/* =========================================================
 * 第四批・社交：自訂名片、玩家名片彈窗、好友（邀請 / 列表 / 在線）、
 * 私訊（只限好友，可封鎖 / 檢舉）、玩家對玩家 Battle
 * 只在雲端模式（Supabase）而且登入角色後才會啟用。
 * ========================================================= */
window.Friends = (() => {
  const { h, esc, modal, toast, sparkle } = UI;
  const A = window.App;
  const on = () => Backend.enabled && !!Backend.uid && !!Player.me;

  /* ---------- 狀態 ---------- */
  let rels = [], blocks = new Set(), people = {}, online = new Set(), unread = {}, started = false;
  let presence = null, inbox = null, unsubs = [];
  const me = () => Backend.uid;
  const other = r => (r.from_user === me() ? r.to_user : r.from_user);
  // 和某人的關係：friend / out（我送出的）/ in（對方送來的）/ none
  function rel(uid) {
    const rs = rels.filter(r => other(r) === uid);
    const f = rs.find(r => r.status === 'accepted'); if (f) return { type: 'friend', row: f };
    const inn = rs.find(r => r.to_user === me() && r.status === 'pending'); if (inn) return { type: 'in', row: inn };
    const out = rs.find(r => r.from_user === me()); if (out) return { type: 'out', row: out };
    return { type: 'none' };
  }
  const friendIds = () => rels.filter(r => r.status === 'accepted').map(other);
  const incoming = () => rels.filter(r => r.to_user === me() && r.status === 'pending');
  async function loadPeople(ids) {
    const need = [...new Set(ids)].filter(id => id && !people[id]);
    if (!need.length) return;
    try { (await Backend.playersByIds(need)).forEach(p => (people[p.user_id] = p)); } catch (x) {}
  }
  async function reload() {
    try { rels = await Backend.friendRequests(); } catch (x) { rels = []; }
    try { blocks = new Set(await Backend.listBlocks()); } catch (x) {}
    await loadPeople(rels.map(other));
    try { unread = {}; (await Backend.unreadDMs()).forEach(r => (unread[r.from_user] = (unread[r.from_user] || 0) + 1)); } catch (x) {}
    badge();
  }
  const errMsg = x => {
    const m = String(x && x.message || x);
    if (/blocked/.test(m)) return t('bl_by');
    if (/too many/.test(m)) return t('fr_too_many');
    if (/too fast/.test(m)) return t('fr_fast');
    if (/not friends/.test(m)) return t('dm_only');
    if (/spam/.test(m)) return t('fr_spam');
    if (/duplicate|unique/.test(m)) return t('fr_sent');
    return m;
  };

  /* ---------- HUD 好友按鈕（有未讀時顯示數字） ---------- */
  let hudBtn = null;
  function ensureHud() {
    if (hudBtn) return;
    const lang = document.querySelector('.hud-lang'); if (!lang) return;
    hudBtn = h(`<button class="btn green hud-friends hidden">👥 <span class="label"></span><span class="fr-badge" hidden></span></button>`);
    lang.parentNode.insertBefore(hudBtn, lang);
    hudBtn.onclick = () => { SFX.play('select'); openPanel(); };
  }
  function badge() {
    ensureHud(); if (!hudBtn) return;
    hudBtn.classList.toggle('hidden', !on());
    hudBtn.querySelector('.label').textContent = t('hud_friends');
    const n = incoming().length + Object.values(unread).reduce((s, v) => s + v, 0);
    const b = hudBtn.querySelector('.fr-badge'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
  }

  /* ---------- 名片 ---------- */
  const BG = { pink: '#f6a8c4', teal: '#8fd3c7', blue: '#a9bdf0', yellow: '#f4d77a', purple: '#c7a8e8', night: '#3d3a5c' };
  const PAT = ['grid', 'dots', 'stripe', 'star', 'none'];
  const FRAME = ['pixel', 'double', 'gold'];
  const defCard = () => ({ bg: 'pink', pat: 'grid', frame: 'pixel', crew: '', move: '', bio: '', ig: '', find: true, rpub: false, rc: '', rcity: '' });
  // 地區：名片上公開的地區（rpub = true 才會存、才會被地區搜尋找到）
  const regionName = c => { const k = c.rc && A.byCode[c.rc]; if (!k) return ''; const ci = c.rcity && A.cityOf(c.rc, c.rcity); return [nm(k), ci ? nm(ci) : ''].filter(Boolean).join('・'); };
  const lonN = l => ((l + 540) % 360) - 180;
  // 目前位置 → 最近的城市
  const locate = () => new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('geo'));
    navigator.geolocation.getCurrentPosition(p => {
      const { latitude: la, longitude: lo } = p.coords; let best = null, bd = 1e9;
      GEO.countries.forEach(k => (k.cities || []).forEach(ci => {
        const dl = la - ci.lat, dn = (lo - lonN(ci.lon)) * Math.cos(la * Math.PI / 180), d = dl * dl + dn * dn;
        if (d < bd) { bd = d; best = { rc: k.code, rcity: ci.id }; }
      }));
      best ? res(best) : rej(new Error('geo'));
    }, rej, { timeout: 10000, maximumAge: 6e5 });
  });
  const countryOpts = sel => GEO.countries.slice().sort((a, b) => (b.home - a.home) || nm(a).localeCompare(nm(b))).map(k => `<option value="${k.code}" ${k.code === sel ? 'selected' : ''}>${esc(nm(k))}</option>`).join('');
  const cityOpts = (cc, sel) => `<option value="">${t('fd_any_city')}</option>` + ((A.byCode[cc] || {}).cities || []).map(ci => `<option value="${esc(ci.id)}" ${ci.id === sel ? 'selected' : ''}>${esc(nm(ci))}</option>`).join('');
  function cardHTML(p, opt = {}) {
    const c = { ...defCard(), ...(p.card || {}) };
    const nat = p.nat && A.byCode[p.nat];
    const J = t('jobs') || {};
    const ig = /^[A-Za-z0-9._]{1,30}$/.test(c.ig || '') ? c.ig : '';
    const isOn = p.user_id && online.has(p.user_id);
    return `<div class="pcard bg-${esc(BG[c.bg] ? c.bg : 'pink')} pat-${esc(PAT.includes(c.pat) ? c.pat : 'grid')} fr-${esc(FRAME.includes(c.frame) ? c.frame : 'pixel')}">
      <div class="pc-top"><span>DANCE ISLAND</span><span>PLAYER CARD</span></div>
      <div class="pc-body">
        <div class="pc-av"></div>
        <div class="pc-info">
          <div class="pc-name">${Player.nameHTML({ ...p, handle: null })}${p.user_id && p.user_id !== me() ? `<i class="dot ${isOn ? 'on' : ''}" title="${esc(t(isOn ? 'fr_online' : 'fr_offline'))}"></i>` : ''}</div>
          <div class="pc-handle">@${esc(p.handle || '')}</div>
          ${p.title ? `<div class="pc-title">${Titles.html(p.title)}</div>` : ''}
          <div class="pc-tags">${c.rpub && regionName(c) ? `<span class="tag pc-reg">📍 ${esc(regionName(c))}</span>` : nat ? `<span class="tag">${esc(nm(nat))}</span>` : ''}${p.style ? `<span class="tag">${esc(p.style)}</span>` : ''}${p.job && J[p.job] ? `<span class="tag">${esc(J[p.job])}</span>` : ''}</div>
        </div>
      </div>
      <dl class="pc-dl">${c.crew ? `<dt>${t('cd_crew')}</dt><dd>${esc(c.crew)}</dd>` : ''}${c.move ? `<dt>${t('cd_move')}</dt><dd>${esc(c.move)}</dd>` : ''}</dl>
      <p class="pc-bio ${c.bio ? '' : 'empty'}">${c.bio ? esc(c.bio) : esc(opt.mine ? t('cd_bio_ph') : t('cd_none_bio'))}</p>
      ${ig ? `<a class="pc-ig" href="https://www.instagram.com/${encodeURIComponent(ig)}/" target="_blank" rel="noopener">IG @${esc(ig)}</a>` : ''}
    </div>`;
  }
  function mountCard(el, p) {
    const box = el.querySelector('.pc-av'); if (!box) return;
    box.innerHTML = '';
    try { const d = Avatar.dancer(3, p.look || Avatar.DEFAULT); box.appendChild(d.el); const tm = setInterval(() => { if (!d.el.isConnected) clearInterval(tm); else d.beat(); }, 420); } catch (x) {}
  }

  /* 編輯我的名片 */
  function openCardEditor() {
    if (!on()) return Player.prompt();
    const p = { ...Backend.profile, user_id: me() };
    const c = { ...defCard(), ...(p.card || {}) };
    const body = h(`<div class="cd-ed">
      <div class="cd-prev"></div>
      <form class="form cd-form" novalidate>
        <div class="field full"><span>${t('cd_bg')}</span><div class="swatches">${Object.entries(BG).map(([k, v]) => `<button type="button" class="sw" data-bg="${k}" style="--c:${v}" aria-label="${k}"></button>`).join('')}</div></div>
        <div class="field"><span>${t('cd_pat')}</span><div class="seg">${PAT.map(k => `<button type="button" class="btn sm" data-pat="${k}">${t('cd_pat_' + k)}</button>`).join('')}</div></div>
        <div class="field"><span>${t('cd_frame')}</span><div class="seg">${FRAME.map(k => `<button type="button" class="btn sm" data-frame="${k}">${t('cd_frame_' + k)}</button>`).join('')}</div></div>
        <label class="field"><span>${t('cd_crew')}</span><input class="input" name="crew" maxlength="24" value="${esc(c.crew)}"></label>
        <label class="field"><span>${t('cd_move')}</span><input class="input" name="move" maxlength="24" value="${esc(c.move)}" placeholder="${esc(t('cd_move_ph'))}"></label>
        <label class="field full"><span>${t('cd_bio')}</span><textarea class="input" name="bio" maxlength="80" placeholder="${esc(t('cd_bio_ph'))}">${esc(c.bio)}</textarea></label>
        <label class="field full"><span>${t('cd_ig')}</span><input class="input" name="ig" maxlength="31" value="${esc(c.ig)}" placeholder="yourname" autocapitalize="off" spellcheck="false"></label>
        <fieldset class="full cd-priv"><legend>🔍 ${t('fd_priv')}</legend>
          <label class="chk"><input type="checkbox" name="find" ${c.find !== false ? 'checked' : ''}> ${t('fd_find_me')}</label>
          <label class="chk"><input type="checkbox" name="rpub" ${c.rpub ? 'checked' : ''}> ${t('fd_rpub')}</label>
          <div class="cd-reg" ${c.rpub ? '' : 'hidden'}><select class="input sm" name="rc">${countryOpts(c.rc || (Backend.profile && Backend.profile.nat) || 'TW')}</select>
            <select class="input sm" name="rcity"></select><button type="button" class="btn sm teal here">📍 ${t('fd_here')}</button></div>
          <p class="note">${t('fd_priv_note')}</p></fieldset>
        <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn pink">${t('cd_save')}</button></div></div>
      </form></div>`);
    const prev = body.querySelector('.cd-prev'), f = body.querySelector('form');
    const E = f.elements;
    const fillCity = sel => { E.rcity.innerHTML = cityOpts(E.rc.value, sel); };
    fillCity(c.rcity);
    E.rc.onchange = () => { fillCity(''); paint(); };
    E.rpub.onchange = () => { f.querySelector('.cd-reg').hidden = !E.rpub.checked; paint(); };
    f.querySelector('.here').onclick = async () => {
      try { const r = await locate(); E.rc.value = r.rc; fillCity(r.rcity); SFX.play('coin'); paint(); } catch (x) { toast(t('fd_geo_fail'), '📍'); }
    };
    const read = () => {
      const o = { ...c, crew: E.crew.value.trim(), move: E.move.value.trim(), bio: E.bio.value.trim(), ig: E.ig.value.trim().replace(/^@/, ''), find: E.find.checked, rpub: E.rpub.checked };
      // 沒有勾選公開地區：地區不存
      if (o.rpub) { o.rc = E.rc.value; o.rcity = E.rcity.value; } else { delete o.rc; delete o.rcity; }
      return o;
    };
    const paint = () => {
      const cur = read(); Object.assign(c, cur);
      prev.innerHTML = cardHTML({ ...p, card: cur }, { mine: true }); mountCard(prev, p);
      body.querySelectorAll('[data-bg]').forEach(b => b.classList.toggle('on', b.dataset.bg === c.bg));
      body.querySelectorAll('[data-pat]').forEach(b => b.classList.toggle('on', b.dataset.pat === c.pat));
      body.querySelectorAll('[data-frame]').forEach(b => b.classList.toggle('on', b.dataset.frame === c.frame));
    };
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-bg],[data-pat],[data-frame]'); if (!b) return;
      if (b.dataset.bg) c.bg = b.dataset.bg; if (b.dataset.pat) c.pat = b.dataset.pat; if (b.dataset.frame) c.frame = b.dataset.frame;
      SFX.play('select'); paint();
    });
    let tm; f.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(paint, 200); });
    const m = modal({ title: t('cd_edit'), color: 'pink', body, wide: true });
    f.onsubmit = async ev => {
      ev.preventDefault();
      const cur = read(), err = f.querySelector('.err');
      if (cur.ig && !/^[A-Za-z0-9._]{1,30}$/.test(cur.ig)) { err.textContent = '✕ ' + t('v_ig_bad'); return; }
      if (/(https?:\/\/|www\.|\.com|line\.me|t\.me)/i.test(cur.bio + ' ' + cur.crew)) { err.textContent = '✕ ' + t('cd_nolink'); return; }
      try { await Backend.saveProfile({ card: cur }); } catch (x) { SFX.play('error'); err.textContent = '✕ ' + x.message; return; }
      m.close(); SFX.play('coin'); toast(t('cd_saved'), '🪪');
    };
    paint();
  }

  /* 玩家名片彈窗：依關係顯示不同按鈕；opt.request = 好友邀請（顯示接受 / 婉拒） */
  async function openCard(handle, opt = {}) {
    if (!Backend.enabled) return;
    let p = null;
    try { p = await Backend.playerByHandle(handle); } catch (x) {}
    if (!p) { toast(t('cd_notfound'), '✕'); return; }
    people[p.user_id] = p;
    const mine = p.user_id === me();
    const body = h(`<div class="pc-wrap">${opt.request ? `<p class="pc-req">💌 ${esc(t('fr_wants', { n: p.name }))}</p>` : ''}<div class="pc-slot">${cardHTML(p, { mine })}</div><div class="pc-acts"></div></div>`);
    mountCard(body, p);
    const m = modal({ title: mine ? t('cd_me') : t('cd_title'), color: opt.request ? 'yellow' : 'blue', body });
    const acts = body.querySelector('.pc-acts');
    const draw = () => {
      if (mine) { acts.innerHTML = `<button class="btn pink ed">✎ ${t('cd_edit')}</button>`; acts.querySelector('.ed').onclick = () => { m.close(); setTimeout(openCardEditor, 220); }; return; }
      if (!on()) { acts.innerHTML = `<p class="note">${t('cd_login')}</p><button class="btn pink lg">${t('login')}</button>`; acts.querySelector('.lg').onclick = () => { m.close(); Player.prompt(); }; return; }
      const r = rel(p.user_id), bl = blocks.has(p.user_id);
      let main = '';
      if (bl) main = `<button class="btn ub">${t('bl_unblock')}</button>`;
      else if (r.type === 'friend') main = `<button class="btn pink dm">💬 ${t('dm_open')}</button><button class="btn orange pv">${t('pvp_invite')}</button><span class="tag fr-is">${t('fr_is')}</span>`;
      else if (r.type === 'in') main = `<button class="btn green ac">✓ ${t('fr_accept')}</button><button class="btn dc">${t('fr_decline')}</button>`;
      else if (r.type === 'out') main = `<span class="tag">${t('fr_pending')}</span><button class="btn orange pv">${t('pvp_invite')}</button>`;
      else main = `<button class="btn green ad">${t('fr_add')}</button><button class="btn orange pv">${t('pvp_invite')}</button>`;
      acts.innerHTML = `<div class="btn-row">${main}</div><div class="btn-row sub">
        ${r.type === 'friend' ? `<button class="btn sm rm">${t('fr_remove')}</button>` : ''}
        ${bl ? '' : `<button class="btn sm bk">🚫 ${t('bl_block')}</button>`}<button class="btn sm rp">⚑ ${t('rp_title')}</button></div>`;
      const q = s => acts.querySelector(s);
      if (q('.ad')) q('.ad').onclick = async () => { try { await Backend.sendFriend(p.user_id); await reload(); SFX.play('coin'); toast(rel(p.user_id).type === 'friend' ? t('fr_now', { n: p.name }) : t('fr_sent'), '💌'); } catch (x) { toast(errMsg(x), '✕'); } draw(); };
      if (q('.ac')) q('.ac').onclick = async () => { try { await Backend.respondFriend(r.row.id, 'accepted'); await reload(); SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 20); toast(t('fr_now', { n: p.name }), '🤝'); } catch (x) { toast(errMsg(x), '✕'); } draw(); };
      if (q('.dc')) q('.dc').onclick = async () => { try { await Backend.respondFriend(r.row.id, 'declined'); await reload(); } catch (x) { toast(errMsg(x), '✕'); } m.close(); };
      if (q('.rm')) q('.rm').onclick = async () => { if (!confirm(t('fr_remove_q', { n: p.name }))) return; try { await Backend.removeFriend(r.row.id); await reload(); } catch (x) { toast(errMsg(x), '✕'); } draw(); };
      if (q('.bk')) q('.bk').onclick = async () => {
        if (!confirm(t('bl_q', { n: p.name }))) return;
        try { await Backend.block(p.user_id); if (r.row) await Backend.removeFriend(r.row.id).catch(() => {}); await reload(); toast(t('bl_done'), '🚫'); } catch (x) { toast(errMsg(x), '✕'); } draw();
      };
      if (q('.ub')) q('.ub').onclick = async () => { try { await Backend.unblock(p.user_id); await reload(); } catch (x) { toast(errMsg(x), '✕'); } draw(); };
      if (q('.rp')) q('.rp').onclick = () => { m.close(); setTimeout(() => Player.openReport(p.handle, p.name), 220); };
      if (q('.dm')) q('.dm').onclick = () => { m.close(); openDM(p.user_id); };
      if (q('.pv')) q('.pv').onclick = () => { m.close(); invitePvp(p); };
    };
    draw();
  }

  /* ---------- 好友面板 ---------- */
  async function openPanel(tab = 'friends') {
    if (!on()) return Player.prompt();
    await reload();
    const body = h(`<div class="fr-panel">
      <div class="tabs"><button class="btn sm" data-t="friends">${t('fr_tab_friends')}</button><button class="btn sm" data-t="req">${t('fr_tab_req')}${incoming().length ? ` (${incoming().length})` : ''}</button><button class="btn sm" data-t="block">${t('fr_tab_block')}</button><button class="btn sm teal" data-t="find">🔍 ${t('fd_tab')}</button>
        <span class="grow"></span><button class="btn sm pink mycard">🪪 ${t('cd_edit')}</button></div>
      <div class="fd-box" hidden>
        <form class="fd-id chat-input"><input class="input sm" name="q" maxlength="16" placeholder="${esc(t('fd_id_ph'))}" autocapitalize="off" spellcheck="false"><button class="btn sm teal">🔍 ${t('fd_search')}</button></form>
        <div class="fd-reg"><span>${t('fd_region')}</span><select class="input sm fd-cc"></select><select class="input sm fd-city"></select><button type="button" class="btn sm yellow fd-go">${t('fd_search')}</button><button type="button" class="btn sm teal fd-here">📍 ${t('fd_here')}</button></div>
        <p class="note">${t('fd_note')}</p></div>
      <ul class="fr-list"></ul></div>`);
    const m = modal({ title: t('fr_title'), color: 'green', body, wide: true });
    // 找好友：預設地區 = 我名片上的地區 → 國籍 → 台灣
    const myCard = (Backend.profile && Backend.profile.card) || {};
    const fcc = body.querySelector('.fd-cc'), fcity = body.querySelector('.fd-city');
    fcc.innerHTML = countryOpts(myCard.rc || (Backend.profile && Backend.profile.nat) || 'TW'); fcity.innerHTML = cityOpts(fcc.value, myCard.rcity || '');
    fcc.onchange = () => { fcity.innerHTML = cityOpts(fcc.value, ''); };
    let found = null, foundNote = '';
    const showFound = () => {
      if (!found) { ul.innerHTML = ''; return; }
      const list = found.filter(p => p.user_id !== me() && !blocks.has(p.user_id));
      list.forEach(p => (people[p.user_id] = p));
      ul.innerHTML = (foundNote ? `<li class="fr-sub">${esc(foundNote)}</li>` : '') + (list.length ? list.map(p => {
        const r = rel(p.user_id), reg = (p.card && p.card.rpub && regionName(p.card)) || '';
        return row(p, `${reg ? `<span class="tag">📍 ${esc(reg)}</span>` : ''}<i class="dot ${online.has(p.user_id) ? 'on' : ''}"></i>${r.type === 'friend' ? `<span class="tag fr-is">${t('fr_is')}</span>` : r.type === 'none' ? `<button class="btn sm green add" data-u="${esc(p.user_id)}">${t('fr_add')}</button>` : `<span class="tag">${t('fr_pending')}</span>`}<button class="btn sm cd">🪪</button>`);
      }).join('') : `<li class="note">${t('fd_none')}</li>`);
      ul.querySelectorAll('.fr-row').forEach(li => { const p = list.find(x => x.handle === li.dataset.h); if (p) li.querySelector('.fr-ic').appendChild(headIcon(p.look)); });
    };
    const drawFind = () => showFound();
    body.querySelector('.fd-id').onsubmit = async ev => {
      ev.preventDefault();
      const q = ev.target.elements.q.value.trim();
      if (q.replace(/[^a-z0-9_]/gi, '').length < 2) { toast(t('fd_short'), '🔍'); return; }
      try { found = await Backend.searchPlayers(q); foundNote = t('fd_res_id', { q }); } catch (x) { toast(errMsg(x), '✕'); return; }
      SFX.play('select'); showFound();
    };
    const regionSearch = async () => {
      try { found = await Backend.regionPlayers(fcc.value, fcity.value); } catch (x) { toast(errMsg(x), '✕'); return; }
      foundNote = t('fd_res_reg', { r: regionName({ rc: fcc.value, rcity: fcity.value }) }); SFX.play('select'); showFound();
    };
    body.querySelector('.fd-go').onclick = regionSearch;
    body.querySelector('.fd-here').onclick = async () => {
      try { const r = await locate(); fcc.value = r.rc; fcity.innerHTML = cityOpts(r.rc, r.rcity); regionSearch(); } catch (x) { toast(t('fd_geo_fail'), '📍'); }
    };
    const ul = body.querySelector('.fr-list');
    const row = (p, extra) => `<li class="fr-row" data-h="${esc(p.handle)}"><span class="fr-ic"></span><span class="fr-nm"><b>${Player.nameHTML({ ...p, handle: null })}</b><small>@${esc(p.handle)}</small></span><span class="grow"></span>${extra}</li>`;
    const draw = async () => {
      body.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
      let html = '';
      body.querySelector('.fd-box').hidden = tab !== 'find';
      if (tab === 'find') { ul.innerHTML = ''; return drawFind(); }
      if (tab === 'friends') {
        const ids = friendIds().sort((a, b) => (online.has(b) - online.has(a)));
        html = ids.length ? ids.map(id => { const p = people[id]; if (!p) return ''; const u = unread[id] || 0;
          return row(p, `<i class="dot ${online.has(id) ? 'on' : ''}"></i><button class="btn sm pink dm" data-u="${esc(id)}">💬${u ? ` <b class="fr-badge">${u}</b>` : ''}</button><button class="btn sm cd">🪪</button>`); }).join('')
          : `<li class="note">${t('fr_none')}</li>`;
      } else if (tab === 'req') {
        const inn = incoming(), out = rels.filter(r => r.from_user === me() && r.status === 'pending');
        html = (inn.length ? inn.map(r => { const p = people[r.from_user]; return p ? row(p, `<button class="btn sm yellow cd">💌 ${t('fr_open_req')}</button>`) : ''; }).join('') : `<li class="note">${t('fr_req_none')}</li>`)
          + (out.length ? `<li class="fr-sub">${t('fr_pending')}</li>` + out.map(r => { const p = people[r.to_user]; return p ? row(p, `<button class="btn sm cx" data-id="${r.id}">${t('fr_cancel')}</button>`) : ''; }).join('') : '');
      } else {
        await loadPeople([...blocks]);
        html = blocks.size ? [...blocks].map(id => { const p = people[id]; return p ? row(p, `<button class="btn sm ub" data-u="${esc(id)}">${t('bl_unblock')}</button>`) : ''; }).join('') : `<li class="note">${t('fr_block_none')}</li>`;
      }
      ul.innerHTML = html;
      ul.querySelectorAll('.fr-row').forEach(li => { const p = Object.values(people).find(x => x.handle === li.dataset.h); if (p) li.querySelector('.fr-ic').appendChild(headIcon(p.look)); });
    };
    body.querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; SFX.play('select'); draw(); } };
    body.querySelector('.mycard').onclick = () => { m.close(); setTimeout(openCardEditor, 220); };
    ul.onclick = async e => {
      const li = e.target.closest('.fr-row'); if (!li) return;
      if (e.target.closest('.dm')) { m.close(); openDM(e.target.closest('.dm').dataset.u); }
      else if (e.target.closest('.cx')) { try { await Backend.removeFriend(+e.target.closest('.cx').dataset.id); await reload(); } catch (x) { toast(errMsg(x), '✕'); } draw(); }
      else if (e.target.closest('.add')) { const b = e.target.closest('.add'); try { await Backend.sendFriend(b.dataset.u); await reload(); toast(rel(b.dataset.u).type === 'friend' ? t('fr_now', { n: (people[b.dataset.u] || {}).name || '' }) : t('fr_sent'), '💌'); SFX.play('coin'); } catch (x) { toast(errMsg(x), '✕'); } showFound(); }
      else if (e.target.closest('.ub')) { try { await Backend.unblock(e.target.closest('.ub').dataset.u); await reload(); } catch (x) { toast(errMsg(x), '✕'); } draw(); }
      else { m.close(); setTimeout(() => openCard(li.dataset.h, { request: tab === 'req' }), 220); }
    };
    draw();
  }
  const headIcon = look => {
    try { const c = Avatar.render(look || Avatar.DEFAULT, 0, 2); c.className = 'fr-head'; return c; } catch (x) { return document.createElement('span'); }
  };

  /* ---------- 私訊 ---------- */
  let dm = null; // { uid, el, list }
  async function openDM(uid) {
    if (!on()) return Player.prompt();
    await loadPeople([uid]);
    const p = people[uid]; if (!p) return;
    if (rel(uid).type !== 'friend') { toast(t('dm_only'), '✕'); return; }
    closeDM();
    const el = h(`<div class="dm-win win" role="dialog" aria-label="${esc(t('dm_title'))}">
      <div class="dm-head"><span class="dm-ic"></span><b>${Player.nameHTML({ ...p, handle: null })}</b><i class="dot ${online.has(uid) ? 'on' : ''}"></i><span class="grow"></span>
        <button class="btn sm icon cd" title="${esc(t('cd_title'))}">🪪</button><button class="btn sm icon x" aria-label="close">✕</button></div>
      <div class="dm-list"><p class="note">…</p></div>
      <form class="chat-input dm-form"><button type="button" class="btn sm emo-btn" aria-label="emoji">😺</button><input class="input sm" maxlength="500" placeholder="${esc(t('dm_ph'))}"><button class="btn sm pink">${t('dm_send')}</button></form></div>`);
    el.querySelector('.dm-ic').appendChild(headIcon(p.look));
    document.body.appendChild(el);
    const list = el.querySelector('.dm-list'), input = el.querySelector('input');
    dm = { uid, el, list };
    el.querySelector('.x').onclick = closeDM;
    el.querySelector('.cd').onclick = () => openCard(p.handle);
    let pick = null;
    el.querySelector('.emo-btn').onclick = () => {
      if (pick) { pick.remove(); pick = null; return; }
      pick = Emoji.picker(code => { input.value += code; input.focus(); });
      pick.classList.add('dm-picker'); el.appendChild(pick);
    };
    let rows = [];
    try { rows = await Backend.listDMs(uid); } catch (x) {}
    list.innerHTML = rows.length ? '' : `<p class="note dm-empty">${t('dm_none')}</p>`;
    rows.forEach(addMsg);
    unread[uid] = 0; badge();
    Backend.markRead(uid).catch(() => {});
    el.querySelector('form').onsubmit = async ev => {
      ev.preventDefault();
      const text = input.value.trim(); if (!text) return;
      input.disabled = true;
      try { const r = await Backend.sendDM(uid, text); input.value = ''; addMsg(r); SFX.play('blip'); }
      catch (x) { SFX.play('error'); toast(errMsg(x), '✕'); }
      input.disabled = false; input.focus();
    };
    setTimeout(() => input.focus(), 50);
  }
  function addMsg(r) {
    if (!dm || dm.list.querySelector(`[data-id="${r.id}"]`)) return;
    const em = dm.list.querySelector('.dm-empty'); if (em) em.remove();
    const mine = r.from_user === me();
    const tm = new Date(r.created_at);
    dm.list.appendChild(h(`<div class="dm-msg ${mine ? 'me' : ''}" data-id="${r.id}"><div class="dm-b">${Emoji.toHTML(r.text)}</div><small>${String(tm.getHours()).padStart(2, '0')}:${String(tm.getMinutes()).padStart(2, '0')}</small></div>`));
    dm.list.scrollTop = dm.list.scrollHeight;
  }
  function closeDM() { if (dm) { dm.el.remove(); dm = null; } }

  /* ---------- 玩家對玩家 Battle（Freeze / Power / Footwork，三戰兩勝） ----------
     邀請透過對方的「收件匣」即時頻道；對戰時雙方先送出招式的雜湊值，
     兩邊都送出後才公開招式，所以沒辦法偷看對方出什麼。 */
  const RPS = { freeze: { icon: '🧊', beats: 'power', mv: 'freeze' }, power: { icon: '🌀', beats: 'foot', mv: 'windmill' }, foot: { icon: '👟', beats: 'freeze', mv: 'toprock' } };
  let battling = false, lastInvite = 0;
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const myInfo = () => ({ uid: me(), handle: Player.me.id, name: Player.me.name, look: Player.me.look });
  function sendTo(uid, payload) {
    return new Promise(res => {
      const ch = Backend.channel('inbox-' + uid, 'x-' + Math.random().toString(36).slice(2, 7));
      const done = () => { setTimeout(() => Backend.removeChannel(ch), 800); res(); };
      ch.subscribe(st => { if (st === 'SUBSCRIBED') ch.send({ type: 'broadcast', event: 'pvp', payload }).then(done, done); });
      setTimeout(done, 5000);
    });
  }
  async function invitePvp(p) {
    if (!on()) return Player.prompt();
    if (battling) return;
    if (!online.has(p.user_id)) { toast(t('pvp_offline'), '💤'); return; }
    if (Date.now() - lastInvite < 15000) { toast(t('fr_fast'), '⏳'); return; }
    lastInvite = Date.now();
    const room = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const body = h(`<div class="pvp-wait"><p>${esc(t('pvp_sent', { n: p.name }))}</p><div class="pvp-dots">⚔</div><button class="btn sm cx">${t('fr_cancel')}</button></div>`);
    const m = modal({ title: t('pvp_invite'), color: 'orange', body });
    let settled = false;
    pending[room] = ans => {
      if (settled) return; settled = true; delete pending[room]; m.close();
      if (ans === 'accept') startPvp(room, p, true);
      else toast(ans === 'busy' ? t('pvp_busy') : t('pvp_declined', { n: p.name }), '🙅');
    };
    body.querySelector('.cx').onclick = () => { settled = true; delete pending[room]; m.close(); sendTo(p.user_id, { type: 'cancel', room, from: myInfo() }); };
    setTimeout(() => { if (!settled) { settled = true; delete pending[room]; m.close(); toast(t('pvp_timeout'), '⌛'); } }, 30000);
    await sendTo(p.user_id, { type: 'invite', room, from: myInfo() });
  }
  const pending = {}; const invites = {};
  function onInbox(pl) {
    if (!pl || !pl.from || !pl.from.uid || pl.from.uid === me() || blocks.has(pl.from.uid)) return;
    if (pl.type === 'invite') {
      if (battling) { sendTo(pl.from.uid, { type: 'busy', room: pl.room, from: myInfo() }); return; }
      SFX.play('fanfare');
      const body = h(`<div class="pvp-inv"><div class="pvp-av"></div><p>${esc(t('pvp_got', { n: pl.from.name }))}</p>
        <div class="btn-row"><button class="btn orange ok">⚔ ${t('pvp_accept')}</button><button class="btn no">${t('pvp_decline')}</button><button class="btn sm cd">🪪</button></div></div>`);
      try { const d = Avatar.dancer(3, pl.from.look || Avatar.DEFAULT); body.querySelector('.pvp-av').appendChild(d.el); } catch (x) {}
      const m = modal({ title: t('pvp_invite'), color: 'orange', body });
      invites[pl.room] = m;
      body.querySelector('.ok').onclick = () => { m.close(); delete invites[pl.room]; sendTo(pl.from.uid, { type: 'accept', room: pl.room, from: myInfo() }); startPvp(pl.room, { user_id: pl.from.uid, handle: pl.from.handle, name: pl.from.name, look: pl.from.look }, false); };
      body.querySelector('.no').onclick = () => { m.close(); delete invites[pl.room]; sendTo(pl.from.uid, { type: 'decline', room: pl.room, from: myInfo() }); };
      body.querySelector('.cd').onclick = () => openCard(pl.from.handle);
      setTimeout(() => { if (invites[pl.room]) { invites[pl.room].close(); delete invites[pl.room]; } }, 30000);
    } else if (pl.type === 'cancel') { if (invites[pl.room]) { invites[pl.room].close(); delete invites[pl.room]; toast(t('pvp_timeout'), '⌛'); } }
    else if (pending[pl.room]) pending[pl.room](pl.type);
  }

  function startPvp(room, opp, host) {
    battling = true;
    let you = 0, them = 0, round = 1, over = false, myPick = null, salt = '', sentCommit = false, timer = null, left = 15;
    const commits = {}, reveals = {};
    const body = h(`<div class="npc-battle pvp">
      <div class="nb-stage"><div class="nb-side me"><small>${esc(Player.me.name)}</small></div><div class="nb-vs">VS</div><div class="nb-side npc"><small>${esc(opp.name)}</small></div></div>
      <div class="nb-score"><span class="s-me">0</span> : <span class="s-npc">0</span></div>
      <p class="nb-round"></p><p class="nb-msg">${t('npc_rule')}</p>
      <div class="nb-btns">${Object.entries(RPS).map(([k, v]) => `<button class="btn" data-m="${k}">${v.icon} ${t('rps_' + k)}</button>`).join('')}</div>
      <div class="pvp-end"></div></div>`);
    const dMe = Avatar.dancer(3, Player.me.look), dOp = Avatar.dancer(3, opp.look || Avatar.DEFAULT);
    body.querySelector('.me').prepend(dMe.el); body.querySelector('.npc').prepend(dOp.el); dOp.el.style.transform = 'scaleX(-1)';
    const m = modal({ title: t('pvp_title', { a: Player.me.name, b: opp.name }), color: 'orange', body });
    const msg = body.querySelector('.nb-msg'), rd = body.querySelector('.nb-round'), btns = body.querySelector('.nb-btns');
    const ch = Backend.channel('pvp-' + room, me());
    const finish = (text, win) => {
      if (over) return; over = true; clearInterval(timer);
      btns.hidden = true; rd.textContent = '';
      msg.textContent = text;
      if (win) { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 24); } else if (win === false) SFX.play('error');
      const r = rel(opp.user_id);
      const end = body.querySelector('.pvp-end');
      if (r.type === 'none' && !blocks.has(opp.user_id)) {
        end.innerHTML = `<p>${esc(t('pvp_add', { n: opp.name }))}</p><div class="btn-row"><button class="btn green ad">${t('fr_add')}</button><button class="btn sm cd">🪪</button></div>`;
        end.querySelector('.ad').onclick = async () => { try { await Backend.sendFriend(opp.user_id); await reload(); toast(rel(opp.user_id).type === 'friend' ? t('fr_now', { n: opp.name }) : t('fr_sent'), '💌'); end.querySelector('.ad').disabled = true; } catch (x) { toast(errMsg(x), '✕'); } };
        end.querySelector('.cd').onclick = () => openCard(opp.handle);
      }
      setTimeout(() => Backend.removeChannel(ch), 1500);
    };
    const tick = () => {
      left--; rd.textContent = `${t('pvp_round', { n: round })}・${myPick ? t('pvp_wait') : t('pvp_pick', { s: left })}`;
      if (left <= 0 && !myPick) choose(Object.keys(RPS)[Math.floor(Math.random() * 3)]);
      if (left <= -15 && myPick && !reveals[round]) finish(t('pvp_left'), null);
    };
    const newRound = () => {
      myPick = null; salt = ''; sentCommit = false; left = 16;
      btns.querySelectorAll('button').forEach(b => { b.disabled = false; b.classList.remove('on'); });
      clearInterval(timer); timer = setInterval(tick, 1000); tick();
    };
    async function choose(k) {
      if (myPick || over) return;
      myPick = k; salt = Math.random().toString(36).slice(2) + Date.now();
      btns.querySelectorAll('button').forEach(b => { b.disabled = true; b.classList.toggle('on', b.dataset.m === k); });
      SFX.play('select'); tick();
      ch.send({ type: 'broadcast', event: 'commit', payload: { uid: me(), r: round, hash: await sha(`${room}|${round}|${k}|${salt}`) } });
      sentCommit = true; maybeReveal();
    }
    const revealed = {};
    const maybeReveal = () => { if (sentCommit && commits[round] && myPick && !revealed[round]) (revealed[round] = 1, ch.send({ type: 'broadcast', event: 'reveal', payload: { uid: me(), r: round, pick: myPick, salt } })); };
    async function onReveal(p) {
      if (p.uid !== opp.user_id || p.r !== round || reveals[round] || !RPS[p.pick]) return;
      if (!commits[round] || (await sha(`${room}|${p.r}|${p.pick}|${p.salt}`)) !== commits[round]) { finish(t('pvp_cheat'), true); return; }
      reveals[round] = p.pick;
      const mine = myPick, theirs = p.pick;
      Emotes.dance(dMe, RPS[mine].mv, 1400); Emotes.dance(dOp, RPS[theirs].mv, 1400);
      if (mine === theirs) msg.textContent = t('npc_tie', { a: RPS[mine].icon, b: RPS[theirs].icon });
      else if (RPS[mine].beats === theirs) { you++; msg.textContent = t('npc_win_r', { a: RPS[mine].icon, b: RPS[theirs].icon }); }
      else { them++; msg.textContent = t('npc_lose_r', { a: RPS[mine].icon, b: RPS[theirs].icon }); }
      body.querySelector('.s-me').textContent = you; body.querySelector('.s-npc').textContent = them;
      clearInterval(timer);
      if (you >= 2) return setTimeout(() => finish(t('pvp_win'), true), 900);
      if (them >= 2) return setTimeout(() => finish(t('pvp_lose'), false), 900);
      setTimeout(() => { round++; newRound(); }, 1600);
    }
    btns.onclick = e => { const b = e.target.closest('[data-m]'); if (b) choose(b.dataset.m); };
    let startedGame = false;
    ch.on('presence', { event: 'sync' }, () => {
      const keys = Object.keys(ch.presenceState());
      if (!startedGame && keys.includes(opp.user_id)) { startedGame = true; newRound(); }
    }).on('presence', { event: 'leave' }, ({ key }) => { if (key === opp.user_id && !over) finish(t('pvp_left'), null); })
      .on('broadcast', { event: 'commit' }, ({ payload: p }) => { if (p.uid === opp.user_id && p.r >= round && !commits[p.r]) { commits[p.r] = p.hash; maybeReveal(); } })
      .on('broadcast', { event: 'reveal' }, ({ payload: p }) => onReveal(p))
      .subscribe(async st => { if (st === 'SUBSCRIBED') await ch.track({ handle: Player.me.id }); });
    rd.textContent = t('pvp_connecting');
    setTimeout(() => { if (!startedGame && !over) finish(t('pvp_timeout'), null); }, 20000);
    // 關掉視窗 = 離開
    const obs = new MutationObserver(() => { if (!body.isConnected) { obs.disconnect(); battling = false; clearInterval(timer); if (!over) { over = true; Backend.removeChannel(ch); } } });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 即時通知：好友邀請、私訊、在線狀態 ---------- */
  function stop() {
    unsubs.forEach(f => { try { f(); } catch (x) {} }); unsubs = [];
    if (presence) { Backend.removeChannel(presence); presence = null; }
    if (inbox) { Backend.removeChannel(inbox); inbox = null; }
    rels = []; unread = {}; online = new Set(); closeDM(); started = false; badge();
  }
  async function start() {
    if (started || !on()) return;
    started = true;
    await reload();
    const uid = me();
    // 在線狀態（所有登入的玩家）
    presence = Backend.channel('online', uid);
    presence.on('presence', { event: 'sync' }, () => {
      online = new Set(Object.keys(presence.presenceState()));
      document.querySelectorAll('.fr-panel .fr-row, .dm-head').forEach(() => {});
    }).subscribe(async st => { if (st === 'SUBSCRIBED') await presence.track({ handle: Player.me.id }); });
    // 自己的收件匣（Battle 邀請）
    inbox = Backend.channel('inbox-' + uid, uid);
    inbox.on('broadcast', { event: 'pvp' }, ({ payload }) => onInbox(payload)).subscribe();
    // 好友邀請
    unsubs.push(Backend.subscribeTable('friend_requests', `to_user=eq.${uid}`, async p => {
      await reload();
      const r = p.new; if (!r || !r.from_user) return;
      if (p.eventType === 'INSERT' && r.status === 'pending' && !blocks.has(r.from_user)) {
        const who = people[r.from_user]; if (!who) return;
        SFX.play('coin');
        notify(`💌 ${t('fr_wants', { n: who.name })}`, () => openCard(who.handle, { request: true }));
      }
    }));
    unsubs.push(Backend.subscribeTable('friend_requests', `from_user=eq.${uid}`, async p => {
      const before = rel(p.new && p.new.to_user).type;
      await reload();
      const r = p.new;
      if (r && r.status === 'accepted' && before !== 'friend') { const who = people[r.to_user]; if (who) { SFX.play('fanfare'); toast(t('fr_accepted', { n: who.name }), '🤝'); } }
    }));
    // 私訊
    unsubs.push(Backend.subscribeTable('dms', `to_user=eq.${uid}`, async p => {
      if (p.eventType !== 'INSERT') return;
      const r = p.new; if (blocks.has(r.from_user)) return;
      if (dm && dm.uid === r.from_user) { addMsg(r); Backend.markRead(r.from_user).catch(() => {}); SFX.play('blip'); return; }
      unread[r.from_user] = (unread[r.from_user] || 0) + 1; badge();
      await loadPeople([r.from_user]);
      const who = people[r.from_user];
      SFX.play('coin');
      notify(`💬 ${t('dm_new', { n: who ? who.name : '?' })}`, () => openDM(r.from_user));
    }));
  }
  // 右上角的小通知（可以點）
  function notify(text, act) {
    let wrap = document.getElementById('fr-notes');
    if (!wrap) { wrap = h('<div id="fr-notes"></div>'); document.body.appendChild(wrap); }
    const n = h(`<button class="fr-note">${esc(text)}</button>`);
    n.onclick = () => { n.remove(); act && act(); };
    wrap.appendChild(n);
    setTimeout(() => n.remove(), 9000);
  }

  /* 點聊天室、留言、排行榜、舞池上的名字 → 打開名片 */
  document.addEventListener('click', e => {
    const n = e.target.closest && e.target.closest('.pname[data-h]');
    if (!n || n.closest('.hud') || !Backend.enabled) return;
    e.preventDefault(); e.stopPropagation();
    SFX.play('select'); openCard(n.dataset.h);
  }, true);

  // 登入 / 登出時啟動或停止
  const sync = () => { if (on()) start(); else if (started) stop(); else badge(); };
  if (Backend.enabled) {
    Backend.ready.then(() => Player.ready).then(() => { ensureHud(); sync(); });
    Backend.onChange(() => setTimeout(sync, 50));
    Player.onChange(() => setTimeout(sync, 50));
  }

  return { openCard, openCardEditor, openPanel, openDM, invitePvp, get online() { return online; } };
})();
