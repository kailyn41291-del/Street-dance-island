/* =========================================================
 * 第二批：收藏 ★、我的頁面（行程 / 護照 / 等級 / 每日簽到）、
 *         主辦方頁面 + 追蹤、投稿審核、歷屆成績、提醒
 * 需要雲端模式（Supabase）；本機模式下這些按鈕會提示要登入雲端
 * ========================================================= */
(() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const S = { favs: new Set(), checks: new Map(), follows: new Set(), unlocks: new Set(), stats: null, level: 1, loaded: false };
  A.socialState = S;
  A.social = S;

  /* ---------- 等級：Lv = √(XP/30) + 1 ---------- */
  const levelOf = xp => Math.floor(Math.sqrt((xp || 0) / 30)) + 1;
  const xpFor = lv => 30 * (lv - 1) ** 2;

  const cloudOK = () => Backend.enabled && Player.me;
  async function loadMine() {
    S.loaded = false;
    S.favs = new Set(); S.checks = new Map(); S.follows = new Set(); S.unlocks = new Set(); S.stats = null; S.level = 1;
    if (!cloudOK()) return;
    try {
      const [f, c, fo, u, st] = await Promise.all([Backend.listFavorites(), Backend.myCheckins(), Backend.listFollows(), Backend.myUnlocks(), Backend.stats()]);
      S.favs = new Set(f); S.checks = new Map(c.map(x => [x.event_id, x])); S.follows = new Set(fo); S.unlocks = new Set(u);
      S.stats = st; S.level = levelOf(st.xp);
      Player.me.unlocks = S.unlocks; Player.me.level = S.level;
      S.loaded = true;
    } catch (e) { console.warn('[mine]', e); }
  }
  const refreshStats = async () => { try { S.stats = await Backend.stats(); const lv = levelOf(S.stats.xp); if (lv > S.level) { S.level = lv; if (Player.me) Player.me.level = lv; levelUp(lv); } } catch (e) {} };
  function levelUp(lv) {
    SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 30);
    toast(t('lv_up', { n: lv }), PXI.img('xp/level_up', '⬆'));
  }
  const needLogin = () => { if (!Backend.enabled) { toast(t('need_cloud'), '☁'); return true; } if (!Player.me) { Player.prompt(); return true; } return false; };

  /* ---------- 活動卡片：收藏 ★、打卡 🛂、成績 🏆 ---------- */
  const canCheckin = (e, today) => e.date <= today && (e.endDate || e.date) >= A.ymd(new Date(Date.now() - 14 * 864e5));
  A.cardExtras2 = (e, past) => {
    const today = A.todayStr(), fav = S.favs.has(e.id), done = S.checks.has(e.id);
    return `<button class="btn sm ${fav ? 'yellow' : ''} fav-b" data-act="fav" data-ev="${esc(e.id)}" aria-pressed="${fav}">${fav ? PXI.img('event/fav_on', '★') : PXI.img('event/fav', '☆')} ${t(fav ? 'b_faved' : 'b_fav')}</button>`
      + (canCheckin(e, today) || done ? `<button class="btn sm ${done ? 'green' : 'blue'}" data-act="checkin" data-ev="${esc(e.id)}">${PXI.img('event/checkin', '🛂')} ${t(done ? 'b_checked' : 'b_checkin')}</button>` : '');
  };
  A.cardResults = e => {
    const rs = (e.results || []).filter(r => r && r.name);
    const vid = /^https?:\/\//i.test(e.video || '') ? e.video : '';
    if (!rs.length && !vid) return '';
    return `<div class="results"><b>🏆 ${t('res_title')}</b>${rs.map((r, i) => `<span class="res res${Math.min(i, 3)}">${esc(r.place || '')} ${esc(r.name)}</span>`).join('')}
      ${vid ? `<a class="btn sm red" href="${esc(vid)}" target="_blank" rel="noopener">▶ ${t('res_video')}</a>` : ''}</div>`;
  };
  A.onCardAct2 = async (a, ev, tg, redraw) => {
    if (a === 'fav') {
      if (needLogin()) return true;
      const on = S.favs.has(ev.id);
      try { if (on) { await Backend.removeFavorite(ev.id); S.favs.delete(ev.id); } else { await Backend.addFavorite(ev.id); S.favs.add(ev.id); SFX.play('coin'); sparkle(tg.getBoundingClientRect().x + 20, tg.getBoundingClientRect().y, 8); toast(t('fav_added'), '★'); } }
      catch (x) { toast(x.message, '✕'); return true; }
      tg.outerHTML = A.cardExtras2(ev).split('</button>')[0] + '</button>';
      refreshStats();
      return true;
    }
    if (a === 'checkin') {
      if (needLogin()) return true;
      const done = S.checks.has(ev.id);
      try {
        if (done) { await Backend.uncheckin(ev.id); S.checks.delete(ev.id); toast(t('checkin_undo'), '↺'); }
        else { await Backend.checkin(ev); S.checks.set(ev.id, { event_id: ev.id, country: ev.country, city: ev.city, created_at: new Date().toISOString() }); stampFx(ev); }
      } catch (x) { toast(/too many/.test(x.message) ? t('err_toomany') : x.message, '✕'); return true; }
      redraw && redraw(); refreshStats();
      return true;
    }
    return false;
  };
  function stampFx(ev) {
    SFX.play('fanfare');
    const el = h(`<div class="stamp-fx"><div class="stamp big">${stampInner(ev.country, ev.city, A.todayStr())}</div><p>${t('checkin_ok', { c: esc(nm(A.cityOf(ev.country, ev.city))) })}</p></div>`);
    document.body.appendChild(el);
    sparkle(innerWidth / 2, innerHeight / 2, 24);
    setTimeout(() => el.classList.add('out'), 1600);
    setTimeout(() => el.remove(), 2100);
  }
  const STAMP_COLORS = ['#c8372d', '#3a4f8a', '#2a9d8f', '#7a3e9d', '#e07b39', '#d6336c'];
  A.STAMP_COLORS = STAMP_COLORS; A.stampInner = (...x) => stampInner(...x);
  function stampInner(cc, city, date) {
    const th = Themes.of(A.byCode[cc]);
    return `<span class="st-ico">${th ? th.icon : PXI.img('xp/island', '🏝')}</span><span class="st-city">${esc(nm(A.cityOf(cc, city)) || city)}</span><span class="st-cc">${esc(cc)}</span><span class="st-date">${esc((date || '').slice(0, 10).replace(/-/g, '.'))}</span>`;
  }

  /* ---------- 主辦方：拆成多個（「A / B / C」） ---------- */
  const splitOrg = s => String(s || '').split(/\s*[\/／、,，]\s*/).map(x => x.trim()).filter(Boolean);
  A.orgLinks = s => splitOrg(s).map(o => `<a class="org-link" href="#/org/${encodeURIComponent(o)}">${esc(o)}</a>`).join(' / ');
  A.crumbs.org = r => PXI.img('event/organizer', '🏠') + ' ' + esc(r.arg[0] || '');
  A.views.org = (r, stage) => {
    const org = r.arg[0] || '';
    const today = A.todayStr();
    const evs = Store.all().filter(e => splitOrg(e.organizer).some(o => o.toLowerCase() === org.toLowerCase()));
    const up = evs.filter(e => (e.endDate || e.date) >= today), past = evs.filter(e => (e.endDate || e.date) < today).reverse();
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner');
    stage.appendChild(view);
    const draw = () => {
      const on = S.follows.has(org);
      inner.innerHTML = `<div class="win">${UI.winHTML(PXI.img('event/organizer', '🏠') + ' ' + esc(org), 'orange', false)}<div class="win-body org-head">
          <div><div class="note">${t('org_stats', { a: up.length, b: past.length })}</div></div><span class="grow"></span>
          <button class="btn ${on ? 'yellow' : 'pink'} follow">${on ? '✓ ' + t('org_following') : '＋ ' + t('org_follow')}</button></div></div>
        <div class="list-head">${t('list_upcoming')} <span class="badge">${up.length}</span></div>
        <div class="cards">${up.map((e, i) => A.cardHTML(e, i, today, Store.canEdit(), { place: true })).join('') || `<p class="note">${t('org_none')}</p>`}</div>
        ${past.length ? `<div class="list-head">${t('ev_w_past')} <span class="badge">${past.length}</span></div><div class="cards">${past.map((e, i) => A.cardHTML(e, i, today, Store.canEdit(), { place: true })).join('')}</div>` : ''}`;
      A.loadCommentCounts(inner); A.translateCards(inner);
      inner.querySelector('.follow').onclick = async () => {
        if (needLogin()) return;
        try { if (S.follows.has(org)) { await Backend.unfollow(org); S.follows.delete(org); } else { await Backend.follow(org); S.follows.add(org); SFX.play('coin'); toast(t('org_followed'), '✓'); } } catch (x) { toast(x.message, '✕'); }
        draw();
      };
    };
    inner.addEventListener('click', ev => { const tg = ev.target.closest('button[data-act], a[data-act]'); if (tg) A.cardAct(tg, draw); });
    draw();
  };

  /* ---------- 我的頁面 ---------- */
  const REWARD_ICON = { xp20: '✨', xp50: '💎', xp100: '👑' };
  A.crumbs.me = () => '★ ' + t('me_title');
  const meCache = {};
  A.clearMeCache = () => { meCache.at = 0; };
  // 簽到紀錄、投稿：60 秒內再開「我的舞島」直接用上次的（簽到 / 投稿後會清掉）；換頁動畫一開始就先抓
  function meData() {
    if (!Player.me) return Promise.resolve([null, [], []]);
    const fresh = meCache.at && Date.now() - meCache.at < 60000 && meCache.who === Player.me.id;
    if (fresh && meCache.p) return meCache.p;
    meCache.at = Date.now(); meCache.who = Player.me.id;
    meCache.p = Promise.all([
      Backend.enabled && !S.loaded ? loadMine() : null,
      Backend.enabled ? Backend.myDaily().catch(() => []) : [],
      Backend.enabled ? Backend.mySubmissions().catch(() => []) : []
    ]);
    return meCache.p;
  }
  A.prefetch = A.prefetch || {};
  A.prefetch.me = () => meData();
  A.views.me = async (r, stage) => {
    if (!Player.me) { Player.prompt(); return A.nav('#/'); }
    const view = h(`<div class="view city-view"><div class="city-inner me-page"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner');
    stage.appendChild(view);
    const [, daily0, subs0] = await meData();
    const me = Player.me, today = A.todayStr();
    const st = S.stats || { xp: 0, checkins: 0, comments: 0, messages: 0, days: 0 };
    const lv = levelOf(st.xp), cur = xpFor(lv), nxt = xpFor(lv + 1), pct = Math.round(((st.xp - cur) / Math.max(1, nxt - cur)) * 100);
    const daily = daily0 || [];
    const doneToday = daily.some(d => d.day === taipeiDay());
    let streak = 0; { let d = new Date(taipeiDay() + 'T00:00'); if (!doneToday) d.setDate(d.getDate() - 1); const set = new Set(daily.map(x => x.day)); while (set.has(A.ymd(d))) { streak++; d.setDate(d.getDate() - 1); } }
    const favEvents = Store.all().filter(e => S.favs.has(e.id));
    const upFav = favEvents.filter(e => (e.endDate || e.date) >= today), pastFav = favEvents.filter(e => (e.endDate || e.date) < today).reverse();
    const stamps = [...S.checks.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const twDone = new Set(stamps.filter(s => s.country === 'TW').map(s => s.city)).size, twAll = A.byCode.TW.cities.length;
    const countries = new Set(stamps.map(s => s.country)).size;
    const subs = subs0 || [];

    inner.innerHTML = `
      <div class="win">${UI.winHTML('★ ' + t('me_title'), 'pink', false)}<div class="win-body me-head">
        <div class="me-av"></div>
        <div class="me-info"><div class="me-name">${Player.nameHTML(me)} ${me.title ? Titles.html(me.title) : ''}</div>
          <div class="lv-row"><span class="lv">Lv.${lv}</span><div class="xpbar"><i style="width:${pct}%"></i></div><span class="note">${st.xp} / ${nxt} XP</span></div>
          <div class="me-nums"><span>${PXI.img('event/checkin', '🛂')} ${st.checkins}</span><span>💬 ${st.comments}</span><span>🗨 ${st.messages}</span><span>📅 ${st.days}</span></div>
          <div class="btn-row"><button class="btn sm pink ed">✎ ${t('p_edit')}</button>${Backend.enabled ? `<button class="btn sm yellow mycard">🪪 ${t('cd_edit')}</button><button class="btn sm green myfr">👥 ${t('fr_title_s')}</button>` : ''}${Backend.enabled && !me.verified ? `<button class="btn sm blue vf">${t('v_apply')}</button>` : ''}</div>
        </div>
        <div class="spin-box"><div class="spin-title">🎰 ${t('daily_title')}</div><div class="wheel"><span>${doneToday ? '✓' : '?'}</span></div>
          <button class="btn ${doneToday ? '' : 'yellow'} spin" ${doneToday ? 'disabled' : ''}>${doneToday ? t('daily_done') : t('daily_spin')}</button>
          <div class="note">${t('daily_streak', { n: streak })}</div></div>
      </div></div>

      ${A.xpHTML ? A.xpHTML() : ''}
      ${A.recommendHTML ? A.recommendHTML() : ''}
      <div class="win">${UI.winHTML('📅 ' + t('me_plan'), 'teal', false)}<div class="win-body">
        ${upFav.length ? `<div class="cards">${upFav.map((e, i) => A.cardHTML(e, i, today, Store.canEdit(), { place: true })).join('')}</div>` : `<p class="note">${t('me_plan_none')}</p>`}
        ${pastFav.length ? `<details><summary>${t('ev_w_past')} (${pastFav.length})</summary><div class="cards">${pastFav.map((e, i) => A.cardHTML(e, i, today, Store.canEdit(), { place: true })).join('')}</div></details>` : ''}
      </div></div>

      <div class="win">${UI.winHTML(PXI.img('xp/passport', '🛂') + ' ' + t('me_passport'), 'blue', false)}<div class="win-body">
        <div class="btn-row"><button class="btn blue open-pp">📘 ${t('pp_open')}</button></div>
        <div class="pass-stats"><span>${PXI.img('xp/taiwan', '🇹🇼')} ${twDone} / ${twAll}</span><span>${PXI.img('menu/world', '🌏')} ${t('me_countries', { n: countries })}</span><span>${PXI.img('event/checkin', '🛂')} ${stamps.length}</span></div>
        <div class="tw-prog"><i style="width:${Math.round((twDone / twAll) * 100)}%"></i></div>
        <div class="passport">${stamps.length ? stamps.map((s, i) => `<div class="stamp" style="--sc:${STAMP_COLORS[i % STAMP_COLORS.length]};--rot:${((i * 37) % 14) - 7}deg">${stampInner(s.country, s.city, s.created_at)}</div>`).join('') : `<p class="note">${t('me_pass_none')}</p>`}</div>
      </div></div>

      <div class="win">${UI.winHTML(PXI.img('event/organizer', '🏠') + ' ' + t('me_follows'), 'orange', false)}<div class="win-body">
        ${S.follows.size ? `<ul class="follow-list">${[...S.follows].map(o => { const n = Store.all().filter(e => (e.endDate || e.date) >= today && splitOrg(e.organizer).some(x => x.toLowerCase() === o.toLowerCase())).length; return `<li><a href="#/org/${encodeURIComponent(o)}">${esc(o)}</a> <span class="badge">${n}</span></li>`; }).join('')}</ul>` : `<p class="note">${t('me_follow_none')}</p>`}
      </div></div>

      ${subs.length ? `<div class="win">${UI.winHTML('📮 ' + t('me_subs'), 'yellow', false)}<div class="win-body"><ul class="adm-list">${subs.map(x => `<li><span class="grow">${esc(x.data.name || '')} <span class="note">${esc(x.data.date || '')}</span></span><span class="tag sub-${x.status}">${t('sub_' + x.status)}</span></li>`).join('')}</ul></div></div>` : ''}`;

    const av = Avatar.dancer(4, me.look); inner.querySelector('.me-av').appendChild(av.el); A.beatLoop(av, 340);
    inner.querySelector('.ed').onclick = () => Player.openMenu();
    { const pp = inner.querySelector('.open-pp'); if (pp) pp.onclick = () => window.Passport && Passport.open(); }
    { const mc = inner.querySelector('.mycard'); if (mc) mc.onclick = () => Friends.openCardEditor(); const mf = inner.querySelector('.myfr'); if (mf) mf.onclick = () => Friends.openPanel(); }
    const vf = inner.querySelector('.vf'); if (vf) vf.onclick = () => Player.openVerify();
    const spin = inner.querySelector('.spin');
    spin.onclick = async () => {
      if (needLogin()) return;
      spin.disabled = true;
      const wheel = inner.querySelector('.wheel'), icons = ['✨', '💎', '👑', '🎁', '🍀', '🌀', '🦶', '🎧', '🌈', '🌙', '🍣'];
      let k = 0; wheel.classList.add('spinning');
      const tm = setInterval(() => { wheel.querySelector('span').textContent = icons[k++ % icons.length]; SFX.play('blip'); }, 70);
      let res;
      try { res = await Backend.dailySpin(); meCache.at = 0; } catch (x) { clearInterval(tm); wheel.classList.remove('spinning'); toast(/already/.test(x.message) ? t('daily_done') : x.message, '✕'); return; }
      await new Promise(r => setTimeout(r, 1400));
      clearInterval(tm); wheel.classList.remove('spinning');
      const rw = res.reward, isTitle = rw.startsWith('r_');
      wheel.querySelector('span').textContent = isTitle ? '🎁' : REWARD_ICON[rw] || '✨';
      SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 26);
      if (isTitle) S.unlocks.add(rw), Player.me.unlocks = S.unlocks;
      modal({ title: '🎰 ' + t('daily_title'), color: 'yellow', body: `<div class="reward"><div class="rw-ico">${isTitle ? '🎁' : REWARD_ICON[rw]}</div>
        <p>${isTitle ? t('daily_got_title', { n: Titles.label(rw) }) : t('daily_got_xp', { n: rw.slice(2) })}</p>
        ${isTitle ? `<p class="note">${t('daily_title_hint')}</p>` : ''}<p class="note">${t('daily_streak', { n: res.streak })}</p></div>`,
        onClose: () => A.render(true) });
      refreshStats();
    };
    inner.addEventListener('click', ev => { const tg = ev.target.closest('button[data-act], a[data-act]'); if (tg) A.cardAct(tg, () => A.render(true)); });
    A.loadCommentCounts(inner); A.translateCards(inner);
  };
  const taipeiDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  /* ---------- 投稿：一般玩家送出 → 管理員審核 ---------- */
  A.submitEvent = async data => {
    const r = await Backend.submitEvent(data); meCache.at = 0;
    SFX.play('fanfare'); toast(t('sub_sent'), '📮');
    return r;
  };
  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'sub', label: () => '📮 ' + t('adm_sub'),
    draw: async (pane, fail) => {
      let rows = []; try { rows = await Backend.listSubmissions(); } catch (x) { return fail(x); }
      pane.innerHTML = rows.length ? '' : `<p class="note">${t('adm_none')}</p>`;
      const ul = h('<div class="cards"></div>'); pane.appendChild(ul);
      rows.forEach(s => {
        const d = { ...s.data, id: s.data.id || 'sub-' + s.id };
        const wrap = h(`<div class="sub-item">${A.cardHTML(d, 0, A.todayStr(), false, { place: true })}
          <div class="btn-row"><button class="btn sm green ok">✓ ${t('adm_approve')}</button><button class="btn sm red no">✕ ${t('adm_reject')}</button></div></div>`);
        wrap.querySelector('.ok').onclick = async () => {
          try { await Store.upsert(d); await Backend.reviewSubmission(s.id, 'approved'); SFX.play('fanfare'); toast(t('adm_done'), '✔'); wrap.remove(); A.render(true); } catch (x) { fail(x); }
        };
        wrap.querySelector('.no').onclick = async () => { try { await Backend.reviewSubmission(s.id, 'rejected'); wrap.remove(); } catch (x) { fail(x); } };
        ul.appendChild(wrap);
      });
    }
  });

  /* ---------- 提醒：收藏的活動快到了、報名快截止、追蹤的主辦方有新活動 ---------- */
  I18N.extend({
    zh: { rm_reg3: '你收藏的「{n}」報名再 3 天就截止囉！', rm_reg1: '你收藏的「{n}」報名明天截止，別錯過！', rm_reg0: '你收藏的「{n}」今天報名截止！' },
    en: { rm_reg3: 'Sign-up for "{n}" (saved) closes in 3 days!', rm_reg1: 'Sign-up for "{n}" (saved) closes tomorrow — don’t miss it!', rm_reg0: 'Sign-up for "{n}" (saved) closes today!' },
    ja: { rm_reg3: 'お気に入りの「{n}」エントリー締切まであと 3 日！', rm_reg1: 'お気に入りの「{n}」エントリーは明日締切！', rm_reg0: 'お気に入りの「{n}」エントリーは今日締切！' },
    ko: { rm_reg3: '저장한 「{n}」 신청 마감까지 3일 남았어요!', rm_reg1: '저장한 「{n}」 신청이 내일 마감돼요!', rm_reg0: '저장한 「{n}」 신청이 오늘 마감돼요!' }
  });
  function reminders() {
    if (!S.loaded) return;
    const today = A.todayStr(), tomorrow = A.ymd(new Date(Date.now() + 864e5)), in2 = A.ymd(new Date(Date.now() + 2 * 864e5)), in14 = A.ymd(new Date(Date.now() + 14 * 864e5));
    const out = [];
    Store.all().forEach(e => {
      if (S.favs.has(e.id)) {
        if (e.date === today) out.push(t('rm_today', { n: e.name }));
        else if (e.date === tomorrow) out.push(t('rm_tomorrow', { n: e.name }));
        if (e.regEnd && (!e.regType || e.regType === 'open')) {
          const in3 = A.ymd(new Date(Date.now() + 3 * 864e5));
          if (e.regEnd === in3) out.push(t('rm_reg3', { n: e.name }));
          else if (e.regEnd === tomorrow) out.push(t('rm_reg1', { n: e.name }));
          else if (e.regEnd === today) out.push(t('rm_reg0', { n: e.name }));
        }
      } else if (e.date >= today && e.date <= in14 && splitOrg(e.organizer).some(o => [...S.follows].some(f => f.toLowerCase() === o.toLowerCase()))) {
        out.push(t('rm_follow', { n: e.name }));
      }
    });
    const key = 'danceIsland.rm', val = (Backend.uid || 'local') + '|' + today;   // 每個帳號一天只提醒一次
    try { if (localStorage.getItem(key) === val) return; if (out.length) localStorage.setItem(key, val); } catch (x) {}
    out.slice(0, 4).forEach((m, i) => setTimeout(() => toast(m, '⏰'), 3500 + i * 1200));
  }

  /* ---------- 啟動 ---------- */
  Player.ready.then(async () => { await loadMine(); reminders(); if (A.current) A.render(true); });
  Player.onChange(async () => { await loadMine(); reminders(); if (A.current) A.render(true); });
  A.levelOf = levelOf;
  A.refreshStats = refreshStats;
})();
