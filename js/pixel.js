/* =========================================================
 * 像素繪圖：把國家輪廓轉成像素島嶼、角色 sprite、像素 icon
 * ========================================================= */
window.PX = (() => {
  const C = {
    ink: '#3b2b2b',
    grass: '#8fd17e', grass2: '#7cc06c', grassHi: '#b4e59a',
    sand: '#f6dfae', sand2: '#ecc98a',
    cliff: ['#e0a86a', '#c98a52', '#a86d3e', '#86532f'],
    flower: ['#f07ca3', '#fbe9d0', '#eac45a'],
    tree: '#5a9e5a', treeHi: '#79c071',
    foam: 'rgba(255,255,255,.85)', shadow: 'rgba(59,43,43,.16)'
  };

  // 簡單的可重現亂數（同一座島每次畫出來長一樣）
  const hash = (x, y, s = 0) => {
    let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };

  const cache = new Map();

  /**
   * 把多邊形（已投影到平面座標）轉成格子：用 canvas 填色再讀回來，速度很快
   * polys: [[[x,y],...],...]   cell: 每格代表多少單位
   */
  function rasterizeXY(polys, cell, pad = 4) {
    const all = polys.flat();
    const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = Math.max(1, Math.ceil((maxX - minX) / cell)) + pad * 2;
    const h = Math.max(1, Math.ceil((maxY - minY) / cell)) + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.setTransform(1 / cell, 0, 0, 1 / cell, pad - minX / cell, pad - minY / cell);
    g.beginPath();
    polys.forEach(poly => { poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); });
    g.fillStyle = '#000';
    g.fill('evenodd');
    const data = g.getImageData(0, 0, w, h).data;
    const cells = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) cells[i] = data[i * 4 + 3] > 110 ? 1 : 0;
    // 太小的島至少保留一格
    polys.forEach(poly => {
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      const gx = Math.floor((cx - minX) / cell) + pad, gy = Math.floor((cy - minY) / cell) + pad;
      if (gx >= 0 && gy >= 0 && gx < w && gy < h) cells[gy * w + gx] = 1;
    });
    const toCell = (x, y) => [(x - minX) / cell + pad, (y - minY) / cell + pad];
    return { w, h, cells, toCell, pad, minX, minY, cell };
  }

  /** 國家放大地圖用：經緯度 → 平面（依緯度修正寬度）。res 不給就自動讓長邊約 target 格 */
  function rasterize(country, res, target = 110) {
    const all = country.polys.flat();
    const ys = all.map(p => p[1]);
    const lat0 = (Math.min(...ys) + Math.max(...ys)) / 2;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const proj = (lon, lat) => [lon * k, -lat];
    const P = country.polys.map(poly => poly.map(([lo, la]) => proj(lo, la)));
    if (!res) {
      const xs = P.flat().map(p => p[0]), yy = P.flat().map(p => p[1]);
      res = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...yy) - Math.min(...yy)) / target;
    }
    const key = country.code + '@' + res;
    if (cache.has(key)) return cache.get(key);
    const grid = rasterizeXY(P, res);
    const t = grid.toCell;
    const out = { ...grid, toCell: (lon, lat) => t(...proj(lon, lat)) };
    cache.set(key, out);
    return out;
  }

  /**
   * 畫出立體島嶼（草地＋沙灘＋懸崖＋描邊）
   * 回傳 { island: canvas, base: canvas(倒影/浪花), w, h }
   */
  function drawIsland(grid, cell, opt = {}) {
    const depth = opt.depth ?? 3;
    const seed = opt.seed ?? 1;
    const { w, h, cells } = grid;
    const H = h + depth;
    const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? cells[y * w + x] : 0);
    const sil = (x, y) => { for (let d = 0; d <= depth; d++) if (at(x, y - d)) return 1; return 0; };

    const cv = document.createElement('canvas');
    cv.width = w * cell; cv.height = H * cell;
    const g = cv.getContext('2d');
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x * cell, y * cell, cell, cell); };

    // 描邊
    for (let y = -1; y <= H; y++) for (let x = -1; x <= w; x++) {
      if (sil(x, y)) continue;
      if (sil(x + 1, y) || sil(x - 1, y) || sil(x, y + 1) || sil(x, y - 1)) px(x, y, C.ink);
    }
    // 懸崖（由下往上疊）
    for (let d = depth; d >= 1; d--) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!at(x, y)) continue;
        const col = C.cliff[Math.min(d - 1, C.cliff.length - 1)];
        px(x, y + d, hash(x, y + d, seed) < 0.08 ? C.cliff[3] : col);
      }
    }
    // 地表
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const edge = !at(x + 1, y) || !at(x - 1, y) || !at(x, y + 1) || !at(x, y - 1);
      const edge2 = !at(x + 2, y) || !at(x - 2, y) || !at(x, y + 2) || !at(x, y - 2);
      const r = hash(x, y, seed);
      let c;
      if (edge) c = r < 0.3 ? C.sand2 : C.sand;
      else if (edge2) c = C.grassHi;
      else if (r < 0.025) c = C.flower[Math.floor(r * 1000) % 3];
      else if (r < 0.09) c = C.tree;
      else if (r < 0.22) c = C.grass2;
      else c = C.grass;
      px(x, y, c);
      if (c === C.tree && at(x, y - 1)) px(x, y - 1, C.treeHi);
    }

    // 底座：影子＋浪花
    const pad = 3;
    const base = document.createElement('canvas');
    base.width = (w + pad * 2) * cell; base.height = (H + pad * 2 + 3) * cell;
    const b = base.getContext('2d');
    const bp = (x, y, c) => { b.fillStyle = c; b.fillRect((x + pad) * cell, (y + pad) * cell, cell, cell); };
    for (let y = -pad; y < H + pad + 3; y++) for (let x = -pad; x < w + pad; x++) {
      if (sil(x, y - 3)) { bp(x, y, C.shadow); continue; }
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (sil(x + dx, y + dy)) { near = true; break; }
      if (near && hash(x, y, seed + 7) < 0.5) bp(x, y, C.foam);
    }
    return { island: cv, base, w: cv.width, h: cv.height, pad: pad * cell };
  }

  /* ---------- 角色 sprite：街舞小人 ---------- */
  const SPRITE_PAL = { c: '#e35d5d', s: '#f6c9a0', k: '#3b2b2b', w: '#fbe9d0', b: '#7895df', y: '#eac45a', p: '#f07ca3', t: '#5bb5a6' };
  const DANCER = [
    [ '....cccc....', '...cccccc...', '...ccccccc..', '....ssss....', '....sksk....', '....ssss....',
      '...tttttt...', '..sttttttts.', '..s.tttt.s..', '....tttt....', '....bbbb....', '...bb..bb...',
      '...bb..bb...', '...bb..bb...', '..yyy..yyy..', '............' ],
    [ '....cccc....', '...cccccc...', '...ccccccc..', '....ssss....', '....sksk....', '.s..ssss..s.',
      '..stttttts..', '...tttttt...', '....tttt....', '....tttt....', '....bbbb....', '...bb..bb...',
      '..bb....bb..', '.bb......bb.', 'yyy......yyy', '............' ],
    [ '............', '....cccc....', '...cccccc...', '...ccccccc..', '....ssss....', '....sksk....',
      'ss..ssss....', '.sstttttt...', '....tttttss.', '....tttt..s.', '....bbbb....', '..bbb.bbb...',
      '.bb.....bb..', '.bb......bb.', 'yy........yy', '............' ],
    [ '....cccc....', '...cccccc...', '...ccccccc..', '....ssss....', '....sksk....', '....ssss..s.',
      '...ttttttss.', '..sttttttt..', '..s.tttt....', '....tttt....', '....bbbb....', '....bb.bb...',
      '...bb...bb..', '...b.....bb.', '..yy.....yy.', '............' ]
  ];

  function drawSprite(frame, scale = 4, pal = SPRITE_PAL) {
    const rows = frame, h = rows.length, w = rows[0].length;
    const cv = document.createElement('canvas');
    cv.width = (w + 2) * scale; cv.height = (h + 2) * scale;
    const g = cv.getContext('2d');
    const on = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
    g.fillStyle = SPRITE_PAL.k;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (on(x, y)) continue;
      if (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1)) g.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x]; if (ch === '.') continue;
      g.fillStyle = pal[ch] || '#000';
      g.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
    }
    return cv;
  }

  /** 建立會跳舞的角色 <canvas>，回傳 { el, setFrame, beat } */
  function dancer(scale = 4, pal) {
    const frames = DANCER.map(f => drawSprite(f, scale, pal));
    const el = document.createElement('canvas');
    el.width = frames[0].width; el.height = frames[0].height;
    el.className = 'sprite';
    const g = el.getContext('2d');
    let i = 0;
    const setFrame = n => { i = n % frames.length; g.clearRect(0, 0, el.width, el.height); g.drawImage(frames[i], 0, 0); };
    setFrame(0);
    return { el, setFrame, beat: () => setFrame(i + 1) };
  }

  /* ---------- 像素 icon（SVG） ---------- */
  const icon = (rows, color = 'currentColor') => {
    const h = rows.length, w = rows[0].length;
    let d = '';
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') d += `M${x} ${y}h1v1h-1z`; }));
    return `<svg class="pxi" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true"><path fill="${color}" d="${d}"/></svg>`;
  };
  const ICONS = {
    pin:   icon(['..####..', '.##..##.', '##....##', '##....##', '.##..##.', '..####..', '...##...', '...##...']),
    link:  icon(['....###.', '...#...#', '....#..#', '..#..##.', '.##..#..', '#..#....', '#...#...', '.###....']),
    edit:  icon(['......##', '.....###', '....###.', '...###..', '..###...', '.###....', '##......', '###.....']),
    trash: icon(['..####..', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.#.##.#.', '.#....#.', '..####..']),
    image: icon(['########', '#......#', '#.##...#', '#.##...#', '#....#.#', '#...####', '#.######', '########']),
    clock: icon(['..####..', '.#....#.', '#..#...#', '#..#...#', '#..###.#', '#......#', '.#....#.', '..####..']),
    coin:  icon(['..####..', '.#....#.', '#..##..#', '#.#....#', '#.#....#', '#..##..#', '.#....#.', '..####..']),
    pen:   icon(['########', '#......#', '#.####.#', '#......#', '#.###..#', '#......#', '#.##...#', '########']),
    star:  icon(['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '##....##', '........']),
    heart: icon(['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........']),
    back:  icon(['...#....', '..##....', '.#######', '########', '.#######', '..##....', '...#....', '........']),
    plus:  icon(['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...']),
    game:  icon(['........', '.######.', '#......#', '#.#..#.#', '###.##.#', '#.#....#', '.######.', '........']),
    disk:  icon(['#######.', '#.#..#.#', '#.####.#', '#......#', '#.####.#', '#.#..#.#', '#.####.#', '########']),
    sound: icon(['...#....', '..##..#.', '####...#', '####.#.#', '####.#.#', '####...#', '..##..#.', '...#....']),
    mute:  icon(['...#....', '..##....', '####.#.#', '####..#.', '####..#.', '####.#.#', '..##....', '...#....']),
    user:  icon(['..####..', '..####..', '..####..', '...##...', '.######.', '########', '########', '########']),
    flag:  icon(['#.......', '######..', '#######.', '######..', '#.......', '#.......', '#.......', '#.......'])
  };

  return { C, rasterize, rasterizeXY, drawIsland, dancer, drawSprite, ICONS, hash };
})();
