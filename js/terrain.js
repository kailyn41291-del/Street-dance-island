/* =========================================================
 * 世界地圖的島嶼材質（V9 地形）
 * 材質圖的 1 個像素 = 地圖上 1 格（WL.CELL = 5 個螢幕像素）
 * - 地面：grass / grass_alt（每座島挑一種），用世界座標鋪，島跟島之間花紋接得起來
 * - 島的最外圈：沙灘色（每個主題兩種）
 * - 國界：border 小圖案
 * - 懸崖：cliff 由上（接沙灘）往下（接海）取顏色
 * - 小裝飾：大一點的島上隨機放幾個，避開國名和主角
 * 節日期間換成節日主題；材質還沒載入好就先用舊的畫法，載好再換
 * ========================================================= */
window.Terrain = (() => {
  const THEMES = ['default', 'xmas', 'newyear', 'lunar', 'halloween', 'valentine', 'moon', 'hiphop', 'danceday'];
  // 沙灘只有一格寬，直接用兩種顏色（有幾張 sand.png 混了海水或草地，取圖會出錯）
  const SAND = {
    default: ['#fddda2', '#feeac4'], xmas: ['#f7f4ef', '#d2e2f2'], newyear: ['#f8d192', '#fbe1b0'],
    lunar: ['#ecc88f', '#f1daae'], halloween: ['#c28c47', '#a77a45'], valentine: ['#f0e5c9', '#dad4b5'],
    moon: ['#b9c9c5', '#a3b8b4'], hiphop: ['#a9aab0', '#c2c3c8'], danceday: ['#e29f67', '#c9845a']
  };
  const V = 1;
  const store = {};

  const theme = () => {
    let f = null;
    try { f = window.Festivals && Festivals.look ? Festivals.look() : null; } catch (e) {}
    if (f && THEMES.includes(f)) return f;
    try { if (window.App && App.todayStr && App.todayStr().slice(5, 7) === '12') return 'xmas'; } catch (e) {}
    return 'default';
  };

  const img = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const pixels = im => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data, w = im.width, h = im.height;
    const css = new Array(w * h);
    for (let i = 0; i < w * h; i++) css[i] = d[i * 4 + 3] < 128 ? null : `rgb(${d[i * 4]},${d[i * 4 + 1]},${d[i * 4 + 2]})`;
    return { w, h, at: (x, y) => css[(((y % h) + h) % h) * w + (((x % w) + w) % w)] };
  };

  /** 載入某個主題的材質（只載一次） */
  function load(t = theme(), retry = 2) {
    if (store[t]) return store[t].ready;
    const s = store[t] = { data: null };
    const base = `assets/terrain/${t}/`;
    s.ready = Promise.all(['grass', 'grass_alt', 'sand', 'cliff', 'border', 'deco_1', 'deco_2', 'deco_3', 'deco_4', 'deco_5', 'deco_6']
      .map(n => img(`${base}${n}.png?v=${V}`)))
      .then(([grass, alt, , cliff, border, ...decos]) => {
        s.data = { t, grass: pixels(grass), alt: pixels(alt), cliff: pixels(cliff), border: pixels(border), decos, sand: SAND[t] || SAND.default };
        return s.data;
      })
      .catch(e => {
        // 網路不穩：等一下再試（最多再試 2 次），還是不行就繼續用舊的畫法
        console.warn('[Terrain]', t, e && e.target ? e.target.src : e);
        delete store[t];
        return retry > 0 ? new Promise(r => setTimeout(r, 1500)).then(() => load(t, retry - 1)) : null;
      });
    return s.ready;
  }
  /** 已經載好就回傳材質，沒有就回傳 null（並開始載） */
  const get = (t = theme()) => { load(t); return store[t] && store[t].data; };

  const hash = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

  /**
   * 畫一座島。grid 跟 PX.drawIsland 一樣；opt：
   *   ox, oy  這座島左上角在整張世界地圖上的格子座標（材質才接得起來）
   *   depth   懸崖有幾格高；seed 亂數種子
   *   avoid   [[x, y], ...]（島內格子座標）不要放裝飾的地方，例如國名、主角
   */
  function drawIsland(grid, cell, opt = {}) {
    const T = opt.data || get();
    const CC = (window.PX && PX.C) || {};
    const ink = CC.ink || '#3b2b2b', shadow = CC.shadow || 'rgba(30,60,90,.25)', foam = CC.foam || '#ffffff';
    const depth = opt.depth ?? 3, seed = opt.seed ?? 1, ox = opt.ox || 0, oy = opt.oy || 0;
    const { w, h, cells, ids } = grid;
    const H = h + depth;
    const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? cells[y * w + x] : 0);
    const idAt = (x, y) => (ids ? ids[y * w + x] : 1);
    const sil = (x, y) => { for (let d = 0; d <= depth; d++) if (at(x, y - d)) return 1; return 0; };
    const ground = hash(seed, 3, 11) < 0.3 ? T.alt : T.grass;

    const cv = document.createElement('canvas');
    cv.width = w * cell; cv.height = H * cell;
    const g = cv.getContext('2d');
    const px = (x, y, c) => { if (!c) return; g.fillStyle = c; g.fillRect(x * cell, y * cell, cell, cell); };

    // 描邊
    for (let y = -1; y <= H; y++) for (let x = -1; x <= w; x++) {
      if (sil(x, y)) continue;
      if (sil(x + 1, y) || sil(x - 1, y) || sil(x, y + 1) || sil(x, y - 1)) px(x, y, ink);
    }
    // 懸崖：第 1 格（最上面）取 cliff.png 的上半，越往下取越下面
    const ch = T.cliff.h;
    for (let d = depth; d >= 1; d--) {
      const row = Math.min(ch - 1, Math.floor(((d - 0.5) / depth) * ch));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!at(x, y) || at(x, y + d) ) continue;
        px(x, y + d, T.cliff.at(ox + x, row) || T.cliff.at(ox + x, Math.max(0, row - 1)));
      }
      // 島的下緣才看得到懸崖；被上面的地面蓋住的部分不用畫
    }
    // 地表
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const edge = !at(x + 1, y) || !at(x - 1, y) || !at(x, y + 1) || !at(x, y - 1);
      const me = idAt(x, y);
      const border = ids && ((at(x + 1, y) && idAt(x + 1, y) !== me) || (at(x, y + 1) && idAt(x, y + 1) !== me));
      const X = ox + x, Y = oy + y;
      let c;
      if (edge) c = T.sand[hash(X, Y, 5) < 0.3 ? 1 : 0];
      else if (border) c = T.border.at(X, Y);
      else c = ground.at(X, Y);
      px(x, y, c);
    }

    // 小裝飾：大一點的島才放，每 900 格放 1 個，最多 6 個
    const land = cells.reduce((n, v) => n + v, 0);
    const want = Math.min(6, Math.floor(land / 900));
    if (want && T.decos.length) {
      const avoid = opt.avoid || [], placed = [];
      const ok = (x0, y0, dw, dh) => {
        for (let y = y0 - 1; y <= y0 + dh; y++) for (let x = x0 - 1; x <= x0 + dw; x++) {
          if (!at(x, y)) return false;
          if (ids && (idAt(x, y) !== idAt(x0, y0))) return false;          // 不要壓在國界上
        }
        const cx = x0 + dw / 2, cy = y0 + dh / 2;
        if (avoid.some(([ax, ay]) => Math.abs(ax - cx) < dw / 2 + 9 && Math.abs(ay - cy) < dh / 2 + 5)) return false;
        if (placed.some(([px0, py0]) => Math.abs(px0 - cx) < 26 && Math.abs(py0 - cy) < 22)) return false;
        return true;
      };
      g.imageSmoothingEnabled = false;
      for (let tries = 0; tries < 400 && placed.length < want; tries++) {
        const im = T.decos[Math.floor(hash(tries, seed, 41) * T.decos.length)];
        const dw = im.width, dh = im.height;
        const x0 = Math.floor(hash(tries, seed, 42) * (w - dw)), y0 = Math.floor(hash(tries, seed, 43) * (h - dh));
        if (x0 < 1 || y0 < 1 || !ok(x0, y0, dw, dh)) continue;
        // 腳下一點影子
        g.fillStyle = 'rgba(40, 30, 30, .22)';
        g.beginPath(); g.ellipse((x0 + dw / 2) * cell, (y0 + dh - 0.6) * cell, dw * cell * 0.38, cell * 1.4, 0, 0, Math.PI * 2); g.fill();
        g.drawImage(im, x0 * cell, y0 * cell, dw * cell, dh * cell);
        placed.push([x0 + dw / 2, y0 + dh / 2]);
      }
    }

    // 底座：影子＋浪花（跟原本一樣）
    const pad = 3;
    const base = document.createElement('canvas');
    base.width = (w + pad * 2) * cell; base.height = (H + pad * 2 + 3) * cell;
    const b = base.getContext('2d');
    const bp = (x, y, c) => { b.fillStyle = c; b.fillRect((x + pad) * cell, (y + pad) * cell, cell, cell); };
    for (let y = -pad; y < H + pad + 3; y++) for (let x = -pad; x < w + pad; x++) {
      if (sil(x, y - 3)) { bp(x, y, shadow); continue; }
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (sil(x + dx, y + dy)) { near = true; break; }
      if (near && hash(x, y, seed + 7) < 0.5) bp(x, y, foam);
    }
    return { island: cv, base, w: cv.width, h: cv.height, pad: pad * cell };
  }

  return { THEMES, theme, load, get, drawIsland };
})();
