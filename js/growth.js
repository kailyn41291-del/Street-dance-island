/* =========================================================
 * 第五批・成長：
 * - 師徒系統（#/mentor）：10 級以上可以收徒（最多 3 個），5 級以下可以拜師；徒弟達成里程碑，師徒都拿經驗值，10 級出師
 * - 舞團每週 PK：系統配對實力相近的舞團，雙方團長 / 副團長都同意才開打，週末經驗值多的那團全員 +80 XP
 * - 知識+ 懸賞：發問時可以懸賞經驗值，選出最佳解答時轉給回答的人
 * ========================================================= */
window.Growth = (() => {
  const { h, esc, modal, toast, sparkle } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const myLevel = () => (A.socialState && A.socialState.level) || (Player.me && Player.me.level) || 1;
  const err = x => { const m = String(x && x.message || x);
    if (/level too low/.test(m)) return t('mt_e_low'); if (/level too high/.test(m)) return t('mt_e_high'); if (/mentor full/.test(m)) return t('mt_e_full');
    if (/already/.test(m)) return t('mt_e_already'); if (/not a mentor/.test(m)) return t('mt_e_closed'); if (/not enough xp/.test(m)) return t('qb_e_xp'); if (/spam/.test(m)) return t('fr_spam'); return m; };

  I18N.extend({
    zh: {
      hub_mentor: '師徒', mt_title: '🥋 師徒系統', mt_rules: '10 級以上可以當師父（最多收 3 個徒弟），5 級以下可以拜師。徒弟完成里程碑時，師徒雙方都會拿到經驗值；徒弟升到 10 級就「出師」，師父拿到「名師」稱號、徒弟拿到「出師」稱號。',
      mt_ms: '里程碑獎勵（徒弟 / 師父）：完成第一個每日任務 +20 / +20、第一次活動打卡 +40 / +40、升到 5 級 +40 / +60、升到 10 級出師 +100 / +150',
      mt_find: '找師父', mt_none: '目前還沒有開放招生的師父', mt_req: '拜師', mt_sent: '已送出拜師申請，等師父回覆！', mt_lv: 'Lv.{n}', mt_slots: '徒弟 {n} / 3',
      mt_mine: '我的師徒', mt_master: '我的師父', mt_apps: '我的徒弟', mt_pending: '拜師申請', mt_accept: '收徒', mt_decline: '婉拒', mt_end: '解除關係', mt_end_q: '確定要解除師徒關係嗎？',
      mt_wait: '⏳ 等師父回覆中', mt_set: '我的招生設定', mt_pitch: '招生文案（200 字內）', mt_pitch_ph: '例：教 Locking 基本功，每週日下午在國館練，歡迎新手！', mt_open: '開放招生', mt_save: '儲存', mt_saved: '已儲存！',
      mt_need10: '升到 10 級就能當師父收徒弟（你現在 Lv.{n}）', mt_over5: '你已經超過 5 級，不能再拜師了，升到 10 級就能收徒弟！',
      mt_got: '🥋 師徒任務達成：{k}　+{n} XP', mt_k_quest: '第一個每日任務', mt_k_checkin: '第一次活動打卡', mt_k_lv5: '升到 5 級', mt_k_lv10: '出師！',
      mt_e_low: '要 10 級以上才能當師父', mt_e_high: '要 5 級以下才能拜師', mt_e_full: '這位師父的徒弟已經滿了', mt_e_already: '你已經有師父（或申請中）了', mt_e_closed: '這位師父目前沒有開放招生',
      pk_title: '🆚 本週舞團 PK', pk_vs: '對手：{n}', pk_none: '本週沒有配到對手（舞團數量是單數，或還沒有其他認證舞團）', pk_ask: '系統幫你們配到實力相近的對手！要接受挑戰嗎？（雙方團長 / 副團長都同意才開打）',
      pk_yes: '接受挑戰', pk_no: '這週先不要', pk_wait: '⏳ 等對方回覆', pk_on: '🔥 PK 進行中！這週經驗值多的那團，全員 +80 XP', pk_off: '這週不 PK', pk_score: '本週經驗值', pk_last: '上週結果', pk_win: '🏆 {n} 獲勝', pk_tie: '平手', pk_answered: '已回覆！',
      qb_label: '💎 懸賞經驗值（選填）', qb_none: '不懸賞', qb_tag: '💎 懸賞 {n} XP', qb_e_xp: '你的經驗值不夠懸賞這麼多', qb_paid: '懸賞 {n} XP 已轉給回答的人！'
    },
    en: {
      hub_mentor: 'Mentors', mt_title: '🥋 Mentorship', mt_rules: 'Lv.10+ players can mentor up to 3 apprentices; Lv.5 and below can find a mentor. Both get XP when the apprentice hits milestones, and at Lv.10 the apprentice graduates — the mentor earns the “Master” title and the apprentice “Graduate”.',
      mt_ms: 'Milestones (apprentice / mentor): first daily quest +20 / +20, first event check-in +40 / +40, reach Lv.5 +40 / +60, reach Lv.10 & graduate +100 / +150',
      mt_find: 'Find a mentor', mt_none: 'No mentors recruiting right now', mt_req: 'Ask to learn', mt_sent: 'Request sent — wait for the mentor’s reply!', mt_lv: 'Lv.{n}', mt_slots: 'Apprentices {n} / 3',
      mt_mine: 'My mentorship', mt_master: 'My mentor', mt_apps: 'My apprentices', mt_pending: 'Requests', mt_accept: 'Accept', mt_decline: 'Decline', mt_end: 'End', mt_end_q: 'End this mentorship?',
      mt_wait: '⏳ Waiting for the mentor', mt_set: 'My mentor settings', mt_pitch: 'Pitch (200 chars)', mt_pitch_ph: 'e.g. Locking basics, Sunday afternoons at the Memorial Hall — beginners welcome!', mt_open: 'Open for apprentices', mt_save: 'Save', mt_saved: 'Saved!',
      mt_need10: 'Reach Lv.10 to become a mentor (you’re Lv.{n})', mt_over5: 'You’re above Lv.5, so you can’t take a mentor — reach Lv.10 to become one!',
      mt_got: '🥋 Mentorship milestone: {k}  +{n} XP', mt_k_quest: 'first daily quest', mt_k_checkin: 'first check-in', mt_k_lv5: 'reached Lv.5', mt_k_lv10: 'graduated!',
      mt_e_low: 'You need Lv.10 to mentor', mt_e_high: 'You need to be Lv.5 or below', mt_e_full: 'This mentor is full', mt_e_already: 'You already have a mentor (or a pending request)', mt_e_closed: 'This mentor isn’t recruiting right now',
      pk_title: '🆚 Weekly Crew PK', pk_vs: 'Opponent: {n}', pk_none: 'No opponent this week (odd number of crews, or no other verified crews yet)', pk_ask: 'We matched you with a crew of similar strength! Accept the challenge? (Both crews’ leaders/vices must agree)',
      pk_yes: 'Accept', pk_no: 'Not this week', pk_wait: '⏳ Waiting for the other crew', pk_on: '🔥 PK on! The crew with more XP this week: everyone +80 XP', pk_off: 'No PK this week', pk_score: 'XP this week', pk_last: 'Last week', pk_win: '🏆 {n} wins', pk_tie: 'Tie', pk_answered: 'Answered!',
      qb_label: '💎 XP bounty (optional)', qb_none: 'No bounty', qb_tag: '💎 Bounty {n} XP', qb_e_xp: 'You don’t have enough XP for that bounty', qb_paid: '{n} XP bounty sent to the answerer!'
    },
    ja: {
      hub_mentor: '師弟', mt_title: '🥋 師弟システム', mt_rules: 'Lv.10 以上は師匠になれます（弟子は 3 人まで）。Lv.5 以下は弟子入りできます。弟子がマイルストーンを達成すると二人とも経験値。Lv.10 で「卒業」、師匠は称号「名師」、弟子は「卒業」を獲得。',
      mt_ms: 'マイルストーン（弟子 / 師匠）：初デイリー +20 / +20、初チェックイン +40 / +40、Lv.5 +40 / +60、Lv.10 卒業 +100 / +150',
      mt_find: '師匠を探す', mt_none: '募集中の師匠はいません', mt_req: '弟子入り', mt_sent: '弟子入りを申請しました！', mt_lv: 'Lv.{n}', mt_slots: '弟子 {n} / 3',
      mt_mine: '自分の師弟', mt_master: '師匠', mt_apps: '弟子', mt_pending: '弟子入り申請', mt_accept: '受け入れる', mt_decline: '断る', mt_end: '解消', mt_end_q: '師弟関係を解消しますか？',
      mt_wait: '⏳ 師匠の返事待ち', mt_set: '募集設定', mt_pitch: '募集メッセージ（200 字）', mt_pitch_ph: '例：ロックの基礎を教えます。毎週日曜の午後に練習、初心者歓迎！', mt_open: '弟子を募集する', mt_save: '保存', mt_saved: '保存しました！',
      mt_need10: 'Lv.10 になると師匠になれます（今は Lv.{n}）', mt_over5: 'Lv.5 を超えているので弟子入りはできません。Lv.10 で師匠に！',
      mt_got: '🥋 師弟マイルストーン：{k}　+{n} XP', mt_k_quest: '初デイリー', mt_k_checkin: '初チェックイン', mt_k_lv5: 'Lv.5 到達', mt_k_lv10: '卒業！',
      mt_e_low: '師匠になるには Lv.10 が必要です', mt_e_high: '弟子入りは Lv.5 以下です', mt_e_full: 'この師匠は満員です', mt_e_already: 'すでに師匠がいます（申請中を含む）', mt_e_closed: 'この師匠は募集していません',
      pk_title: '🆚 今週のチーム PK', pk_vs: '相手：{n}', pk_none: '今週は相手がいません（チーム数が奇数、または他の認証チームがいない）', pk_ask: '実力の近いチームとマッチしました！挑戦を受けますか？（両チームのリーダー / サブの同意が必要）',
      pk_yes: '受ける', pk_no: '今週は見送り', pk_wait: '⏳ 相手の返事待ち', pk_on: '🔥 PK 中！今週の経験値が多いチームは全員 +80 XP', pk_off: '今週は PK なし', pk_score: '今週の経験値', pk_last: '先週の結果', pk_win: '🏆 {n} の勝ち', pk_tie: '引き分け', pk_answered: '返事しました！',
      qb_label: '💎 経験値の懸賞（任意）', qb_none: '懸賞なし', qb_tag: '💎 懸賞 {n} XP', qb_e_xp: '経験値が足りません', qb_paid: '懸賞 {n} XP を回答者に渡しました！'
    },
    ko: {
      hub_mentor: '사제', mt_title: '🥋 사제 시스템', mt_rules: 'Lv.10 이상은 스승이 될 수 있어요(제자 최대 3명). Lv.5 이하는 제자로 들어갈 수 있어요. 제자가 목표를 달성하면 둘 다 경험치를 받고, Lv.10이 되면 「졸업」— 스승은 「명사」, 제자는 「졸업」 칭호를 받아요.',
      mt_ms: '목표 보상 (제자 / 스승): 첫 일일 퀘스트 +20 / +20, 첫 체크인 +40 / +40, Lv.5 +40 / +60, Lv.10 졸업 +100 / +150',
      mt_find: '스승 찾기', mt_none: '모집 중인 스승이 없어요', mt_req: '제자 신청', mt_sent: '제자 신청을 보냈어요!', mt_lv: 'Lv.{n}', mt_slots: '제자 {n} / 3',
      mt_mine: '내 사제', mt_master: '내 스승', mt_apps: '내 제자', mt_pending: '제자 신청', mt_accept: '받기', mt_decline: '거절', mt_end: '관계 끝내기', mt_end_q: '사제 관계를 끝낼까요?',
      mt_wait: '⏳ 스승의 답을 기다리는 중', mt_set: '모집 설정', mt_pitch: '모집 글 (200자)', mt_pitch_ph: '예: 락킹 기초를 가르쳐요. 매주 일요일 오후 연습, 초보 환영!', mt_open: '제자 모집 중', mt_save: '저장', mt_saved: '저장했어요!',
      mt_need10: 'Lv.10이 되면 스승이 될 수 있어요 (지금 Lv.{n})', mt_over5: 'Lv.5를 넘어서 제자 신청은 안 돼요. Lv.10이 되면 스승이 될 수 있어요!',
      mt_got: '🥋 사제 목표 달성: {k}  +{n} XP', mt_k_quest: '첫 일일 퀘스트', mt_k_checkin: '첫 체크인', mt_k_lv5: 'Lv.5 달성', mt_k_lv10: '졸업!',
      mt_e_low: '스승은 Lv.10 이상이어야 해요', mt_e_high: '제자는 Lv.5 이하여야 해요', mt_e_full: '이 스승은 제자가 꽉 찼어요', mt_e_already: '이미 스승이 있어요 (신청 중 포함)', mt_e_closed: '이 스승은 지금 모집하지 않아요',
      pk_title: '🆚 이번 주 크루 PK', pk_vs: '상대: {n}', pk_none: '이번 주는 상대가 없어요 (크루 수가 홀수이거나 다른 인증 크루가 없음)', pk_ask: '실력이 비슷한 크루와 매칭됐어요! 도전을 받을까요? (양쪽 리더/부리더가 모두 동의해야 시작)',
      pk_yes: '도전 수락', pk_no: '이번 주는 패스', pk_wait: '⏳ 상대의 답을 기다리는 중', pk_on: '🔥 PK 진행 중! 이번 주 경험치가 많은 크루 전원 +80 XP', pk_off: '이번 주는 PK 없음', pk_score: '이번 주 경험치', pk_last: '지난주 결과', pk_win: '🏆 {n} 승리', pk_tie: '무승부', pk_answered: '답했어요!',
      qb_label: '💎 경험치 현상금 (선택)', qb_none: '현상금 없음', qb_tag: '💎 현상금 {n} XP', qb_e_xp: '경험치가 부족해요', qb_paid: '현상금 {n} XP를 답변자에게 보냈어요!'
    }
  });

  /* =========================================================
   * 師徒
   * ========================================================= */
  A.crumbs.mentor = () => '🥋 ' + t('hub_mentor');
  A.views.mentor = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    await Backend.ready;
    const draw = async () => {
      const lv = myLevel();
      let list = [], mine = [], me = null;
      try { [list, mine, me] = await Promise.all([Backend.rpc('mentor_list'), logged() ? Backend.myMentorships() : [], logged() ? Backend.mentorProfile(Backend.uid).catch(() => null) : null]); }
      catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(err(x))}</p>`; return; }
      const ids = [...new Set(mine.flatMap(m => [m.mentor, m.apprentice]))];
      const ps = {}; if (ids.length) (await Backend.playersByIds(ids).catch(() => [])).forEach(p => (ps[p.user_id] = p));
      const nameOf = u => (ps[u] || {}).name || '?', handleOf = u => (ps[u] || {}).handle || '';
      const asApp = mine.find(m => m.apprentice === Backend.uid && ['pending', 'active'].includes(m.status));
      const asMaster = mine.filter(m => m.mentor === Backend.uid);
      const who = u => `<button class="linkish mt-who" data-h="${esc(handleOf(u))}">${esc(nameOf(u))}</button>`;
      inner.innerHTML = `<div class="win">${UI.winHTML(t('mt_title'), 'orange', false)}<div class="win-body"><p>${t('mt_rules')}</p><p class="note">${t('mt_ms')}</p></div></div>
        ${logged() ? `<div class="win">${UI.winHTML('🥋 ' + t('mt_mine'), 'yellow', false)}<div class="win-body">
          ${asApp ? `<p>${t('mt_master')}：${who(asApp.mentor)} ${asApp.status === 'pending' ? `<span class="tag">${t('mt_wait')}</span>` : ''} <button class="btn sm mt-end" data-m="${asApp.id}">${t('mt_end')}</button></p>` : ''}
          ${asMaster.filter(m => m.status === 'pending').length ? `<h4>${t('mt_pending')}</h4>${asMaster.filter(m => m.status === 'pending').map(m => `<div class="mt-row">${who(m.apprentice)}<span class="grow"></span><button class="btn sm green mt-ok" data-m="${m.id}">${t('mt_accept')}</button><button class="btn sm mt-no" data-m="${m.id}">${t('mt_decline')}</button></div>`).join('')}` : ''}
          ${asMaster.filter(m => m.status === 'active').length ? `<h4>${t('mt_apps')}</h4>${asMaster.filter(m => m.status === 'active').map(m => `<div class="mt-row">${who(m.apprentice)}<span class="grow"></span><button class="btn sm mt-end" data-m="${m.id}">${t('mt_end')}</button></div>`).join('')}` : ''}
          ${lv >= 10 ? `<h4>${t('mt_set')}</h4><form class="form mt-form"><label class="field full"><span>${t('mt_pitch')}</span><textarea class="input" name="pitch" maxlength="200" rows="3" placeholder="${esc(t('mt_pitch_ph'))}">${esc((me && me.pitch) || '')}</textarea></label>
            <label class="chk"><input type="checkbox" name="open" ${!me || me.open ? 'checked' : ''}> ${t('mt_open')}</label><div class="form-foot"><button class="btn pink">${t('mt_save')}</button></div></form>`
            : `<p class="note">${lv > 5 ? t('mt_over5') : t('mt_need10', { n: lv })}</p>`}
        </div></div>` : ''}
        <div class="win">${UI.winHTML('🔍 ' + t('mt_find'), 'teal', false)}<div class="win-body"><div class="mt-list">${list.filter(m => m.user_id !== Backend.uid).map(m => `<div class="mt-card"><b>${esc(m.name)}</b><small>@${esc(m.handle)}・${t('mt_lv', { n: m.lv })}${m.style ? '・' + esc(m.style) : ''}・${t('mt_slots', { n: m.n })}</small>
            ${m.pitch ? `<p data-utr>${esc(m.pitch)}</p>` : ''}<div class="btn-row"><button class="btn sm mt-who" data-h="${esc(m.handle)}">🪪</button>${logged() && lv <= 5 && !asApp && m.n < 3 ? `<button class="btn sm pink mt-req" data-u="${m.user_id}">🥋 ${t('mt_req')}</button>` : ''}</div></div>`).join('') || `<p class="note">${t('mt_none')}</p>`}</div></div></div>`;
      const rpc = async (fn, args, ok) => { try { await Backend.rpc(fn, args); SFX.play('coin'); if (ok) toast(ok, '🥋'); draw(); } catch (x) { toast(err(x), '✕'); } };
      inner.querySelectorAll('.mt-who').forEach(b => (b.onclick = () => b.dataset.h && Friends.openCard(b.dataset.h)));
      inner.querySelectorAll('.mt-req').forEach(b => (b.onclick = () => rpc('mentor_request', { p_mentor: b.dataset.u }, t('mt_sent'))));
      inner.querySelectorAll('.mt-ok').forEach(b => (b.onclick = () => rpc('mentor_answer', { mid: +b.dataset.m, ok: true })));
      inner.querySelectorAll('.mt-no').forEach(b => (b.onclick = () => rpc('mentor_answer', { mid: +b.dataset.m, ok: false })));
      inner.querySelectorAll('.mt-end').forEach(b => (b.onclick = () => { if (confirm(t('mt_end_q'))) rpc('mentor_end', { mid: +b.dataset.m }); }));
      const f = inner.querySelector('.mt-form');
      if (f) f.onsubmit = ev => { ev.preventDefault(); rpc('mentor_set', { p_pitch: f.elements.pitch.value.trim(), p_styles: Player.me && Player.me.style ? [Player.me.style] : [], p_open: f.elements.open.checked }, t('mt_saved')); };
    };
    draw();
  };
  // 定期檢查師徒里程碑（登入時、做完事情後）
  let mtT = null;
  const mentorCheck = () => { clearTimeout(mtT); mtT = setTimeout(async () => {
    if (!logged()) return;
    try { const got = await Backend.rpc('mentor_check'); (got || []).forEach((g, i) => { const n = g.a || g.m; if (n) setTimeout(() => { SFX.play('fanfare'); toast(t('mt_got', { k: t('mt_k_' + g.k), n }), '🥋'); }, i * 1300); }); if ((got || []).length) window.XP && XP.changed && XP.changed(); } catch (e) {}
  }, 3000); };
  if (Backend.enabled) Backend.ready.then(mentorCheck);
  Player.onChange(mentorCheck);
  window.addEventListener('di:act', mentorCheck);

  /* =========================================================
   * 舞團每週 PK（顯示在舞團頁）
   * ========================================================= */
  window.CrewPK = {
    async mount(inner, c, myRank) {
      if (!Backend.enabled || !c || c.status !== 'approved') return;
      const slot = h(`<div class="win pk-box">${UI.winHTML(t('pk_title'), 'red', false)}<div class="win-body"><p class="note">…</p></div></div>`);
      const head = inner.querySelector('.win'); head ? head.after(slot) : inner.prepend(slot);
      const body = slot.querySelector('.win-body');
      try {
        if (logged()) { await Backend.rpc('crew_pk_pair').catch(() => {}); await Backend.rpc('crew_pk_settle').catch(() => {}); }
        const rows = await Backend.crewPK(c.id);
        if (!rows.length) { body.innerHTML = `<p class="note">${t('pk_none')}</p>`; return; }
        const thisWeek = rows[0], last = rows.find(r => r.settled && r.week < thisWeek.week);
        const side = thisWeek.crew_a === c.id ? 'a' : 'b', oppId = side === 'a' ? thisWeek.crew_b : thisWeek.crew_a;
        const opp = await Backend.crew(oppId).catch(() => null);
        const mine = thisWeek[side + '_ok'], theirs = thisWeek[(side === 'a' ? 'b' : 'a') + '_ok'];
        const mgr = myRank === 'leader' || myRank === 'vice';
        let html = `<p><b>${esc(t('pk_vs', { n: opp ? opp.name : '?' }))}</b> <a class="btn sm" href="#/crew/${oppId}">👯</a></p>`;
        if (thisWeek.settled) html += '';
        else if (mine === false || theirs === false) html += `<p class="note">${t('pk_off')}</p>`;
        else if (mine && theirs) {
          let score = ''; try { const rk = await Backend.crewWeekRank(); const xa = (rk.find(x => x.crew_id === c.id) || {}).xp || 0, xb = (rk.find(x => x.crew_id === oppId) || {}).xp || 0;
            score = `<div class="pk-score"><span>${esc(c.name)}<b>${xa}</b></span><i>VS</i><span>${esc(opp ? opp.name : '?')}<b>${xb}</b></span></div><p class="note">${t('pk_score')}</p>`; } catch (e) {}
          html += `<p class="pk-on">${t('pk_on')}</p>${score}`;
        } else if (mine == null && mgr) html += `<p>${t('pk_ask')}</p><div class="btn-row"><button class="btn pink pk-yes">🆚 ${t('pk_yes')}</button><button class="btn pk-no">${t('pk_no')}</button></div>`;
        else html += `<p class="note">${mine ? t('pk_wait') : t('pk_ask')}</p>`;
        if (last) { const ln = last.winner === c.id ? c.name : last.winner ? (last.winner === oppId && opp ? opp.name : '…') : null; html += `<p class="note">${t('pk_last')}：${last.winner ? esc(t('pk_win', { n: last.winner === c.id ? c.name : (await Backend.crew(last.winner).catch(() => ({}))).name || '?' })) : t('pk_tie')}${last.xp_a != null ? `（${last.xp_a} : ${last.xp_b}）` : ''}</p>`; void ln; }
        body.innerHTML = html;
        const ans = async ok => { try { await Backend.rpc('crew_pk_answer', { pid: thisWeek.id, ok }); SFX.play(ok ? 'fanfare' : 'select'); toast(t('pk_answered'), '🆚'); slot.remove(); CrewPK.mount(inner, c, myRank); } catch (e) { toast(err(e), '✕'); } };
        const y = body.querySelector('.pk-yes'), n = body.querySelector('.pk-no');
        if (y) y.onclick = () => ans(true); if (n) n.onclick = () => ans(false);
      } catch (e) { slot.remove(); }
    }
  };

  /* =========================================================
   * 知識+ 懸賞：發問表單多一個懸賞選項；列表 / 文章顯示懸賞
   * ========================================================= */
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    const form = n.querySelector && n.querySelector('form.form [name=cat]')?.closest('form');
    if (!form || form.querySelector('[name=bounty]')) return;
    const cat = form.elements.cat;
    const fld = h(`<label class="field qb-field" hidden><span>${t('qb_label')}</span><select class="input" name="bounty"><option value="0">${t('qb_none')}</option>${[10, 20, 50, 100].map(v => `<option value="${v}">${v} XP</option>`).join('')}</select></label>`);
    cat.closest('.field').after(fld);
    const sync = () => { fld.hidden = cat.value !== 'qa'; if (fld.hidden) fld.querySelector('select').value = '0'; };
    cat.addEventListener('change', sync); sync();
  }))).observe(document.body, { childList: true, subtree: true });
  // 發文時把懸賞一起送出
  const f0 = Backend.addPost;
  if (typeof f0 === 'function') Backend.addPost = async function (p) { const sel = document.querySelector('form.form [name=bounty]'); const v = sel ? +sel.value : 0; if (v && p && p.category === 'qa') p.bounty = v; return f0.call(this, p); };
  // 選最佳解答時告訴玩家懸賞已轉出
  const f1 = Backend.qaAccept;
  if (typeof f1 === 'function') Backend.qaAccept = async function (...a) { const r = await f1.apply(this, a); if (r && r.bounty) setTimeout(() => toast(t('qb_paid', { n: r.bounty }), '💎'), 600); return r; };
  // 文章、列表上的懸賞標籤
  const tagBounty = root => root.querySelectorAll && root.querySelectorAll('.fo-row[href^="#/forum/"], .fo-post').forEach(el => {
    if (el._qb) return; el._qb = 1;
    const id = +((el.getAttribute('href') || location.hash).match(/forum\/(\d+)/) || [])[1]; const p = id && bountyOf[id];
    if (p) (el.querySelector('.fo-top, .fo-meta') || el).insertAdjacentHTML('beforeend', `<span class="tag qb-tag">${t('qb_tag', { n: p })}</span>`);
  });
  let bountyOf = {};
  const f2 = Backend.forumPosts;
  if (typeof f2 === 'function') Backend.forumPosts = async function (...a) { const rows = await f2.apply(this, a); (rows || []).forEach(p => { if (p.bounty) bountyOf[p.id] = p.bounty; }); return rows; };
  const f3 = Backend.forumPost;
  if (typeof f3 === 'function') Backend.forumPost = async function (...a) { const p = await f3.apply(this, a); if (p && p.bounty) bountyOf[p.id] = p.bounty; return p; };
  let qbT = null; new MutationObserver(() => { if (!qbT) qbT = setTimeout(() => { qbT = null; tagBounty(document); }, 200); }).observe(document.body, { childList: true, subtree: true });

  return { mentorCheck };
})();
