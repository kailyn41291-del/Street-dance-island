/* =========================================================
 * 像素表情符號：貓咪 / 吉娃娃（各 12 個）
 * 文字裡用 :c1: ~ :c12:、:d1: ~ :d12: 代表，顯示時換成圖片
 * ========================================================= */
window.Emoji = (() => {
  const S = 16, INK = '#2a1f2e';
  const P = {
    cat:  { f: '#f2a65a', d: '#d9803a', w: '#fff4e6', p: '#f4a1a1' },
    cat2: { f: '#b9bcc6', d: '#8a8d99', w: '#f3efe6', p: '#f4a1a1' },
    cat3: { f: '#5c566e', d: '#45405a', w: '#f3efe6', p: '#f4a1a1' },
    dog:  { f: '#e8c08a', d: '#c99a5e', w: '#fff1dc', p: '#f4a1a1' },
    dog2: { f: '#f3efe6', d: '#d6cfc2', w: '#ffffff', p: '#f4a1a1' },
    dog3: { f: '#6b4128', d: '#4a2c1a', w: '#c98d5f', p: '#f4a1a1' }
  };

  function grid() {
    const px = new Array(S * S).fill(null);
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < S && y < S) px[y * S + x] = c; };
    return { px, set, get: (x, y) => (x >= 0 && y >= 0 && x < S && y < S ? px[y * S + x] : null), row: (y, a, b, c) => { for (let x = a; x <= b; x++) set(x, y, c); } };
  }

  function catBase(g, c) {
    // 耳朵
    for (let i = 0; i < 4; i++) { g.row(1 + i, 2, 2 + i, c.f); g.row(1 + i, 13 - i, 13, c.f); }
    g.set(3, 3, c.p); g.set(3, 4, c.p); g.set(12, 3, c.p); g.set(12, 4, c.p);
    // 頭
    const rows = [[4, 3, 12], [5, 2, 13], [6, 1, 14], [7, 1, 14], [8, 1, 14], [9, 1, 14], [10, 1, 14], [11, 1, 14], [12, 2, 13], [13, 3, 12], [14, 4, 11]];
    rows.forEach(([y, a, b]) => g.row(y, a, b, c.f));
    g.set(7, 5, c.d); g.set(8, 5, c.d); g.set(7, 6, c.d); g.set(6, 5, c.d); g.set(9, 5, c.d);   // 額頭條紋
    g.row(11, 5, 10, c.w); g.row(12, 5, 10, c.w); g.row(13, 6, 9, c.w);                         // 嘴邊
    g.set(7, 10, c.p); g.set(8, 10, c.p);                                                          // 鼻子
    g.set(0, 10, INK); g.set(15, 10, INK); g.set(0, 12, INK); g.set(15, 12, INK);                // 鬍鬚
  }
  function dogBase(g, c) {
    // 大耳朵
    const earL = [[0, 0, 1], [1, 0, 2], [2, 0, 3], [3, 1, 4], [4, 1, 4], [5, 2, 4]], earR = earL.map(([y, a, b]) => [y, 15 - b, 15 - a]);
    earL.forEach(([y, a, b]) => g.row(y, a, b, c.f)); earR.forEach(([y, a, b]) => g.row(y, a, b, c.f));
    g.set(1, 1, c.p); g.set(1, 2, c.p); g.set(2, 3, c.p); g.set(14, 1, c.p); g.set(14, 2, c.p); g.set(13, 3, c.p);
    const rows = [[3, 5, 10], [4, 4, 11], [5, 3, 12], [6, 2, 13], [7, 2, 13], [8, 2, 13], [9, 2, 13], [10, 2, 13], [11, 3, 12], [12, 4, 11], [13, 5, 10], [14, 6, 9]];
    rows.forEach(([y, a, b]) => g.row(y, a, b, c.f));
    g.row(4, 7, 8, c.w); g.row(5, 7, 8, c.w);
    g.row(11, 6, 9, c.w); g.row(12, 5, 10, c.w); g.row(13, 6, 9, c.w);
    g.set(7, 10, INK); g.set(8, 10, INK); g.set(7, 9, INK); g.set(8, 9, INK);   // 黑鼻子
  }

  // 表情（e: 眼睛高度）
  const eyesOpen = (g, y, x1 = 4, x2 = 10, big) => {
    for (const x of [x1, x2]) { g.set(x, y, INK); g.set(x + 1, y, INK); g.set(x, y + 1, INK); g.set(x + 1, y + 1, INK); g.set(x + 1, y, '#ffffff'); if (big) { g.set(x, y + 2, INK); g.set(x + 1, y + 2, INK); } }
  };
  const happyEyes = (g, y, x1 = 4, x2 = 10) => { for (const x of [x1, x2]) { g.set(x, y + 1, INK); g.set(x + 1, y, INK); g.set(x + 2, y + 1, INK); } };
  const mouthSmile = (g, y) => { g.set(6, y, INK); g.set(9, y, INK); g.set(7, y + 1, INK); g.set(8, y + 1, INK); };
  const mouthOpen = (g, y) => { g.row(y, 6, 9, INK); g.row(y + 1, 6, 9, '#e35d5d'); g.set(6, y + 1, INK); g.set(9, y + 1, INK); g.row(y + 2, 7, 8, INK); };
  const heart = (g, x, y, col = '#e35d5d') => { g.set(x, y, col); g.set(x + 2, y, col); g.row(y + 1, x, x + 2, col); g.set(x + 1, y + 2, col); };
  const tear = (g, x, y) => { g.set(x, y, '#7fc3ff'); g.set(x, y + 1, '#7fc3ff'); g.set(x, y + 2, '#5ba6e8'); };

  const EXPR = [
    (g, e) => { happyEyes(g, e); mouthSmile(g, 12); },                                          // 開心
    (g, e) => { heart(g, 3, e); heart(g, 10, e); mouthSmile(g, 12); },                            // 愛心眼
    (g, e) => { eyesOpen(g, e); tear(g, 4, e + 2); tear(g, 11, e + 2); g.row(13, 6, 9, INK); },   // 哭哭
    (g, e) => { eyesOpen(g, e); g.set(3, e - 1, INK); g.set(4, e - 2, INK); g.set(12, e - 1, INK); g.set(11, e - 2, INK); g.row(13, 6, 9, INK); g.set(13, 2, '#e35d5d'); g.set(14, 3, '#e35d5d'); }, // 生氣
    (g, e) => { g.row(e + 1, 3, 5, INK); g.row(e + 1, 10, 12, INK); g.set(8, 13, INK); g.set(13, 1, '#7895df'); g.set(14, 0, '#7895df'); g.set(15, 1, '#7895df'); }, // 想睡
    (g, e) => { eyesOpen(g, e, 4, 10, true); mouthOpen(g, 12); },                                 // 驚訝
    (g, e) => { eyesOpen(g, e, 4, 10); g.row(e + 1, 10, 12, INK); g.set(10, e, null); g.set(11, e, null); mouthSmile(g, 12); }, // 眨眼
    (g, e) => { g.row(e, 2, 13, INK); g.row(e + 1, 3, 6, '#3b3a5a'); g.row(e + 1, 9, 12, '#3b3a5a'); g.set(3, e + 1, '#9fd8ff'); g.set(9, e + 1, '#9fd8ff'); mouthSmile(g, 12); }, // 墨鏡
    (g, e) => { happyEyes(g, e); mouthOpen(g, 12); g.set(0, 4, '#eac45a'); g.set(15, 6, '#eac45a'); g.set(1, 14, '#eac45a'); },  // 大笑
    (g, e) => { happyEyes(g, e); mouthSmile(g, 12); for (let x = 1; x <= 14; x += 3) { g.set(x, 15, '#ef8a3a'); g.set(x + 1, 14, '#e35d5d'); } }, // 火力全開
    (g, e) => { eyesOpen(g, e); mouthSmile(g, 12); g.row(15, 4, 11, '#eac45a'); g.set(5, 14, '#eac45a'); g.set(10, 14, '#eac45a'); }, // 拿獎盃
    (g, e) => { eyesOpen(g, e); g.row(13, 7, 8, INK); for (const [x, y] of [[13, 0], [14, 2], [12, 2]]) g.set(x, y, '#3b3550'); g.set(13, 1, '#3b3550'); g.set(15, 3, '#3b3550'); } // 音樂
  ];

  const LIST = [];
  const make = (kind, base, palettes, eyeY) => EXPR.forEach((ex, i) => {
    const pal = palettes[i % palettes.length];
    LIST.push({ code: `${kind}${i + 1}`, kind, draw: () => { const g = grid(); base(g, P[pal]); ex(g, eyeY); return g; } });
  });
  make('c', catBase, ['cat', 'cat', 'cat2', 'cat', 'cat3', 'cat2', 'cat', 'cat3', 'cat', 'cat', 'cat2', 'cat3'], 7);
  make('d', dogBase, ['dog', 'dog', 'dog2', 'dog', 'dog3', 'dog2', 'dog', 'dog3', 'dog', 'dog', 'dog2', 'dog3'], 7);

  /* ---------- 使用自己的表情圖（emoji/cats.png、emoji/dogs.png） ----------
   * 網站會自動把整張圖切成一個一個表情：先找出一列一列，再找出每一個
   * 想換表情：直接換掉這兩張圖就好（白色或透明背景，表情之間留一點空白）
   */
  const SHEETS = [{ kind: 'c', src: 'emoji/cats.png' }, { kind: 'd', src: 'emoji/dogs.png' }];
  const sheetItems = { c: [], d: [] };
  const isInk = (d, i) => d[i + 3] > 40 && !(d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236);
  function slice(img) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H).data;
    const rowInk = new Uint32Array(H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isInk(d, (y * W + x) * 4)) rowInk[y]++;
    // 一段一段找出有內容的範圍，太小的段落併到旁邊
    const bands = (arr, len, minGap) => {
      const out = []; let start = -1, gap = 0;
      for (let i = 0; i < len; i++) {
        if (arr[i] > 1) { if (start < 0) start = i; gap = 0; }
        else if (start >= 0 && ++gap >= minGap) { out.push([start, i - gap]); start = -1; gap = 0; }
      }
      if (start >= 0) out.push([start, len - 1]);
      return out;
    };
    const mergeSmall = list => {
      if (list.length < 2) return list;
      const sizes = list.map(([a, b]) => b - a).sort((p, q) => p - q), med = sizes[Math.floor(sizes.length / 2)];
      const out = [];
      list.forEach(seg => {
        if (seg[1] - seg[0] < med * 0.35 && out.length) { const prev = out[out.length - 1]; prev[1] = seg[1]; }
        else out.push([...seg]);
      });
      // 開頭的小段併到後面
      if (out.length > 1 && out[0][1] - out[0][0] < med * 0.35) { out[1][0] = out[0][0]; out.shift(); }
      return out;
    };
    const rows = mergeSmall(bands(rowInk, H, Math.max(4, H * 0.008)));
    const items = [];
    rows.forEach(([y0, y1]) => {
      const colInk = new Uint32Array(W);
      for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) if (isInk(d, (y * W + x) * 4)) colInk[x]++;
      mergeSmall(bands(colInk, W, Math.max(3, W * 0.004))).forEach(([x0, x1]) => {
        let t = y1, b = y0;                       // 這一格實際的上下界
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x += 2) if (isInk(d, (y * W + x) * 4)) { if (y < t) t = y; if (y > b) b = y; }
        const w = x1 - x0 + 1, hh = b - t + 1, size = Math.max(w, hh) + 4, out = document.createElement('canvas');
        out.width = out.height = 72;
        const o = out.getContext('2d');
        o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
        const k = 72 / size;
        o.drawImage(cv, x0, t, w, hh, (72 - w * k) / 2, (72 - hh * k) / 2, w * k, hh * k);
        // 把白底變透明
        const id = o.getImageData(0, 0, 72, 72), p = id.data;
        for (let i = 0; i < p.length; i += 4) if (p[i] > 240 && p[i + 1] > 240 && p[i + 2] > 240) p[i + 3] = 0;
        o.putImageData(id, 0, 0);
        items.push(out.toDataURL());
      });
    });
    return items;
  }
  const ready = Promise.all(SHEETS.map(sh => new Promise(res => {
    const img = new Image();
    img.onload = () => { try { sheetItems[sh.kind] = slice(img); } catch (e) { console.warn('[Emoji]', e); } res(); };
    img.onerror = () => res();                    // 沒有圖就用內建的像素表情
    img.src = sh.src;
  })));
  const codesOf = k => (sheetItems[k].length ? sheetItems[k].map((_, i) => `${k}${i + 1}`) : LIST.filter(e => e.kind === k).map(e => e.code));

  const urls = {};
  function url(code) {
    const k = code[0], n = +code.slice(1);
    if (sheetItems[k] && sheetItems[k].length) return sheetItems[k][n - 1] || '';
    if (urls[code]) return urls[code];
    const e = LIST.find(x => x.code === code); if (!e) return '';
    const g = e.draw(), sc = 2, cv = document.createElement('canvas');
    cv.width = (S + 2) * sc; cv.height = (S + 2) * sc;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = INK;
    for (let y = -1; y <= S; y++) for (let x = -1; x <= S; x++) {
      if (g.get(x, y)) continue;
      if (g.get(x + 1, y) || g.get(x - 1, y) || g.get(x, y + 1) || g.get(x, y - 1)) ctx.fillRect((x + 1) * sc, (y + 1) * sc, sc, sc);
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const c = g.get(x, y); if (c) { ctx.fillStyle = c; ctx.fillRect((x + 1) * sc, (y + 1) * sc, sc, sc); } }
    return (urls[code] = cv.toDataURL());
  }

  /** 把文字轉成安全的 HTML，並把 :c1: 之類換成像素表情 */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toHTML = text => esc(text).replace(/:([cd][1-9]\d?):/g, (m, code) => { const u = url(code); return u ? `<img class="pxemo" src="${u}" alt="${m}">` : m; });

  /** 表情選單：picker(onPick) → 元素 */
  function picker(onPick) {
    const el = document.createElement('div');
    el.className = 'emo-pick win';
    el.innerHTML = `<div class="emo-tabs"><button data-k="c" class="on">🐱</button><button data-k="d">🐶</button></div><div class="emo-grid"></div>`;
    const gridEl = el.querySelector('.emo-grid');
    const show = k => {
      el.querySelectorAll('.emo-tabs button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      gridEl.innerHTML = codesOf(k).map(c => `<button data-code="${c}" aria-label=":${c}:"><img class="pxemo" src="${url(c)}" alt=""></button>`).join('');
    };
    el.addEventListener('click', ev => {
      const tab = ev.target.closest('[data-k]'); if (tab) { SFX.play('select'); return show(tab.dataset.k); }
      const b = ev.target.closest('[data-code]'); if (b) { SFX.play('blip'); onPick(`:${b.dataset.code}:`); }
    });
    show('c');
    return el;
  }

  return { LIST, url, toHTML, picker, ready };
})();
