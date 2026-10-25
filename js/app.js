/* =========================================================
 * 舞島 DANCE ISLAND — 主程式
 * 路由：#/           世界地圖
 *       #/c/TW       國家（島嶼）→ 城市按鈕
 *       #/c/TW/taipei 城市活動行事曆
 * ========================================================= */
(() => {
  const { h, esc, I, winHTML, modal, npc, toast, sparkle, wipe, download } = UI;
  const G = window.GEO;
  const byCode = Object.fromEntries(G.countries.map(c => [c.code, c]));
  const stage = document.getElementById('stage');
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const pad2 = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayStr = () => ymd(new Date());
  const parseDate = s => { const [y, m, d] = (s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
  const cityOf = (cc, id) => (byCode[cc]?.cities || []).find(c => c.id === id);
  const seen = key => { try { if (localStorage.getItem('danceIsland.seen.' + key)) return true; localStorage.setItem('danceIsland.seen.' + key, 1); } catch (e) {} return false; };

  /* ---------------- 路由 ---------------- */
  const parseRoute = () => {
    const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (p[0] === 'c' && byCode[p[1]]) return { view: p[2] && cityOf(p[1], p[2]) ? 'city' : 'country', cc: p[1], city: p[2] };
    return { view: 'world' };
  };
  let current = null;
  let firstRender = true;
  const render = () => {
    const r = parseRoute();
    const go = () => {
      stage.innerHTML = '';
      current = r;
      npc.hide();
      if (r.view === 'world') WorldView();
      else if (r.view === 'country') CountryView(byCode[r.cc]);
      else CityView(byCode[r.cc], cityOf(r.cc, r.city));
      updateCrumbs(r);
    };
    if (firstRender) { firstRender = false; go(); } else wipe(go);
  };
  const nav = hash => { if (location.hash === hash) render(); else location.hash = hash; };
  window.addEventListener('hashchange', render);

  /* ---------------- HUD ---------------- */
  function updateCrumbs(r) {
    const el = document.querySelector('.crumbs');
    let html = `<a href="#/">🌏 世界</a>`;
    if (r.cc) html += `<span class="sep">›</span><a href="#/c/${r.cc}">${esc(byCode[r.cc].name)}</a>`;
    if (r.view === 'city') html += `<span class="sep">›</span><span>${esc(cityOf(r.cc, r.city).name)}</span>`;
    el.innerHTML = html;
  }

  /* ================= 世界地圖 ================= */
  /*
   * 版面：所有國家依真實經緯度排列（以東經 150° 為中心，美洲在右、歐非在左），
   * 再以台灣為圓心「往外推」並拉開間距，讓每個國家都變成一座獨立漂浮的島；
   * 台灣放大 7 倍放在正中間。
   */
  const WL = { S: 10, Y: 1.15, SPREAD: 1.3, PUSH: 240, DECAY: 800, TW_ZOOM: 7, CELL: 5, MARGIN: 260 };
  let layout = null;
  function buildLayout() {
    if (layout) return layout;
    const raw = (lon, lat) => [(lon - G.center) * WL.S, -lat * WL.S * WL.Y];
    const tw = byCode.TW;
    const twPts = tw.polys[0].map(([lo, la]) => raw(lo, la));
    const T = [twPts.reduce((s, p) => s + p[0], 0) / twPts.length, twPts.reduce((s, p) => s + p[1], 0) / twPts.length];
    // 一個點（例如國家中心）在世界地圖上的新位置
    const place = ([x, y]) => {
      const dx = (x - T[0]) * WL.SPREAD, dy = (y - T[1]) * WL.SPREAD, r = Math.hypot(dx, dy);
      if (r < 1e-6) return [...T];
      const r2 = r + WL.PUSH * Math.exp(-r / WL.DECAY);
      return [T[0] + (dx / r) * r2, T[1] + (dy / r) * r2];
    };
    const items = G.countries.map((c, idx) => {
      let polys = c.polys.map(poly => poly.map(([lo, la]) => raw(lo, la)));
      const xs = polys.flat().map(p => p[0]), ys = polys.flat().map(p => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      // 太小的國家放大到至少 5 格，台灣放大 TW_ZOOM 倍
      const k = c.home ? WL.TW_ZOOM : Math.max(1, (WL.CELL * 5) / Math.max(size, 0.01));
      const [nx, ny] = c.home ? [...T] : place([cx, cy]);
      polys = polys.map(poly => poly.map(([x, y]) => [nx + (x - cx) * k, ny + (y - cy) * k]));
      const grid = PX.rasterizeXY(polys, WL.CELL);
      return { c, idx, grid, x: grid.minX - grid.pad * WL.CELL, y: grid.minY - grid.pad * WL.CELL, area: grid.w * grid.h };
    });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(it => { minX = Math.min(minX, it.x); minY = Math.min(minY, it.y); maxX = Math.max(maxX, it.x + it.grid.w * WL.CELL); maxY = Math.max(maxY, it.y + (it.grid.h + 4) * WL.CELL); });
    const ox = WL.MARGIN - minX, oy = WL.MARGIN - minY;
    items.forEach(it => { it.x += ox; it.y += oy; });
    const toWorld = (lon, lat) => { const [x, y] = place(raw(lon, lat)); return [x + ox, y + oy]; };
    items.sort((a, b) => b.area - a.area);   // 小國畫在上層，才點得到
    layout = { items, W: maxX - minX + WL.MARGIN * 2, H: maxY - minY + WL.MARGIN * 2, T: [T[0] + ox, T[1] + oy], toWorld, art: new Map() };
    return layout;
  }

  const OCEANS = [
    ['太平洋 PACIFIC OCEAN', -150, 15], ['太平洋', 175, -30], ['台灣海峽', 119.6, 24.3], ['南海', 114, 14],
    ['印度洋 INDIAN OCEAN', 78, -22], ['大西洋', -27, 25], ['大西洋 ATLANTIC', 328, 5], ['北冰洋 ARCTIC', 100, 80]
  ];
  const CONTS = ['亞洲', '歐洲', '北美洲', '南美洲', '非洲', '大洋洲'];

  const cam = { x: null, y: null, s: 1 };
  function WorldView() {
    const L = buildLayout();
    const view = h(`<div class="view"><div class="world-vp"><div class="world"></div></div></div>`);
    const vp = view.querySelector('.world-vp'), world = view.querySelector('.world');
    world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
    const counts = {};
    Store.all().forEach(e => (counts[e.country] = (counts[e.country] || 0) + 1));

    // 航線：從台灣連到「有活動」的國家
    const routes = L.items.filter(it => !it.c.home && counts[it.c.code]).map(it => {
      const x = it.x + (it.grid.w * WL.CELL) / 2, y = it.y + (it.grid.h * WL.CELL) / 2;
      const [tx, ty] = L.T, mx = (tx + x) / 2, my = (ty + y) / 2 - Math.abs(x - tx) * 0.15;
      return `<path d="M${tx} ${ty} Q${mx} ${my} ${x} ${y}"/>`;
    }).join('');
    world.appendChild(h(`<svg class="routes" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}">${routes}</svg>`));

    // 浪花 & 海洋名稱 & 雲
    const waves = h('<div class="waves"></div>');
    for (let i = 0; i < 260; i++) {
      const w = document.createElement('i'); w.className = 'wave';
      w.style.left = Math.round(PX.hash(i, 1) * L.W) + 'px';
      w.style.top = Math.round(PX.hash(i, 2) * L.H) + 'px';
      w.style.animationDelay = (PX.hash(i, 3) * -4).toFixed(2) + 's';
      waves.appendChild(w);
    }
    world.appendChild(waves);
    OCEANS.forEach(([t, lon, lat]) => { const [x, y] = L.toWorld(lon, lat); world.appendChild(h(`<div class="ocean-label" style="left:${x}px;top:${y}px">${esc(t)}</div>`)); });
    for (let i = 0; i < 16; i++) {
      const c = h(`<i class="cloud"></i>`);
      c.style.top = Math.round(PX.hash(i, 9) * L.H) + 'px';
      const dur = 140 + PX.hash(i, 10) * 120;
      c.style.setProperty('--w', L.W + 'px');
      c.style.animationDuration = dur + 's';
      c.style.animationDelay = (-PX.hash(i, 11) * dur).toFixed(1) + 's';
      world.appendChild(c);
    }

    // 島嶼
    L.items.forEach(({ c, idx, grid, x, y, area }) => {
      let art = L.art.get(c.code);
      if (!art) { art = PX.drawIsland(grid, WL.CELL, { depth: c.home ? 4 : 3, seed: idx + 1 }); L.art.set(c.code, art); }
      const count = counts[c.code] || 0;
      const lvl = c.home || count ? 0 : area > 2500 ? 1 : area > 500 ? 2 : 3;
      const isle = h(`<div class="isle lv${lvl} ${c.home ? 'home' : ''}" style="left:${x}px;top:${y}px;width:${art.w}px;height:${art.h}px">
        <div class="float" style="--d:${(-(idx % 9) * 0.37).toFixed(2)}s"><button class="hit" aria-label="${esc(c.name)}（${count} 個活動）"></button></div>
        <div class="isle-tag" style="top:${art.h + 6}px">${esc(c.name)} <span class="en">${esc(c.en)}</span>${count ? `<span class="badge">${count}</span>` : ''}</div>
      </div>`);
      art.base.className = 'base';
      art.base.style.left = -art.pad + 'px'; art.base.style.top = -art.pad + 'px';
      isle.prepend(art.base);
      const fl = isle.querySelector('.float');
      fl.prepend(art.island);
      if (count) fl.appendChild(h(`<i class="arrow" style="top:-26px"></i>`));
      if (c.home) {
        const d = PX.dancer(4);
        d.el.style.left = art.w * 0.42 + 'px'; d.el.style.top = art.h * 0.2 + 'px';
        fl.appendChild(d.el);
        const t = setInterval(() => { if (!d.el.isConnected) clearInterval(t); else d.beat(); }, 300);
      }
      const btn = isle.querySelector('.hit');
      btn.addEventListener('mouseenter', () => SFX.play('hover'));
      btn.addEventListener('click', e => {
        if (pan.moved) return;
        SFX.play('select'); sparkle(e.clientX, e.clientY);
        nav('#/c/' + c.code);
      });
      world.appendChild(isle);
    });

    // 平移 / 縮放
    const zoomLevel = s => (s >= 1.1 ? 3 : s >= 0.6 ? 2 : 1);
    const apply = () => {
      world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
      world.style.setProperty('--inv', Math.min(2.4, 1 / cam.s).toFixed(3));
      world.dataset.z = zoomLevel(cam.s);
    };
    const homeScale = () => (innerWidth < 760 ? 0.45 : 0.7);
    const centerOn = ([x, y], s = cam.s) => { cam.s = s; cam.x = innerWidth / 2 - x * s; cam.y = innerHeight / 2 - y * s; apply(); };
    if (cam.x === null) centerOn(L.T, homeScale()); else apply();

    const pan = { on: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0, pts: new Map(), dist: 0 };
    vp.addEventListener('pointerdown', e => {
      pan.pts.set(e.pointerId, [e.clientX, e.clientY]);
      pan.on = true; pan.moved = false;
      pan.sx = e.clientX; pan.sy = e.clientY; pan.ox = cam.x; pan.oy = cam.y;
      if (pan.pts.size === 2) { const [a, b] = [...pan.pts.values()]; pan.dist = Math.hypot(a[0] - b[0], a[1] - b[1]); pan.s0 = cam.s; }
    });
    vp.addEventListener('pointermove', e => {
      if (!pan.on) return;
      pan.pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pan.pts.size === 2) {
        const [a, b] = [...pan.pts.values()];
        zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pan.s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pan.dist, true);
        pan.moved = true; return;
      }
      const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (!pan.moved && Math.hypot(dx, dy) > 6) { pan.moved = true; vp.classList.add('dragging'); vp.setPointerCapture(e.pointerId); }
      if (pan.moved) { cam.x = pan.ox + dx; cam.y = pan.oy + dy; apply(); }
    });
    const end = e => { pan.pts.delete(e.pointerId); if (!pan.pts.size) { pan.on = false; vp.classList.remove('dragging'); setTimeout(() => (pan.moved = false), 0); } };
    vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
    const zoomAt = (px, py, s, abs) => {
      s = Math.min(2.2, Math.max(0.16, abs ? s : cam.s * s));
      cam.x = px - ((px - cam.x) * s) / cam.s; cam.y = py - ((py - cam.y) * s) / cam.s; cam.s = s; apply();
    };
    vp.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });

    // 控制鈕
    const ctrls = h(`<div class="map-ctrls">
      <button class="btn icon" data-z="in" aria-label="放大">${I.plus}</button>
      <button class="btn icon" data-z="out" aria-label="縮小"><b style="font-size:16px;line-height:1">－</b></button>
      <button class="btn icon yellow" data-z="all" aria-label="看整個世界">🌏</button>
      <button class="btn icon pink" data-z="home" aria-label="回到台灣">⌂</button></div>`);
    ctrls.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; SFX.play('select');
      if (b.dataset.z === 'in') zoomAt(innerWidth / 2, innerHeight / 2, 1.2);
      else if (b.dataset.z === 'out') zoomAt(innerWidth / 2, innerHeight / 2, 0.83);
      else if (b.dataset.z === 'all') centerOn([L.W / 2, L.H / 2], Math.max(0.16, Math.min(innerWidth / L.W, innerHeight / L.H) * 0.95));
      else centerOn(L.T, homeScale());
    };
    view.appendChild(ctrls);

    // 快速傳送：搜尋 + 洲別
    const menu = h(`<div class="win world-menu ${innerWidth < 760 ? 'collapsed' : ''}">${winHTML(`🧭 快速傳送（${G.countries.length} 國）`, 'yellow', false)}
      <div class="win-body"><input class="input sm search" placeholder="搜尋國家…（中文或英文）" aria-label="搜尋國家">
        <div class="cont-tabs"><button data-cont="" class="on">★ 熱門</button>${CONTS.map(k => `<button data-cont="${k}">${k}</button>`).join('')}</div>
        <div class="country-grid"></div></div></div>`);
    menu.querySelector('.win-title').insertAdjacentHTML('beforeend', `<button class="btn sm toggle" aria-label="展開或收合">▾</button>`);
    menu.querySelector('.toggle').onclick = () => { menu.classList.toggle('collapsed'); SFX.play('select'); };
    const gridEl = menu.querySelector('.country-grid'), search = menu.querySelector('.search');
    let cont = '';
    const POPULAR = ['TW', 'JP', 'KR', 'CN', 'HK', 'VN', 'TH', 'PH', 'SG', 'MY', 'ID', 'US', 'FR', 'GB', 'DE', 'AU'];
    const fillMenu = () => {
      const q = search.value.trim().toLowerCase();
      let list = q ? G.countries.filter(c => c.name.includes(q) || c.en.toLowerCase().includes(q) || c.code.toLowerCase() === q)
        : cont ? G.countries.filter(c => c.cont === cont)
        : [...new Set([...G.countries.filter(c => counts[c.code]).map(c => c.code), ...POPULAR])].map(k => byCode[k]).filter(Boolean);
      gridEl.innerHTML = list.length ? '' : '<p style="grid-column:1/-1;font-size:12px;margin:4px">找不到這個國家…</p>';
      list.forEach(c => {
        const n = counts[c.code] || 0;
        const b = h(`<button class="btn sm ${c.home ? 'pink' : ''}"><span class="nm">${esc(c.name)}</span>${n ? `<span class="badge">${n}</span>` : ''}</button>`);
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
    const art = PX.drawIsland(grid, cell, { depth, seed: 99 });
    const wrap = view.querySelector('.map-wrap');
    const big = h(`<div class="big-isle" style="width:${art.w}px;height:${art.h}px"><div class="float"><div class="pins"></div></div></div>`);
    art.base.className = 'base'; art.base.style.left = -art.pad + 'px'; art.base.style.top = -art.pad + 'px';
    big.prepend(art.base);
    big.querySelector('.float').prepend(art.island);
    const pins = big.querySelector('.pins');

    const goCity = (city, e) => {
      SFX.play('confirm');
      if (e) sparkle(e.clientX, e.clientY, 14);
      nav(`#/c/${c.code}/${city.id}`);
    };

    // 標籤自動避開：先試指定方向（沒指定就右邊），撞到就換邊
    const placed = [];
    const hit = r => placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    c.cities.forEach(city => {
      let [x, y] = grid.toCell(city.lon, city.lat);
      x = Math.min(grid.w - 1, Math.max(1, x)) * cell; y = Math.min(grid.h - 1, Math.max(1, y)) * cell + cell / 2;
      const n = Store.byCity(c.code, city.id).length;
      const lw = city.name.length * 13 + 34 + (n ? 22 : 0);
      const rect = side => side === 'l' ? [x - lw, y - 26, x + 9, y] : [x - 9, y - 26, x + lw, y];
      let side = city.label || 'r';
      if (!city.label && hit(rect(side))) side = 'l';
      placed.push(rect(side));
      const pin = h(`<button class="pin ${side} ${n ? 'has' : ''}" style="left:${x}px;top:${y}px">
        <i class="gem"></i><span class="name">${esc(city.name)}${n ? `<span class="cnt">${n}</span>` : ''}</span></button>`);
      pin.style.transform = side === 'l' ? 'translate(calc(-100% + 9px), -100%)' : 'translate(-9px, -100%)';
      pin.addEventListener('mouseenter', () => SFX.play('hover'));
      pin.onclick = e => goCity(city, e);
      pins.appendChild(pin);
    });
    wrap.appendChild(big);

    // 城市清單
    const total = Store.byCountry(c.code).length;
    const menu = h(`<div class="win city-menu">${winHTML(`📍 ${esc(c.name)}・選擇城市`, 'pink', false)}
      <div class="win-body"><div class="country-head">${esc(c.en)} — ${total} EVENTS</div><ul class="city-list"></ul></div></div>`);
    const ul = menu.querySelector('.city-list');
    [...c.cities].sort((a, b) => Store.byCity(c.code, b.id).length - Store.byCity(c.code, a.id).length).forEach(city => {
      const n = Store.byCity(c.code, city.id).length;
      const li = h(`<li><button><span class="grow">${esc(city.name)}</span>${n ? `<span class="badge">${n}</span>` : '<span style="opacity:.4;font-size:11px">—</span>'}</button></li>`);
      li.querySelector('button').addEventListener('mouseenter', () => SFX.play('hover'));
      li.querySelector('button').onclick = () => goCity(city);
      ul.appendChild(li);
    });
    view.appendChild(menu);
    stage.appendChild(view);

    if (!seen('country.' + c.code)) {
      setTimeout(() => npc.say(c.home
        ? ['歡迎回到主島「台灣」！', '每個縣市都是一顆按鈕。發亮跳動的是「有活動」的城市，點進去看行事曆吧！']
        : [`抵達「${c.name}」！`, '這裡的城市一樣可以點，看看海外有什麼 Battle 和 Workshop。']), 500);
    }
  }

  /* ================= 城市行事曆 ================= */
  const calState = {};
  function CityView(c, city) {
    const key = c.code + '/' + city.id;
    const now = new Date();
    const st = calState[key] || (calState[key] = { y: now.getFullYear(), m: now.getMonth(), mode: 'upcoming', styles: new Set(), day: null });
    // 如果這個月沒活動、但之後有，預設跳到下一個有活動的月份
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner');
    stage.appendChild(view);

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

      const stylesHere = Store.STYLES;
      inner.innerHTML = `
        <div class="win">${winHTML(`📅 ${esc(c.name)}・${esc(city.name)}　活動行事曆`, 'teal', false)}
          <div class="win-body" style="display:grid;gap:14px">
            <div class="cal-head">
              <div class="seg" role="tablist">
                <button data-mode="upcoming" class="${st.mode === 'upcoming' ? 'on' : ''}">即將到來</button>
                <button data-mode="month" class="${st.mode === 'month' ? 'on' : ''}">月曆</button>
                <button data-mode="all" class="${st.mode === 'all' ? 'on' : ''}">全部</button>
              </div>
              <span class="grow"></span>
              <a class="btn sm" href="#/c/${c.code}">${I.back} 回到${esc(c.name)}</a>
              <button class="btn pink sm add-here">${I.plus} 在${esc(city.name)}新增活動</button>
            </div>
            <div class="chips">
              <button class="chip ${st.styles.size ? '' : 'on'}" data-style="" style="--c:var(--yellow)">全部舞風</button>
              ${stylesHere.map(s => `<button class="chip ${st.styles.has(s) ? 'on' : ''}" data-style="${esc(s)}" style="--c:${Store.STYLE_COLOR[s]}"><span class="dot"></span>${esc(s)}</button>`).join('')}
            </div>
            ${st.mode === 'month' ? monthGrid(filtered, today) : ''}
          </div>
        </div>
        <div class="list-head">${st.mode === 'month' ? (st.day ? `${st.day.replace(/-/g, '/')} 的活動` : `${st.y} 年 ${st.m + 1} 月的活動`) : st.mode === 'upcoming' ? '即將到來的活動' : '所有活動'}
          <span class="badge">${list.length}</span></div>
        <div class="cards">${list.length ? list.map((e, i) => cardHTML(e, i, today)).join('') : emptyHTML(city)}</div>`;

      if (!list.length) {
        const d = PX.dancer(5); d.el.classList.add('sprite');
        inner.querySelector('.empty').prepend(d.el);
        const t = setInterval(() => { if (!d.el.isConnected) clearInterval(t); else d.beat(); }, 420);
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
          <button class="btn sm" data-mon="-1" aria-label="上個月">◀</button>
          <div class="month">${st.y} 年 ${st.m + 1} 月</div>
          <button class="btn sm" data-mon="1" aria-label="下個月">▶</button>
          <button class="btn sm yellow" data-mon="0">今天</button>
        </div>
        <div class="month-grid">${WEEK.map(w => `<div class="dow">${w}</div>`).join('')}${cells}</div>`;
    }

    inner.addEventListener('click', e => {
      const t = e.target.closest('button, a'); if (!t) return;
      if (t.dataset.mode) { st.mode = t.dataset.mode; st.day = null; SFX.play('select'); draw(); }
      else if (t.dataset.style !== undefined) {
        const s = t.dataset.style;
        if (!s) st.styles.clear(); else st.styles.has(s) ? st.styles.delete(s) : st.styles.add(s);
        SFX.play('select'); draw();
      }
      else if (t.dataset.mon !== undefined) {
        const v = +t.dataset.mon;
        if (v === 0) { st.y = now.getFullYear(); st.m = now.getMonth(); }
        else { const d = new Date(st.y, st.m + v, 1); st.y = d.getFullYear(); st.m = d.getMonth(); }
        st.day = null; SFX.play('select'); draw();
      }
      else if (t.dataset.day) {
        if (!t.classList.contains('has')) return;
        st.day = st.day === t.dataset.day ? null : t.dataset.day; SFX.play('select'); draw();
      }
      else if (t.classList.contains('add-here')) openForm({ country: c.code, city: city.id });
      else if (t.dataset.act === 'edit') openForm(Store.get(t.dataset.ev));
      else if (t.dataset.act === 'del') confirmDelete(Store.get(t.dataset.ev), draw);
      else if (t.dataset.act === 'poster') openPoster(Store.get(t.dataset.ev));
      else if (t.dataset.act === 'map' || t.dataset.act === 'link') SFX.play('confirm');
    });
    draw(CityView.flash);
    CityView.flash = null;
    CityView.redraw = draw;

    if (!seen('city')) setTimeout(() => npc.say(['這裡是城市行事曆！', '「月曆」可以看整個月；每張卡片右邊有地圖📍和官網🔗按鈕。', '有活動沒被登錄？按「新增活動」把它加進來！']), 500);
  }

  function regStatus(e, today) {
    if (!e.regStart && !e.regEnd) return '';
    if (e.regStart && today < e.regStart) return `<span class="tag" style="--c:var(--blue)">報名尚未開始</span>`;
    if (e.regEnd && today > e.regEnd) return `<span class="tag" style="--c:#c9bfb5">報名已截止</span>`;
    return `<span class="tag" style="--c:var(--green)">● 報名中</span>`;
  }

  function cardHTML(e, i, today) {
    const d = parseDate(e.date);
    const color = Store.STYLE_COLOR[(e.styles || [])[0]] || 'var(--yellow)';
    const mapUrl = e.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address || e.venue || '')}`;
    const past = (e.endDate || e.date) < today;
    const timeStr = [e.startTime, e.endTime].filter(Boolean).join(' – ');
    const dateStr = e.endDate && e.endDate !== e.date ? `${(e.date || '').replace(/-/g, '/')} – ${e.endDate.slice(5).replace('-', '/')}` : (e.date || '').replace(/-/g, '/');
    const reg = (e.regStart || e.regEnd) ? `${(e.regStart || '?').replace(/-/g, '/')} ～ ${(e.regEnd || '?').replace(/-/g, '/')}` : '';
    const safeLink = /^https?:\/\//i.test(e.link || '') ? e.link : '';
    const rows = [
      ['🕒 日期時間', `${dateStr}${timeStr ? '　' + timeStr : ''}`],
      ['🏠 主辦', e.organizer],
      ['📍 地點', [e.venue, e.address].filter(Boolean).join('｜')],
      ['📝 報名期間', reg],
      ['✉ 報名方式', e.regMethod],
      ['💰 費用', e.fee],
      ['💬 備註', e.note]
    ].filter(r => r[1]);
    return `<article class="card ${e.poster ? 'has-poster' : ''} ${past ? 'past' : ''}" data-id="${esc(e.id)}" style="--i:${i};--c:${color}">
      ${e.poster ? `<button class="poster" data-act="poster" data-ev="${esc(e.id)}" aria-label="放大海報"><img src="${esc(e.poster)}" alt="${esc(e.name)} 海報" loading="lazy"></button>` : ''}
      <div class="date">
        <span class="m">${d ? d.getFullYear() + '/' + (d.getMonth() + 1) : ''}</span>
        <span class="d">${d ? pad2(d.getDate()) : '??'}</span>
        <span class="w">週${d ? WEEK[d.getDay()] : '?'}</span>
        ${e.startTime ? `<span class="tm">${esc(e.startTime)}</span>` : ''}
      </div>
      <div class="main">
        <div class="tags">${(e.styles || []).map(s => `<span class="tag" style="--c:${Store.STYLE_COLOR[s] || 'var(--cream)'}">${esc(s)}</span>`).join('')}
          ${regStatus(e, today)}${past ? '<span class="tag">已結束</span>' : ''}${e._src === 'local' ? '<span class="tag local" title="只存在這台瀏覽器，記得匯出">本機新增</span>' : ''}</div>
        <h3>${esc(e.name)}</h3>
        <dl class="info">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      </div>
      <div class="acts">
        ${(e.address || e.venue || e.mapUrl) ? `<a class="btn sm teal" data-act="map" href="${esc(mapUrl)}" target="_blank" rel="noopener">${I.pin} 地圖</a>` : ''}
        ${safeLink ? `<a class="btn sm orange" data-act="link" href="${esc(safeLink)}" target="_blank" rel="noopener">${I.link} 官網/IG</a>` : ''}
        <button class="btn sm" data-act="edit" data-ev="${esc(e.id)}">${I.edit} 編輯</button>
        <button class="btn sm" data-act="del" data-ev="${esc(e.id)}">${I.trash} 刪除</button>
      </div>
    </article>`;
  }

  const emptyHTML = city => `<div class="win empty"><div class="win-body">
      <p>${esc(city.name)}這裡還沒有活動……</p>
      <p style="font-size:13px;color:var(--ink-soft)">成為第一個登錄活動的勇者吧！</p>
      <button class="btn pink add-here">${I.plus} 新增活動</button></div></div>`;

  function openPoster(e) {
    modal({ title: '🖼 ' + e.name, color: 'blue', wide: true, body: `<div class="lightbox"><img src="${esc(e.poster)}" alt="${esc(e.name)} 海報"></div>` });
  }

  function confirmDelete(e, after) {
    const m = modal({
      title: '⚠ 確認刪除', color: 'pink',
      body: `<p>確定要刪除「${esc(e.name)}」嗎？</p>
        <p style="font-size:12px;color:var(--ink-soft)">${e._src === 'seed' ? '這是 GitHub 上的活動：只會在這台瀏覽器隱藏，匯出 events.js 後才會真的移除。' : '這個活動只存在這台瀏覽器。'}</p>
        <div class="form-foot"><button class="btn no">NO</button><button class="btn red yes">YES，刪除</button></div>`
    });
    m.el.querySelector('.no').onclick = m.close;
    m.el.querySelector('.yes').onclick = () => { Store.remove(e.id); m.close(); toast('活動已刪除', '✕'); after && after(); };
  }

  /* ================= 新增 / 編輯活動 ================= */
  function openForm(init = {}) {
    const editing = !!init.id;
    const e = { styles: [], country: 'TW', city: 'taipei', ...init };
    const opt = c => `<option value="${c.code}" ${c.code === e.country ? 'selected' : ''}>${esc(c.name)}　${esc(c.en)}</option>`;
    const countryOpts = opt(byCode.TW) + CONTS.map(k => `<optgroup label="${k}">${G.countries.filter(c => c.cont === k && !c.home).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')).map(opt).join('')}</optgroup>`).join('');
    const posterMode = !e.poster ? 'none' : e.poster.startsWith('data:') ? 'upload' : 'url';
    const body = h(`<form class="form" novalidate>
      <label class="field full"><span>活動名稱 <b>*</b></span><input class="input" name="name" value="${esc(e.name)}" placeholder="例：Island Cypher Vol.1" required></label>
      <label class="field"><span>主辦方</span><input class="input" name="organizer" value="${esc(e.organizer)}" placeholder="主辦單位 / Crew"></label>
      <div class="field"><span>國家 / 城市 <b>*</b></span><div class="row2">
        <select class="input" name="country">${countryOpts}</select><select class="input" name="city"></select></div></div>
      <label class="field"><span>場地名稱</span><input class="input" name="venue" value="${esc(e.venue)}" placeholder="例：華山文創園區"></label>
      <label class="field"><span>地址（會用來開 Google Map）</span><input class="input" name="address" value="${esc(e.address)}" placeholder="例：台北市中正區八德路一段1號"></label>

      <fieldset class="fieldset full"><legend>賽事分類（可複選）<b style="color:var(--red)">*</b></legend>
        <div class="chips">${Store.STYLES.map(s => `<label class="chip ${e.styles.includes(s) ? 'on' : ''}" style="--c:${Store.STYLE_COLOR[s]}"><input type="checkbox" name="styles" value="${esc(s)}" ${e.styles.includes(s) ? 'checked' : ''} hidden><span class="dot"></span>${esc(s)}</label>`).join('')}</div>
      </fieldset>

      <fieldset class="fieldset full"><legend>🕒 活動日期與時間</legend>
        <div class="row2"><label class="field"><span>活動日期 <b>*</b></span><input class="input" type="date" name="date" value="${esc(e.date)}"></label>
          <label class="field"><span>結束日期（多日活動才填）</span><input class="input" type="date" name="endDate" value="${esc(e.endDate)}"></label></div>
        <div class="row2"><label class="field"><span>開始時間</span><input class="input" type="time" name="startTime" value="${esc(e.startTime)}"></label>
          <label class="field"><span>結束時間</span><input class="input" type="time" name="endTime" value="${esc(e.endTime)}"></label></div>
      </fieldset>

      <fieldset class="fieldset full"><legend>📝 報名資訊</legend>
        <div class="row2"><label class="field"><span>報名開始</span><input class="input" type="date" name="regStart" value="${esc(e.regStart)}"></label>
          <label class="field"><span>報名截止</span><input class="input" type="date" name="regEnd" value="${esc(e.regEnd)}"></label></div>
        <div class="row2"><label class="field"><span>報名方式</span><input class="input" name="regMethod" value="${esc(e.regMethod)}" placeholder="例：IG 私訊 / Google 表單 / 現場"></label>
          <label class="field"><span>費用</span><input class="input" name="fee" value="${esc(e.fee)}" placeholder="例：選手 NT$300｜觀眾免費"></label></div>
      </fieldset>

      <label class="field full"><span>${I.link} 活動官網 / 官方 IG 連結</span><input class="input" name="link" type="url" value="${esc(e.link)}" placeholder="https://www.instagram.com/..."></label>
      <label class="field full"><span>${I.pin} Google Map 連結（選填，不填就用地址搜尋）</span><input class="input" name="mapUrl" type="url" value="${esc(e.mapUrl)}" placeholder="https://maps.app.goo.gl/..."></label>

      <fieldset class="fieldset full"><legend>${I.image} 活動海報</legend>
        <div class="seg" style="justify-self:start">
          <button type="button" data-pm="none" class="${posterMode === 'none' ? 'on' : ''}">不放海報</button>
          <button type="button" data-pm="upload" class="${posterMode === 'upload' ? 'on' : ''}">上傳圖片</button>
          <button type="button" data-pm="url" class="${posterMode === 'url' ? 'on' : ''}">圖片網址</button>
        </div>
        <input type="file" accept="image/*" class="input pm-upload ${posterMode === 'upload' ? '' : 'hidden'}">
        <input class="input pm-url ${posterMode === 'url' ? '' : 'hidden'}" name="posterUrl" placeholder="https://... 或 posters/檔名.jpg" value="${posterMode === 'url' ? esc(e.poster) : ''}">
        <img class="poster-prev ${e.poster ? '' : 'hidden'}" src="${esc(e.poster || '')}" alt="海報預覽">
      </fieldset>

      <label class="field full"><span>備註</span><textarea class="input" name="note" placeholder="評審、DJ、獎金、注意事項…">${esc(e.note)}</textarea></label>
      <div class="full"><div class="err"></div><div class="form-foot">
        <button type="button" class="btn cancel">CANCEL</button>
        <button type="submit" class="btn pink">${editing ? '★ 儲存修改' : '★ 登錄活動'}</button></div></div>
    </form>`);

    const m = modal({ title: editing ? '✎ 編輯活動' : '＋ 新增活動', color: 'pink', body, wide: true });
    const f = body;
    const citySel = f.elements.city;
    const fillCities = (cc, sel) => { citySel.innerHTML = byCode[cc].cities.map(ci => `<option value="${ci.id}" ${ci.id === sel ? 'selected' : ''}>${esc(ci.name)}</option>`).join(''); };
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
        // 縮小海報避免塞爆瀏覽器儲存空間
        const max = 720, k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        poster = cv.toDataURL('image/jpeg', 0.78); showPrev(poster); SFX.play('coin');
      };
      rd.readAsDataURL(file);
    };

    f.querySelector('.cancel').onclick = m.close;
    f.onsubmit = ev => {
      ev.preventDefault();
      const fd = new FormData(f);
      const get = k => (fd.get(k) || '').toString().trim();
      const out = {
        ...(editing ? { id: e.id } : {}),
        name: get('name'), organizer: get('organizer'), country: get('country'), city: get('city'),
        venue: get('venue'), address: get('address'), styles: fd.getAll('styles'),
        date: get('date'), endDate: get('endDate'), startTime: get('startTime'), endTime: get('endTime'),
        regStart: get('regStart'), regEnd: get('regEnd'), regMethod: get('regMethod'), fee: get('fee'),
        link: get('link'), mapUrl: get('mapUrl'), note: get('note'),
        poster: pm === 'none' ? '' : pm === 'url' ? get('posterUrl') : (poster.startsWith('data:') ? poster : '')
      };
      Object.keys(out).forEach(k => { if (out[k] === '' && k !== 'poster') delete out[k]; });
      const err = f.querySelector('.err');
      f.querySelectorAll('.bad').forEach(x => x.classList.remove('bad'));
      const bad = [];
      if (!out.name) bad.push(['name', '請輸入活動名稱']);
      if (!out.date) bad.push(['date', '請選擇活動日期']);
      if (!out.styles.length) bad.push([null, '請至少選一個賽事分類']);
      if (out.endDate && out.date && out.endDate < out.date) bad.push(['endDate', '結束日期不能早於活動日期']);
      if (out.regStart && out.regEnd && out.regEnd < out.regStart) bad.push(['regEnd', '報名截止不能早於報名開始']);
      if (out.link && !/^https?:\/\//i.test(out.link)) bad.push(['link', '連結請以 https:// 開頭']);
      if (bad.length) {
        SFX.play('error');
        err.textContent = '✕ ' + bad.map(b => b[1]).join('、');
        bad.forEach(([n]) => n && f.elements[n].classList.add('bad'));
        return;
      }
      let saved;
      try { saved = Store.upsert(out); } catch (x) { SFX.play('error'); err.textContent = '✕ ' + x.message; return; }
      m.close();
      setTimeout(() => {
        SFX.play('fanfare');
        toast(editing ? '活動資料已更新！' : `獲得新活動「${saved.name}」！`, '★');
        sparkle(innerWidth / 2, 90, 16);
        CityView.flash = saved.id;
        const target = `#/c/${saved.country}/${saved.city}`;
        const d = parseDate(saved.date);
        const k = saved.country + '/' + saved.city;
        if (calState[k] && d && calState[k].mode === 'month') { calState[k].y = d.getFullYear(); calState[k].m = d.getMonth(); calState[k].day = null; }
        if (location.hash === target && CityView.redraw) { CityView.redraw(saved.id); CityView.flash = null; }
        else nav(target);
        if (!seen('exportHint')) setTimeout(() => npc.say(['活動已存進「這台瀏覽器」。', '要讓所有人都看到，記得按右上角「💾 存檔」匯出 events.js，再上傳到 GitHub 喔！']), 1200);
      }, 220);
    };
  }

  /* ================= 存檔管理 ================= */
  function openSave() {
    const s = Store.stats();
    const body = h(`<div>
      <div class="save-stats">
        <div class="stat">GitHub 活動<div class="v">${s.seed}</div></div>
        <div class="stat">本機新增/修改<div class="v">${s.local}</div></div>
        <div class="stat">目前總數<div class="v">${s.total}</div></div>
      </div>
      <p style="margin:0 0 8px">讓活動<b>永久</b>出現在網站上（所有人都看得到）：</p>
      <ol class="steps">
        <li>在網站上新增 / 編輯活動（會先存在這台瀏覽器）</li>
        <li>按下面的「匯出 events.js」</li>
        <li>到 GitHub 專案，把 <code>data/events.js</code> 換成剛下載的檔案</li>
        <li>Commit 後等 1 分鐘，GitHub Pages 就更新了 ✦</li>
      </ol>
      <div class="btn-row">
        <button class="btn pink exp-js">${I.disk} 匯出 events.js</button>
        <button class="btn exp-json">匯出 JSON 備份</button>
        <label class="btn">匯入 JSON<input type="file" accept=".json,application/json" hidden class="imp"></label>
        <button class="btn red reset">清除本機變更</button>
      </div>
      <p style="font-size:12px;color:var(--ink-soft);margin:0">小提醒：上傳的海報會直接存在 events.js 裡，海報多的話建議把圖片放進 <code>posters/</code> 資料夾，表單改填「圖片網址」<code>posters/檔名.jpg</code>。</p>
    </div>`);
    const m = modal({ title: '💾 存檔管理 SAVE DATA', color: 'yellow', body });
    body.querySelector('.exp-js').onclick = () => { download('events.js', Store.exportJS()); SFX.play('coin'); toast('已下載 events.js', '💾'); };
    body.querySelector('.exp-json').onclick = () => { download('dance-island-backup.json', Store.exportJSON(), 'application/json'); SFX.play('coin'); };
    body.querySelector('.imp').onchange = ev => {
      const file = ev.target.files[0]; if (!file) return;
      file.text().then(t => { const n = Store.importJSON(t); toast(`匯入 ${n} 筆活動`, '★'); m.close(); render(); })
        .catch(x => { SFX.play('error'); toast('匯入失敗：' + x.message, '✕'); });
    };
    body.querySelector('.reset').onclick = () => {
      if (!confirm('確定清除這台瀏覽器的所有新增 / 修改 / 刪除？（GitHub 上的活動不受影響）')) return;
      Store.resetLocal(); m.close(); toast('已清除本機變更', '✕'); render();
    };
  }

  /* ================= 開機 ================= */
  function boot() {
    const bootEl = document.getElementById('boot');
    const bar = bootEl.querySelector('.bar');
    bar.innerHTML = '<i></i>'.repeat(20);
    const d = PX.dancer(5);
    bootEl.querySelector('.boot-dancer').appendChild(d.el);
    const dt = setInterval(() => d.beat(), 300);
    const msgs = ['生成島嶼中…', '鋪設舞池中…', '調整 BPM…', '召喚舞者…', 'READY!'];
    let i = 0;
    const st = bootEl.querySelector('.boot-status span');
    const pct = bootEl.querySelector('.boot-status b');
    const t = setInterval(() => {
      bar.children[i].classList.add('on'); i++;
      pct.textContent = i * 5 + '%';
      st.textContent = msgs[Math.min(msgs.length - 1, Math.floor(i / 5))];
      if (i >= 20) { clearInterval(t); bootEl.querySelector('.start').classList.remove('hidden'); bootEl.querySelector('.start').focus(); }
    }, 55);
    bootEl.querySelector('.start').onclick = () => {
      SFX.init(); SFX.play('fanfare'); clearInterval(dt);
      bootEl.remove();
      document.getElementById('hud').classList.remove('hidden');
      render();
      if (!seen('intro')) setTimeout(() => npc.say([
        '嗨！歡迎來到「舞島 DANCE ISLAND」！我是嚮導 B-BOT。',
        '中間粉紅色的是台灣主島，周圍漂浮的是世界各國。拖曳可以移動地圖，滾輪可以縮放。',
        '點擊島嶼進入城市，就能看到活動行事曆。右上角可以新增活動、玩小遊戲！'
      ]), 900);
    };
  }

  /* HUD 按鈕 */
  document.querySelector('.hud-add').onclick = () => {
    SFX.play('select');
    const r = parseRoute();
    openForm(r.view === 'city' ? { country: r.cc, city: r.city } : r.cc ? { country: r.cc, city: byCode[r.cc].cities[0].id } : {});
  };
  document.querySelector('.hud-save').onclick = () => { SFX.play('select'); openSave(); };
  document.querySelector('.hud-game').onclick = () => { SFX.play('select'); Games.open(); };
  const sndBtn = document.querySelector('.hud-sound');
  const sndIcon = () => { sndBtn.innerHTML = SFX.on ? I.sound : I.mute; sndBtn.setAttribute('aria-label', SFX.on ? '關閉音效' : '開啟音效'); };
  sndIcon();
  sndBtn.onclick = () => { SFX.toggle(); sndIcon(); SFX.play('select'); };
  document.querySelector('.hud-add .ic').innerHTML = I.plus;
  document.querySelector('.hud-game .ic').innerHTML = I.game;
  document.querySelector('.hud-save .ic').innerHTML = I.disk;

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (current && current.view === 'country') { stage.innerHTML = ''; CountryView(byCode[current.cc]); } }, 250); });

  boot();
})();
