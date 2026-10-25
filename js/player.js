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
  const fromProfile = p => (p ? { id: p.handle, name: p.name, nat: p.nat, style: p.style, look: p.look || {} } : null);
  // 啟動時恢復登入狀態（雲端：Supabase session；本機：localStorage）
  const ready = (cloud() ? Backend.ready.then(() => { me = fromProfile(Backend.profile); }) : Promise.resolve().then(() => {
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

  /* ---------- 外觀編輯器 ---------- */
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const randomLook = () => ({
    head: pick(Object.keys(PX.HEADS)), hat: pick(PX.SWATCH.cloth), hair: pick(PX.SWATCH.hair), skin: pick(PX.SWATCH.skin),
    shirt: pick(PX.SWATCH.cloth), pants: pick(PX.SWATCH.cloth), shoes: pick(PX.SWATCH.cloth), acc: pick(['none', 'none', 'glasses', 'shades'])
  });

  function lookEditor(look, onChange) {
    const wrap = h(`<div class="creator">
      <div class="creator-stage"><div class="spot-floor"></div><button type="button" class="btn sm rnd">${t('p_random')}</button></div>
      <div class="creator-opts"></div></div>`);
    const d = PX.dancer(9, look);
    wrap.querySelector('.creator-stage').prepend(d.el);
    const tm = setInterval(() => { if (!d.el.isConnected) clearInterval(tm); else d.beat(); }, 330);
    const opts = wrap.querySelector('.creator-opts');
    const row = (label, html) => `<div class="opt-row"><span class="opt-l">${label}</span><div class="opt-v">${html}</div></div>`;
    const sw = (key, list) => list.map(c => `<button type="button" class="sw" data-k="${key}" data-v="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('');
    const sel = (key, obj) => Object.keys(obj).map(k => `<button type="button" class="opt-b" data-k="${key}" data-v="${k}">${esc(obj[k])}</button>`).join('');
    const draw = () => {
      opts.innerHTML =
        row(t('p_head'), sel('head', t('heads'))) +
        row(t('p_hat'), sw('hat', PX.SWATCH.cloth)) + row(t('p_hair'), sw('hair', PX.SWATCH.hair)) +
        row(t('p_skin'), sw('skin', PX.SWATCH.skin)) + row(t('p_shirt'), sw('shirt', PX.SWATCH.cloth)) +
        row(t('p_pants'), sw('pants', PX.SWATCH.cloth)) + row(t('p_shoes'), sw('shoes', PX.SWATCH.cloth)) +
        row(t('p_acc'), sel('acc', t('accs')));
      opts.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', look[b.dataset.k] === b.dataset.v));
    };
    opts.addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      look[b.dataset.k] = b.dataset.v; SFX.play('select');
      opts.querySelectorAll(`[data-k="${b.dataset.k}"]`).forEach(x => x.classList.toggle('on', x === b));
      d.setLook(look); onChange && onChange(look);
    });
    wrap.querySelector('.rnd').onclick = () => { Object.assign(look, randomLook()); SFX.play('card'); d.setLook(look); draw(); onChange && onChange(look); };
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
    const look = randomLook(); look.head = 'cap';
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
    body.firstElementChild.appendChild(lookEditor(look));
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
          p = fromProfile(await Backend.signUpPlayer(id, pass, { name: v('name'), nat: v('nat'), style: v('style'), look: { ...look } }));
        } else {
          if (DB.get(id)) { btn.disabled = false; return fail('id', t('e_id_taken')); }
          const s = salt();
          p = { id, name: v('name'), nat: v('nat'), style: v('style'), look: { ...look }, salt: s, hash: await hashPass(pass, s), created: new Date().toISOString() };
          DB.put(p);
        }
      } catch (e) { btn.disabled = false; console.warn(e); return fail(null, /registered|exists/i.test(e.message) ? t('e_id_taken') : e.message); }
      m.close();
      I18N.set(I18N.langForCountry(p.nat));
      setSession(p);
      setTimeout(() => { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 24); npc.say([t('welcome_new', { n: p.name })], () => questBoard()); }, 260);
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
    const looks = [PX.LOOK_DEFAULT, randomLook(), randomLook()];
    looks.forEach(l => { const d = PX.dancer(5, l); body.querySelector('.choose-art').appendChild(d.el); const tm = setInterval(() => { if (!d.el.isConnected) clearInterval(tm); else d.beat(); }, 300 + Math.random() * 120); });
    const m = modal({ title: t('p_choose_title'), color: 'yellow', body });
    body.querySelector('.c-new').onclick = () => { m.close(); setTimeout(openCreate, 220); };
    body.querySelector('.c-login').onclick = () => { m.close(); setTimeout(openLogin, 220); };
    body.querySelector('.c-later').onclick = m.close;
  }

  /* ---------- 角色選單（編輯外觀 / 登出） ---------- */
  function openMenu() {
    if (!me) return prompt();
    const look = { ...PX.LOOK_DEFAULT, ...me.look };
    const body = h(`<div><div class="me-head"><b>${esc(me.name)}</b> <span class="tag">@${esc(me.id)}</span> <span class="tag">${esc(nm(GEO.countries.find(c => c.code === me.nat)))}</span> <span class="tag">${esc(me.style || '')}</span></div>
      <div class="ed"></div>
      <div class="form-foot"><button class="btn red lo">${t('p_logout')}</button><span class="grow"></span><button class="btn pink sv">${t('p_save')}</button></div></div>`);
    body.querySelector('.ed').appendChild(lookEditor(look));
    const m = modal({ title: t('p_edit'), color: 'pink', body, wide: true });
    body.querySelector('.sv').onclick = async () => {
      try { if (cloud()) await Backend.saveLook(look); else DB.put({ ...DB.get(me.id), look }); } catch (e) { SFX.play('error'); toast(e.message, '✕'); return; }
      me.look = look; changed(); m.close(); SFX.play('coin'); toast(t('p_saved'), '★');
    };
    body.querySelector('.lo').onclick = async () => { m.close(); if (cloud()) await Backend.signOut(); setSession(null); toast(t('p_logged_out'), '👋'); };
  }

  /* ---------- 歡迎回來 + 本週任務板 ---------- */
  function welcome() {
    if (!me) return;
    SFX.play('fanfare');
    npc.say([t('welcome_back', { n: me.name })], () => questBoard());
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
    const body = h(`<div><p class="quest-head">${head}</p><ul class="quest">${list.map((e, i) => {
      const d = new Date(e.date + 'T00:00');
      return `<li style="--i:${i};--c:${Store.STYLE_COLOR[(e.styles || [])[0]] || 'var(--yellow)'}"><span class="qd"><b>${pad(d.getMonth() + 1)}/${pad(d.getDate())}</b><small>${W[d.getDay()]}</small></span>
        <span class="qn"><b>${esc(e.name)}</b><small>${esc(place(e))}${e.startTime ? ' · ' + esc(e.startTime) : ''}</small></span>
        <button class="btn sm yellow" data-go="${esc(e.country)}/${esc(e.city)}" data-id="${esc(e.id)}">${t('quest_go')}</button></li>`;
    }).join('')}</ul></div>`);
    const m = modal({ title: t('quest_title'), color: 'yellow', body });
    body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { m.close(); hooks.goEvent && hooks.goEvent(b.dataset.go, b.dataset.id); });
  }

  return {
    get me() { return me; },
    ready,
    init(o) { hooks = o || {}; },
    onChange: f => listeners.push(f),
    prompt, openCreate, openLogin, openMenu, welcome, questBoard
  };
})();
