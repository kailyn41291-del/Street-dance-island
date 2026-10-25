/* =========================================================
 * 角色繪製（Q 版街舞人）
 * 32 x 46 像素，一層一層畫：後髮 → 披風 → 褲子 → 鞋 → 上衣 → 手 → 頭 → 臉 → 前髮 → 帽子 → 配件
 * 想加新的髮型 / 衣服：在下面對應的 PARTS 裡加一個函式即可
 * ========================================================= */
window.Avatar = (() => {
  const W = 32, H = 46;
  const INK = '#2a1f2e';

  /* ---------- 顏色工具 ---------- */
  const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (c, k = 0.78) => toHex(hex(c).map(v => v * k));
  const light = (c, k = 0.35) => toHex(hex(c).map(v => v + (255 - v) * k));

  /* ---------- 選項 ---------- */
  const OPT = {
    gender: ['m', 'f'],
    face: ['round', 'oval', 'sharp'],
    hair: ['short', 'spiky', 'messy', 'undercut', 'sidepart', 'buzz', 'afro', 'dreads', 'long', 'bob', 'ponytail', 'twintails', 'buns', 'wolf'],
    hat: ['none', 'cap', 'backcap', 'beanie', 'catbeanie', 'bucket', 'newsboy', 'fedora', 'beret', 'headband', 'bandana'],
    top: ['tee', 'hoodie', 'jacket', 'varsity', 'track', 'oversize', 'crop', 'tank', 'locker', 'vest'],
    bottom: ['cargo', 'baggy', 'joggers', 'jeans', 'track', 'shorts', 'knickers', 'skirt'],
    shoes: ['sneakers', 'hightops', 'boots'],
    faceAcc: ['none', 'glasses', 'shades', 'mask'],
    acc: ['none', 'headphones', 'scarf', 'chain'],
    special: ['none', 'admin', 'owner', 'kailyn']
  };
  const COLORS = {
    skin: ['#ffe3cc', '#f6c9a0', '#e8b088', '#c98d5f', '#9a6440', '#6b4128'],
    eye: ['#5b8fd9', '#3fb3a6', '#7fcf73', '#b48ae0', '#e35d5d', '#f2a33a', '#7a4a2a', '#2a1f2e'],
    hair: ['#2a1f2e', '#5a3a2a', '#9a6a3a', '#e8c070', '#f3efe6', '#b9bcc6', '#e35d5d', '#f07ca3', '#b48ae0', '#5b8fd9', '#3fb3a6', '#7fcf73'],
    cloth: ['#e35d5d', '#ef8a3a', '#eac45a', '#7fcf73', '#3fb3a6', '#5b8fd9', '#3a4fa0', '#b48ae0', '#f07ca3', '#f3efe6', '#9a9aa6', '#3b3550', '#22202a']
  };

  // 職業：帶專屬道具，「套用職業造型」會換成代表性的服裝
  const JOBS = {
    bboy:    { hat: 'beanie', top: 'track', bottom: 'track', shoes: 'sneakers', hatColor: '#22202a', topColor: '#e35d5d', bottomColor: '#22202a', shoesColor: '#f3efe6' },
    bgirl:   { gender: 'f', hair: 'ponytail', hat: 'backcap', top: 'crop', bottom: 'cargo', hatColor: '#3fb3a6', topColor: '#22202a', bottomColor: '#9a9aa6', shoesColor: '#f07ca3' },
    locker:  { hat: 'newsboy', top: 'locker', bottom: 'knickers', shoes: 'hightops', hatColor: '#22202a', topColor: '#eac45a', bottomColor: '#22202a', shoesColor: '#f3efe6' },
    popper:  { hat: 'fedora', top: 'vest', bottom: 'jeans', shoes: 'sneakers', hatColor: '#22202a', topColor: '#3b3550', bottomColor: '#22202a', shoesColor: '#22202a', faceAcc: 'shades' },
    hiphop:  { hat: 'bucket', top: 'oversize', bottom: 'baggy', shoes: 'hightops', hatColor: '#f3efe6', topColor: '#ef8a3a', bottomColor: '#3b3550', shoesColor: '#e35d5d', acc: 'chain' },
    house:   { hat: 'beret', top: 'tank', bottom: 'jeans', shoes: 'sneakers', hatColor: '#3a4fa0', topColor: '#f3efe6', bottomColor: '#5b8fd9', shoesColor: '#eac45a' },
    waacker: { gender: 'f', hair: 'long', hat: 'none', top: 'crop', bottom: 'jeans', topColor: '#f07ca3', bottomColor: '#22202a', shoesColor: '#22202a', faceAcc: 'shades' },
    krumper: { hat: 'bandana', top: 'tank', bottom: 'cargo', shoes: 'boots', hatColor: '#e35d5d', topColor: '#22202a', bottomColor: '#3b3550', shoesColor: '#22202a' },
    voguer:  { gender: 'f', hair: 'bob', hat: 'none', top: 'jacket', bottom: 'skirt', topColor: '#b48ae0', bottomColor: '#22202a', shoesColor: '#22202a', faceAcc: 'shades' },
    choreo:  { hat: 'cap', top: 'hoodie', bottom: 'joggers', hatColor: '#f3efe6', topColor: '#9a9aa6', bottomColor: '#22202a', shoesColor: '#f3efe6' },
    dj:      { hat: 'backcap', top: 'oversize', bottom: 'joggers', acc: 'headphones', hatColor: '#22202a', topColor: '#22202a', bottomColor: '#3b3550', accColor: '#f07ca3' },
    mc:      { hat: 'cap', top: 'jacket', bottom: 'baggy', acc: 'chain', hatColor: '#eac45a', topColor: '#3a4fa0', bottomColor: '#22202a', shoesColor: '#f3efe6' },
    fan:     { hat: 'catbeanie', top: 'hoodie', bottom: 'jeans', hatColor: '#f07ca3', topColor: '#f3efe6', bottomColor: '#5b8fd9' },
    host:    { hat: 'none', top: 'varsity', bottom: 'jeans', topColor: '#3fb3a6', bottomColor: '#3b3550', faceAcc: 'glasses' }
  };

  const DEFAULT = {
    gender: 'm', face: 'round', skin: '#f6c9a0', eye: '#5b8fd9', hair: 'short', hairColor: '#2a1f2e',
    hat: 'cap', hatColor: '#e35d5d', top: 'hoodie', topColor: '#3fb3a6', bottom: 'cargo', bottomColor: '#3b3550',
    shoes: 'sneakers', shoesColor: '#f07ca3', faceAcc: 'none', acc: 'none', accColor: '#eac45a', job: 'bboy', special: 'none'
  };

  // 舊版角色資料轉成新版
  function normalize(l) {
    l = l || {};
    if (l.head && typeof l.hat === 'string' && l.hat.startsWith('#')) {
      const hatMap = { cap: 'cap', beanie: 'beanie', bucket: 'bucket', headband: 'headband', afro: 'none', spiky: 'none', bun: 'none', buzz: 'none' };
      const hairMap = { afro: 'afro', spiky: 'spiky', bun: 'buns', buzz: 'buzz' };
      l = { hat: hatMap[l.head] || 'none', hatColor: l.hat, hair: hairMap[l.head] || 'short', hairColor: l.hair, skin: l.skin,
            topColor: l.shirt, bottomColor: l.pants, shoesColor: l.shoes, faceAcc: l.acc === 'none' ? 'none' : l.acc };
    }
    const out = { ...DEFAULT };
    Object.keys(l).forEach(k => { if (l[k] !== undefined && l[k] !== null) out[k] = l[k]; });
    return out;
  }
  const random = (keep = {}) => {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const g = keep.gender || pick(OPT.gender);
    return normalize({
      gender: g, face: pick(OPT.face), skin: pick(COLORS.skin), eye: pick(COLORS.eye),
      hair: g === 'f' ? pick(['long', 'bob', 'ponytail', 'twintails', 'buns', 'wolf', 'short']) : pick(['short', 'spiky', 'messy', 'undercut', 'sidepart', 'buzz', 'afro', 'dreads', 'wolf']),
      hairColor: pick(COLORS.hair), hat: pick(OPT.hat), hatColor: pick(COLORS.cloth), top: pick(OPT.top), topColor: pick(COLORS.cloth),
      bottom: pick(OPT.bottom), bottomColor: pick(COLORS.cloth), shoes: pick(OPT.shoes), shoesColor: pick(COLORS.cloth),
      faceAcc: pick(['none', 'none', 'glasses', 'shades', 'mask']), acc: pick(['none', 'none', 'headphones', 'scarf', 'chain']), accColor: pick(COLORS.cloth),
      job: keep.job || pick(Object.keys(JOBS)), special: keep.special || 'none'
    });
  };

  /* ---------- 畫布 ---------- */
  function Canvas() {
    const px = new Array(W * H).fill(null);
    const set = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H && c) px[y * W + x] = c; };
    const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? px[y * W + x] : null);
    const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
    const row = (y, x0, x1, c) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
    const clear = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = null; };
    return { px, set, get, rect, row, clear };
  }

  /* ---------- 姿勢（4 格動畫） ---------- */
  const POSES = [
    { dy: 0, aL: 'down', aR: 'down', step: 0 },
    { dy: 1, aL: 'up', aR: 'down', step: 0 },
    { dy: 0, aL: 'down', aR: 'out', step: 1 },
    { dy: 1, aL: 'down', aR: 'up', step: 0 }
  ];

  /* ---------- 各部位 ---------- */
  // 後面的頭髮（長髮、馬尾等畫在身體後面）
  function hairBack(cv, L, o) {
    const c = L.hairColor, d = shade(c), y = o;
    switch (L.hair) {
      case 'long': cv.rect(6, 7 + y, 20, 22, c); for (let x = 7; x < 25; x += 3) cv.set(x, 28 + y, d); break;
      case 'bob': cv.rect(6, 7 + y, 20, 13, c); cv.row(19 + y, 7, 24, d); break;
      case 'wolf': cv.rect(6, 7 + y, 20, 15, c); cv.set(7, 22 + y, c); cv.set(24, 22 + y, c); cv.set(10, 22 + y, c); break;
      case 'ponytail': cv.rect(24, 6 + y, 4, 14, c); cv.rect(25, 20 + y, 3, 4, c); cv.rect(24, 8 + y, 2, 2, L.accColor); break;
      case 'twintails':
        cv.rect(2, 9 + y, 5, 16, c); cv.rect(25, 9 + y, 5, 16, c); cv.rect(3, 25 + y, 3, 3, c); cv.rect(26, 25 + y, 3, 3, c);
        cv.rect(5, 9 + y, 2, 2, L.accColor); cv.rect(25, 9 + y, 2, 2, L.accColor); break;
      case 'afro': cv.rect(4, 1 + y, 24, 15, c); cv.rect(5, 0 + y, 22, 1, c); cv.rect(5, 16 + y, 22, 1, c); break;
      case 'dreads': for (const x of [7, 9, 22, 24]) cv.rect(x, 10 + y, 1, x === 7 || x === 24 ? 14 : 16, d); break;
    }
  }

  function cape(cv, L, o) {
    if (L.special === 'none') return;
    const c = L.special === 'owner' ? '#c0392b' : '#6a4fb3', trim = L.special === 'owner' ? '#eac45a' : '#cfd3ff';
    for (let y = 21; y <= 41; y++) { const w = 7 + Math.floor((y - 21) / 2); cv.row(y + (y < 32 ? o : 0), 16 - w, 15 + w, y === 41 ? trim : c); }
  }

  function legs(cv, L, p) {
    const c = L.bottomColor, d = shade(c), lt = light(c, 0.2), top = 32 + p.dy, s = p.step;
    const skin = L.skin, ds = shade(skin);
    const leg = (x0, w, y0, y1, col) => cv.rect(x0, y0, w, y1 - y0 + 1, col);
    const lx = 10 - s, rx = 16 + s;                // 跨步時腳往外
    switch (L.bottom) {
      case 'shorts':
        cv.rect(10, top, 12, 4, c); cv.row(top + 3, 10, 21, d);
        leg(lx + 1, 4, top + 4, 39, skin); leg(rx + 1, 4, top + 4, 39, skin);
        cv.rect(lx + 1, 38, 4, 2, '#f3efe6'); cv.rect(rx + 1, 38, 4, 2, '#f3efe6'); break;
      case 'knickers':
        cv.rect(10, top, 12, 2, c); leg(lx, 6, top + 2, 36, c); leg(rx, 6, top + 2, 36, c);
        cv.row(36, lx, lx + 5, d); cv.row(36, rx, rx + 5, d);
        for (let y = 37; y <= 40; y++) { const sc = y % 2 ? '#f3efe6' : '#2a1f2e'; cv.row(y, lx + 1, lx + 4, sc); cv.row(y, rx + 1, rx + 4, sc); } break;
      case 'skirt':
        for (let y = top; y <= top + 5; y++) cv.row(y, 10 - Math.floor((y - top) / 2), 21 + Math.floor((y - top) / 2), (y - top) % 2 && y > top ? d : c);
        cv.row(top, 10, 21, lt);
        leg(lx + 1, 4, top + 6, 40, skin); leg(rx + 1, 4, top + 6, 40, skin);
        cv.rect(lx + 1, 39, 4, 2, '#f3efe6'); cv.rect(rx + 1, 39, 4, 2, '#f3efe6'); break;
      default: {
        const wide = L.bottom === 'baggy' || L.bottom === 'jeans' || L.bottom === 'cargo';
        cv.rect(10, top, 12, 2, c);
        for (let y = top + 2; y <= 40; y++) {
          const k = wide ? Math.floor((y - top) / 3) : 0;
          cv.row(y, lx - Math.min(k, 1), lx + 5, c); cv.row(y, rx, rx + 5 + Math.min(k, 1), c);
        }
        cv.row(top, 10, 21, shade(c, 0.6));                                  // 腰帶
        for (let y = top + 2; y <= 40; y++) { cv.set(lx + 5, y, d); cv.set(rx, y, d); }   // 兩腳中間的陰影
        if (L.bottom === 'cargo') { cv.rect(lx - 1, 35, 2, 3, d); cv.rect(rx + 5, 35, 2, 3, d); }
        if (L.bottom === 'jeans') { cv.set(lx + 2, top + 3, lt); cv.set(rx + 3, top + 3, lt); cv.row(40, lx - 1, lx + 5, lt); cv.row(40, rx, rx + 6, lt); }
        if (L.bottom === 'track') for (let y = top + 1; y <= 40; y++) { cv.set(lx, y, '#f3efe6'); cv.set(rx + 5, y, '#f3efe6'); }
        if (L.bottom === 'joggers') { cv.row(39, lx, lx + 5, d); cv.row(40, lx, lx + 5, d); cv.row(39, rx, rx + 5, d); cv.row(40, rx, rx + 5, d); }
        if (L.bottom === 'baggy') { cv.row(40, lx - 1, lx + 5, d); cv.row(40, rx, rx + 6, d); }
      }
    }
    return { lx, rx };
  }

  function shoes(cv, L, p, f) {
    const c = L.shoesColor, d = shade(c), sole = L.shoes === 'boots' ? shade(c, 0.5) : '#f3efe6';
    const one = (x, flip) => {
      if (L.shoes === 'hightops') cv.rect(x + (flip ? 1 : 0), 39, 6, 2, c);
      if (L.shoes === 'boots') cv.rect(x + (flip ? 1 : 0), 38, 6, 3, c);
      cv.rect(x, 41, 7, 2, c);
      cv.row(43, x, x + 6, sole);
      cv.set(flip ? x + 5 : x + 1, 41, light(c, 0.5));
      cv.set(flip ? x : x + 6, 42, d);
      if (L.shoes !== 'boots') cv.row(41, x + 2, x + 4, light(c, 0.3));
    };
    one(f.lx - 1, false); one(f.rx, true);
  }

  // 上衣（含手臂）
  function torso(cv, L, p) {
    const o = p.dy, c = L.topColor, d = shade(c), lt = light(c, 0.25), skin = L.skin, ds = shade(skin);
    const female = L.gender === 'f';
    const x0 = female ? 11 : 10, x1 = female ? 20 : 21;
    const T = 21 + o, B = 31 + o;
    let sleeve = 'long', armCol = c;
    if (['tee', 'oversize', 'crop', 'varsity'].includes(L.top)) sleeve = 'short';
    if (L.top === 'tank') sleeve = 'none';
    if (L.top === 'varsity') { sleeve = 'long'; armCol = '#f3efe6'; }
    if (L.top === 'vest') { sleeve = 'long'; armCol = '#f3efe6'; }
    if (L.top === 'locker') sleeve = 'long';

    // 身體
    for (let y = T; y <= B; y++) {
      let a = x0, b = x1;
      if (female && y >= T + 6 && y <= T + 7) { a++; b--; }        // 女生腰身
      if (L.top === 'oversize') { a--; b++; }
      cv.row(y, a, b, c);
    }
    cv.row(B, x0, x1, d);
    cv.set(x0, T, d); cv.set(x1, T, d);
    switch (L.top) {
      case 'tee': case 'oversize':
        cv.row(T, 14, 17, skin); cv.row(T + 1, 15, 16, ds);
        if (L.top === 'oversize') { cv.rect(14, T + 4, 4, 3, light(c, 0.6)); cv.set(15, T + 5, c); cv.set(16, T + 5, d); }
        break;
      case 'hoodie':
        cv.row(T, 11, 20, d); cv.row(T + 1, 12, 19, d); cv.row(T, 14, 17, shade(c, 0.6));
        cv.set(14, T + 2, '#f3efe6'); cv.set(14, T + 3, '#f3efe6'); cv.set(17, T + 2, '#f3efe6'); cv.set(17, T + 3, '#f3efe6');
        cv.rect(12, T + 6, 8, 3, d); cv.row(T + 6, 12, 19, shade(c, 0.65)); break;
      case 'jacket': case 'track':
        cv.rect(14, T, 4, B - T, L.top === 'track' ? shade(c, 0.85) : '#f3efe6');
        cv.set(13, T, lt); cv.set(18, T, lt); cv.set(13, T + 1, lt); cv.set(18, T + 1, lt);
        for (let y = T + 1; y < B; y++) { cv.set(13, y, d); cv.set(18, y, d); }
        if (L.top === 'track') for (let y = T; y < B; y++) cv.set(15 + (y % 2), y, '#c9ccd6');
        break;
      case 'varsity':
        cv.row(T, 13, 18, '#f3efe6'); cv.rect(15, T + 1, 2, B - T - 1, shade(c, 0.85));
        cv.rect(11, T + 3, 3, 3, '#f3efe6'); cv.set(12, T + 4, c);
        cv.row(B, x0, x1, '#f3efe6'); break;
      case 'crop': {
        const cut = T + 6;
        for (let y = cut; y <= B; y++) cv.row(y, x0 + (female && y <= cut + 1 ? 1 : 0), x1 - (female && y <= cut + 1 ? 1 : 0), skin);
        cv.row(cut, x0, x1, d); cv.set(15, cut + 3, ds); cv.row(B, x0, x1, ds);
        cv.row(T, 14, 17, skin); break;
      }
      case 'tank':
        cv.row(T, x0, 13, skin); cv.row(T, 18, x1, skin); cv.row(T + 1, x0, 12, skin); cv.row(T + 1, 19, x1, skin);
        cv.row(T, 14, 17, skin); cv.row(T + 1, 15, 16, skin); break;
      case 'locker':
        for (let y = T; y <= B; y++) if ((y - T) % 2 === 1) cv.row(y, x0, x1, '#22202a'); else cv.row(y, x0, x1, '#f3efe6');
        for (let y = T; y <= B; y++) { cv.set(12, y, c); cv.set(19, y, c); }       // 吊帶
        cv.set(12, B - 1, shade(c)); cv.set(19, B - 1, shade(c));
        cv.row(T, 14, 17, '#22202a'); cv.set(15, T + 1, c); cv.set(16, T + 1, c); // 領結
        break;
      case 'vest':
        cv.row(T, 14, 17, '#f3efe6');
        for (let y = T; y <= T + 6; y++) cv.row(y, 15 - Math.max(0, 3 - (y - T)), 16 + Math.max(0, 3 - (y - T)), '#f3efe6');
        cv.rect(15, T + 1, 2, 4, '#f3efe6'); cv.set(15, T + 1, '#22202a'); cv.set(16, T + 1, '#22202a');
        cv.set(14, T + 7, lt); cv.set(14, T + 9, lt); break;
    }

    // 手臂
    const armColor = sleeve === 'none' ? skin : armCol;
    const arm = (side, mode) => {
      const L0 = side === 'L';
      if (mode === 'down') {
        const ax = L0 ? x0 - 3 : x1 + 1;
        for (let y = T; y <= B - 1; y++) {
          const isSkin = sleeve === 'none' || (sleeve === 'short' && y > T + 4);
          cv.rect(ax, y, 3, 1, isSkin ? skin : armColor);
        }
        cv.set(L0 ? ax : ax + 2, T + 1, sleeve === 'none' ? ds : shade(armColor));
        if (sleeve === 'short') cv.row(T + 4, ax, ax + 2, shade(armColor));
        if (L.top === 'track' && sleeve !== 'none') for (let y = T; y < B - 1; y++) cv.set(L0 ? ax : ax + 2, y, '#f3efe6');
        cv.rect(ax, B, 3, 2, skin); cv.set(L0 ? ax + 2 : ax, B + 1, ds);
        return { hx: ax + 1, hy: B + 1 };
      }
      if (mode === 'up') {
        const ax = L0 ? x0 - 3 : x1 + 1;
        for (let y = T - 9; y <= T + 1; y++) {
          const isSkin = sleeve === 'none' || (sleeve === 'short' && y < T - 3);
          cv.rect(ax, y, 3, 1, isSkin ? skin : armColor);
        }
        cv.rect(ax, T - 11, 3, 2, skin);
        cv.set(L0 ? ax : ax + 2, T - 12, skin);                        // 比 YA / 指天
        return { hx: ax + 1, hy: T - 11 };
      }
      // out：往右指
      const ay = T + 1;
      for (let x = x1 + 1; x <= x1 + 7; x++) {
        const isSkin = sleeve === 'none' || (sleeve === 'short' && x > x1 + 3);
        cv.rect(x, ay, 1, 3, isSkin ? skin : armColor);
      }
      cv.row(ay + 2, x1 + 1, x1 + 7, sleeve === 'none' ? ds : shade(armColor));
      cv.rect(x1 + 8, ay, 2, 3, skin); cv.set(x1 + 10, ay, skin); cv.set(x1 + 11, ay, skin);   // 食指
      return { hx: x1 + 9, hy: ay + 1 };
    };
    const hl = arm('L', p.aL), hr = arm('R', p.aR);
    return { hl, hr };
  }

  function neckAcc(cv, L, p) {
    const o = p.dy, c = L.accColor, d = shade(c);
    if (L.acc === 'scarf') { cv.rect(10, 20 + o, 12, 3, c); cv.row(22 + o, 10, 21, d); cv.rect(18, 23 + o, 3, 6, c); cv.row(28 + o, 18, 20, d); }
    if (L.acc === 'chain') { const g = '#eac45a'; cv.set(12, 23 + o, g); cv.set(13, 24 + o, g); cv.set(14, 25 + o, g); cv.set(15, 25 + o, g); cv.set(16, 25 + o, g); cv.set(17, 25 + o, g); cv.set(18, 24 + o, g); cv.set(19, 23 + o, g); cv.rect(15, 26 + o, 2, 2, '#f3c84a'); }
  }

  // 頭 + 臉
  function head(cv, L, p) {
    const o = p.dy, s = L.skin, ds = shade(s), y0 = 4 + o, y1 = 19 + o;
    cv.rect(14, 20 + o, 4, 2, ds);                                     // 脖子
    for (let y = y0; y <= y1; y++) {
      let a = 8, b = 23;
      const top = y - y0, bot = y1 - y;
      if (top === 0) { a = 10; b = 21; } else if (top === 1) { a = 9; b = 22; }
      if (L.face === 'round') { if (bot === 0) { a = 11; b = 20; } else if (bot === 1) { a = 9; b = 22; } }
      if (L.face === 'oval') { if (bot === 0) { a = 12; b = 19; } else if (bot === 1) { a = 10; b = 21; } else if (bot === 2) { a = 9; b = 22; } }
      if (L.face === 'sharp') { if (bot <= 3) { a = 9 + (4 - bot) - 1 + (bot === 0 ? 1 : 0); b = 31 - a; } }
      cv.row(y, a, b, s);
    }
    cv.set(7, 12 + o, s); cv.set(7, 13 + o, ds); cv.set(24, 12 + o, s); cv.set(24, 13 + o, ds);   // 耳朵
    // 眼睛
    const ey = 12 + o, ec = L.eye, eL = light(ec, 0.35), eD = shade(ec, 0.6);
    const eye = (x, outer) => {
      cv.row(ey, x, x + 2, INK);
      cv.set(x, ey + 1, eL); cv.set(x + 1, ey + 1, '#ffffff'); cv.set(x + 2, ey + 1, ec);
      cv.set(x, ey + 2, ec); cv.set(x + 1, ey + 2, eD); cv.set(x + 2, ey + 2, ec);
      cv.row(ey + 3, x, x + 2, eD);
      if (L.gender === 'f') cv.set(outer, ey - 1, INK);
    };
    eye(11, 10); eye(18, 21);
    if (L.gender === 'f') { cv.set(10, ey, INK); cv.set(21, ey, INK); }
    // 腮紅、嘴巴
    cv.set(10, 16 + o, '#f4a1a1'); cv.set(21, 16 + o, '#f4a1a1');
    if (L.gender === 'f') { cv.set(11, 16 + o, '#f4b4b4'); cv.set(20, 16 + o, '#f4b4b4'); }
    cv.set(15, 17 + o, L.gender === 'f' ? '#d9606e' : shade(s, 0.55)); cv.set(16, 17 + o, L.gender === 'f' ? '#d9606e' : shade(s, 0.55));
    cv.set(17, 16 + o, shade(s, 0.55));
  }

  // 前面的頭髮
  function hairFront(cv, L, p) {
    const o = p.dy, c = L.hairColor, d = shade(c), lt = light(c, 0.3), y = o;
    const dome = (top = 2, bottom = 8) => {
      cv.row(top + y, 11, 20, c); cv.row(top + 1 + y, 9, 22, c);
      for (let r = top + 2; r <= bottom; r++) cv.row(r + y, 8, 23, c);
      cv.set(12, top + 1 + y, lt); cv.set(13, top + 1 + y, lt); cv.set(11, top + 2 + y, lt);
    };
    const fringe = (pattern, r = 9) => { [...pattern].forEach((ch, i) => { if (ch !== '.') cv.set(8 + i, r + y, ch === 'd' ? d : c); }); };
    const sides = to => { for (let r = 9; r <= to; r++) { cv.set(8, r + y, c); cv.set(23, r + y, c); if (r <= to - 2) { cv.set(9, r + y, d); cv.set(22, r + y, d); } } };
    switch (L.hair) {
      case 'short': dome(); fringe('cccc.cc.cc.ccccc'); fringe('c.c.......c..c.c', 10); sides(12); break;
      case 'spiky': dome(); for (const x of [9, 12, 15, 18, 21]) { cv.set(x, 1 + y, c); cv.set(x + 1, 1 + y, c); cv.set(x, 0 + y, c); }
        fringe('cc.cc.ccc.cc.ccc'); sides(11); break;
      case 'messy': dome(); fringe('ccccc.cccc.ccccc'); fringe('.c.cc..c..cc.c..', 10); fringe('..c....c....c...', 11); cv.set(7, 8 + y, c); cv.set(24, 8 + y, c); cv.set(7, 10 + y, c); sides(13); break;
      case 'undercut': dome(2, 7); fringe('d.....cccccccccc', 8); fringe('......ccccccccc.', 9); fringe('.........cccccc.', 10); for (let r = 8; r <= 11; r++) { cv.set(8, r + y, d); cv.set(23, r + y, d); } break;
      case 'sidepart': dome(); fringe('cccccccccccdcccc'); fringe('ccccccccc...c..c', 10); fringe('cccccc.........c', 11); sides(15); break;
      case 'buzz': cv.row(3 + y, 11, 20, d); cv.row(4 + y, 9, 22, d); cv.row(5 + y, 8, 23, d); cv.row(6 + y, 8, 23, shade(c, 0.9)); cv.set(8, 7 + y, d); cv.set(23, 7 + y, d); break;
      case 'afro': cv.row(6 + y, 8, 23, c); cv.row(7 + y, 8, 23, c); fringe('cc.cc.cc.cc.cc.c', 8); for (let i = 0; i < 9; i++) cv.set(6 + ((i * 7) % 20), 1 + ((i * 3) % 12) + y, lt); break;
      case 'dreads': dome(); fringe('c.c.c.c.c.c.c.c.', 9); fringe('c...c...c...c..c', 10); for (const x of [8, 23]) for (let r = 9; r <= 22; r++) cv.set(x, r + y, r % 3 ? c : d); break;
      case 'long': dome(); fringe('ccccc.cccc.ccccc'); fringe('cc..c.....c..ccc', 10); for (let r = 9; r <= 24; r++) { cv.set(8, r + y, c); cv.set(23, r + y, c); cv.set(7, r + y, d); cv.set(24, r + y, d); } break;
      case 'bob': dome(); fringe('cccccccccccccccc'); fringe('cc.c.c..c.c.c.cc', 10); for (let r = 9; r <= 18; r++) { cv.set(8, r + y, c); cv.set(23, r + y, c); cv.set(7, r + y, d); cv.set(24, r + y, d); } break;
      case 'wolf': dome(); fringe('cccc.ccc.ccc.ccc'); fringe('c.c..c...c..c.cc', 10); for (let r = 9; r <= 20; r++) { cv.set(8, r + y, r % 4 === 0 ? d : c); cv.set(23, r + y, r % 4 === 0 ? d : c); } cv.set(7, 15 + y, c); cv.set(24, 17 + y, c); break;
      case 'ponytail': case 'twintails': case 'buns':
        dome(); fringe('ccccc.cccc.ccccc'); fringe('c..c.......c..cc', 10); sides(13);
        if (L.hair === 'buns') { cv.rect(7, 0 + y, 5, 4, c); cv.rect(20, 0 + y, 5, 4, c); cv.set(8, 1 + y, lt); cv.set(21, 1 + y, lt); cv.row(3 + y, 8, 10, d); cv.row(3 + y, 21, 23, d); }
        break;
    }
  }

  function hat(cv, L, p) {
    const o = p.dy, c = L.hatColor, d = shade(c), lt = light(c, 0.3), y = o;
    switch (L.hat) {
      case 'cap': cv.row(2 + y, 11, 20, c); cv.row(3 + y, 9, 22, c); for (let r = 4; r <= 6; r++) cv.row(r + y, 8, 23, c);
        cv.row(7 + y, 8, 23, d); cv.row(8 + y, 13, 28, d); cv.row(7 + y, 23, 27, d); cv.set(15, 2 + y, lt); cv.set(16, 2 + y, lt); cv.set(12, 4 + y, lt); cv.rect(14, 4 + y, 4, 2, light(c, 0.6)); break;
      case 'backcap': cv.row(2 + y, 11, 20, c); cv.row(3 + y, 9, 22, c); for (let r = 4; r <= 7; r++) cv.row(r + y, 8, 23, c);
        cv.row(7 + y, 3, 9, d); cv.row(8 + y, 4, 8, d); cv.set(15, 2 + y, lt); cv.row(8 + y, 9, 23, d); break;
      case 'beanie': case 'catbeanie':
        cv.row(1 + y, 11, 20, c); cv.row(2 + y, 9, 22, c); for (let r = 3; r <= 7; r++) cv.row(r + y, 8, 23, c);
        for (let x = 9; x <= 22; x += 2) for (let r = 3; r <= 6; r++) cv.set(x, r + y, d);
        cv.row(8 + y, 7, 24, d); cv.row(9 + y, 7, 24, shade(c, 0.7));
        if (L.hat === 'catbeanie') { cv.set(9, 0 + y, c); cv.set(10, 0 + y, c); cv.set(9, -1 + y, c); cv.set(21, 0 + y, c); cv.set(22, 0 + y, c); cv.set(22, -1 + y, c); cv.set(10, 1 + y, '#f4a1a1'); cv.set(21, 1 + y, '#f4a1a1'); }
        break;
      case 'bucket': cv.row(2 + y, 11, 20, c); for (let r = 3; r <= 7; r++) cv.row(r + y, 9, 22, c); cv.row(6 + y, 9, 22, d);
        cv.row(8 + y, 6, 25, c); cv.row(9 + y, 5, 26, d); cv.set(13, 3 + y, lt); break;
      case 'newsboy': cv.row(1 + y, 10, 21, c); cv.row(2 + y, 8, 23, c); for (let r = 3; r <= 6; r++) cv.row(r + y, 7, 24, c);
        for (let x = 9; x <= 22; x += 3) cv.set(x, 3 + y, d); cv.set(15, 0 + y, d); cv.set(16, 0 + y, d);
        cv.row(7 + y, 8, 23, d); cv.row(8 + y, 10, 22, shade(c, 0.6)); cv.set(11, 2 + y, lt); break;
      case 'fedora': cv.row(0 + y, 12, 19, c); for (let r = 1; r <= 5; r++) cv.row(r + y, 10, 21, c); cv.row(1 + y, 15, 16, d);
        cv.row(5 + y, 10, 21, '#e35d5d'); cv.row(6 + y, 4, 27, c); cv.row(7 + y, 5, 26, d); cv.set(11, 2 + y, lt); break;
      case 'beret': cv.row(2 + y, 9, 20, c); cv.row(3 + y, 7, 22, c); for (let r = 4; r <= 6; r++) cv.row(r + y, 7, 23, c); cv.row(7 + y, 8, 23, d);
        cv.set(14, 1 + y, d); cv.set(10, 3 + y, lt); break;
      case 'headband': cv.row(7 + y, 8, 23, c); cv.row(8 + y, 8, 23, d); cv.set(24, 8 + y, c); cv.set(25, 9 + y, c); cv.set(24, 10 + y, d); break;
      case 'bandana': cv.row(2 + y, 11, 20, c); cv.row(3 + y, 9, 22, c); for (let r = 4; r <= 8; r++) cv.row(r + y, 8, 23, c);
        for (let x = 10; x <= 22; x += 4) cv.set(x, 5 + y, '#f3efe6'); cv.row(8 + y, 8, 23, d); cv.rect(24, 6 + y, 2, 2, c); cv.set(26, 8 + y, c); cv.set(25, 9 + y, d); break;
    }
    if (L.special === 'owner') {                                         // 網站架設者：皇冠
      const g = '#eac45a', gd = '#b8892a';
      cv.row(0 + y, 10, 21, g); cv.row(1 + y, 10, 21, g); cv.row(1 + y, 10, 21, gd);
      for (const x of [10, 13, 16, 19, 21]) cv.set(x, -1 + y, g);
      cv.set(12, 0 + y, '#e35d5d'); cv.set(15, 0 + y, '#5b8fd9'); cv.set(18, 0 + y, '#7fcf73');
    }
  }

  function faceAcc(cv, L, p) {
    const o = p.dy, ey = 12 + o;
    if (L.faceAcc === 'glasses') { for (const x of [10, 17]) { cv.row(ey - 1, x, x + 4, INK); cv.row(ey + 4, x, x + 4, INK); cv.set(x, ey + 1, INK); cv.set(x, ey + 2, INK); cv.set(x + 4, ey + 1, INK); cv.set(x + 4, ey + 2, INK); } cv.row(ey + 1, 15, 16, INK); }
    if (L.faceAcc === 'shades') { cv.row(ey, 10, 21, INK); cv.rect(10, ey + 1, 5, 2, '#3b3a5a'); cv.rect(17, ey + 1, 5, 2, '#3b3a5a'); cv.row(ey + 1, 15, 16, INK); cv.set(11, ey + 1, '#9fd8ff'); cv.set(18, ey + 1, '#9fd8ff'); cv.row(ey + 3, 11, 13, '#3b3a5a'); cv.row(ey + 3, 18, 20, '#3b3a5a'); }
    if (L.faceAcc === 'mask') { cv.rect(10, 15 + o, 12, 4, '#22202a'); cv.row(15 + o, 10, 21, '#3b3550'); cv.set(9, 15 + o, '#22202a'); cv.set(22, 15 + o, '#22202a'); }
    if (L.acc === 'headphones') {
      const c = L.accColor, d = shade(c);
      cv.row(1 + o, 10, 21, '#3b3550'); cv.set(9, 2 + o, '#3b3550'); cv.set(22, 2 + o, '#3b3550');
      for (let r = 3; r <= 9; r++) { cv.set(7, r + o, '#3b3550'); cv.set(24, r + o, '#3b3550'); }
      cv.rect(5, 10 + o, 3, 6, c); cv.rect(24, 10 + o, 3, 6, c); cv.rect(5, 10 + o, 1, 6, d); cv.rect(26, 10 + o, 1, 6, d);
    }
  }

  function props(cv, L, hands) {
    const h = hands.hr;
    if (L.job === 'mc') { cv.rect(h.hx - 1, h.hy - 7, 2, 6, '#9a9aa6'); cv.rect(h.hx - 2, h.hy - 10, 4, 3, '#3b3550'); cv.set(h.hx - 1, h.hy - 10, '#c9ccd6'); }
    if (L.job === 'dj') { const x = hands.hl.hx - 4, y = hands.hl.hy - 3; cv.rect(x, y, 6, 6, '#22202a'); cv.rect(x + 2, y + 2, 2, 2, '#f07ca3'); cv.set(x + 1, y + 1, '#55506a'); }
    if (L.job === 'host') { const x = hands.hl.hx - 3, y = hands.hl.hy - 5; cv.rect(x, y, 5, 6, '#f3efe6'); cv.row(y, x + 1, x + 3, '#9a6a3a'); cv.row(y + 2, x + 1, x + 3, '#9a9aa6'); cv.row(y + 4, x + 1, x + 3, '#9a9aa6'); }
  }

  function badge(cv, L, p) {
    if (L.special !== 'admin' && L.special !== 'owner') return;
    const o = p.dy, x = L.gender === 'f' ? 18 : 19, y = 24 + o, g = L.special === 'owner' ? '#eac45a' : '#cfd3ff';
    cv.set(x, y - 1, g); cv.row(y, x - 1, x + 1, g); cv.set(x, y + 1, g);
  }

  /* ---------- 組合 ---------- */
  function paint(look, frame) {
    const L = normalize(look), p = POSES[frame % POSES.length], cv = Canvas();
    hairBack(cv, L, p.dy);
    cape(cv, L, p.dy);
    const f = legs(cv, L, p);
    shoes(cv, L, p, f);
    const hands = torso(cv, L, p);
    neckAcc(cv, L, p);
    head(cv, L, p);
    hairFront(cv, L, p);
    hat(cv, L, p);
    faceAcc(cv, L, p);
    props(cv, L, hands);
    badge(cv, L, p);
    return { cv, L };
  }

  const cache = new Map();
  // 網站架設者專屬：「Kailyn 本人」造型直接用原畫
  const KIMG = new Image(); KIMG.src = 'assets/kailyn/full.webp';
  function renderKailyn(frame, scale) {
    const out = document.createElement('canvas');
    out.width = (W + 2) * scale; out.height = (H + 2) * scale;
    if (KIMG.complete && KIMG.naturalWidth) {
      const g = out.getContext('2d'), h = out.height, w = (KIMG.naturalWidth / KIMG.naturalHeight) * h;
      const bob = [0, -1, 0, 1][frame % 4] * scale;
      g.imageSmoothingQuality = 'high';
      g.drawImage(KIMG, (out.width - w) / 2, bob, w, h);
    }
    return out;
  }
  function render(look, frame = 0, scale = 3) {
    if (look && look.special === 'kailyn') {
      const key = 'kailyn|' + frame + '|' + scale;
      if (cache.has(key)) return cache.get(key);
      const c = renderKailyn(frame, scale);
      if (KIMG.complete && KIMG.naturalWidth) cache.set(key, c);
      return c;
    }
    const key = JSON.stringify(normalize(look)) + '|' + frame + '|' + scale;
    if (cache.has(key)) return cache.get(key);
    const { cv: c, L } = paint(look, frame);
    const out = document.createElement('canvas');
    out.width = (W + 2) * scale; out.height = (H + 2) * scale;
    const g = out.getContext('2d');
    const line = L.special === 'owner' ? '#b8892a' : L.special === 'admin' ? '#5a3fa3' : INK;
    g.fillStyle = line;
    for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
      if (c.get(x, y)) continue;
      if (c.get(x + 1, y) || c.get(x - 1, y) || c.get(x, y + 1) || c.get(x, y - 1)) g.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const col = c.get(x, y); if (!col) continue;
      g.fillStyle = col; g.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
    }
    if (cache.size > 400) cache.clear();
    cache.set(key, out);
    return out;
  }

  /** 會跳舞的角色：dancer(scale, look) → { el, beat, setFrame, setLook } */
  function dancer(scale = 3, look) {
    const el = document.createElement('canvas');
    el.className = 'sprite avatar';
    el.width = (W + 2) * scale; el.height = (H + 2) * scale;
    const g = el.getContext('2d');
    let i = 0, cur = look;
    const setFrame = n => { i = ((n % 4) + 4) % 4; g.clearRect(0, 0, el.width, el.height); g.drawImage(render(cur, i, scale), 0, 0); };
    const setLook = l => { cur = l; setFrame(i); };
    setFrame(0);
    return { el, setFrame, beat: () => setFrame(i + 1), setLook };
  }

  return { W, H, OPT, COLORS, JOBS, DEFAULT, normalize, random, render, dancer };
})();
