/* =========================================================
 * 舞島 DANCE ISLAND — 主程式
 * 路由：#/            世界地圖
 *       #/c/TW        國家（島嶼）→ 城市按鈕
 *       #/c/TW/taipei 城市活動行事曆
 * ========================================================= */
(() => {
  const { h, esc, I, winHTML, modal, npc, toast, sparkle, wipe, download } = UI;
  const G = window.GEO;
  const byCode = Object.fromEntries(G.countries.map(c => [c.code, c]));
  const stage = document.getElementById('stage');
  const pad2 = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayStr = () => ymd(new Date());
  const parseDate = s => { const [y, m, d] = (s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
  const cityOf = (cc, id) => (byCode[cc]?.cities || []).find(c => c.id === id);
  const seen = key => { try { if (localStorage.getItem('danceIsland.seen.' + key)) return true; localStorage.setItem('danceIsland.seen.' + key, 1); } catch (e) {} return false; };
  const CONTS = Object.keys(I18N.CONT_KEY);
  const contName = k => t(I18N.CONT_KEY[k]);
  const beatLoop = (d, ms) => { const tm = setInterval(() => { if (!d.el.isConnected) clearInterval(tm); else d.beat(); }, ms); };
  const myLook = () => (Player.me ? Player.me.look : null);

  /* ---------------- 路由 ---------------- */
  const parseRoute = () => {
    const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (p[0] === 'c' && byCode[p[1]]) return { view: p[2] && cityOf(p[1], p[2]) ? 'city' : 'country', cc: p[1], city: p[2] };
    if (App.views[p[0]]) return { view: p[0], arg: p.slice(1).map(decodeURIComponent) };   // 其他頁面（活動總覽、我的、主辦方…）
    return { view: 'world' };
  };
  let current = null, started = false;
  const draw = r => {
    stage.innerHTML = '';
    current = r;
    Themes.apply(r.view === 'world' ? null : byCode[r.cc]);
    if (r.view === 'world') WorldView();
    else if (r.view === 'country') CountryView(byCode[r.cc]);
    else if (r.view === 'city') CityView(byCode[r.cc], cityOf(r.cc, r.city));
    else App.views[r.view](r, stage);
    updateHUD();
  };
  const render = (instant) => {
    if (!started) return;
    let r = parseRoute();
    // 活動連結 #/e/<id>：直接換成那個活動的城市頁，不要播兩次轉場
    if (r.view === 'e') { const ev = Store.get(r.arg[0]); if (ev) { CityView.flash = ev.id; history.replaceState(null, '', `#/c/${ev.country}/${ev.city}`); r = parseRoute(); } }
    try { const pf = App.prefetch && App.prefetch[r.view]; if (pf) pf(r); } catch (e) {}
    if (instant || !current) draw(r); else { npc.hide(); wipe(() => draw(r)); }
  };
  const nav = hash => { if (location.hash === hash) render(); else location.hash = hash; };
  window.addEventListener('hashchange', () => render());

  /* ---------------- HUD ---------------- */
  const hud = document.getElementById('hud');
  function updateHUD() {
    const r = current || { view: 'world' };
    let html = `<a href="#/">${PXI.img('menu/world', '🌏')} ${t('world')}</a>`;
    if (r.cc) html += `<span class="sep">›</span><a href="#/c/${r.cc}">${esc(nm(byCode[r.cc]))}</a>`;
    if (r.view === 'city') html += `<span class="sep">›</span><span>${esc(nm(cityOf(r.cc, r.city)))}</span>`;
    if (App.crumbs[r.view]) html += `<span class="sep">›</span><span>${App.crumbs[r.view](r)}</span>`;
    hud.querySelector('.crumbs').innerHTML = html;
    hud.querySelector('.hud-add').classList.toggle('hidden', !Store.canEdit() && !Store.cloud);
    hud.querySelector('.hud-save').classList.toggle('hidden', Store.cloud);
    hud.querySelector('.hud-add .label').textContent = Store.canEdit() ? t('add') : t('sub_btn');
    hud.querySelector('.hud-game .label').textContent = t('games');
    hud.querySelector('.hud-events .label').textContent = t('ev_all');
    hud.querySelector('.hud-save .label').textContent = t('save');
    hud.querySelector('.hud-help').setAttribute('aria-label', t('help'));
    hud.querySelector('.hud-lang .label').textContent = I18N.LANGS.find(l => l[0] === I18N.lang)[1];
    const adm = hud.querySelector('.hud-admin');
    const isAdm = Store.cloud ? Backend.isAdmin : true;
    adm.classList.toggle('hidden', !isAdm);
    adm.classList.toggle('pink', Store.cloud && Backend.isAdmin);
    adm.innerHTML = Store.cloud ? PXI.img('menu/admin', '🔑') + ' ADMIN' : PXI.img('menu/admin', '🔑');
    adm.setAttribute('aria-label', t('admin_btn'));
    const pl = hud.querySelector('.hud-player');
    pl.innerHTML = '';
    const d = PX.dancer(2, myLook());
    pl.appendChild(d.el);
    pl.insertAdjacentHTML('beforeend', `<span class="label">${Player.me ? Player.nameHTML(Player.me) : t('login')}</span>${Player.me && Player.me.level ? `<span class="lv-chip">Lv.${Player.me.level}</span>` : ''}`);
    beatLoop(d, 400);
    const snd = hud.querySelector('.hud-sound');
    snd.innerHTML = SFX.on ? PXI.img('menu/sound_on', I.sound) : PXI.img('menu/sound_off', I.mute);
    snd.setAttribute('aria-label', SFX.on ? t('sound_on') : t('sound_off'));
  }

  /* ================= 世界地圖 ================= */
  /*
   * 所有國家依真實經緯度拼在一起（以東經 150° 為中心：歐非在左、美洲在右）。
   * 以台灣為圓心做「平滑往外推」，讓放大的台灣不會壓到鄰國，
   * 推的時候國界仍然貼合。相連的陸地（例如歐亞非）是同一塊漂浮大陸，國界用細線分開。
   */
  const WL = { S: 10, Y: 1.15, PUSH: 300, DECAY: 900, TW_ZOOM: 9, CELL: 5, PADC: 50, MIN: 3 };
  let layout = null;
  function buildLayout() {
    if (layout) return layout;
    const { S, Y, CELL } = WL;
    const raw = (lon, lat) => [(lon - G.center) * S, -lat * S * Y];
    const tw = byCode.TW;
    const twPts = tw.polys[0].map(([lo, la]) => raw(lo, la));
    const T = [twPts.reduce((s, p) => s + p[0], 0) / twPts.length, twPts.reduce((s, p) => s + p[1], 0) / twPts.length];
    const warp = ([x, y]) => {
      const dx = x - T[0], dy = y - T[1], r = Math.hypot(dx, dy);
      if (r < 1e-6) return [x, y];
      const r2 = r + WL.PUSH * Math.exp(-r / WL.DECAY);
      return [T[0] + (dx / r) * r2, T[1] + (dy / r) * r2];
    };
    // 1) 每個國家投影成世界座標
    const shapes = G.countries.map((c, idx) => {
      let polys = c.polys.map(poly => poly.map(([lo, la]) => raw(lo, la)));
      polys = c.home ? polys.map(poly => poly.map(([x, y]) => [T[0] + (x - T[0]) * WL.TW_ZOOM, T[1] + (y - T[1]) * WL.TW_ZOOM]))
        : polys.map(poly => poly.map(warp));
      const xs = polys.flat().map(p => p[0]), ys = polys.flat().map(p => p[1]);
      const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
      const size = Math.max(bw, bh);
      if (!c.home && size < CELL * WL.MIN) {   // 太小的國家放大到看得到
        const k = (CELL * WL.MIN) / Math.max(size, 0.01), cx = bx + bw / 2, cy = by + bh / 2;
        polys = polys.map(poly => poly.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]));
      }
      return { c, idx, polys, area: bw * bh, bx, by, bw, bh };
    });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(s => { minX = Math.min(minX, s.bx); minY = Math.min(minY, s.by); maxX = Math.max(maxX, s.bx + s.bw); maxY = Math.max(maxY, s.by + s.bh); });
    const ox = minX - WL.PADC * CELL, oy = minY - WL.PADC * CELL;
    const GW = Math.ceil((maxX - ox) / CELL) + WL.PADC, GH = Math.ceil((maxY - oy) / CELL) + WL.PADC;
    // 2) 蓋到同一張格子上（大國先、小國後，小國才不會被蓋掉）
    const ids = new Uint16Array(GW * GH);
    [...shapes].sort((a, b) => b.area - a.area).forEach(s => {
      const g = PX.rasterizeXY(s.polys, CELL, 0, [ox, oy]);
      const offx = Math.round((g.minX - ox) / CELL), offy = Math.round((g.minY - oy) / CELL);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (!g.cells[y * g.w + x]) continue;
        const X = offx + x, Yy = offy + y;
        if (X >= 0 && Yy >= 0 && X < GW && Yy < GH) ids[Yy * GW + X] = s.idx + 1;
      }
    });
    // 3) 找出相連的陸塊（每塊各自漂浮）
    const comp = new Int32Array(GW * GH).fill(-1);
    const comps = [];
    const stack = [];
    for (let i = 0; i < GW * GH; i++) {
      if (!ids[i] || comp[i] >= 0) continue;
      const k = comps.length;
      let x0 = GW, y0 = GH, x1 = 0, y1 = 0, n = 0;
      comp[i] = k; stack.push(i);
      while (stack.length) {
        const j = stack.pop(), x = j % GW, y = (j - x) / GW;
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const nb = [x > 0 ? j - 1 : -1, x < GW - 1 ? j + 1 : -1, y > 0 ? j - GW : -1, y < GH - 1 ? j + GW : -1];
        for (const q of nb) if (q >= 0 && ids[q] && comp[q] < 0) { comp[q] = k; stack.push(q); }
      }
      comps.push({ k, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
    }
    comps.forEach(cp => {
      const cells = new Uint8Array(cp.w * cp.h), sub = new Uint16Array(cp.w * cp.h);
      for (let y = 0; y < cp.h; y++) for (let x = 0; x < cp.w; x++) {
        const j = (cp.y0 + y) * GW + cp.x0 + x;
        if (comp[j] === cp.k) { cells[y * cp.w + x] = 1; sub[y * cp.w + x] = ids[j]; }
      }
      cp.grid = { w: cp.w, h: cp.h, cells, ids: sub };
    });
    // 4) 每個國家的標籤位置與所屬陸塊
    const info = G.countries.map(() => ({ n: 0, sx: 0, sy: 0, x0: GW, y0: GH, x1: 0, y1: 0, comps: {} }));
    for (let i = 0; i < GW * GH; i++) {
      if (!ids[i]) continue;
      const f = info[ids[i] - 1], x = i % GW, y = (i - x) / GW;
      f.n++; f.sx += x; f.sy += y;
      if (x < f.x0) f.x0 = x; if (x > f.x1) f.x1 = x; if (y < f.y0) f.y0 = y; if (y > f.y1) f.y1 = y;
      f.comps[comp[i]] = (f.comps[comp[i]] || 0) + 1;
    }
    info.forEach(f => {
      if (!f.n) return;
      f.cx = f.sx / f.n; f.cy = f.sy / f.n; f.best = Infinity;
    });
    // 標籤放在「離中心最近、且屬於這個國家」的格子上（越南這種 S 形國家，中心點可能落在鄰國）
    for (let i = 0; i < GW * GH; i++) {
      if (!ids[i]) continue;
      const f = info[ids[i] - 1], x = i % GW, y = (i - x) / GW, d = (x - f.cx) ** 2 + (y - f.cy) ** 2;
      if (d < f.best) { f.best = d; f.lx = x; f.ly = y; f.comp = comp[i]; }
    }
    info.forEach(f => { if (f.n) { f.cx = f.lx; f.cy = f.ly; } });
    const toWorld = (lon, lat) => { const [x, y] = warp(raw(lon, lat)); return [x - ox, y - oy]; };
    layout = { GW, GH, ids, comps, info, W: GW * CELL, H: GH * CELL, T: [T[0] - ox, T[1] - oy], toWorld, art: new Map(), hi: new Map() };
    return layout;
  }

  // 滑過國家時的亮框
  function highlightCanvas(L, idx) {
    if (L.hi.has(idx)) return L.hi.get(idx);
    const f = L.info[idx], C = WL.CELL, w = f.x1 - f.x0 + 1, hh = f.y1 - f.y0 + 1;
    const cv = document.createElement('canvas');
    cv.width = w * C; cv.height = hh * C; cv.className = 'hi';
    const g = cv.getContext('2d');
    const me = idx + 1, at = (x, y) => (x >= 0 && y >= 0 && x < L.GW && y < L.GH ? L.ids[y * L.GW + x] : 0);
    for (let y = f.y0; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++) {
      if (at(x, y) !== me) continue;
      const edge = at(x + 1, y) !== me || at(x - 1, y) !== me || at(x, y + 1) !== me || at(x, y - 1) !== me;
      g.fillStyle = edge ? '#3b2b2b' : 'rgba(255, 236, 140, .55)';
      g.fillRect((x - f.x0) * C, (y - f.y0) * C, C, C);
    }
    L.hi.set(idx, cv);
    return cv;
  }

  const OCEANS = [['ocean_pacific', -150, 15], ['ocean_pacific2', 175, -30], ['strait_tw', 119.6, 24.3], ['scs', 113, 13],
    ['ocean_indian', 78, -22], ['ocean_atlantic', -28, 25], ['ocean_atlantic', 328, 5], ['ocean_arctic', 100, 80]];

  const cam = { x: null, y: null, s: 1 };
  function WorldView() {
    const L = buildLayout(), C = WL.CELL;
    const view = h(`<div class="view"><div class="world-vp"><div class="world"></div></div></div>`);
    const vp = view.querySelector('.world-vp'), world = view.querySelector('.world');
    world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
    const counts = {};
    Store.all().forEach(e => (counts[e.country] = (counts[e.country] || 0) + 1));
    const twIdx = G.countries.indexOf(byCode.TW), twInfo = L.info[twIdx];

    // 航線：從台灣到有活動的國家
    const routes = G.countries.map((c, i) => [c, L.info[i]]).filter(([c, f]) => !c.home && counts[c.code] && f.n).map(([c, f]) => {
      const [tx, ty] = [twInfo.cx * C, twInfo.cy * C], x = f.cx * C, y = f.cy * C;
      return `<path d="M${tx} ${ty} Q${(tx + x) / 2} ${(ty + y) / 2 - Math.abs(x - tx) * 0.15} ${x} ${y}"/>`;
    }).join('');
    world.appendChild(h(`<svg class="routes" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}">${routes}</svg>`));

    // 浪花、海洋名稱、雲
    const waves = h('<div class="waves"></div>');
    // 手機 / 平板不畫浪花（太耗效能）
    const lite = matchMedia('(max-width: 1024px), (pointer: coarse)').matches;
    for (let i = 0; i < (lite ? 0 : 280); i++) {
      const w = document.createElement('i'); w.className = 'wave';
      const x = Math.floor(PX.hash(i, 1) * L.GW), y = Math.floor(PX.hash(i, 2) * L.GH);
      if (L.ids[y * L.GW + x]) continue;
      w.style.left = x * C + 'px'; w.style.top = y * C + 'px';
      w.style.animationDelay = (PX.hash(i, 3) * -4).toFixed(2) + 's';
      waves.appendChild(w);
    }
    world.appendChild(waves);
    OCEANS.forEach(([k, lon, lat]) => { const [x, y] = L.toWorld(lon, lat); world.appendChild(h(`<div class="ocean-label" style="left:${x}px;top:${y}px">${esc(t(k))}</div>`)); });
    for (let i = 0; i < 16; i++) {
      const c = h(`<i class="cloud"></i>`);
      c.style.top = Math.round(PX.hash(i, 9) * L.H) + 'px';
      const dur = 140 + PX.hash(i, 10) * 120;
      c.style.setProperty('--w', L.W + 'px');
      c.style.animationDuration = dur + 's';
      c.style.animationDelay = (-PX.hash(i, 11) * dur).toFixed(1) + 's';
      world.appendChild(c);
    }

    // 陸塊
    const compEls = [];
    L.comps.forEach(cp => {
      let art = L.art.get(cp.k);
      if (!art) { art = PX.drawIsland(cp.grid, C, { depth: cp.n > 40 ? 4 : 3, seed: cp.k + 1 }); L.art.set(cp.k, art); }
      const el = h(`<div class="isle" style="left:${cp.x0 * C}px;top:${cp.y0 * C}px;width:${art.w}px;height:${art.h}px">
        <div class="float" style="--d:${(-(cp.k % 9) * 0.37).toFixed(2)}s"></div></div>`);
      art.base.className = 'base'; art.base.style.left = -art.pad + 'px'; art.base.style.top = -art.pad + 'px';
      el.prepend(art.base);
      el.querySelector('.float').prepend(art.island);
      compEls[cp.k] = el;
      world.appendChild(el);
    });
    compEls[twInfo.comp].classList.add('home');

    // 國名標籤
    const tags = [];
    G.countries.forEach((c, i) => {
      const f = L.info[i]; if (!f.n) return;
      const cp = L.comps[f.comp], n = counts[c.code] || 0;
      const lvl = c.home || n ? 0 : f.n > 1500 ? 1 : f.n > 220 ? 2 : 3;
      const tag = h(`<div class="ctag lv${lvl} ${c.home ? 'home' : ''}" data-i="${i}" style="left:${(f.cx - cp.x0 + 0.5) * C}px;top:${(f.cy - cp.y0 + 0.5) * C}px">
        ${n ? '<i class="arrow"></i>' : ''}<span>${esc(nm(c))}</span>${n ? `<span class="badge">${n}</span>` : ''}</div>`);
      compEls[f.comp].querySelector('.float').appendChild(tag);
      tags[i] = tag;
    });
    // 主角站在台灣上
    {
      const cp = L.comps[twInfo.comp];
      const top = (twInfo.y0 - cp.y0) * C + (twInfo.y1 - twInfo.y0) * C * 0.16;
      if (Player.me) {
        const d = PX.dancer(4, myLook());
        d.el.classList.add('hero');
        d.el.style.left = (twInfo.cx - cp.x0) * C - 26 + 'px'; d.el.style.top = top + 'px';
        compEls[twInfo.comp].querySelector('.float').appendChild(d.el);
        beatLoop(d, 300);
      } else {                                                       // 訪客：站一個預設的舞者（不要用網站架設者的造型）
        const d = PX.dancer(4, Avatar.DEFAULT);
        d.el.classList.add('hero', 'guest');
        d.el.style.left = (twInfo.cx - cp.x0) * C - 26 + 'px'; d.el.style.top = top + 'px';
        compEls[twInfo.comp].querySelector('.float').appendChild(d.el);
        beatLoop(d, 300);
      }
    }

    // 平移 / 縮放
    const zoomLevel = s => (s >= 1.1 ? 3 : s >= 0.6 ? 2 : 1);
    const apply = () => {
      world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
      world.style.setProperty('--inv', Math.min(2.6, 1 / cam.s).toFixed(3));
      world.dataset.z = zoomLevel(cam.s);
    };
    const homeScale = () => (innerWidth < 760 ? 0.5 : 0.75);
    const homePt = () => [twInfo.cx * C, twInfo.cy * C];
    const centerOn = ([x, y], s = cam.s) => { cam.s = s; cam.x = innerWidth / 2 - x * s; cam.y = innerHeight / 2 - y * s; apply(); };
    if (cam.x === null) centerOn(homePt(), homeScale()); else apply();

    // 滑過 / 點擊國家
    let hover = -1, hiEl = null;
    const tagAt = e => { const tg = e.target.closest && e.target.closest('.ctag'); return tg ? +tg.dataset.i : -1; };
    // 給散步模式用的地圖介面
    App.worldApi = {
      world, L, cam, C, centerOn, home: homePt(), walking: false, stopWalk: () => {},
      idAtWorld: (wx, wy) => { const gx = Math.floor(wx / C), gy = Math.floor(wy / C); return gx < 0 || gy < 0 || gx >= L.GW || gy >= L.GH ? -1 : L.ids[gy * L.GW + gx] - 1; }
    };
    const idAt = (cx, cy) => {
      const wx = (cx - cam.x) / cam.s, wy = (cy - cam.y) / cam.s + 9;   // +9：補償島嶼浮起的高度
      const gx = Math.floor(wx / C), gy = Math.floor(wy / C);
      if (gx < 0 || gy < 0 || gx >= L.GW || gy >= L.GH) return -1;
      return L.ids[gy * L.GW + gx] - 1;
    };
    const setHover = i => {
      if (i === hover) return;
      if (hover >= 0 && tags[hover]) tags[hover].classList.remove('hov');
      if (hiEl) hiEl.remove(), hiEl = null;
      hover = i;
      vp.classList.toggle('over', i >= 0);
      if (i < 0) return;
      const f = L.info[i], cp = L.comps[f.comp];
      hiEl = highlightCanvas(L, i);
      hiEl.style.left = (f.x0 - cp.x0) * C + 'px'; hiEl.style.top = (f.y0 - cp.y0) * C + 'px';
      compEls[f.comp].querySelector('.float').appendChild(hiEl);
      if (tags[i]) tags[i].classList.add('hov');
      SFX.play('hover');
    };

    const pan = { on: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0, pts: new Map(), dist: 0 };
    vp.addEventListener('pointerdown', e => {
      pan.pts.set(e.pointerId, [e.clientX, e.clientY]);
      pan.on = true; pan.moved = false;
      pan.sx = e.clientX; pan.sy = e.clientY; pan.ox = cam.x; pan.oy = cam.y;
      if (pan.pts.size === 2) { const [a, b] = [...pan.pts.values()]; pan.dist = Math.hypot(a[0] - b[0], a[1] - b[1]); pan.s0 = cam.s; }
    });
    vp.addEventListener('pointermove', e => {
      if (!pan.on) { if (e.pointerType === 'mouse') { const ti = tagAt(e); setHover(ti >= 0 ? ti : idAt(e.clientX, e.clientY)); } return; }
      pan.pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pan.pts.size === 2) {
        const [a, b] = [...pan.pts.values()];
        zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pan.s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pan.dist, true);
        pan.moved = true; return;
      }
      const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (!pan.moved && Math.hypot(dx, dy) > 6) { pan.moved = true; vp.classList.add('dragging'); vp.setPointerCapture(e.pointerId); setHover(-1); }
      if (pan.moved) { cam.x = pan.ox + dx; cam.y = pan.oy + dy; apply(); }
    });
    const end = e => {
      const wasClick = pan.on && !pan.moved && pan.pts.size === 1;
      pan.pts.delete(e.pointerId);
      if (!pan.pts.size) { pan.on = false; vp.classList.remove('dragging'); }
      if (wasClick && e.type === 'pointerup') {
        const ti = tagAt(e), i = ti >= 0 ? ti : idAt(e.clientX, e.clientY);
        if (i >= 0) { SFX.play('select'); sparkle(e.clientX, e.clientY); nav('#/c/' + G.countries[i].code); }
      }
    };
    vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
    vp.addEventListener('pointerleave', () => setHover(-1));
    const zoomAt = (px, py, s, abs) => {
      s = Math.min(2.2, Math.max(0.16, abs ? s : cam.s * s));
      cam.x = px - ((px - cam.x) * s) / cam.s; cam.y = py - ((py - cam.y) * s) / cam.s; cam.s = s; apply();
    };
    vp.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });

    // 控制鈕
    const ctrls = h(`<div class="map-ctrls">
      <button class="btn icon" data-z="in" aria-label="${t('zoom_in')}">${I.plus}</button>
      <button class="btn icon" data-z="out" aria-label="${t('zoom_out')}"><b style="font-size:16px;line-height:1">－</b></button>
      <button class="btn icon yellow" data-z="all" aria-label="${t('see_world')}">${PXI.img('menu/world', '🌏')}</button>
      <button class="btn icon pink" data-z="home" aria-label="${t('go_home')}">⌂</button></div>`);
    ctrls.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; SFX.play('select');
      if (b.dataset.z === 'in') zoomAt(innerWidth / 2, innerHeight / 2, 1.2);
      else if (b.dataset.z === 'out') zoomAt(innerWidth / 2, innerHeight / 2, 0.83);
      else if (b.dataset.z === 'all') centerOn([L.W / 2, L.H / 2], Math.max(0.16, Math.min(innerWidth / L.W, innerHeight / L.H) * 1.05));
      else centerOn(homePt(), homeScale());
    };
    view.appendChild(ctrls);

    // 快速傳送
    const menu = h(`<div class="win world-menu ${matchMedia('(max-width: 1024px), (pointer: coarse) and (max-width: 1400px)').matches ? 'collapsed' : ''}">${winHTML(`🧭 ${t('quick_travel', { n: G.countries.length })}`, 'yellow', false)}
      <div class="win-body"><input class="input sm search" placeholder="${esc(t('search_ph'))}" aria-label="${esc(t('search_ph'))}">
        <div class="cont-tabs"><button data-cont="" class="on">${t('popular')}</button>${CONTS.map(k => `<button data-cont="${k}">${contName(k)}</button>`).join('')}</div>
        <div class="country-grid"></div></div></div>`);
    menu.querySelector('.win-title').insertAdjacentHTML('beforeend', `<button class="btn sm toggle" aria-label="toggle">▾</button>`);
    menu.querySelector('.toggle').onclick = () => { menu.classList.toggle('collapsed'); SFX.play('select'); };
    const gridEl = menu.querySelector('.country-grid'), search = menu.querySelector('.search');
    let cont = '';
    const POPULAR = ['TW', 'JP', 'KR', 'CN', 'HK', 'VN', 'TH', 'PH', 'SG', 'MY', 'ID', 'US', 'FR', 'GB', 'DE', 'AU'];
    const fillMenu = () => {
      const q = search.value.trim().toLowerCase();
      const match = c => [c.name, c.en, ...Object.values(c.n || {})].some(s => String(s).toLowerCase().includes(q));
      const list = q ? G.countries.filter(match)
        : cont ? G.countries.filter(c => c.cont === cont).sort((a, b) => nm(a).localeCompare(nm(b)))
        : [...new Set([...G.countries.filter(c => counts[c.code]).map(c => c.code), ...POPULAR])].map(k => byCode[k]).filter(Boolean);
      gridEl.innerHTML = list.length ? '' : `<p style="grid-column:1/-1;font-size:12px;margin:4px">${t('not_found')}</p>`;
      list.forEach(c => {
        const n = counts[c.code] || 0;
        const b = h(`<button class="btn sm ${c.home ? 'pink' : ''}"><span class="nm">${esc(nm(c))}</span>${n ? `<span class="badge">${n}</span>` : ''}</button>`);
        b.onclick = () => { SFX.play('select'); nav('#/c/' + c.code); };
        gridEl.appendChild(b);
      });
    };
    menu.querySelector('.cont-tabs').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      cont = b.dataset.cont; search.value = '';
      menu.querySelectorAll('.cont-tabs button').forEach(x => x.classList.toggle('on', x === b));
      SFX.play('select'); fillMenu();
    };
    search.oninput = fillMenu;
    search.onkeydown = e => { if (e.key === 'Enter') gridEl.querySelector('button')?.click(); };
    fillMenu();
    view.appendChild(menu);
    if (App.worldExtras) App.worldExtras(view);
    stage.appendChild(view);
  }

  /* ================= 國家 / 島嶼 ================= */
  function CountryView(c) {
    const view = h(`<div class="view country-view"><div class="map-wrap"></div></div>`);
    const grid = PX.rasterize(c, c.detailRes);
    const mobile = innerWidth < 760;
    const depth = 5;
    const availW = mobile ? innerWidth - 40 : innerWidth - 300 - 100;
    const availH = mobile ? innerHeight * 0.62 : innerHeight - 170;
    const cell = Math.max(2, Math.min(12, Math.floor(Math.min(availW / grid.w, availH / (grid.h + depth)))));
    const theme = Themes.of(c);
    const art = PX.drawIsland(grid, cell, { depth, seed: 99, pal: theme && theme.isle });
    const wrap = view.querySelector('.map-wrap');
    const fxl = Themes.fx(c); if (fxl) view.prepend(fxl);
    const big = h(`<div class="big-isle" style="width:${art.w}px;height:${art.h}px"><div class="float"><div class="pins"></div></div></div>`);
    art.base.className = 'base'; art.base.style.left = -art.pad + 'px'; art.base.style.top = -art.pad + 'px';
    big.prepend(art.base);
    big.querySelector('.float').prepend(art.island);
    const pins = big.querySelector('.pins');
    const goCity = (city, e) => { SFX.play('confirm'); if (e) sparkle(e.clientX, e.clientY, 14); nav(`#/c/${c.code}/${city.id}`); };

    // 標籤自動避開：先試指定方向（沒指定就右邊），撞到就換邊
    const placed = [];
    const hit = r => placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    c.cities.forEach(city => {
      let [x, y] = grid.toCell(city.lon, city.lat);
      x = Math.min(grid.w - 1, Math.max(1, x)) * cell; y = Math.min(grid.h - 1, Math.max(1, y)) * cell + cell / 2;
      const n = Store.byCity(c.code, city.id).length, name = nm(city);
      const lw = [...name].reduce((s, ch) => s + (ch.charCodeAt(0) > 255 ? 13 : 8), 0) + 34 + (n ? 22 : 0);
      const rect = side => side === 'l' ? [x - lw, y - 26, x + 9, y] : [x - 9, y - 26, x + lw, y];
      let side = city.label || 'r', nolabel = false;
      if (hit(rect(side))) { side = side === 'l' ? 'r' : 'l'; if (hit(rect(side))) { nolabel = !n; side = city.label || 'r'; } }
      if (nolabel) placed.push([x - 9, y - 26, x + 9, y]); else placed.push(rect(side));
      const pin = h(`<button class="pin ${side} ${n ? 'has' : ''} ${nolabel ? 'nolabel' : ''}" style="left:${x}px;top:${y}px" aria-label="${esc(name)}">
        <i class="gem"></i><span class="name">${esc(name)}${n ? `<span class="cnt">${n}</span>` : ''}</span></button>`);
      pin.style.transform = side === 'l' ? 'translate(calc(-100% + 9px), -100%)' : 'translate(-9px, -100%)';
      pin.addEventListener('mouseenter', () => SFX.play('hover'));
      pin.onclick = e => goCity(city, e);
      pins.appendChild(pin);
    });
    wrap.appendChild(big);

    const total = Store.byCountry(c.code).length;
    const menu = h(`<div class="win city-menu">${winHTML((theme ? theme.icon + ' ' : '') + t('choose_city', { c: esc(nm(c)) }), 'pink', false)}
      <div class="win-body"><div class="country-head">${esc(c.en)} — ${total} EVENTS</div><ul class="city-list"></ul></div></div>`);
    const ul = menu.querySelector('.city-list');
    [...c.cities].sort((a, b) => Store.byCity(c.code, b.id).length - Store.byCity(c.code, a.id).length).forEach(city => {
      const n = Store.byCity(c.code, city.id).length;
      const li = h(`<li><button><span class="grow">${esc(nm(city))}</span>${n ? `<span class="badge">${n}</span>` : '<span style="opacity:.4;font-size:11px">—</span>'}</button></li>`);
      li.querySelector('button').addEventListener('mouseenter', () => SFX.play('hover'));
      li.querySelector('button').onclick = () => goCity(city);
      ul.appendChild(li);
    });
    view.appendChild(menu);
    stage.appendChild(view);

    if (!seen('country.' + c.code)) {
      const lines = c.home ? t('npc_tw') : t('npc_other').map(s => s.replace('{c}', nm(c)));
      setTimeout(() => npc.say(lines, null, { duo: true }), 500);
    }
  }

  /* ================= 城市行事曆 ================= */
  const calState = {};
  function CityView(c, city) {
    const key = c.code + '/' + city.id;
    const now = new Date();
    const st = calState[key] || (calState[key] = { y: now.getFullYear(), m: now.getMonth(), mode: 'upcoming', styles: new Set(), day: null });
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner');
    const fxl = Themes.fx(c); if (fxl) view.prepend(fxl);
    stage.appendChild(view);
    const cN = esc(nm(c)), ciN = esc(nm(city));

    const draw = (flashId) => {
      const all = Store.byCity(c.code, city.id);
      const today = todayStr();
      const filtered = all.filter(e => !st.styles.size || (e.styles || []).some(s => st.styles.has(s)));
      const monthPrefix = `${st.y}-${pad2(st.m + 1)}`;
      const inMonth = e => (e.date || '').startsWith(monthPrefix) || (e.endDate && e.date <= monthPrefix + '-31' && e.endDate >= monthPrefix + '-01');
      let list;
      if (st.mode === 'month') list = filtered.filter(e => st.day ? (e.date === st.day || (e.endDate && e.date <= st.day && e.endDate >= st.day)) : inMonth(e));
      else if (st.mode === 'upcoming') list = filtered.filter(e => (e.endDate || e.date) >= today);
      else list = filtered;
      const canEdit = Store.canEdit();
      const head = st.mode === 'month' ? (st.day ? t('list_day', { d: st.day.replace(/-/g, '/') }) : t('list_month', { y: st.y, m: st.m + 1 }))
        : st.mode === 'upcoming' ? t('list_upcoming') : t('list_all');

      inner.innerHTML = `
        <div class="win">${winHTML(t('calendar', { c: cN, city: ciN }), 'teal', false)}
          <div class="win-body" style="display:grid;gap:14px">
            <div class="cal-head">
              <div class="seg" role="tablist">
                <button data-mode="upcoming" class="${st.mode === 'upcoming' ? 'on' : ''}">${t('upcoming')}</button>
                <button data-mode="month" class="${st.mode === 'month' ? 'on' : ''}">${t('month')}</button>
                <button data-mode="all" class="${st.mode === 'all' ? 'on' : ''}">${t('all')}</button>
              </div>
              <span class="grow"></span>
              <a class="btn sm" href="#/c/${c.code}">${I.back} ${t('back_to', { c: cN })}</a>
              ${canEdit ? `<button class="btn pink sm add-here">${I.plus} ${t('add_here', { city: ciN })}</button>` : ''}
            </div>
            <div class="chips">
              <button class="chip ${st.styles.size ? '' : 'on'}" data-style="" style="--c:var(--yellow)">${t('all_styles')}</button>
              ${Store.STYLES.map(s => `<button class="chip ${st.styles.has(s) ? 'on' : ''}" data-style="${esc(s)}" style="--c:${Store.STYLE_COLOR[s]}"><span class="dot"></span>${esc(s)}</button>`).join('')}
            </div>
            ${st.mode === 'month' ? monthGrid(filtered, today) : ''}
          </div>
        </div>
        <div class="list-head">${head} <span class="badge">${list.length}</span></div>
        <div class="cards">${list.length ? list.map((e, i) => cardHTML(e, i, today, canEdit)).join('') : emptyHTML(city, canEdit)}</div>`;

      App.translateCards(inner);
      if (!list.length) {
        const d = PX.dancer(5, myLook());
        inner.querySelector('.empty .win-body').prepend(d.el);
        beatLoop(d, 420);
      }
      if (flashId) {
        const el = inner.querySelector(`[data-id="${CSS.escape(flashId)}"]`);
        if (el) { el.classList.add('flash'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
    };

    function monthGrid(events, today) {
      const first = new Date(st.y, st.m, 1);
      const start = new Date(first); start.setDate(1 - first.getDay());
      let cells = '';
      for (let i = 0; i < 42; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const s = ymd(d);
        const evs = events.filter(e => e.date === s || (e.endDate && e.date <= s && e.endDate >= s));
        const out = d.getMonth() !== st.m;
        if (i >= 35 && out && d.getDate() <= 7 && i % 7 === 0) break;
        cells += `<button class="day ${out ? 'out' : ''} ${s === today ? 'today' : ''} ${evs.length ? 'has' : ''} ${st.day === s ? 'sel' : ''}" data-day="${s}" ${evs.length ? '' : 'tabindex="-1"'}>
          <span class="n">${d.getDate()}</span>
          ${evs.slice(0, 3).map(e => `<span class="ev" style="--c:${Store.STYLE_COLOR[(e.styles || [])[0]] || 'var(--yellow)'}">${esc(e.name)}</span>`).join('')}
          ${evs.length > 3 ? `<span>+${evs.length - 3}</span>` : ''}
        </button>`;
      }
      return `<div class="cal-head" style="justify-content:center">
          <button class="btn sm" data-mon="-1" aria-label="${t('prev_month')}">◀</button>
          <div class="month">${t('month_title', { y: st.y, m: st.m + 1 })}</div>
          <button class="btn sm" data-mon="1" aria-label="${t('next_month')}">▶</button>
          <button class="btn sm yellow" data-mon="0">${t('today')}</button>
        </div>
        <div class="month-grid">${t('week').map(w => `<div class="dow">${w}</div>`).join('')}${cells}</div>`;
    }

    inner.addEventListener('click', e => {
      const tg = e.target.closest('button, a'); if (!tg) return;
      if (tg.dataset.mode) { st.mode = tg.dataset.mode; st.day = null; SFX.play('select'); draw(); }
      else if (tg.dataset.style !== undefined) {
        const s = tg.dataset.style;
        if (!s) st.styles.clear(); else st.styles.has(s) ? st.styles.delete(s) : st.styles.add(s);
        SFX.play('select'); draw();
      }
      else if (tg.dataset.mon !== undefined) {
        const v = +tg.dataset.mon;
        if (v === 0) { st.y = now.getFullYear(); st.m = now.getMonth(); }
        else { const d = new Date(st.y, st.m + v, 1); st.y = d.getFullYear(); st.m = d.getMonth(); }
        st.day = null; SFX.play('select'); draw();
      }
      else if (tg.dataset.day) {
        if (!tg.classList.contains('has')) return;
        st.day = st.day === tg.dataset.day ? null : tg.dataset.day; SFX.play('select'); draw();
      }
      else if (tg.classList.contains('add-here')) openForm({ country: c.code, city: city.id });
      else cardAct(tg, draw);
    });
    // 留言數
    Social.commentCounts().then(n => { cmtCounts = n || {}; inner.querySelectorAll('[data-cc]').forEach(x => (x.textContent = cmtCounts[x.dataset.cc] || 0)); });
    draw(CityView.flash);
    CityView.flash = null;
    CityView.redraw = draw;

    if (!seen('city')) setTimeout(() => npc.say(t('npc_city'), null, { duo: true, first: 'kailyn' }), 500);
  }

  /* ---------- 活動卡片上的按鈕（城市頁、總覽頁共用） ---------- */
  function cardAct(tg, redraw) {
    const a = tg.dataset.act; if (!a) return false;
    const ev = tg.dataset.ev && Store.get(tg.dataset.ev);
    if (a === 'edit') openForm(ev);
    else if (a === 'del') confirmDelete(ev, redraw);
    else if (a === 'poster') openPoster(ev);
    else if (a === 'map' || a === 'link') SFX.play('confirm');
    else if (a === 'cmt') toggleComments(tg.closest('.card'), tg.dataset.ev);
    else return App.onCardAct(a, ev, tg, redraw);
    return true;
  }
  const loadCommentCounts = root => Social.commentCounts().then(n => { cmtCounts = n || {}; root.querySelectorAll('[data-cc]').forEach(x => (x.textContent = cmtCounts[x.dataset.cc] || 0)); });

  /* ---------- 活動留言板 ---------- */
  let cmtCounts = {};
  async function toggleComments(card, id) {
    const next = card.nextElementSibling;
    if (next && next.classList.contains('cmt-box')) { SFX.play('cancel'); next._off && next._off(); return next.remove(); }
    SFX.play('open');
    const box = h(`<div class="cmt-box win"><div class="cmt-list"></div><form class="cmt-form"></form></div>`);
    card.after(box);
    const listEl = box.querySelector('.cmt-list'), form = box.querySelector('.cmt-form');
    const row = c => {
      const a = c.author || {};
      const r = h(`<div class="msg ${a.role ? 'staff' : ''}" data-id="${c.id}"><div class="mb"><div class="mh">${a.role ? `<span class="role role-${a.role}">${a.role === 'owner' ? '★' : '✦'}</span>` : ''}<b class="nm">${Player.nameHTML(a)}</b>${Chat.crewTagHTML ? Chat.crewTagHTML(a) : ''}${a.title ? Titles.html(a.title) : ''}
        <span class="tm">${new Date(c.created_at).toLocaleDateString()}</span>${Social.canDelete(c) ? `<button class="del" aria-label="${t('b_del')}">×</button>` : ''}</div>
        <div class="mt" data-utr>${Emoji.toHTML(c.text)}</div></div></div>`);
      r.prepend(Chat.headIcon(a.look));
      const del = r.querySelector('.del');
      if (del) del.onclick = async () => { try { await Social.removeComment(c.id); } catch (x) { toast(x.message, '✕'); } };
      return r;
    };
    const setCount = n => { cmtCounts[id] = n; document.querySelectorAll(`[data-cc="${CSS.escape(id)}"]`).forEach(x => (x.textContent = n)); };
    let rows = [];
    const draw = () => {
      listEl.innerHTML = rows.length ? '' : `<p class="note">${t('cmt_none')}</p>`;
      rows.forEach(c => listEl.appendChild(row(c)));
      listEl.scrollTop = listEl.scrollHeight;
      setCount(rows.length);
    };
    try { rows = await Social.comments(id); } catch (x) { rows = []; }
    draw();
    box._off = Social.on('comments', ({ type, row: r }) => {
      if (type === 'INSERT' && r.event_id === id && !rows.some(x => x.id === r.id)) { rows.push(r); draw(); }
      if (type === 'DELETE') { rows = rows.filter(x => x.id !== r.id); draw(); }
    });
    if (!Player.me) {
      form.innerHTML = `<button type="button" class="btn sm pink">${t('cmt_login')}</button>`;
      form.querySelector('button').onclick = () => Player.prompt();
      return;
    }
    form.innerHTML = `<div class="chat-input"><button type="button" class="btn sm emo-btn" aria-label="emoji"><img class="pxemo" src="assets/stickers/c/7.webp?v=1" alt=""></button><input class="input sm" maxlength="200" placeholder="${esc(t('cmt_ph'))}"><button class="btn sm pink">${t('chat_send')}</button></div>`;
    const input = form.querySelector('input');
    form.querySelector('.emo-btn').onclick = e => Chat.togglePicker(e.currentTarget, input);
    form.onsubmit = async ev => {
      ev.preventDefault();
      try {
        const r = await Social.comment(id, input.value);
        if (r && !rows.some(x => x.id === r.id)) { rows.push(r); draw(); }
        input.value = ''; SFX.play('coin'); document.querySelector('.emo-pick')?.remove();
      } catch (x) { SFX.play('error'); const k = 'err_' + x.message; toast(t(k) !== k ? t(k) : x.message, '✕'); }
    };
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  }

  function regStatus(e, today) {
    if (!e.regStart && !e.regEnd) return '';
    if (e.regStart && today < e.regStart) return `<span class="tag" style="--c:var(--blue)">${t('reg_soon')}</span>`;
    if (e.regEnd && today > e.regEnd) return `<span class="tag" style="--c:#c9bfb5">${t('reg_closed')}</span>`;
    return `<span class="tag" style="--c:var(--green)">${t('reg_open')}</span>`;
  }

  function cardHTML(e, i, today, canEdit, opt = {}) {
    const d = parseDate(e.date);
    const color = Store.STYLE_COLOR[(e.styles || [])[0]] || 'var(--yellow)';
    const mapUrl = e.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address || e.venue || '')}`;
    const past = (e.endDate || e.date) < today;
    const timeStr = [e.startTime, e.endTime].filter(Boolean).join(' – ');
    const dateStr = e.endDate && e.endDate !== e.date ? `${(e.date || '').replace(/-/g, '/')} – ${e.endDate.slice(5).replace('-', '/')}` : (e.date || '').replace(/-/g, '/');
    const reg = (e.regStart || e.regEnd) ? `${(e.regStart || '?').replace(/-/g, '/')} ～ ${(e.regEnd || '?').replace(/-/g, '/')}` : '';
    const safeLink = /^https?:\/\//i.test(e.link || '') ? e.link : '';
    const safeMap = /^https?:\/\//i.test(mapUrl) ? mapUrl : '';
    const rows = [
      [t('r_when'), `${dateStr}${timeStr ? '　' + timeStr : ''}`],
      [t('r_venue'), [e.venue, e.address].filter(Boolean).join('｜')], [t('r_reg'), reg],
      [t('r_method'), e.regMethod, 1], [t('r_fee'), e.fee, 1], [t('r_note'), e.note, 1]
    ].filter(r => r[1]);
    return `<article class="card ${e.poster ? 'has-poster' : ''} ${past ? 'past' : ''}" data-id="${esc(e.id)}" style="--i:${i};--c:${color}">
      ${e.poster ? `<button class="poster" data-act="poster" data-ev="${esc(e.id)}" aria-label="${t('poster_zoom')}"><img src="${esc(e.poster)}" alt="${esc(e.name)} ${t('poster')}" loading="lazy"></button>` : ''}
      <div class="date">
        <span class="m">${d ? d.getFullYear() + '/' + (d.getMonth() + 1) : ''}</span>
        <span class="d">${d ? pad2(d.getDate()) : '??'}</span>
        <span class="w">${d ? t('wk').replace('{w}', t('week')[d.getDay()]) : '?'}</span>
        ${e.startTime ? `<span class="tm">${esc(e.startTime)}</span>` : ''}
      </div>
      <div class="main">
        <div class="tags">${(e.styles || []).map(s => `<span class="tag" style="--c:${Store.STYLE_COLOR[s] || 'var(--cream)'}">${esc(s)}</span>`).join('')}
          ${regStatus(e, today)}${past ? `<span class="tag">${t('ended')}</span>` : ''}${e._src === 'local' ? `<span class="tag local" title="${esc(t('local_tip'))}">${t('local')}</span>` : ''}${App.viewTag ? App.viewTag(e) : ''}</div>
        <h3 data-trn>${esc(e.name)}</h3>
        ${opt.place ? `<div class="place-tag">${PXI.img('event/pin', '📍')} ${esc(nm(byCode[e.country]))}・${esc(nm(cityOf(e.country, e.city)))}${opt.dist ? `　(${opt.dist} km)` : ''}</div>` : ''}
        <dl class="info">${e.organizer ? `<dt>${PXI.lead(t('r_org'))}</dt><dd>${App.orgLinks ? App.orgLinks(e.organizer) : esc(e.organizer)}</dd>` : ''}${rows.map(([k, v, tr]) => `<dt>${PXI.lead(k)}</dt><dd ${tr ? 'data-tr' : ''}>${esc(v)}</dd>`).join('')}</dl>
        ${App.cardResults(e)}
      </div>
      <div class="acts">
        ${(e.address || e.venue || e.mapUrl) && safeMap ? `<a class="btn sm teal" data-act="map" href="${esc(safeMap)}" target="_blank" rel="noopener">${PXI.img('event/pin', I.pin)} ${t('b_map')}</a>` : ''}
        ${safeLink ? `<a class="btn sm orange" data-act="link" href="${esc(safeLink)}" target="_blank" rel="noopener">${PXI.img('event/link', I.link)} ${t('b_link')}</a>` : ''}
        <button class="btn sm yellow" data-act="cmt" data-ev="${esc(e.id)}">💬 ${t('cmt')} <span class="cc" data-cc="${esc(e.id)}">${cmtCounts[e.id] || 0}</span></button>
        ${App.cardExtras(e, past)}
        ${canEdit ? `<button class="btn sm" data-act="edit" data-ev="${esc(e.id)}">${I.edit} ${t('b_edit')}</button>
        <button class="btn sm" data-act="del" data-ev="${esc(e.id)}">${I.trash} ${t('b_del')}</button>` : ''}
      </div>
    </article>`;
  }

  const emptyHTML = (city, canEdit) => `<div class="win empty"><div class="win-body">
      <p>${t('empty1', { city: esc(nm(city)) })}</p>
      ${canEdit ? `<p style="font-size:13px;color:var(--ink-soft)">${t('empty2')}</p><button class="btn pink add-here">${I.plus} ${t('add')}</button>` : ''}</div></div>`;

  function openPoster(e) {
    modal({ title: '🖼 ' + e.name, color: 'blue', wide: true, body: `<div class="lightbox"><img src="${esc(e.poster)}" alt="${esc(e.name)} ${t('poster')}"></div>` });
  }

  function confirmDelete(e, after) {
    const m = modal({
      title: t('del_title'), color: 'pink',
      body: `<p>${t('del_q', { n: esc(e.name) })}</p>
        ${Store.cloud ? '' : `<p style="font-size:12px;color:var(--ink-soft)">${e._src === 'seed' ? t('del_seed') : t('del_local')}</p>`}
        <div class="err"></div><div class="form-foot"><button class="btn no">${t('no')}</button><button class="btn red yes">${t('yes_del')}</button></div>`
    });
    m.el.querySelector('.no').onclick = m.close;
    m.el.querySelector('.yes').onclick = async ev => {
      ev.target.disabled = true;
      try { await Store.remove(e.id); } catch (x) { SFX.play('error'); m.el.querySelector('.err').textContent = '✕ ' + t('cloud_err') + x.message; ev.target.disabled = false; return; }
      m.close(); toast(t('deleted'), '✕'); after && after();
    };
  }

  /* ================= 新增 / 編輯活動 ================= */
  function openForm(init = {}) {
    const submitMode = !Store.canEdit();                       // 一般玩家：投稿給管理員審核
    if (submitMode && (!Store.cloud || !Player.me)) return Player.prompt();
    const editing = !!init.id && !submitMode;
    const e = { styles: [], country: 'TW', city: 'taipei', ...init };
    const opt = c => `<option value="${c.code}" ${c.code === e.country ? 'selected' : ''}>${esc(nm(c))}${I18N.lang === 'en' ? '' : '　' + esc(c.n?.en || c.en)}</option>`;
    const countryOpts = opt(byCode.TW) + CONTS.map(k => `<optgroup label="${contName(k)}">${G.countries.filter(c => c.cont === k && !c.home).sort((a, b) => nm(a).localeCompare(nm(b))).map(opt).join('')}</optgroup>`).join('');
    const posterMode = !e.poster ? 'none' : e.poster.startsWith('data:') ? 'upload' : 'url';
    const body = h(`<form class="form" novalidate>
      <label class="field full"><span>${t('f_name')} <b>*</b></span><input class="input" name="name" value="${esc(e.name)}" placeholder="${esc(t('f_name_ph'))}" required></label>
      <label class="field"><span>${t('f_org')}</span><input class="input" name="organizer" value="${esc(e.organizer)}" placeholder="${esc(t('f_org_ph'))}"></label>
      <div class="field"><span>${t('f_place')} <b>*</b></span><div class="row2">
        <select class="input" name="country">${countryOpts}</select><select class="input" name="city"></select></div></div>
      <label class="field"><span>${t('f_venue')}</span><input class="input" name="venue" value="${esc(e.venue)}" placeholder="${esc(t('f_venue_ph'))}"></label>
      <label class="field"><span>${t('f_addr')}</span><input class="input" name="address" value="${esc(e.address)}" placeholder="${esc(t('f_addr_ph'))}"></label>
      <fieldset class="fieldset full"><legend>${t('f_styles')} <b style="color:var(--red)">*</b></legend>
        <div class="chips">${Store.STYLES.map(s => `<label class="chip ${e.styles.includes(s) ? 'on' : ''}" style="--c:${Store.STYLE_COLOR[s]}"><input type="checkbox" name="styles" value="${esc(s)}" ${e.styles.includes(s) ? 'checked' : ''} hidden><span class="dot"></span>${esc(s)}</label>`).join('')}</div>
      </fieldset>
      <fieldset class="fieldset full"><legend>${t('f_when')}</legend>
        <div class="row2"><label class="field"><span>${t('f_date')} <b>*</b></span><input class="input" type="date" name="date" value="${esc(e.date)}"></label>
          <label class="field"><span>${t('f_end')}</span><input class="input" type="date" name="endDate" value="${esc(e.endDate)}"></label></div>
        <div class="row2"><label class="field"><span>${t('f_start')}</span><input class="input" type="time" name="startTime" value="${esc(e.startTime)}"></label>
          <label class="field"><span>${t('f_endt')}</span><input class="input" type="time" name="endTime" value="${esc(e.endTime)}"></label></div>
      </fieldset>
      <fieldset class="fieldset full"><legend>${t('f_reg')}</legend>
        <div class="row2"><label class="field"><span>${t('f_regs')}</span><input class="input" type="date" name="regStart" value="${esc(e.regStart)}"></label>
          <label class="field"><span>${t('f_rege')}</span><input class="input" type="date" name="regEnd" value="${esc(e.regEnd)}"></label></div>
        <div class="row2"><label class="field"><span>${t('f_method')}</span><input class="input" name="regMethod" value="${esc(e.regMethod)}" placeholder="${esc(t('f_method_ph'))}"></label>
          <label class="field"><span>${t('f_fee')}</span><input class="input" name="fee" value="${esc(e.fee)}" placeholder="${esc(t('f_fee_ph'))}"></label></div>
      </fieldset>
      <label class="field full"><span>${I.link} ${t('f_link')}</span><input class="input" name="link" type="url" value="${esc(e.link)}" placeholder="https://www.instagram.com/..."></label>
      <label class="field full"><span>${I.pin} ${t('f_map')}</span><input class="input" name="mapUrl" type="url" value="${esc(e.mapUrl)}" placeholder="https://maps.app.goo.gl/..."></label>
      <fieldset class="fieldset full"><legend>${I.image} ${t('f_poster')}</legend>
        <div class="seg" style="justify-self:start">
          <button type="button" data-pm="none" class="${posterMode === 'none' ? 'on' : ''}">${t('p_none')}</button>
          <button type="button" data-pm="upload" class="${posterMode === 'upload' ? 'on' : ''}">${t('p_up')}</button>
          <button type="button" data-pm="url" class="${posterMode === 'url' ? 'on' : ''}">${t('p_url')}</button>
        </div>
        <input type="file" accept="image/*" class="input pm-upload ${posterMode === 'upload' ? '' : 'hidden'}">
        <input class="input pm-url ${posterMode === 'url' ? '' : 'hidden'}" name="posterUrl" placeholder="${esc(t('p_url_ph'))}" value="${posterMode === 'url' ? esc(e.poster) : ''}">
        <img class="poster-prev ${e.poster ? '' : 'hidden'}" src="${esc(e.poster || '')}" alt="">
      </fieldset>
      <label class="field full"><span>${t('f_note')}</span><textarea class="input" name="note" placeholder="${esc(t('f_note_ph'))}">${esc(e.note)}</textarea></label>
      ${submitMode ? `<p class="full note">📮 ${t('sub_hint')}</p>` : `<fieldset class="fieldset full"><legend>🏆 ${t('res_title')}</legend>
        <label class="field"><span>${t('res_list')}</span><textarea class="input" name="results" rows="3" placeholder="${esc(t('res_ph'))}">${esc((e.results || []).map(r => [r.place, r.name].filter(Boolean).join('：')).join('\n'))}</textarea></label>
        <label class="field"><span>▶ ${t('res_video')}</span><input class="input" name="video" type="url" value="${esc(e.video)}" placeholder="https://www.youtube.com/..."></label></fieldset>`}
      <div class="full"><div class="err"></div><div class="form-foot">
        <button type="button" class="btn cancel">${t('cancel')}</button>
        <button type="submit" class="btn pink">${editing ? t('f_submit_edit') : t('f_submit_new')}</button></div></div>
    </form>`);

    const m = modal({ title: submitMode ? '📮 ' + t('sub_btn') : editing ? t('f_edit') : t('f_new'), color: 'pink', body, wide: true });
    if (submitMode) body.querySelector('[type=submit]').textContent = '📮 ' + t('sub_send');
    const f = body;
    const citySel = f.elements.city;
    const fillCities = (cc, sel) => { citySel.innerHTML = byCode[cc].cities.map(ci => `<option value="${ci.id}" ${ci.id === sel ? 'selected' : ''}>${esc(nm(ci))}</option>`).join(''); };
    fillCities(e.country, e.city);
    f.elements.country.onchange = () => fillCities(f.elements.country.value);
    f.querySelectorAll('.chips label.chip').forEach(l => l.addEventListener('click', ev => {
      ev.preventDefault();
      const cb = l.querySelector('input'); cb.checked = !cb.checked; l.classList.toggle('on', cb.checked); SFX.play('select');
    }));

    let poster = e.poster || '', pm = posterMode;
    const prev = f.querySelector('.poster-prev'), up = f.querySelector('.pm-upload'), urlIn = f.querySelector('.pm-url');
    const showPrev = src => { prev.src = src || ''; prev.classList.toggle('hidden', !src); };
    f.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => {
      pm = b.dataset.pm; SFX.play('select');
      f.querySelectorAll('[data-pm]').forEach(x => x.classList.toggle('on', x === b));
      up.classList.toggle('hidden', pm !== 'upload'); urlIn.classList.toggle('hidden', pm !== 'url');
      showPrev(pm === 'none' ? '' : pm === 'url' ? urlIn.value : (poster.startsWith('data:') ? poster : ''));
    });
    urlIn.oninput = () => showPrev(urlIn.value);
    up.onchange = () => {
      const file = up.files[0]; if (!file) return;
      const img = new Image(), rd = new FileReader();
      rd.onload = () => { img.src = rd.result; };
      img.onload = () => {
        const max = 720, k = Math.min(1, max / Math.max(img.width, img.height));   // 縮小海報
        const cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        poster = cv.toDataURL('image/jpeg', 0.78); showPrev(poster); SFX.play('coin');
      };
      rd.readAsDataURL(file);
    };

    f.querySelector('.cancel').onclick = m.close;
    f.onsubmit = async ev => {
      ev.preventDefault();
      const fd = new FormData(f);
      const get = k => (fd.get(k) || '').toString().trim();
      const out = {
        ...(editing ? { id: e.id } : {}),
        name: get('name'), organizer: get('organizer'), country: get('country'), city: get('city'),
        venue: get('venue'), address: get('address'), styles: fd.getAll('styles'),
        date: get('date'), endDate: get('endDate'), startTime: get('startTime'), endTime: get('endTime'),
        regStart: get('regStart'), regEnd: get('regEnd'), regMethod: get('regMethod'), fee: get('fee'),
        link: get('link'), mapUrl: get('mapUrl'), note: get('note'), video: get('video'),
        results: get('results') ? get('results').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.+?)[：:]\s*(.+)$/); return m ? { place: m[1].trim(), name: m[2].trim() } : { place: '', name: l }; }) : undefined,
        poster: pm === 'none' ? '' : pm === 'url' ? get('posterUrl') : (poster.startsWith('data:') ? poster : '')
      };
      Object.keys(out).forEach(k => { if (out[k] === '' && k !== 'poster') delete out[k]; });
      const err = f.querySelector('.err');
      f.querySelectorAll('.bad').forEach(x => x.classList.remove('bad'));
      const bad = [];
      if (!out.name) bad.push(['name', t('e_name')]);
      if (!out.date) bad.push(['date', t('e_date')]);
      if (!out.styles.length) bad.push([null, t('e_style')]);
      if (out.endDate && out.date && out.endDate < out.date) bad.push(['endDate', t('e_end')]);
      if (out.regStart && out.regEnd && out.regEnd < out.regStart) bad.push(['regEnd', t('e_reg')]);
      if (out.link && !/^https?:\/\//i.test(out.link)) bad.push(['link', t('e_link')]);
      if (out.mapUrl && !/^https?:\/\//i.test(out.mapUrl)) bad.push(['mapUrl', t('e_link')]);
      if (out.video && !/^https?:\/\//i.test(out.video)) bad.push(['video', t('e_link')]);
      if (bad.length) {
        SFX.play('error');
        err.textContent = '✕ ' + bad.map(b => b[1]).join(' / ');
        bad.forEach(([n]) => n && f.elements[n].classList.add('bad'));
        return;
      }
      const btn = f.querySelector('[type=submit]'); btn.disabled = true;
      if (!out.results) delete out.results;
      if (submitMode) {
        try { await App.submitEvent(out); } catch (x) { btn.disabled = false; SFX.play('error'); err.textContent = '✕ ' + (/too many/.test(x.message) ? t('err_toomany') : x.message); return; }
        return m.close();
      }
      let saved;
      try { saved = await Store.upsert(out); } catch (x) { btn.disabled = false; SFX.play('error'); err.textContent = '✕ ' + (Store.cloud ? t('cloud_err') : '') + x.message; return; }
      m.close();
      setTimeout(() => {
        SFX.play('fanfare');
        toast(editing ? t('toast_updated') : t('toast_new', { n: saved.name }), '★');
        sparkle(innerWidth / 2, 90, 16);
        goEvent(saved.country + '/' + saved.city, saved.id);
        if (!Store.cloud && !seen('exportHint')) setTimeout(() => npc.say(t('npc_export')), 1200);
      }, 220);
    };
  }

  // 前往某個活動（城市頁並閃一下那張卡）
  function goEvent(path, id) {
    const [cc, ci] = path.split('/');
    const ev = Store.get(id), d = ev && parseDate(ev.date), k = path;
    if (calState[k] && d && calState[k].mode === 'month') { calState[k].y = d.getFullYear(); calState[k].m = d.getMonth(); calState[k].day = null; }
    if (calState[k] && ev && calState[k].styles.size && !(ev.styles || []).some(s => calState[k].styles.has(s))) calState[k].styles.clear();
    CityView.flash = id;
    const target = `#/c/${cc}/${ci}`;
    if (location.hash === target && CityView.redraw) { CityView.redraw(id); CityView.flash = null; } else nav(target);
  }

  /* ================= 管理員面板：官方快訊 ================= */
  async function openAdmin() {
    const owner = !Store.cloud || Backend.role === 'owner';
    const body = h(`<div class="admin">
      ${Store.cloud ? `<div class="tabs"><button class="btn sm on" data-at="ann">${t('ann_title')}</button>${owner ? `<button class="btn sm" data-at="ver">${t('adm_ver')}</button>` : ''}<button class="btn sm" data-at="rep">${t('adm_rep')}</button>${(App.adminTabs || []).map(tb => `<button class="btn sm" data-at="${tb.key}">${tb.label()}</button>`).join('')}</div>
      ${(App.adminTabs || []).map(tb => `<div class="adm-pane" data-p="${tb.key}" hidden></div>`).join('')}
      <div class="adm-pane" data-p="ver" hidden><ul class="adm-list ver-list"></ul></div>
      <div class="adm-pane" data-p="rep" hidden><ul class="adm-list rep-list"></ul></div>` : ''}
      <div class="adm-pane" data-p="ann">
      <h4>${t('ann_title')}</h4>
      <div class="ann-row"><span>${t('ann_every')}</span><select class="input sm ann-every">${[15, 30, 60, 120, 300, 600].map(v => `<option value="${v}">${v < 60 ? v + ' ' + t('sec') : v / 60 + ' ' + t('min')}</option>`).join('')}</select></div>
      <ul class="ann-list"></ul>
      <form class="ann-form"><div class="chat-input"><button type="button" class="btn sm emo-btn"><img class="pxemo" src="assets/stickers/c/7.webp?v=1" alt=""></button><input class="input sm" maxlength="200" placeholder="${esc(t('ann_ph'))}"><button class="btn sm yellow">${t('ann_add')}</button></div></form>
      ${Store.cloud ? `<hr><div class="btn-row"><button class="btn sm up">${t('admin_upload')}</button></div>` : ''}
      </div><div class="err"></div></div>`);
    const m = modal({ title: t('admin_panel'), color: 'blue', body, wide: true });
    const listEl = body.querySelector('.ann-list'), err = body.querySelector('.err');
    // 分頁：快訊 / 認證申請 / 檢舉
    body.querySelectorAll('[data-at]').forEach(b => b.onclick = () => {
      SFX.play('select');
      body.querySelectorAll('[data-at]').forEach(x => x.classList.toggle('on', x === b));
      body.querySelectorAll('.adm-pane').forEach(p => (p.hidden = p.dataset.p !== b.dataset.at));
      if (b.dataset.at === 'ver') drawVer(); if (b.dataset.at === 'rep') drawRep();
      const xt = (App.adminTabs || []).find(tb => tb.key === b.dataset.at);
      if (xt) xt.draw(body.querySelector(`.adm-pane[data-p="${xt.key}"]`), fail);
    });
    const drawVer = async () => {
      const ul = body.querySelector('.ver-list');
      let rows = []; try { rows = await Backend.listVerifications(); } catch (x) { return fail(x); }
      ul.innerHTML = rows.length ? '' : `<li class="note">${t('adm_none')}</li>`;
      for (const v of rows) {
        let who = null; try { who = await Backend.playerByUser(v.user_id); } catch (x) {}
        const li = h(`<li><div class="grow"><b>${esc(v.dancer_name)}</b> <span class="note">@${esc(who ? who.handle : '?')}</span><br>
          <a href="https://www.instagram.com/${encodeURIComponent(v.ig)}/" target="_blank" rel="noopener">📷 instagram.com/${esc(v.ig)}</a>
          <div class="note">${t('adm_code')} <code class="vcode">${esc(v.code)}</code></div></div>
          <button class="btn sm green ok">${t('adm_approve')}</button><button class="btn sm red no">${t('adm_reject')}</button></li>`);
        li.querySelector('.ok').onclick = async () => { try { await Backend.reviewVerification(v.id, true); SFX.play('fanfare'); toast(t('adm_done'), '✔'); Player.loadVerified(); drawVer(); } catch (x) { fail(x); } };
        li.querySelector('.no').onclick = async () => { try { await Backend.reviewVerification(v.id, false); drawVer(); } catch (x) { fail(x); } };
        ul.appendChild(li);
      }
    };
    const drawRep = async () => {
      const ul = body.querySelector('.rep-list');
      let rows = []; try { rows = await Backend.listReports(); } catch (x) { return fail(x); }
      ul.innerHTML = rows.length ? '' : `<li class="note">${t('adm_none')}</li>`;
      for (const r of rows) {
        let p = null; try { p = await Backend.findPlayer(r.target_handle); } catch (x) {}
        const li = h(`<li><div class="grow"><b>${p ? esc(p.name) : '?'}</b> <span class="note">@${esc(r.target_handle)}</span>${p && p.banned ? ` <span class="tag">${t('adm_banned')}</span>` : ''}<br><span class="note">${esc(r.reason || '')}</span></div>
          ${owner && p ? `<button class="btn sm rn">${t('adm_rename')}</button><button class="btn sm red bn">${p.banned ? t('adm_unban') : t('adm_ban')}</button>` : ''}
          <button class="btn sm dn">${t('adm_close')}</button></li>`);
        const rn = li.querySelector('.rn'), bn = li.querySelector('.bn');
        if (rn) rn.onclick = async () => { const n = prompt(t('adm_rename_ph'), p.name); if (!n) return; try { await Backend.setPlayer(r.target_handle, { name: n.trim().slice(0, 20) }); toast(t('adm_done'), '✔'); drawRep(); } catch (x) { fail(x); } };
        if (bn) bn.onclick = async () => { try { await Backend.setPlayer(r.target_handle, { banned: !p.banned }); toast(t('adm_done'), '✔'); drawRep(); } catch (x) { fail(x); } };
        li.querySelector('.dn').onclick = async () => { try { await Backend.closeReport(r.id); drawRep(); } catch (x) { fail(x); } };
        ul.appendChild(li);
      }
    };
    const fail = x => { SFX.play('error'); err.textContent = '✕ ' + x.message; };
    const draw = async () => {
      const rows = await Social.announcements();
      listEl.innerHTML = rows.length ? '' : `<li class="note">${t('ann_empty')}</li>`;
      rows.forEach(a => {
        const li = h(`<li class="${a.active ? '' : 'off'}"><span class="ann-txt">📢 ${Emoji.toHTML(a.text)}</span>
          <button class="btn sm tg">${a.active ? t('ann_on') : t('ann_off')}</button><button class="btn sm red rm">×</button></li>`);
        li.querySelector('.tg').onclick = async () => { try { await Social.setAnnouncement(a.id, { active: !a.active }); draw(); Chat.restartAnnouncements(); } catch (x) { fail(x); } };
        li.querySelector('.rm').onclick = async () => { try { await Social.removeAnnouncement(a.id); draw(); Chat.restartAnnouncements(); } catch (x) { fail(x); } };
        listEl.appendChild(li);
      });
    };
    const every = body.querySelector('.ann-every');
    every.value = String(await Social.announceEvery());
    every.onchange = async () => { try { await Social.setAnnounceEvery(+every.value); toast(t('ann_saved'), '✓'); Chat.restartAnnouncements(); } catch (x) { fail(x); } };
    const form = body.querySelector('.ann-form'), input = form.querySelector('input');
    form.querySelector('.emo-btn').onclick = e => Chat.togglePicker(e.currentTarget, input);
    form.onsubmit = async ev => {
      ev.preventDefault();
      if (!input.value.trim()) return;
      try { await Social.addAnnouncement(input.value.trim()); input.value = ''; SFX.play('coin'); draw(); Chat.restartAnnouncements(); } catch (x) { fail(x); }
    };
    const up = body.querySelector('.up');
    if (up) up.onclick = async () => {
      up.disabled = true;
      try { const n = await Store.uploadSeed(); toast(t('admin_uploaded', { n }), '★'); render(true); } catch (x) { up.disabled = false; fail(x); }
    };
    draw();
  }

  /* ================= 存檔管理（本機模式） ================= */
  function openSave() {
    const s = Store.stats();
    const body = h(`<div>
      <div class="save-stats">
        <div class="stat">${t('s_seed')}<div class="v">${s.seed}</div></div>
        <div class="stat">${t('s_local')}<div class="v">${s.local}</div></div>
        <div class="stat">${t('s_total')}<div class="v">${s.total}</div></div>
      </div>
      <p style="margin:0 0 8px">${t('s_intro')}</p>
      <ol class="steps">${t('s_steps').map(x => `<li>${x}</li>`).join('')}</ol>
      <div class="btn-row">
        <button class="btn pink exp-js">${I.disk} ${t('s_exp')}</button>
        <button class="btn exp-json">${t('s_json')}</button>
        <label class="btn">${t('s_imp')}<input type="file" accept=".json,application/json" hidden class="imp"></label>
        <button class="btn red reset">${t('s_reset')}</button>
      </div>
      <p style="font-size:12px;color:var(--ink-soft);margin:0">${t('s_tip')}</p>
    </div>`);
    const m = modal({ title: t('s_title'), color: 'yellow', body });
    body.querySelector('.exp-js').onclick = () => { download('events.js', Store.exportJS()); SFX.play('coin'); toast(t('s_downloaded'), '💾'); };
    body.querySelector('.exp-json').onclick = () => { download('dance-island-backup.json', Store.exportJSON(), 'application/json'); SFX.play('coin'); };
    body.querySelector('.imp').onchange = ev => {
      const file = ev.target.files[0]; if (!file) return;
      file.text().then(x => { const n = Store.importJSON(x); toast(t('s_imported', { n }), '★'); m.close(); render(true); })
        .catch(x => { SFX.play('error'); toast(t('s_impfail') + x.message, '✕'); });
    };
    body.querySelector('.reset').onclick = () => {
      if (!confirm(t('s_reset_q'))) return;
      Store.resetLocal(); m.close(); toast(t('s_reset_done'), '✕'); render(true);
    };
  }

  /* ================= 語言選單 ================= */
  function openLang(btn) {
    document.querySelector('.lang-pop')?.remove();
    const r = btn.getBoundingClientRect();
    const pop = h(`<div class="lang-pop win" style="top:${r.bottom + 8}px;right:${Math.max(8, innerWidth - r.right)}px">
      ${I18N.LANGS.map(([k, n]) => `<button data-l="${k}" class="${k === I18N.lang ? 'on' : ''}">${n}</button>`).join('')}</div>`);
    document.body.appendChild(pop);
    SFX.play('open');
    const close = ev => { if (!pop.contains(ev.target) && ev.target !== btn) { pop.remove(); document.removeEventListener('pointerdown', close); } };
    setTimeout(() => document.addEventListener('pointerdown', close), 0);
    pop.onclick = ev => { const b = ev.target.closest('[data-l]'); if (!b) return; SFX.play('confirm'); pop.remove(); I18N.set(b.dataset.l); };
  }
  I18N.onChange(() => { applyStatic(); if (started) render(true); });
  Player.onChange(() => { if (started) render(true); });
  Backend.onChange(() => { if (started) updateHUD(); });

  /* ================= 開機 ================= */
  function applyStatic() {
    const b = document.getElementById('boot');
    if (b) {
      b.querySelector('.start').textContent = t('press_start');
      b.querySelectorAll('.boot-langs button').forEach(x => x.classList.toggle('on', x.dataset.l === I18N.lang));
    }
    document.title = { zh: '舞島 Dance Island', en: 'Dance Island', ja: 'ダンスアイランド Dance Island', ko: '댄스 아일랜드 Dance Island' }[I18N.lang];
  }

  function afterStart() {
    if (Player.me) return setTimeout(() => Player.welcome(), 700);
    if (!Tutorial.seen()) setTimeout(() => Tutorial.run(() => setTimeout(() => Player.prompt(), 250)), 700);
  }

  function boot() {
    const bootEl = document.getElementById('boot');
    // 開機畫面先選語言（第一次來的人才看得懂教學）
    const langs = bootEl.querySelector('.boot-langs');
    langs.innerHTML = `<span>🌐 LANGUAGE</span>` + I18N.LANGS.map(([k, n]) => `<button class="btn sm" data-l="${k}">${n}</button>`).join('');
    langs.onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; SFX.init(); SFX.play('select'); I18N.set(b.dataset.l); };
    applyStatic();
    const bar = bootEl.querySelector('.bar');
    bar.innerHTML = '<i></i>'.repeat(20);
    { const bd = bootEl.querySelector('.boot-dancer'); if (bd) bd.innerHTML = ''; }
    const dt = 0;
    const st = bootEl.querySelector('.boot-status span'), pct = bootEl.querySelector('.boot-status b');
    let i = 0, dataReady = false;
    // 等雲端（如果有）、活動、角色都載好
    Backend.ready.then(() => Promise.all([Store.load(), Player.ready])).then(() => { dataReady = true; });
    const tm = setInterval(() => {
      if (i >= 19 && !dataReady) return;
      bar.children[i].classList.add('on'); i++;
      pct.textContent = i * 5 + '%';
      const msgs = t('boot'); st.textContent = msgs[Math.min(msgs.length - 1, Math.floor(i / 5))];
      if (i >= 20) {
        clearInterval(tm);
        setTimeout(() => buildLayout(), 0);   // 先把世界地圖算好
        const s = bootEl.querySelector('.start'); s.classList.remove('hidden'); s.focus();
      }
    }, 55);
    bootEl.querySelector('.start').onclick = () => {
      SFX.init(); SFX.play('fanfare'); clearInterval(dt);
      bootEl.remove();
      hud.classList.remove('hidden');
      started = true;
      render(true);
      Emoji.ready.then(() => Chat.init());
      afterStart();
    };
  }

  /* HUD 按鈕 */
  hud.querySelector('.hud-add').onclick = () => {
    SFX.play('select');
    const r = parseRoute();
    openForm(r.view === 'city' ? { country: r.cc, city: r.city } : r.cc ? { country: r.cc, city: byCode[r.cc].cities[0].id } : {});
  };
  hud.querySelector('.hud-save').onclick = () => { SFX.play('select'); openSave(); };
  hud.querySelector('.hud-events').onclick = () => { SFX.play('select'); nav('#/events'); };
  hud.querySelector('.hud-game').onclick = () => { SFX.play('select'); App.openArcade ? App.openArcade() : Games.open(); };
  hud.querySelector('.hud-lang').onclick = e => openLang(e.currentTarget);
  hud.querySelector('.hud-player').onclick = () => { SFX.play('select'); if (Player.me && Store.cloud) nav('#/me'); else Player.openMenu(); };
  hud.querySelector('.hud-admin').onclick = () => { SFX.play('select'); openAdmin(); };
  hud.querySelector('.hud-help').onclick = () => {
    SFX.play('select');
    const go = () => Tutorial.run(() => { if (!Player.me) setTimeout(() => Player.prompt(), 250); });
    if (parseRoute().view !== 'world') { nav('#/'); setTimeout(go, 900); } else go();
  };
  hud.querySelector('.hud-sound').onclick = () => { SFX.toggle(); updateHUD(); SFX.play('select'); };
  hud.querySelector('.hud-add .ic').innerHTML = PXI.img('menu/add', I.plus);
  hud.querySelector('.hud-game .ic').innerHTML = PXI.img('menu/games', I.game);
  // 按鈕前面的 emoji 換成像素圖示（有圖才換）
  const swapLead = (sel, name, all) => { const b = hud.querySelector(sel); if (!b || !PXI.has(name)) return; const n = [...b.childNodes].find(x => x.nodeType === 3 && x.textContent.trim()); if (n) n.replaceWith(document.createRange().createContextualFragment(PXI.img(name) + (all ? '' : ' '))); };
  swapLead('.hud-events', 'menu/events'); swapLead('.hud-lang', 'menu/lang'); swapLead('.hud-help', 'menu/tut', true);
  hud.querySelector('.hud-save .ic').innerHTML = PXI.img('menu/save', I.disk);

  Player.init({ goEvent });
  Object.assign(App, { nav, render, byCode, cityOf, cardHTML, cardAct, loadCommentCounts, goEvent, openForm, todayStr, parseDate, ymd, beatLoop, myLook, CONTS, contName });
  Object.defineProperty(App, 'current', { get: () => current });

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (current && current.view === 'country') render(true); }, 250); });

  boot();
})();
