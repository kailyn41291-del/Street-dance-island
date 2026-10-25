/* =========================================================
 * 角色系統：捏角色、ID + 密碼登入、歡迎回來、本週任務板
 * 目前存在這台瀏覽器（localStorage）。之後要跨裝置，
 * 只要把 DB 這個物件換成雲端資料庫（例如 Supabase）即可。
 * ========================================================= */
window.Player = (() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const KEY = 'danceIsland.players', SESSION = 'danceIsland.session';
  const DB = {
    all() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    get(id) { return this.all()[id] || null; },
    put(p) { const a = this.all(); a[p.id] = p; localStorage.setItem(KEY, JSON.stringify(a)); }
  };

  let me = null, hooks = {};
  const listeners = [];
  const changed = () => listeners.forEach(f => f(me));
  const cloud = () => Backend.enabled;
  const fromProfile = p => (p ? { id: p.handle, name: p.name, nat: p.nat, style: p.style, job: p.job, title: p.title, look: p.look || {}, role: Backend.role, verified: !!p.verified, ig: p.ig || null, banned: !!p.banned } : null);
  // 啟動時恢復登入狀態（雲端：Supabase session；本機：localStorage）
  const ready = (cloud() ? Backend.ready.then(() => { me = fromProfile(Backend.profile); return loadVerified(); }) : Promise.resolve().then(() => {
    try { const id = localStorage.getItem(SESSION); if (id) me = DB.get(id); } catch (e) {}
  }));

  /* 密碼雜湊（加鹽 SHA-256；不支援時用備用雜湊） */
  async function hashPass(pass, salt) {
    const text = salt + ':' + pass;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let r = 0; r < 1000; r++) for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    return 'x' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }
  const salt = () => Math.random().toString(36).slice(2, 10);

  const setSession = p => { me = p; try { p ? localStorage.setItem(SESSION, p.id) : localStorage.removeItem(SESSION); } catch (e) {} changed(); };

  /* ---------- 捏角色編輯器 ---------- */
  // state = { look, job, title }，role = 'owner' | 'admin' | null（決定能不能選專屬造型 / 稱號）
  function lookEditor(state, role) {
    state.look = Avatar.normalize(state.look);
    const L = state.look;
    const tabs = ['body', 'hair', 'hat', 'outfit', 'acc', 'job', 'title'].concat(role ? ['special'] : []);
    const wrap = h(`<div class="creator">
      <div class="creator-stage"><div class="spot-floor"></div>
        <div class="stage-tags"></div>
        <div class="stage-btns"><button type="button" class="btn sm g-m">♂</button><button type="button" class="btn sm g-f">♀</button><button type="button" class="btn sm yellow rnd">${t('p_random')}</button></div></div>
      <div class="creator-side"><div class="ctabs">${tabs.map(k => `<button type="button" data-tab="${k}">${t('tab_' + k)}</button>`).join('')}</div><div class="creator-opts"></div></div></div>`);
    const d = Avatar.dancer(4, L);
    wrap.querySelector('.creator-stage').prepend(d.el);
    const tm = setInterval(() => { if (!d.el.isConnected) clearInterval(tm); else d.beat(); }, 340);
    const opts = wrap.querySelector('.creator-opts'), tagsEl = wrap.querySelector('.stage-tags');
    const O = t('opts'), J = t('jobs');
    const row = (label, html) => `<div class="opt-row"><span class="opt-l">${label}</span><div class="opt-v">${html}</div></div>`;
    const sw = (key, list) => list.map(c => `<button type="button" class="sw" data-k="${key}" data-v="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('');
    const sel = (key, list) => list.map(v => `<button type="button" class="opt-b" data-k="${key}" data-v="${v}">${esc(O[v] || v)}</button>`).join('');
    let tab = 'body';
    const refreshTags = () => {
      tagsEl.innerHTML = `<span class="tag job">${esc(J[state.job] || '')}</span>${state.title ? Titles.html(state.title) : ''}`;
    };
    const draw = () => {
      wrap.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      const A = Avatar.OPT, C = Avatar.COLORS;
      const panels = {
        body: row(t('o_gender'), sel('gender', A.gender)) + row(t('o_face'), sel('face', A.face)) + row(t('o_skin'), sw('skin', C.skin)) + row(t('o_eye'), sw('eye', C.eye)),
        hair: row(t('o_hair'), sel('hair', A.hair)) + row(t('o_hairColor'), sw('hairColor', C.hair)),
        hat: row(t('o_hat'), sel('hat', A.hat)) + row(t('o_hatColor'), sw('hatColor', C.cloth)),
        outfit: row(t('o_top'), sel('top', A.top)) + row(t('o_topColor'), sw('topColor', C.cloth)) + row(t('o_bottom'), sel('bottom', A.bottom)) + row(t('o_bottomColor'), sw('bottomColor', C.cloth)) +
          row(t('o_shoes'), sel('shoes', A.shoes)) + row(t('o_shoesColor'), sw('shoesColor', C.cloth)),
        acc: row(t('o_faceAcc'), sel('faceAcc', A.faceAcc)) + row(t('o_acc'), sel('acc', A.acc)) + row(t('o_accColor'), sw('accColor', C.cloth)),
        job: `<div class="job-grid">${Object.keys(Avatar.JOBS).map(k => `<button type="button" class="opt-b job-b" data-job="${k}">${esc(J[k])}</button>`).join('')}</div>
          <button type="button" class="btn sm pink job-apply">${t('job_apply')}</button>`,
        title: `<p class="note">${t('title_pick')}</p><div class="title-grid"><button type="button" class="opt-b" data-title="">${t('title_none')}</button>${Titles.allowed(role, !!(me && me.verified), me && me.unlocks, (me && me.level) || 1).map(x => `<button type="button" class="opt-b" data-title="${x.id}">${Titles.html(x.id)}</button>`).join('')}</div>`,
        special: row(t('o_special'), sel('special', ['none', 'admin'].concat(role === 'owner' ? ['owner'] : [], Avatar.skinsFor(role, me && me.id))))
      };
      opts.innerHTML = panels[tab];
      opts.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', L[b.dataset.k] === b.dataset.v));
      opts.querySelectorAll('[data-job]').forEach(b => b.classList.toggle('on', state.job === b.dataset.job));
      opts.querySelectorAll('[data-title]').forEach(b => b.classList.toggle('on', (state.title || '') === b.dataset.title));
      refreshTags();
    };
    const apply = () => { d.setLook(L); refreshTags(); };
    wrap.querySelector('.ctabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; SFX.play('select'); draw(); } };
    opts.addEventListener('click', e => {
      const k = e.target.closest('[data-k]'), j = e.target.closest('[data-job]'), ti = e.target.closest('[data-title]');
      if (k) { L[k.dataset.k] = k.dataset.v; SFX.play('select'); opts.querySelectorAll(`[data-k="${k.dataset.k}"]`).forEach(x => x.classList.toggle('on', x === k)); apply(); }
      if (j) { state.job = j.dataset.job; L.job = state.job; SFX.play('select'); opts.querySelectorAll('[data-job]').forEach(x => x.classList.toggle('on', x === j)); apply(); }
      if (ti) { state.title = ti.dataset.title || null; SFX.play('select'); opts.querySelectorAll('[data-title]').forEach(x => x.classList.toggle('on', x === ti)); refreshTags(); }
      if (e.target.closest('.job-apply')) { Object.assign(L, Avatar.JOBS[state.job] || {}); L.job = state.job; SFX.play('coin'); sparkle(e.clientX, e.clientY, 10); apply(); }
    });
    wrap.querySelector('.rnd').onclick = () => { Object.assign(L, Avatar.random({ job: state.job, special: L.special })); SFX.play('card'); apply(); draw(); };
    wrap.querySelector('.g-m').onclick = () => { L.gender = 'm'; SFX.play('select'); apply(); draw(); };
    wrap.querySelector('.g-f').onclick = () => { L.gender = 'f'; if (['short', 'buzz', 'spiky'].includes(L.hair)) L.hair = 'long'; SFX.play('select'); apply(); draw(); };
    draw();
    return wrap;
  }

  /* ---------- 國籍選單 ---------- */
  function natOptions(sel) {
    const G = window.GEO, C = I18N.CONT_KEY;
    const opt = c => `<option value="${c.code}" ${c.code === sel ? 'selected' : ''}>${esc(nm(c))}</option>`;
    const home = G.countries.find(c => c.home);
    return opt(home) + Object.keys(C).map(k => `<optgroup label="${t(C[k])}">${G.countries.filter(c => c.cont === k && !c.home)
      .sort((a, b) => nm(a).localeCompare(nm(b))).map(opt).join('')}</optgroup>`).join('');
  }
  const guessNat = () => ({ ja: 'JP', ko: 'KR', zh: 'TW' }[I18N.lang] || 'US');

  /* ---------- 建立角色 ---------- */
  function openCreate() {
    const state = { look: Avatar.random({ job: 'bboy' }), job: 'bboy', title: 'rookie' };
    Object.assign(state.look, Avatar.JOBS.bboy);
    const body = h(`<form class="form" novalidate autocomplete="off">
      <div class="full"></div>
      <label class="field"><span>${t('p_name')} <b>*</b></span><input class="input" name="name" maxlength="20" placeholder="${esc(t('p_name_ph'))}"></label>
      <label class="field"><span>${t('p_nat')} <b>*</b></span><select class="input" name="nat">${natOptions(guessNat())}</select></label>
      <label class="field"><span>${t('p_id')} <b>*</b></span><input class="input" name="id" maxlength="16" placeholder="${esc(t('p_id_ph'))}" autocapitalize="off" spellcheck="false"></label>
      <label class="field"><span>${t('p_style')}</span><select class="input" name="style">${Store.STYLES.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
      <label class="field"><span>${t('p_pass')} <b>*</b></span><input class="input" name="pass" type="password" autocomplete="new-password"></label>
      <label class="field"><span>${t('p_pass2')} <b>*</b></span><input class="input" name="pass2" type="password" autocomplete="new-password"></label>
      ${cloud() ? '' : `<p class="full note">${t('p_local_note')}</p>`}
      <div class="full"><div class="err"></div><div class="form-foot">
        <button type="button" class="btn link-login">${t('p_have')}</button><span class="grow"></span>
        <button type="submit" class="btn pink">${t('p_submit')}</button></div></div>
    </form>`);
    body.firstElementChild.appendChild(lookEditor(state, null));
    const m = modal({ title: t('p_title_create'), color: 'pink', body, wide: true });
    const f = body;
    f.elements.nat.onchange = () => { const l = I18N.langForCountry(f.elements.nat.value); if (l !== I18N.lang) { toast(I18N.LANGS.find(x => x[0] === l)[1], '🌐'); } };
    f.querySelector('.link-login').onclick = () => { m.close(); setTimeout(openLogin, 220); };
    f.onsubmit = async ev => {
      ev.preventDefault();
      const v = k => f.elements[k].value.trim();
      const err = f.querySelector('.err');
      f.querySelectorAll('.bad').forEach(x => x.classList.remove('bad'));
      const fail = (n, msg) => { SFX.play('error'); err.textContent = '✕ ' + msg; if (n) f.elements[n].classList.add('bad'); };
      const id = v('id').toLowerCase();
      if (!v('name')) return fail('name', t('e_name_req'));
      if (!/^[a-z0-9_]{3,16}$/.test(id)) return fail('id', t('e_id_fmt'));
      const pass = f.elements.pass.value;
      if (pass.length < 6) return fail('pass', t('e_pass_len'));
      if (pass !== f.elements.pass2.value) return fail('pass2', t('e_pass_match'));
      const btn = f.querySelector('[type=submit]'); btn.disabled = true;
      let p;
      try {
        if (cloud()) {
          if (await Backend.handleTaken(id)) { btn.disabled = false; return fail('id', t('e_id_taken')); }
          p = fromProfile(await Backend.signUpPlayer(id, pass, { name: v('name'), nat: v('nat'), style: v('style'), job: state.job, title: state.title, look: { ...state.look } }));
        } else {
          if (DB.get(id)) { btn.disabled = false; return fail('id', t('e_id_taken')); }
          const s = salt();
          p = { id, name: v('name'), nat: v('nat'), style: v('style'), job: state.job, title: state.title, look: { ...state.look }, salt: s, hash: await hashPass(pass, s), created: new Date().toISOString() };
          DB.put(p);
        }
      } catch (e) { btn.disabled = false; console.warn(e); return fail(/reserved/.test(e.message) ? 'name' : null, /registered|exists/i.test(e.message) ? t('e_id_taken') : /reserved/.test(e.message) ? t('v_reserved') : e.message); }
      m.close();
      I18N.set(I18N.langForCountry(p.nat));
      setSession(p);
      setTimeout(() => { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 24); npc.say([{ text: t('welcome_new', { n: p.name }), mood: 'celebrate' }, { who: 'choco', mood: 'peace', text: t('welcome_new_c', { n: p.name }) }], () => questBoard()); }, 260);
    };
  }

  /* ---------- 登入 ---------- */
  function openLogin() {
    const body = h(`<form class="form" novalidate>
      <label class="field full"><span>${t('p_id')}</span><input class="input" name="id" autocapitalize="off" spellcheck="false" autocomplete="username"></label>
      <label class="field full"><span>${t('p_pass')}</span><input class="input" name="pass" type="password" autocomplete="current-password"></label>
      ${cloud() ? '' : `<p class="full note">${t('p_local_note')}</p>`}
      <div class="full"><div class="err"></div><div class="form-foot">
        <button type="button" class="btn link-create">${t('p_noacc')}</button><span class="grow"></span>
        <button type="submit" class="btn teal">${t('p_title_login')}</button></div></div>
    </form>`);
    const m = modal({ title: t('p_title_login'), color: 'teal', body });
    body.querySelector('.link-create').onclick = () => { m.close(); setTimeout(openCreate, 220); };
    body.onsubmit = async ev => {
      ev.preventDefault();
      const id = body.elements.id.value.trim().toLowerCase(), pass = body.elements.pass.value;
      let p = null;
      if (cloud()) { try { p = fromProfile(await Backend.signInPlayer(id, pass)); } catch (e) { p = null; } }
      else { const q = DB.get(id); if (q && (await hashPass(pass, q.salt)) === q.hash) p = q; }
      const ok = !!p;
      if (!ok) { SFX.play('error'); body.querySelector('.err').textContent = '✕ ' + t('e_login'); body.elements.pass.classList.add('bad'); return; }
      m.close();
      if (p.nat) I18N.set(I18N.langForCountry(p.nat));
      setSession(p);
      setTimeout(welcome, 260);
    };
  }

  /* ---------- 選擇：創角 / 登入 / 先逛逛 ---------- */
  function prompt() {
    const body = h(`<div class="choose">
      <div class="choose-art"></div>
      <p>${t('p_choose_text')}</p>
      <div class="choose-btns">
        <button class="btn pink c-new">${t('p_create')}</button>
        <button class="btn teal c-login">${t('p_login')}</button>
        <button class="btn c-later">${t('p_later')}</button>
      </div></div>`);
    body.querySelector('.choose-art').insertAdjacentHTML('beforeend', `<img class="k-full choose-k" src="${UI.Kailyn.FULL}" alt="Kailyn">`);
    const looks = [Avatar.random({ gender: 'f' }), Avatar.random({ gender: 'm' })];
    looks.forEach(l => { const d = Avatar.dancer(3, l); body.querySelector('.choose-art').appendChild(d.el); const tm = setInterval(() => { if (!d.el.isConnected) clearInterval(tm); else d.beat(); }, 300 + Math.random() * 120); });
    const m = modal({ title: t('p_choose_title'), color: 'yellow', body });
    body.querySelector('.c-new').onclick = () => { m.close(); setTimeout(openCreate, 220); };
    body.querySelector('.c-login').onclick = () => { m.close(); setTimeout(openLogin, 220); };
    body.querySelector('.c-later').onclick = m.close;
  }

  /* ---------- 角色選單（編輯外觀 / 登出） ---------- */
  function openMenu() {
    if (!me) return prompt();
    const state = { look: { ...me.look }, job: me.job || me.look.job || 'bboy', title: me.title || null };
    const nat = GEO.countries.find(c => c.code === me.nat);
    const body = h(`<div><div class="me-head"><b>${nameHTML(me)}</b> <span class="tag">@${esc(me.id)}</span>
      ${me.verified && me.ig ? `<a class="tag vtag" href="https://www.instagram.com/${encodeURIComponent(me.ig)}/" target="_blank" rel="noopener">✔ IG @${esc(me.ig)}</a>` : ''} ${nat ? `<span class="tag">${esc(nm(nat))}</span>` : ''} <span class="tag">${esc(me.style || '')}</span>
      ${me.role ? `<span class="tag role-tag role-${me.role}">${me.role === 'owner' ? '★ ' + Titles.label('owner') : '✦ ' + Titles.label('admin')}</span>` : ''}</div>
      <div class="ed"></div>
      <div class="form-foot"><button class="btn red lo">${t('p_logout')}</button>${cloud() && !me.verified ? `<button class="btn blue vf">${t('v_apply')}</button>` : ''}<span class="grow"></span><button class="btn pink sv">${t('p_save')}</button></div></div>`);
    body.querySelector('.ed').appendChild(lookEditor(state, me.role));
    const vf = body.querySelector('.vf'); if (vf) vf.onclick = () => { m.close(); setTimeout(openVerify, 220); };
    const m = modal({ title: t('p_edit'), color: 'pink', body, wide: true });
    body.querySelector('.sv').onclick = async () => {
      const patch = { look: state.look, job: state.job, title: state.title };
      try { if (cloud()) await Backend.saveProfile(patch); else DB.put({ ...DB.get(me.id), ...patch }); } catch (e) { SFX.play('error'); toast(/reserved/.test(e.message) ? t('v_reserved') : e.message, '✕'); return; }
      Object.assign(me, patch); changed(); m.close(); SFX.play('coin'); toast(t('p_saved'), '★');
    };
    body.querySelector('.lo').onclick = async () => { m.close(); if (cloud()) await Backend.signOut(); setSession(null); toast(t('p_logged_out'), '👋'); };
  }

  /* ---------- 實名認證 ---------- */
  // 已認證的名字（用來標示「長得很像但沒認證」的帳號）
  let vKeys = new Set();
  const nameKey = n => String(n || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  async function loadVerified() {
    if (!cloud()) return;
    try { vKeys = new Set((await Backend.verifiedNames()).map(p => p.verified_key)); } catch (e) {}
  }
  /** 名字 + 認證勾勾（或「疑似冒名」警告） */
  function nameHTML(a) {
    const n = esc(a.name || '???');
    let out = n;
    if (a.verified) out = `${n}<span class="vchk" title="${esc(t('v_badge'))}">✔</span>`;
    else if (vKeys.has(nameKey(a.name))) out = `${n}<span class="vwarn" title="${esc(t('v_lookalike'))}">⚠</span>`;
    // 雲端模式：點名字可以打開玩家名片
    return cloud() && a.handle ? `<span class="pname" data-h="${esc(a.handle)}" role="button" tabindex="0">${out}</span>` : out;
  }

  async function openVerify() {
    if (!me || !cloud()) return;
    let cur = null;
    try { cur = await Backend.myVerification(); } catch (e) {}
    const steps = code => `<ol class="steps">${t('v_steps').map(x => `<li>${x.replace('{code}', `<code class="vcode">${esc(code)}</code>`)}</li>`).join('')}</ol>`;
    let body;
    if (cur && cur.status === 'pending') {
      body = h(`<div><p>${t('v_pending')}</p>${steps(cur.code)}<p class="note">IG：@${esc(cur.ig)}　｜　${esc(cur.dancer_name)}</p></div>`);
    } else {
      body = h(`<form class="form" novalidate>
        ${cur && cur.status === 'rejected' ? `<p class="full err">${t('v_rejected')}</p>` : ''}
        <p class="full note">${t('v_intro')}</p>
        <label class="field"><span>${t('v_name')} <b>*</b></span><input class="input" name="dn" maxlength="20" value="${esc(me.name)}"></label>
        <label class="field"><span>${t('v_ig')} <b>*</b></span><input class="input" name="ig" maxlength="31" placeholder="${esc(t('v_ig_ph'))}" autocapitalize="off" spellcheck="false"></label>
        <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn blue">${t('v_submit')}</button></div></div></form>`);
    }
    const m = modal({ title: t('v_title'), color: 'blue', body });
    if (body.tagName !== 'FORM') return;
    body.onsubmit = async ev => {
      ev.preventDefault();
      const dn = body.elements.dn.value.trim(), ig = body.elements.ig.value.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
      const err = body.querySelector('.err');
      if (!dn) { err.textContent = '✕ ' + t('e_name_req'); return; }
      if (!/^[A-Za-z0-9._]{1,30}$/.test(ig)) { err.textContent = '✕ ' + t('v_ig_bad'); return; }
      const code = 'DI-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
      try { await Backend.requestVerification(dn, ig, code); } catch (x) { SFX.play('error'); err.textContent = '✕ ' + x.message; return; }
      m.close(); SFX.play('coin');
      setTimeout(openVerify, 250);
    };
  }

  /* ---------- 檢舉冒名 ---------- */
  function openReport(handle, name) {
    if (!cloud()) return;
    if (!me) return prompt();
    const body = h(`<form class="form" novalidate><p class="full">${t('rp_q', { n: esc(name) })}</p>
      <label class="field full"><textarea class="input" name="r" maxlength="200" placeholder="${esc(t('rp_ph'))}"></textarea></label>
      <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn red">${t('rp_send')}</button></div></div></form>`);
    const m = modal({ title: t('rp_title'), color: 'pink', body });
    body.onsubmit = async ev => {
      ev.preventDefault();
      try { await Backend.report(handle, body.elements.r.value.trim()); } catch (x) { body.querySelector('.err').textContent = '✕ ' + x.message; return; }
      m.close(); toast(t('rp_sent'), '⚑');
    };
  }

  /* ---------- 歡迎回來 + 本週任務板 ---------- */
  function welcome() {
    if (!me) return;
    SFX.play('fanfare');
    npc.say(Math.random() < 0.5 ? [{ text: t('welcome_back', { n: me.name }), mood: 'happy' }] : [{ who: 'choco', mood: 'hello', text: t('welcome_back_c', { n: me.name }) }], () => questBoard());
  }

  function questBoard() {
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date(), today = ymd(now), wk = ymd(new Date(now.getTime() + 7 * 864e5));
    const all = Store.all().filter(e => (e.endDate || e.date) >= today);
    let list = all.filter(e => e.date <= wk), head = t('quest_week');
    if (!list.length) { list = all.slice(0, 6); head = all.length ? t('quest_none') : t('quest_empty'); }
    const place = e => { const c = GEO.countries.find(x => x.code === e.country); const ci = c && c.cities.find(x => x.id === e.city); return [nm(c), nm(ci)].filter(Boolean).join('・'); };
    const W = t('week');
    const q = t('quest_npc'), ql = Array.isArray(q) ? q[Math.floor(Math.random() * q.length)] : null, L = ql && UI.lineOf(ql);
    const body = h(`<div>${L ? `<div class="quest-npc ${L.who === 'choco' ? 'choco' : ''}"><div class="k-face"><img src="${L.img}" alt=""></div><div class="bub"><b>${esc(UI.whoName(L.who))}</b><br>${esc(L.text)}</div></div>` : ''}${window.Hub && Hub.boardHTML ? Hub.boardHTML() : ''}<p class="quest-head">${head}</p><ul class="quest">${list.map((e, i) => {
      const d = new Date(e.date + 'T00:00');
      return `<li style="--i:${i};--c:${Store.STYLE_COLOR[(e.styles || [])[0]] || 'var(--yellow)'}"><span class="qd"><b>${pad(d.getMonth() + 1)}/${pad(d.getDate())}</b><small>${W[d.getDay()]}</small></span>
        <span class="qn"><b>${esc(e.name)}</b><small>${esc(place(e))}${e.startTime ? ' · ' + esc(e.startTime) : ''}</small></span>
        <button class="btn sm yellow" data-go="${esc(e.country)}/${esc(e.city)}" data-id="${esc(e.id)}">${t('quest_go')}</button></li>`;
    }).join('')}</ul></div>`);
    const m = modal({ title: t('quest_title'), color: 'yellow', body });
    body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { m.close(); hooks.goEvent && hooks.goEvent(b.dataset.go, b.dataset.id); });
    body.querySelectorAll('[data-qgo]').forEach(b => b.onclick = () => { m.close(); setTimeout(() => Hub.goQuest(b.dataset.qgo), 230); });
  }

  return {
    get me() { return me; },
    ready,
    init(o) { hooks = o || {}; },
    onChange: f => listeners.push(f),
    prompt, openCreate, openLogin, openMenu, welcome, questBoard, openVerify, openReport, nameHTML, loadVerified
  };
})();
