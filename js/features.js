/* =========================================================
 * 便民 / 好玩功能（第一批）
 * - 活動總覽 + 搜尋 + 篩選（#/events，#/events/near = 附近的活動）
 * - 分享連結（#/e/活動ID）＋ 分享圖卡
 * - 加入行事曆（Google / Apple .ics）
 * - 首頁倒數看板、日夜與節慶變化
 * 這個檔案在 app.js 之前載入，先建立 window.App 讓 app.js 掛上需要的東西
 * ========================================================= */
window.App = {
  views: {}, crumbs: {},
  cardExtras: () => '', cardResults: () => '',
  onCardAct: () => false, worldExtras: null
};

(() => {
  const { h, esc, modal, toast, sparkle, download } = UI;
  const A = window.App;
  const pad2 = n => String(n).padStart(2, '0');
  const DAY = 864e5;
  const daysUntil = (dateStr, today) => Math.round((new Date(dateStr + 'T00:00') - new Date(today + 'T00:00')) / DAY);

  /* ---------- 時區（行事曆用） ---------- */
  const TZ = { TW: 'Asia/Taipei', JP: 'Asia/Tokyo', KR: 'Asia/Seoul', CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong', MO: 'Asia/Macau', SG: 'Asia/Singapore', TH: 'Asia/Bangkok',
    VN: 'Asia/Ho_Chi_Minh', PH: 'Asia/Manila', MY: 'Asia/Kuala_Lumpur', ID: 'Asia/Jakarta', IN: 'Asia/Kolkata', AU: 'Australia/Sydney', NZ: 'Pacific/Auckland',
    GB: 'Europe/London', FR: 'Europe/Paris', DE: 'Europe/Berlin', ES: 'Europe/Madrid', IT: 'Europe/Rome', NL: 'Europe/Amsterdam', RU: 'Europe/Moscow', CA: 'America/Toronto', BR: 'America/Sao_Paulo', MX: 'America/Mexico_City' };
  const tzOf = e => {
    if (e.country === 'US') { const ci = A.cityOf('US', e.city), lon = ci ? ci.lon : -74; return lon < -115 ? 'America/Los_Angeles' : lon < -100 ? 'America/Denver' : lon < -86 ? 'America/Chicago' : 'America/New_York'; }
    return TZ[e.country] || null;
  };
  const placeOf = e => [e.venue, e.address, nm(A.cityOf(e.country, e.city)), nm(A.byCode[e.country])].filter(Boolean).join(', ');
  const eventUrl = e => location.origin + location.pathname + '#/e/' + encodeURIComponent(e.id);

  /* ---------- 加入行事曆 ---------- */
  const stamp = (d, tm) => d.replace(/-/g, '') + (tm ? 'T' + tm.replace(':', '') + '00' : '');
  const nextDay = d => { const x = new Date(d + 'T00:00'); x.setDate(x.getDate() + 1); return A.ymd(x); };
  function googleUrl(e) {
    const end = e.endDate || e.date;
    const dates = e.startTime ? `${stamp(e.date, e.startTime)}/${stamp(end, e.endTime || e.startTime)}` : `${stamp(e.date)}/${stamp(nextDay(end))}`;
    const q = new URLSearchParams({ action: 'TEMPLATE', text: e.name, dates, details: `${e.organizer || ''}\n${e.link || ''}\n${eventUrl(e)}`.trim(), location: placeOf(e) });
    const tz = tzOf(e); if (tz && e.startTime) q.set('ctz', tz);
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  function icsText(e) {
    const tz = tzOf(e), end = e.endDate || e.date;
    const escI = s => String(s || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const dt = (k, d, tm) => (tm ? `${k}${tz ? ';TZID=' + tz : ''}:${stamp(d, tm)}` : `${k};VALUE=DATE:${stamp(d)}`);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dance Island//EN', 'BEGIN:VEVENT',
      'UID:' + e.id + '@dance-island', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      dt('DTSTART', e.date, e.startTime), e.startTime ? dt('DTEND', end, e.endTime || e.startTime) : dt('DTEND', nextDay(end)),
      'SUMMARY:' + escI(e.name), 'LOCATION:' + escI(placeOf(e)), 'DESCRIPTION:' + escI(`${e.organizer || ''} ${e.link || ''} ${eventUrl(e)}`), 'URL:' + eventUrl(e),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + escI(e.name), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function openCalendar(e) {
    const body = h(`<div class="cal-pick"><p>${t('cal_q')}</p>
      <a class="btn teal" href="${esc(googleUrl(e))}" target="_blank" rel="noopener">📅 Google Calendar</a>
      <button class="btn orange ics">🍎 Apple / Outlook (.ics)</button></div>`);
    const m = modal({ title: t('cal_title'), color: 'teal', body });
    body.querySelector('a').onclick = () => { SFX.play('confirm'); setTimeout(m.close, 200); };
    body.querySelector('.ics').onclick = () => { download((e.name || 'event').replace(/[\\/:*?"<>|]/g, '') + '.ics', icsText(e), 'text/calendar'); SFX.play('coin'); m.close(); };
  }

  /* ---------- 分享圖卡 ---------- */
  async function drawShareCard(e) {
    try { await document.fonts.ready; } catch (x) {}
    const W = 1080, H = 1350, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const F = n => `${n}px Cubic11, "PingFang TC", sans-serif`;
    const color = Store.STYLE_COLOR[(e.styles || [])[0]] || '#eac45a';
    // 背景格子
    g.fillStyle = '#c9d8f5'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e3ebfb'; for (let x = 0; x < W; x += 54) g.fillRect(x, 0, 4, H); for (let y = 0; y < H; y += 54) g.fillRect(0, y, W, 4);
    // 視窗
    const X = 70, Y = 110, WW = W - 140, HH = H - 230;
    g.fillStyle = '#3b2b2b'; g.fillRect(X + 14, Y + 14, WW, HH); g.fillRect(X - 6, Y - 6, WW + 12, HH + 12);
    g.fillStyle = '#fff6e8'; g.fillRect(X, Y, WW, HH);
    g.fillStyle = '#f07ca3'; g.fillRect(X, Y, WW, 90); g.fillStyle = '#3b2b2b'; g.fillRect(X, Y + 90, WW, 6);
    g.fillStyle = '#3b2b2b'; g.font = F(40); g.textBaseline = 'middle'; g.fillText('DANCE ISLAND 舞島', X + 32, Y + 46);
    // 日期色塊
    const d = A.parseDate(e.date);
    g.fillStyle = '#3b2b2b'; g.fillRect(X + 40, Y + 140, 260, 300);
    g.fillStyle = color; g.fillRect(X + 46, Y + 146, 248, 288);
    g.fillStyle = '#3b2b2b'; g.textAlign = 'center';
    g.font = F(40); g.fillText(d ? `${d.getFullYear()}/${d.getMonth() + 1}` : '', X + 170, Y + 200);
    g.font = F(140); g.fillText(d ? pad2(d.getDate()) : '??', X + 170, Y + 300);
    g.font = F(40); g.fillText(d ? t('wk').replace('{w}', t('week')[d.getDay()]) : '', X + 170, Y + 395);
    g.textAlign = 'left';
    // 標題（自動換行）
    const wrap = (text, x, y, maxW, lh, max = 3) => {
      const out = []; let line = '';
      for (const ch of String(text)) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
      if (line) out.push(line);
      out.slice(0, max).forEach((l, i) => g.fillText(i === max - 1 && out.length > max ? l.slice(0, -1) + '…' : l, x, y + i * lh));
      return Math.min(out.length, max) * lh;
    };
    g.font = F(64); g.fillStyle = '#3b2b2b';
    wrap(e.name, X + 340, Y + 190, WW - 380, 80, 3);
    // 舞風
    let sx = X + 40, sy = Y + 500;
    g.font = F(34);
    (e.styles || []).forEach(s => {
      const w = g.measureText(s).width + 36;
      if (sx + w > X + WW - 40) { sx = X + 40; sy += 66; }
      g.fillStyle = '#3b2b2b'; g.fillRect(sx - 4, sy - 4, w + 8, 56);
      g.fillStyle = Store.STYLE_COLOR[s] || '#eac45a'; g.fillRect(sx, sy, w, 48);
      g.fillStyle = '#3b2b2b'; g.fillText(s, sx + 18, sy + 25);
      sx += w + 20;
    });
    // 資訊
    const info = [
      ['🕒', [e.startTime, e.endTime].filter(Boolean).join(' – ')],
      ['📍', [nm(A.byCode[e.country]), nm(A.cityOf(e.country, e.city)), e.venue].filter(Boolean).join('・')],
      ['🏠', e.organizer], ['💰', e.fee], ['📝', e.regEnd ? t('share_reg_end', { d: e.regEnd.replace(/-/g, '/') }) : '']
    ].filter(r => r[1]);
    g.font = F(40);
    let iy = sy + 120;
    info.forEach(([ic, v]) => { g.fillText(ic, X + 40, iy); iy += wrap(v, X + 110, iy, WW - 160, 52, 2) + 18; });
    // 角色
    try {
      const av = Avatar.render(Player.me ? Player.me.look : Avatar.DEFAULT, 1, 5);
      g.drawImage(av, X + WW - av.width - 30, Y + HH - av.height - 20);
    } catch (x) {}
    // 網址
    g.fillStyle = '#3b2b2b'; g.font = F(30);
    g.fillText(eventUrl(e).replace(/^https?:\/\//, ''), X + 40, Y + HH - 50);
    g.font = F(36); g.textAlign = 'center'; g.fillText('🏝 ' + t('share_footer'), W / 2, H - 55);
    return cv;
  }
  async function openShare(e) {
    const url = eventUrl(e);
    const body = h(`<div class="share"><div class="share-prev"><p class="note">…</p></div>
      <div class="btn-row"><button class="btn pink sh">📤 ${t('share_send')}</button><button class="btn dl">⬇ ${t('share_dl')}</button><button class="btn teal cp">🔗 ${t('share_copy')}</button>
      <a class="btn" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}">LINE</a></div></div>`);
    modal({ title: t('share_title'), color: 'pink', body, wide: true });
    const cv = await drawShareCard(e);
    const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = e.name;
    body.querySelector('.share-prev').innerHTML = ''; body.querySelector('.share-prev').appendChild(img);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'dance-island.png', { type: 'image/png' });
    body.querySelector('.dl').onclick = () => { const a = document.createElement('a'); a.href = img.src; a.download = (e.name || 'event') + '.png'; a.click(); SFX.play('coin'); };
    body.querySelector('.cp').onclick = async () => { try { await navigator.clipboard.writeText(url); toast(t('share_copied'), '🔗'); } catch (x) { window.prompt('URL', url); } };
    const sh = body.querySelector('.sh');
    if (!navigator.share) sh.classList.add('hidden');
    sh.onclick = async () => {
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: e.name, text: e.name + ' ' + url });
        else await navigator.share({ title: e.name, text: e.name, url });
      } catch (x) {}
    };
  }

  /* ---------- 活動卡片多出來的按鈕 ---------- */
  A.cardExtras = (e, past) => `
    <button class="btn sm" data-act="cal" data-ev="${esc(e.id)}">📅 ${t('b_cal')}</button>
    <button class="btn sm pink" data-act="share" data-ev="${esc(e.id)}">📤 ${t('b_share')}</button>` + (A.cardExtras2 ? A.cardExtras2(e, past) : '');
  A.onCardAct = (a, ev, tg, redraw) => {
    if (!ev) return false;
    if (a === 'cal') { SFX.play('select'); openCalendar(ev); return true; }
    if (a === 'share') { SFX.play('select'); openShare(ev); return true; }
    return A.onCardAct2 ? A.onCardAct2(a, ev, tg, redraw) : false;
  };

  /* ---------- 分享連結 #/e/活動ID ---------- */
  A.views.e = r => {
    const ev = Store.get(r.arg[0]);
    if (!ev) { toast(t('ev_notfound'), '?'); return A.nav('#/events'); }
    setTimeout(() => A.goEvent(ev.country + '/' + ev.city, ev.id), 0);
  };

  /* ---------- 附近：取得目前位置 ---------- */
  let here = null;
  const getHere = () => new Promise((res, rej) => {
    if (here) return res(here);
    if (!navigator.geolocation) return rej(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(p => res(here = [p.coords.latitude, p.coords.longitude]), rej, { timeout: 10000, maximumAge: 600000 });
  });
  const km = (a, b) => {
    const R = 6371, r = x => (x * Math.PI) / 180, dl = r(b[0] - a[0]), dn = r(b[1] - a[1]);
    const q = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(q)));
  };
  const lonNorm = l => ((l + 540) % 360) - 180;
  const distOf = e => { const c = A.cityOf(e.country, e.city); return here && c ? km(here, [c.lat, lonNorm(c.lon)]) : null; };

  /* ---------- 活動總覽 ---------- */
  const fs = { q: '', when: 'upcoming', region: '', styles: new Set(), open: false };
  A.crumbs.events = r => (r.arg[0] === 'near' ? '📍 ' + t('ev_near') : '📋 ' + t('ev_all'));
  A.views.events = (r, stage) => {
    if (r.arg[0] === 'near') fs.region = 'near';
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner');
    stage.appendChild(view);
    inner.innerHTML = `<div class="win">${UI.winHTML('📋 ' + t('ev_all'), 'teal', false)}
      <div class="win-body ev-filters">
        <input class="input q" placeholder="${esc(t('ev_search'))}" value="${esc(fs.q)}">
        <div class="ev-row">
          <select class="input sm when">${['upcoming', 'week', 'month', 'past', 'all'].map(k => `<option value="${k}" ${fs.when === k ? 'selected' : ''}>${t('ev_w_' + k)}</option>`).join('')}</select>
          <select class="input sm region"><option value="">${t('ev_r_all')}</option><option value="near" ${fs.region === 'near' ? 'selected' : ''}>📍 ${t('ev_near')}</option>
            <option value="TW" ${fs.region === 'TW' ? 'selected' : ''}>${esc(nm(A.byCode.TW))}</option>${A.CONTS.map(k => `<option value="${k}" ${fs.region === k ? 'selected' : ''}>${A.contName(k)}</option>`).join('')}</select>
          <label class="chk"><input type="checkbox" class="open" ${fs.open ? 'checked' : ''}> ${t('ev_open')}</label>
        </div>
        <div class="chips">${Store.STYLES.map(s => `<button class="chip ${fs.styles.has(s) ? 'on' : ''}" data-style="${esc(s)}" style="--c:${Store.STYLE_COLOR[s]}"><span class="dot"></span>${esc(s)}</button>`).join('')}</div>
      </div></div>
      <div class="list-head"><span class="ev-count"></span></div><div class="cards ev-list"></div>`;
    const listEl = inner.querySelector('.ev-list'), countEl = inner.querySelector('.ev-count');
    const draw = async () => {
      const today = A.todayStr(), wk = A.ymd(new Date(Date.now() + 7 * DAY)), mo = A.ymd(new Date(Date.now() + 31 * DAY));
      if (fs.region === 'near' && !here) {
        listEl.innerHTML = `<p class="note">${t('ev_locating')}</p>`;
        try { await getHere(); } catch (x) { listEl.innerHTML = `<p class="note">${t('ev_noloc')}</p>`; return; }
      }
      const q = fs.q.trim().toLowerCase();
      let list = Store.all().filter(e => {
        const end = e.endDate || e.date;
        if (fs.when === 'upcoming' && end < today) return false;
        if (fs.when === 'week' && (end < today || e.date > wk)) return false;
        if (fs.when === 'month' && (end < today || e.date > mo)) return false;
        if (fs.when === 'past' && end >= today) return false;
        const c = A.byCode[e.country];
        if (fs.region && fs.region !== 'near' && (fs.region === 'TW' ? e.country !== 'TW' : !c || c.cont !== fs.region)) return false;
        if (fs.styles.size && !(e.styles || []).some(s => fs.styles.has(s))) return false;
        if (fs.open && !(e.regEnd && e.regEnd >= today && (!e.regStart || e.regStart <= today))) return false;
        if (q) {
          const hay = [e.name, e.organizer, e.venue, e.address, ...(e.styles || []), nm(c), c && c.en, nm(A.cityOf(e.country, e.city))].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      if (fs.region === 'near') list = list.map(e => ({ e, d: distOf(e) })).sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9)).map(x => x.e);
      if (fs.when === 'past') list.reverse();
      countEl.textContent = t('ev_count', { n: list.length });
      const canEdit = Store.canEdit();
      let html = '', lastM = '';
      list.forEach((e, i) => {
        const m = (e.date || '').slice(0, 7);
        if (fs.region !== 'near' && m !== lastM) { lastM = m; const [y, mm] = m.split('-'); html += `<div class="month-sep">${t('month_title', { y, m: +mm })}</div>`; }
        html += A.cardHTML(e, Math.min(i, 12), today, canEdit, { place: true, dist: fs.region === 'near' ? distOf(e) : null });
      });
      listEl.innerHTML = html || `<div class="win empty"><div class="win-body"><p>${t('ev_none')}</p></div></div>`;
      A.loadCommentCounts(listEl);
    };
    let tmr;
    inner.querySelector('.q').oninput = ev => { fs.q = ev.target.value; clearTimeout(tmr); tmr = setTimeout(draw, 200); };
    inner.querySelector('.when').onchange = ev => { fs.when = ev.target.value; SFX.play('select'); draw(); };
    inner.querySelector('.region').onchange = ev => { fs.region = ev.target.value; SFX.play('select'); draw(); };
    inner.querySelector('.open').onchange = ev => { fs.open = ev.target.checked; SFX.play('select'); draw(); };
    inner.addEventListener('click', ev => {
      const tg = ev.target.closest('button, a'); if (!tg) return;
      if (tg.dataset.style !== undefined && tg.classList.contains('chip')) {
        const s = tg.dataset.style; fs.styles.has(s) ? fs.styles.delete(s) : fs.styles.add(s); tg.classList.toggle('on'); SFX.play('select'); return draw();
      }
      A.cardAct(tg, draw);
    });
    draw();
  };

  /* ---------- 世界地圖：倒數看板 + 日夜 / 節慶 ---------- */
  const tpe = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, md: `${p.month}-${p.day}`, hour: +p.hour };
  };
  const LUNAR_NY = ['2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23'];
  function festival(d) {
    const md = d.md;
    if (md >= '10-24' && md <= '11-01') return { fx: 'pumpkin', msg: 'fest_halloween' };
    if (md >= '12-01' && md <= '12-31') return { fx: 'snow', msg: md >= '12-20' ? 'fest_xmas' : null };
    if (md === '01-01') return { fx: 'confetti', msg: 'fest_newyear' };
    if (md >= '02-12' && md <= '02-14') return { fx: 'heart', msg: md === '02-14' ? 'fest_valentine' : null };
    if (LUNAR_NY.some(x => Math.abs(new Date(d.date) - new Date(x)) <= 7 * DAY)) return { fx: 'lantern', msg: 'fest_lunar' };
    return null;
  }
  A.worldExtras = view => {
    const today = A.todayStr();
    // 倒數看板
    const soon = Store.all().filter(e => (e.endDate || e.date) >= today).slice(0, 8);
    if (soon.length) {
      const bar = h(`<button class="cd-ticker" aria-live="polite"><span class="tk-ico">🔥</span><span class="tk-txt"></span></button>`);
      let i = 0;
      const show = () => {
        const e = soon[i % soon.length], n = daysUntil(e.date, today);
        const when = n <= 0 && (e.endDate || e.date) >= today ? t('tk_today') : n === 1 ? t('tk_tomorrow') : t('tk_days', { n });
        bar.querySelector('.tk-txt').textContent = `${e.name}・${nm(A.cityOf(e.country, e.city))}　${when}`;
        bar.dataset.ev = e.id; bar.classList.remove('flip'); void bar.offsetWidth; bar.classList.add('flip');
      };
      show();
      const tm = setInterval(() => { if (!bar.isConnected) return clearInterval(tm); i++; show(); }, 4500);
      bar.onclick = () => { const e = Store.get(bar.dataset.ev); if (e) { SFX.play('confirm'); A.goEvent(e.country + '/' + e.city, e.id); } };
      view.appendChild(bar);
    }
    // 附近活動按鈕
    const ctrls = view.querySelector('.map-ctrls');
    if (ctrls) { const b = h(`<button class="btn icon teal" aria-label="${esc(t('ev_near'))}" title="${esc(t('ev_near'))}">📍</button>`); b.onclick = () => { SFX.play('select'); A.nav('#/events/near'); }; ctrls.prepend(b); }
    // 日夜
    const d = tpe(), hr = d.hour;
    const phase = hr >= 6 && hr < 16 ? 'day' : hr >= 16 && hr < 19 ? 'dusk' : 'night';
    view.dataset.phase = phase;
    view.appendChild(h(`<div class="daynight ${phase}"></div>`));
    if (phase === 'night') { const l = Themes.fxLayer('spark'); if (l) { l.classList.add('fixed'); view.appendChild(l); } }
    // 節慶
    const f = festival(d);
    if (f) {
      const l = Themes.fxLayer(f.fx); if (l) { l.classList.add('fixed'); view.appendChild(l); }
      if (f.msg && !sessionStorage.getItem('fest.' + f.msg)) { try { sessionStorage.setItem('fest.' + f.msg, 1); } catch (x) {} setTimeout(() => toast(t(f.msg), '🎉'), 2500); }
    }
  };
})();
