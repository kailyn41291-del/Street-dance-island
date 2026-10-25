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
  cardExtras: () => '', cardResults: () => '', translateCards: () => {},
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
    const wrap = (text, x, y, maxW, lh, max = 3) => {
      const out = []; let line = '';
      // 英文單字不拆開，中日韓文字可以逐字換行
      for (const tk of String(text).match(/[A-Za-z0-9'’.,!?&:-]+|\s+|./gu) || []) {
        if (g.measureText(line + tk).width > maxW && line.trim()) { out.push(line.trimEnd()); line = /^\s+$/.test(tk) ? '' : tk; }
        else line += tk;
      }
      if (line) out.push(line);
      out.slice(0, max).forEach((l, i) => g.fillText(i === max - 1 && out.length > max ? l.slice(0, -1) + '…' : l, x, y + i * lh));
      return Math.min(out.length, max) * lh;
    };
    const fit = (text, maxW) => {
      let str = String(text); if (g.measureText(str).width <= maxW) return str;
      while (str && g.measureText(str + '…').width > maxW) str = str.slice(0, -1);
      return str + '…';
    };
    const tags = (x0, y0, maxX, sm) => {
      let sx = x0, sy = y0;
      const fz = sm ? 26 : 32, bh = sm ? 38 : 46;
      g.font = F(fz);
      (e.styles || []).forEach(s => {
        const w = g.measureText(s).width + (sm ? 24 : 32);
        if (sx + w > maxX) { sx = x0; sy += bh + 14; }
        g.fillStyle = '#3b2b2b'; g.fillRect(sx - 4, sy - 4, w + 8, bh + 8);
        g.fillStyle = Store.STYLE_COLOR[s] || '#eac45a'; g.fillRect(sx, sy, w, bh);
        g.fillStyle = '#3b2b2b'; g.fillText(s, sx + (sm ? 12 : 16), sy + bh / 2 + 1);
        sx += w + (sm ? 12 : 18);
      });
      return (e.styles || []).length ? sy + bh + 8 : y0;
    };
    const d = A.parseDate(e.date);
    const wk = d ? t('wk').replace('{w}', t('week')[d.getDay()]) : '';
    const footTop = Y + HH - 100;

    // 海報（有的話）
    let poster = null;
    if (e.poster) poster = await new Promise(res => {
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => res(im); im.onerror = () => res(null); im.src = e.poster;
      setTimeout(() => res(null), 6000);
    });

    let bottom;
    if (poster) {
      // 版面 A：海報在右上，左邊放日期、標題、舞風，下方資訊整行
      const pw = 340, pH = Math.min(Math.round(pw * poster.height / poster.width), 520);
      const px = X + WW - 40 - pw, py = Y + 140;
      g.fillStyle = '#3b2b2b'; g.fillRect(px - 6, py - 6, pw + 12, pH + 12); g.fillRect(px + 4, py + 4, pw + 12, pH + 12);
      g.imageSmoothingEnabled = true;
      const sh = Math.min(poster.height, poster.width * pH / pw);
      g.drawImage(poster, 0, 0, poster.width, sh, px, py, pw, pH);
      g.imageSmoothingEnabled = false;
      const LW = px - 40 - (X + 40);
      g.fillStyle = '#3b2b2b'; g.fillRect(X + 40, Y + 140, LW, 120);
      g.fillStyle = color; g.fillRect(X + 46, Y + 146, LW - 12, 108);
      g.fillStyle = '#3b2b2b';
      g.font = F(30); g.fillText(d ? `${d.getFullYear()}　${wk}` : '', X + 70, Y + 172);
      g.font = F(60); g.fillText(d ? `${d.getMonth() + 1}/${pad2(d.getDate())}` : '??', X + 70, Y + 230);
      g.font = F(44);
      const th = wrap(e.name, X + 40, Y + 310, LW, 54, 3);
      const tb = tags(X + 40, Y + 310 + th - 10, X + 40 + LW, true);
      bottom = Math.max(tb, py + pH + 10) + 40;
    } else {
      // 版面 B：沒有海報 — 大日期色塊＋右邊標題
      g.fillStyle = '#3b2b2b'; g.fillRect(X + 40, Y + 140, 260, 300);
      g.fillStyle = color; g.fillRect(X + 46, Y + 146, 248, 288);
      g.fillStyle = '#3b2b2b'; g.textAlign = 'center';
      g.font = F(40); g.fillText(d ? `${d.getFullYear()}/${d.getMonth() + 1}` : '', X + 170, Y + 200);
      g.font = F(140); g.fillText(d ? pad2(d.getDate()) : '??', X + 170, Y + 300);
      g.font = F(40); g.fillText(wk, X + 170, Y + 395);
      g.textAlign = 'left';
      g.font = F(56); g.fillStyle = '#3b2b2b';
      wrap(e.name, X + 340, Y + 186, WW - 380, 72, 3);
      bottom = tags(X + 40, Y + 490, X + WW - 40) + 66;
    }

    // 資訊（精簡）
    const first = v => String(v || '').split(/\s*(?:[\/／|｜；;\n]|、)\s*/)[0].trim();
    const venue = first(e.venue).replace(/\s*[（(].*?[)）]\s*/g, ' ').trim();
    const ed = e.endDate && e.endDate !== e.date ? ' – ' + e.endDate.slice(5).replace('-', '/') : '';
    const info = [
      ['🕒', [ed ? e.date.slice(5).replace('-', '/') + ed : '', [e.startTime, e.endTime].filter(Boolean).join(' – ')].filter(Boolean).join('　')],
      ['📍', [nm(A.cityOf(e.country, e.city)), venue].filter(Boolean).join('・')],
      ['🏠', String(e.organizer || '').replace(/\s*[\/／]\s*/g, ' / ')],
      ['💰', first(e.fee)],
      ['📝', e.regEnd ? t('share_reg_end', { d: e.regEnd.replace(/-/g, '/') }) : '']
    ].filter(r => r[1]);
    // 角色（右下角）
    let av = null, aw = 0, ah = 0;
    try { av = Avatar.render(Player.me ? Player.me.look : Avatar.DEFAULT, 1, 5); } catch (x) {}
    if (av) { const k = Math.min(1, 230 / av.height); aw = Math.round(av.width * k); ah = Math.round(av.height * k); }
    const avW = av ? aw + 30 : 0, avTop = Y + HH - ah - 14;
    g.font = F(36); g.fillStyle = '#3b2b2b';
    let iy = bottom;
    for (const [ic, v] of info) {
      if (iy > footTop - 36) break;
      const w = WW - 140 - (iy + 50 > avTop ? avW : 0);
      g.fillText(ic, X + 40, iy);
      const two = !poster && iy + 46 < footTop - 40;
      iy += (two ? wrap(v, X + 100, iy, w, 46, 2) : (g.fillText(fit(v, w), X + 100, iy), 46)) + (poster ? 12 : 26);
    }
    g.fillRect(X + 30, footTop, WW - 60 - avW, 4);
    if (av) g.drawImage(av, X + WW - aw - 30, avTop, aw, ah);
    g.font = F(30);
    g.fillText(fit((location.host + location.pathname).replace(/\/$/, ''), WW - 100 - avW), X + 40, footTop + 50);
    g.font = F(36); g.textAlign = 'center'; g.fillText('🏝 ' + t('share_footer'), W / 2, H - 55);
    return cv;
  }
  // 複製連結時附上的 RPG 邀請文字（3 種隨機）
  function inviteText(e, url) {
    const list = t('invite'), tpl = Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : '{name}\n{url}';
    const d = A.parseDate(e.date);
    const date = d ? `${(e.date || '').replace(/-/g, '/')}（${t('week')[d.getDay()]}）${e.startTime ? ' ' + e.startTime : ''}` : '';
    const place = [nm(A.byCode[e.country]), nm(A.cityOf(e.country, e.city))].filter(Boolean).join('・');
    return tpl.replace(/\{(\w+)\}/g, (_, k) => ({ name: e.name || '', date, place, url })[k] ?? '');
  }
  async function openShare(e) {
    const url = eventUrl(e); diAct('share', 1, e.id);
    const body = h(`<div class="share"><div class="share-prev"><p class="note">…</p></div>
      <div class="btn-row"><button class="btn pink sh">📤 ${t('share_send')}</button><button class="btn dl">⬇ ${t('share_dl')}</button><button class="btn teal cp">🔗 ${t('share_copy')}</button>
      <a class="btn" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}">LINE</a>
      <a class="btn blue" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a></div>
      <pre class="invite-prev"></pre></div>`);
    modal({ title: t('share_title'), color: 'pink', body, wide: true });
    const pre = body.querySelector('.invite-prev');
    body.querySelector('.cp').onclick = async () => {
      const txt = inviteText(e, url);
      pre.textContent = txt; pre.classList.add('on');
      try { await navigator.clipboard.writeText(txt); toast(t('share_copied'), '🔗'); SFX.play('coin'); } catch (x) { window.prompt('URL', txt); }
    };
    const cv = await drawShareCard(e);
    const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = e.name;
    body.querySelector('.share-prev').innerHTML = ''; body.querySelector('.share-prev').appendChild(img);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'dance-island.png', { type: 'image/png' });
    body.querySelector('.dl').onclick = () => { const a = document.createElement('a'); a.href = img.src; a.download = (e.name || 'event') + '.png'; a.click(); SFX.play('coin'); };
    const sh = body.querySelector('.sh');
    if (!navigator.share) sh.classList.add('hidden');
    sh.onclick = async () => {
      const txt = inviteText(e, url);
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: e.name, text: txt });
        else await navigator.share({ title: e.name, text: txt });
      } catch (x) {}
    };
  }


  /* ---------- 活動資訊自動翻譯（費用、報名方式、備註；名稱 / 主辦 / 地址保持原文） ---------- */
  const TKEY = 'danceIsland.tr.v1';
  let tcache = {};
  try { tcache = JSON.parse(localStorage.getItem(TKEY)) || {}; } catch (x) {}
  const saveT = () => { try { const k = Object.keys(tcache); if (k.length > 600) k.slice(0, 200).forEach(x => delete tcache[x]); localStorage.setItem(TKEY, JSON.stringify(tcache)); } catch (x) {} };
  async function trText(text, to) {
    const key = to + '|' + text;
    if (tcache[key] !== undefined) return tcache[key];
    // 一行一行翻，保留換行
    const lines = text.split('\n');
    const out = await Promise.all(lines.map(l => (l.trim() ? Social.translate(l, to) : Promise.resolve(null))));
    const res = out.some(Boolean) ? lines.map((l, i) => out[i] || l).join('\n') : null;
    tcache[key] = res; saveT();
    return res;
  }
  A.translateCards = root => {
    const to = I18N.lang;
    root.querySelectorAll('dd[data-tr]').forEach(async dd => {
      const orig = dd.dataset.orig || dd.textContent;
      dd.dataset.orig = orig;
      const tr = await trText(orig, to);
      if (!tr || !dd.isConnected || I18N.lang !== to) return;
      dd.textContent = tr;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tr-orig'; b.textContent = '🌐 ' + t('tr_show_orig');
      b.onclick = ev => { ev.stopPropagation(); const showOrig = b.dataset.o !== '1'; b.dataset.o = showOrig ? '1' : ''; dd.firstChild.textContent = showOrig ? orig : tr; b.textContent = '🌐 ' + t(showOrig ? 'tr_show_tr' : 'tr_show_orig'); };
      dd.textContent = ''; dd.append(document.createTextNode(tr), b);
    });
  };

  /* ---------- 活動卡片多出來的按鈕 ---------- */
  /* ---------- 活動瀏覽次數 ----------
     卡片出現在畫面上 1 秒才算一次；同一台裝置同一個活動一天只算一次 */
  let views = null;
  const VKEY = 'danceIsland.viewed.v1';
  const fmtN = n => n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : String(n);
  let vLoading = false;
  const loadViews = () => {
    if (vLoading || !Store.cloud) return; vLoading = true;
    Backend.viewCounts().then(n => { views = n; paintViews(); }).catch(() => { vLoading = false; });
  };
  A.viewTag = e => (loadViews(), views === null) ? `<span class="tag views" data-vc="${esc(e.id)}" hidden></span>`
    : `<span class="tag views" data-vc="${esc(e.id)}" title="${esc(t('views'))}">👁 ${fmtN(views[e.id] || 0)}</span>`;
  const paintViews = () => document.querySelectorAll('[data-vc]').forEach(x => {
    x.hidden = views === null; if (views) { x.textContent = '👁 ' + fmtN(views[x.dataset.vc] || 0); x.title = t('views'); }
  });
  const viewedToday = () => { try { const o = JSON.parse(localStorage.getItem(VKEY) || '{}'); return o.day === A.todayStr() ? o : { day: A.todayStr(), ids: [] }; } catch (x) { return { day: A.todayStr(), ids: [] }; } };
  function countView(id) {
    if (!Store.cloud) return;
    const o = viewedToday(); if (o.ids.includes(id)) return;
    o.ids.push(id); try { localStorage.setItem(VKEY, JSON.stringify(o)); } catch (x) {}
    diAct('view', 1, id);
    if (views) { views[id] = (views[id] || 0) + 1; paintViews(); }
    Backend.bumpView(id).catch(() => {});
  }
  if (window.IntersectionObserver) {
    const timers = new Map();
    const io = new IntersectionObserver(list => list.forEach(en => {
      const id = en.target.dataset.id;
      if (en.isIntersecting) { if (!timers.has(en.target)) timers.set(en.target, setTimeout(() => { countView(id); io.unobserve(en.target); }, 1000)); }
      else { clearTimeout(timers.get(en.target)); timers.delete(en.target); }
    }), { threshold: 0.5 });
    const watch = root => root.querySelectorAll && root.querySelectorAll('article.card[data-id]').forEach(c => { if (!c._vw) { c._vw = 1; io.observe(c); } });
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches('article.card[data-id]')) watch(n.parentNode); else watch(n); } }))).observe(document.body, { childList: true, subtree: true });
    watch(document);
  }

  A.cardExtras = (e, past) => `
    <button class="btn sm" data-act="cal" data-ev="${esc(e.id)}">📅 ${t('b_cal')}</button>
    <button class="btn sm pink" data-act="share" data-ev="${esc(e.id)}">📤 ${t('b_share')}</button>` + (A.cardExtras2 ? A.cardExtras2(e, past) : '') + (A.cardExtras3 ? A.cardExtras3(e) : '');
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
      A.translateCards(listEl);
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

  /* ---------- 世界地圖：倒數看板 + 日夜 / 節慶（依使用者當地時間） ---------- */
  // 使用者所在地的時間（瀏覽器的時區）
  const localNow = () => {
    const d = new Date();
    return { date: A.ymd(d), md: `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, hour: d.getHours() };
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
    const d = localNow(), hr = d.hour;
    const phase = hr >= 6 && hr < 16 ? 'day' : hr >= 16 && hr < 19 ? 'dusk' : 'night';
    view.dataset.phase = phase;
    view.appendChild(h(`<div class="daynight ${phase}"></div>`));
    if (phase === 'night') { const l = Themes.fxLayer('spark'); if (l) { l.classList.add('fixed'); view.appendChild(l); } }
    (A.worldHooks || []).forEach(f => f(view));
    // 節慶
    const f = festival(d);
    if (f) {
      const l = Themes.fxLayer(f.fx); if (l) { l.classList.add('fixed'); view.appendChild(l); }
      if (f.msg && !sessionStorage.getItem('fest.' + f.msg)) { try { sessionStorage.setItem('fest.' + f.msg, 1); } catch (x) {} setTimeout(() => toast(t(f.msg), '🎉'), 2500); }
    }
  };
})();
