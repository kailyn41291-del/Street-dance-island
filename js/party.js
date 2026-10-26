/* =========================================================
 * 揪練舞組隊（RPG 組隊）
 * - 開隊：隊名、時間、地點、舞風、人數上限；可以選「公開招募」或「不公開（邀請碼）」
 * - 公開的隊伍會推送給附近的冒險者，也會自動貼到聊天室的「組隊頻道」
 * - 每支隊伍有隊員專用的小聊天室
 * ========================================================= */
window.Party = (() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const withTimeout = (p, ms = 10000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const err = x => {
    const m = String(x && x.message || x);
    if (/party full/.test(m)) return t('pt_e_full'); if (/party closed/.test(m)) return t('pt_e_closed'); if (/need code/.test(m)) return t('pt_e_code');
    if (/no such party/.test(m)) return t('pt_e_gone'); if (/too many/.test(m)) return t('pt_e_many'); if (/bad time/.test(m)) return t('pt_e_time');
    if (/spam/.test(m)) return t('fr_spam'); if (/need character/.test(m)) return t('cd_login'); if (/not allowed|row-level/.test(m)) return t('cr_e_perm');
    return m;
  };

  I18N.extend({
    zh: {
      hub_party: '揪練舞組隊', ch_party: '組隊頻道', pt_view: '🚩 查看隊伍',
      pt_title: '🚩 組隊佈告欄', pt_intro: '找夥伴一起練舞、跑 cypher、去看比賽！開一支隊伍，選擇公開招募，附近的冒險者就會收到你的召集令。',
      pt_tab_near: '附近招募中', pt_tab_all: '全部公開隊伍', pt_tab_mine: '我的隊伍', pt_new: '＋ 開一支新隊伍', pt_none: '目前沒有招募中的隊伍。當第一個發起冒險的人吧！',
      pt_join_code: '輸入邀請碼', pt_go: '加入',
      pt_name: '隊伍名稱', pt_name_ph: '例：國館 Cypher', pt_intro_f: '隊伍說明', pt_intro_ph: '例：週日晚上在國館練 Popping，新手也歡迎！', pt_styles: '舞風', pt_place_f: '集合地點', pt_place_ph: '例：國父紀念館 地下道',
      pt_when: '集合時間', pt_max: '人數上限（含隊長）', pt_vis: '招募方式', pt_public: '📯 公開招募（推送給附近的冒險者）', pt_private: '🔒 不公開（只能用邀請碼加入）',
      pt_create: '開隊！', pt_save: '儲存', pt_need: '請填隊伍名稱（至少 2 個字）和集合時間',
      pt_members: '隊員 {n} / {m}', pt_leader: '隊長', pt_join: '🚩 加入隊伍', pt_leave: '離開隊伍', pt_leave_q: '確定要離開「{n}」嗎？', pt_kick: '踢出', pt_close: '結束招募', pt_reopen: '重新開放招募', pt_del: '解散隊伍', pt_del_q: '確定要解散「{n}」嗎？',
      pt_edit: '編輯隊伍', pt_full: '已滿員', pt_closed: '招募結束', pt_past: '已結束', pt_private_tag: '🔒 不公開', pt_code: '邀請碼', pt_copy: '複製邀請連結', pt_copied: '已複製！貼給你想邀請的人吧',
      pt_chat: '💬 隊伍頻道（只有隊員看得到）', pt_chat_ph: '跟隊友說點什麼…', pt_chat_join: '加入隊伍後就能在這裡跟隊友聊天',
      pt_joined: '成功加入隊伍！冒險開始 🚩', pt_created: '隊伍成立！召集令已經發出 📯', pt_left: '已離開隊伍', pt_gone: '這支隊伍已經不存在了',
      pt_e_full: '隊伍已經滿員了', pt_e_closed: '這支隊伍已經結束招募了', pt_e_code: '這是不公開的隊伍，需要邀請碼', pt_e_gone: '找不到這支隊伍（邀請碼可能打錯了）', pt_e_many: '你參加的隊伍太多了，先完成幾場冒險吧', pt_e_time: '集合時間要在 90 天內',
      pt_ad: '📯【組隊招募】「{n}」{w}・{p}（{c}/{m} 人）快來入隊！',
      pt_push: '🚩 冒險者注意！\n在你附近的【{city}】出現了一支正在招募的小隊——「{n}」！\n📅 {w}　📍 {p}\n隊長正在尋找並肩作戰的夥伴，一起去打倒今天的練舞大魔王吧！',
      pt_push_yes: '🚩 接下委託，入隊！', pt_push_no: '💤 先在村莊休息'
    },
    en: {
      hub_party: 'Practice party', ch_party: 'Party', pt_view: '🚩 View party',
      pt_title: '🚩 Party Board', pt_intro: 'Find crewmates to practice, cypher or watch battles together! Start a party and go public — nearby adventurers will get your call to arms.',
      pt_tab_near: 'Recruiting nearby', pt_tab_all: 'All public parties', pt_tab_mine: 'My parties', pt_new: '＋ Start a party', pt_none: 'No parties recruiting right now. Be the first to start an adventure!',
      pt_join_code: 'Invite code', pt_go: 'Join',
      pt_name: 'Party name', pt_name_ph: 'e.g. SYS Memorial Hall Cypher', pt_intro_f: 'About', pt_intro_ph: 'e.g. Popping practice Sunday night, beginners welcome!', pt_styles: 'Styles', pt_place_f: 'Meeting spot', pt_place_ph: 'e.g. Memorial Hall underpass',
      pt_when: 'Meeting time', pt_max: 'Max members (incl. leader)', pt_vis: 'Recruiting', pt_public: '📯 Public (pushed to nearby adventurers)', pt_private: '🔒 Private (invite code only)',
      pt_create: 'Start party!', pt_save: 'Save', pt_need: 'Enter a party name (2+ characters) and a meeting time',
      pt_members: 'Members {n} / {m}', pt_leader: 'Leader', pt_join: '🚩 Join party', pt_leave: 'Leave party', pt_leave_q: 'Leave “{n}”?', pt_kick: 'Kick', pt_close: 'Stop recruiting', pt_reopen: 'Reopen recruiting', pt_del: 'Disband', pt_del_q: 'Disband “{n}”?',
      pt_edit: 'Edit party', pt_full: 'Full', pt_closed: 'Closed', pt_past: 'Finished', pt_private_tag: '🔒 Private', pt_code: 'Invite code', pt_copy: 'Copy invite link', pt_copied: 'Copied! Send it to whoever you want to invite',
      pt_chat: '💬 Party channel (members only)', pt_chat_ph: 'Say something to your party…', pt_chat_join: 'Join the party to chat with members here',
      pt_joined: 'You joined the party! Adventure begins 🚩', pt_created: 'Party created! Your call to arms is out 📯', pt_left: 'You left the party', pt_gone: 'This party no longer exists',
      pt_e_full: 'The party is full', pt_e_closed: 'This party has stopped recruiting', pt_e_code: 'Private party — you need an invite code', pt_e_gone: 'Party not found (check the invite code)', pt_e_many: "You're in too many parties — finish a few adventures first", pt_e_time: 'Meeting time must be within 90 days',
      pt_ad: '📯 [Party] “{n}” {w} · {p} ({c}/{m}) — join us!',
      pt_push: '🚩 Attention, adventurer!\nA party is recruiting near you in [{city}] — “{n}”!\n📅 {w}   📍 {p}\nThe leader seeks brave companions. Join up and defeat today’s practice boss together!',
      pt_push_yes: '🚩 Accept the quest!', pt_push_no: '💤 Rest at the inn'
    },
    ja: {
      hub_party: '練習パーティー', ch_party: 'パーティー', pt_view: '🚩 パーティーを見る',
      pt_title: '🚩 パーティー掲示板', pt_intro: '一緒に練習・サイファー・観戦する仲間を探そう！パーティーを作って公開募集すると、近くの冒険者に招集状が届きます。',
      pt_tab_near: '近くで募集中', pt_tab_all: '公開パーティー', pt_tab_mine: '自分のパーティー', pt_new: '＋ パーティーを作る', pt_none: '募集中のパーティーはまだありません。最初の冒険を始めよう！',
      pt_join_code: '招待コード', pt_go: '参加',
      pt_name: 'パーティー名', pt_name_ph: '例：国父紀念館サイファー', pt_intro_f: '説明', pt_intro_ph: '例：日曜夜にポッピング練習、初心者歓迎！', pt_styles: 'ジャンル', pt_place_f: '集合場所', pt_place_ph: '例：国父紀念館の地下道',
      pt_when: '集合時間', pt_max: '最大人数（リーダー含む）', pt_vis: '募集方法', pt_public: '📯 公開募集（近くの冒険者に通知）', pt_private: '🔒 非公開（招待コードのみ）',
      pt_create: '結成！', pt_save: '保存', pt_need: 'パーティー名（2 文字以上）と集合時間を入力してください',
      pt_members: 'メンバー {n} / {m}', pt_leader: 'リーダー', pt_join: '🚩 パーティーに参加', pt_leave: '脱退する', pt_leave_q: '「{n}」から脱退しますか？', pt_kick: '外す', pt_close: '募集終了', pt_reopen: '募集を再開', pt_del: '解散', pt_del_q: '「{n}」を解散しますか？',
      pt_edit: '編集', pt_full: '満員', pt_closed: '募集終了', pt_past: '終了', pt_private_tag: '🔒 非公開', pt_code: '招待コード', pt_copy: '招待リンクをコピー', pt_copied: 'コピーしました！誘いたい人に送ろう',
      pt_chat: '💬 パーティーチャンネル（メンバーのみ）', pt_chat_ph: 'メンバーに話しかけよう…', pt_chat_join: '参加するとここでメンバーと話せます',
      pt_joined: 'パーティーに参加しました！冒険の始まり 🚩', pt_created: 'パーティー結成！招集状を送りました 📯', pt_left: '脱退しました', pt_gone: 'このパーティーはもうありません',
      pt_e_full: '満員です', pt_e_closed: '募集は終了しました', pt_e_code: '非公開パーティーです。招待コードが必要です', pt_e_gone: '見つかりません（招待コードを確認してください）', pt_e_many: '参加中のパーティーが多すぎます', pt_e_time: '集合時間は 90 日以内にしてください',
      pt_ad: '📯【募集】「{n}」{w}・{p}（{c}/{m} 人）仲間募集中！',
      pt_push: '🚩 冒険者よ、聞け！\n近くの【{city}】で仲間を募集中のパーティー「{n}」が現れた！\n📅 {w}　📍 {p}\nリーダーは共に戦う仲間を探している。一緒に今日の練習ボスを倒そう！',
      pt_push_yes: '🚩 依頼を受ける！', pt_push_no: '💤 宿屋で休む'
    },
    ko: {
      hub_party: '연습 파티', ch_party: '파티 채널', pt_view: '🚩 파티 보기',
      pt_title: '🚩 파티 게시판', pt_intro: '함께 연습하고 사이퍼하고 배틀을 보러 갈 동료를 찾아요! 파티를 만들어 공개 모집하면 근처 모험가들에게 소집령이 전해져요.',
      pt_tab_near: '근처 모집 중', pt_tab_all: '공개 파티 전체', pt_tab_mine: '내 파티', pt_new: '＋ 새 파티 만들기', pt_none: '지금 모집 중인 파티가 없어요. 첫 모험을 시작해 보세요!',
      pt_join_code: '초대 코드', pt_go: '참가',
      pt_name: '파티 이름', pt_name_ph: '예: 국부기념관 사이퍼', pt_intro_f: '설명', pt_intro_ph: '예: 일요일 밤 팝핀 연습, 초보 환영!', pt_styles: '장르', pt_place_f: '집합 장소', pt_place_ph: '예: 국부기념관 지하도',
      pt_when: '집합 시간', pt_max: '최대 인원 (리더 포함)', pt_vis: '모집 방식', pt_public: '📯 공개 모집 (근처 모험가에게 알림)', pt_private: '🔒 비공개 (초대 코드로만 참가)',
      pt_create: '파티 결성!', pt_save: '저장', pt_need: '파티 이름(2자 이상)과 집합 시간을 입력해 주세요',
      pt_members: '파티원 {n} / {m}', pt_leader: '리더', pt_join: '🚩 파티 참가', pt_leave: '파티 나가기', pt_leave_q: '「{n}」에서 나갈까요?', pt_kick: '내보내기', pt_close: '모집 마감', pt_reopen: '모집 재개', pt_del: '파티 해산', pt_del_q: '「{n}」을(를) 해산할까요?',
      pt_edit: '파티 수정', pt_full: '정원 마감', pt_closed: '모집 마감', pt_past: '종료', pt_private_tag: '🔒 비공개', pt_code: '초대 코드', pt_copy: '초대 링크 복사', pt_copied: '복사했어요! 초대하고 싶은 사람에게 보내세요',
      pt_chat: '💬 파티 채널 (파티원만)', pt_chat_ph: '파티원에게 한마디…', pt_chat_join: '파티에 참가하면 여기서 파티원과 대화할 수 있어요',
      pt_joined: '파티에 참가했어요! 모험 시작 🚩', pt_created: '파티 결성! 소집령을 보냈어요 📯', pt_left: '파티에서 나왔어요', pt_gone: '이 파티는 더 이상 없어요',
      pt_e_full: '파티 정원이 찼어요', pt_e_closed: '모집이 마감된 파티예요', pt_e_code: '비공개 파티라 초대 코드가 필요해요', pt_e_gone: '파티를 찾을 수 없어요 (초대 코드를 확인하세요)', pt_e_many: '참가 중인 파티가 너무 많아요', pt_e_time: '집합 시간은 90일 이내여야 해요',
      pt_ad: '📯【파티 모집】「{n}」{w}・{p} ({c}/{m}명) 함께해요!',
      pt_push: '🚩 모험가여, 주목!\n근처 【{city}】에서 동료를 모집하는 파티 「{n}」이(가) 나타났다!\n📅 {w}　📍 {p}\n리더가 함께 싸울 동료를 찾고 있어요. 오늘의 연습 보스를 함께 쓰러뜨리자!',
      pt_push_yes: '🚩 의뢰 수락, 파티 참가!', pt_push_no: '💤 마을에서 쉬기'
    }
  });

  const pad = n => String(n).padStart(2, '0');
  const whenStr = iso => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}（${(t('week') || [])[d.getDay()] || ''}）${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const placeOf = x => [x.city ? nm(A.cityOf(x.country, x.city)) : nm(A.byCode[x.country]), x.place].filter(Boolean).join('・');
  const styleTags = list => (list || []).map(s => `<span class="tag" style="--c:${Store.STYLE_COLOR[s] || 'var(--cream)'}">${esc(s)}</span>`).join('');
  const myRegion = () => { const p = Backend.profile || {}; const c = p.card || {}; return { cc: c.rc || p.nat || 'TW', city: c.rcity || '' }; };
  const isNear = x => { const r = myRegion(); return x.country === r.cc && (!r.city || !x.city || x.city === r.city); };
  const countryOpts = sel => GEO.countries.slice().sort((a, b) => (b.home - a.home) || nm(a).localeCompare(nm(b))).map(k => `<option value="${k.code}" ${k.code === sel ? 'selected' : ''}>${esc(nm(k))}</option>`).join('');
  const cityOpts = (cc, sel) => ((A.byCode[cc] || {}).cities || []).map(ci => `<option value="${esc(ci.id)}" ${ci.id === sel ? 'selected' : ''}>${esc(nm(ci))}</option>`).join('');

  let parties = [], members = {}, mine = new Set(), loadedAt = 0;
  async function load(force) {
    if (!force && Date.now() - loadedAt < 30000) return;
    await Backend.ready;
    parties = await Backend.parties();
    const rows = await Backend.partyMembers(parties.map(x => x.id));
    members = {}; rows.forEach(r => (members[r.party_id] = members[r.party_id] || []).push(r));
    mine = new Set(logged() ? (await Backend.myPartyIds()) : []);
    loadedAt = Date.now();
  }
  const count = x => (members[x.id] || []).length;
  const stateOf = x => (new Date(x.meet_at) < new Date(Date.now() - 3600e3) ? 'past' : x.status === 'closed' ? 'closed' : count(x) >= x.max_members ? 'full' : 'open');

  /* ---------- 佈告欄  #/party ---------- */
  A.crumbs.party = () => '🚩 ' + t('hub_party');
  let tab = 'near';
  A.views.party = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    try {
      if (r.arg && r.arg[0] === 'join') return joinByCode(inner, r.arg[1] || '');
      await withTimeout(load(true));
      if (r.arg && r.arg[0]) return partyPage(inner, +r.arg[0]);
      board(inner);
    } catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(/timeout/.test(x.message) ? t('cr_slow') : err(x))}</p><button class="btn" onclick="location.reload()">↻</button>`; }
  };
  const cardHTML = x => {
    const st = stateOf(x);
    return `<a class="pt-card ${st}" href="#/party/${x.id}"><span class="pt-top"><b>${esc(x.name)}</b>${!x.public ? `<span class="tag">${t('pt_private_tag')}</span>` : ''}${st !== 'open' ? `<span class="tag">${t('pt_' + st)}</span>` : ''}${mine.has(x.id) ? `<span class="tag pin">${t('pt_tab_mine')}</span>` : ''}</span>
      <small>📅 ${esc(whenStr(x.meet_at))}　${PXI.img('event/pin', '📍')} ${esc(placeOf(x))}</small>
      <span class="sd-tags">${styleTags(x.styles)}</span>
      <span class="pt-hp"><i style="width:${Math.round(count(x) / x.max_members * 100)}%"></i><em>${esc(t('pt_members', { n: count(x), m: x.max_members }))}</em></span></a>`;
  };
  function board(inner) {
    const list = () => {
      const up = parties.filter(x => stateOf(x) !== 'past' || mine.has(x.id));
      if (tab === 'mine') return up.filter(x => mine.has(x.id));
      const pub = up.filter(x => x.public && stateOf(x) === 'open');
      return tab === 'near' ? pub.filter(isNear) : pub;
    };
    inner.innerHTML = `<div class="win">${UI.winHTML(t('pt_title'), 'red', false)}<div class="win-body"><p>${t('pt_intro')}</p>
        <div class="fo-bar"><div class="seg pt-tabs">${['near', 'all', 'mine'].map(k => `<button type="button" data-t="${k}" class="${tab === k ? 'on' : ''}">${t('pt_tab_' + k)}</button>`).join('')}</div><span class="grow"></span>
          <form class="chat-input pt-codef"><input class="input sm" maxlength="6" placeholder="${esc(t('pt_join_code'))}" autocapitalize="characters" spellcheck="false"><button class="btn sm">${t('pt_go')}</button></form>
          <button class="btn pink pt-new">${t('pt_new')}</button></div></div></div>
      <div class="pt-grid"></div>`;
    const draw = () => { inner.querySelector('.pt-grid').innerHTML = list().map(cardHTML).join('') || `<p class="note">${t('pt_none')}</p>`; };
    inner.querySelector('.pt-tabs').onclick = ev => { const b = ev.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; SFX.play('select'); inner.querySelectorAll('.pt-tabs button').forEach(x => x.classList.toggle('on', x === b)); draw(); };
    inner.querySelector('.pt-new').onclick = () => (logged() ? openEditor(null) : Player.prompt());
    inner.querySelector('.pt-codef').onsubmit = ev => { ev.preventDefault(); const v = ev.target.querySelector('input').value.trim().toUpperCase(); if (v) A.nav('#/party/join/' + encodeURIComponent(v)); };
    draw();
  }

  async function joinByCode(inner, code) {
    if (!logged()) { inner.innerHTML = `<p class="note">${t('cd_login')}</p>`; return Player.prompt(); }
    try { const id = await Backend.rpc('party_join', { pid: null, p_code: code }); SFX.play('fanfare'); toast(t('pt_joined'), '🚩'); loadedAt = 0; A.nav('#/party/' + id); }
    catch (x) { inner.innerHTML = `<div class="win"><div class="win-body"><p>⚠ ${esc(err(x))}</p><a class="btn" href="#/party">◀ ${t('hub_party')}</a></div></div>`; }
  }

  /* ---------- 單一隊伍頁  #/party/<id> ---------- */
  let unsub = null;
  window.addEventListener('hashchange', () => { if (unsub && !/^#\/party\/\d+/.test(location.hash)) { unsub(); unsub = null; } });
  async function partyPage(inner, id) {
    let x = parties.find(p => p.id === id);
    if (!x) { try { x = await Backend.party(id); if (x) members[x.id] = await Backend.partyMembers([x.id]); } catch (e) {} }
    if (!x) { inner.innerHTML = `<div class="win"><div class="win-body"><p>${t('pt_gone')}</p><a class="btn" href="#/party">◀ ${t('hub_party')}</a></div></div>`; return; }
    const mem = members[x.id] || [];
    const ps = {}; try { (await Backend.playersByIds(mem.map(m => m.user_id))).forEach(p => (ps[p.user_id] = p)); } catch (e) {}
    const amIn = mine.has(x.id) || mem.some(m => m.user_id === Backend.uid), lead = x.leader === Backend.uid || Backend.isAdmin, st = stateOf(x);
    const link = location.origin + location.pathname + '#/party/join/' + (x.code || '');
    inner.innerHTML = `<div class="win">${UI.winHTML('🚩 ' + esc(x.name), 'red', false)}<div class="win-body">
        <div class="sd-tags">${styleTags(x.styles)}${!x.public ? `<span class="tag">${t('pt_private_tag')}</span>` : ''}${st !== 'open' ? `<span class="tag">${t('pt_' + st)}</span>` : ''}</div>
        <dl class="info"><dt>${PXI.img('event/time', '🕒')} ${t('pt_when')}</dt><dd>${esc(whenStr(x.meet_at))}</dd>
          <dt>${PXI.img('event/pin', '📍')} ${t('pt_place_f')}</dt><dd>${esc(placeOf(x))}</dd></dl>
        ${x.intro ? `<p class="sd-intro" data-utr>${esc(x.intro)}</p>` : ''}
        <span class="pt-hp big"><i style="width:${Math.round(mem.length / x.max_members * 100)}%"></i><em>${esc(t('pt_members', { n: mem.length, m: x.max_members }))}</em></span>
        <ul class="pt-mem">${mem.map(m => { const p = ps[m.user_id] || {}; return `<li><button class="linkish pt-who" data-h="${esc(p.handle || '')}">${m.user_id === x.leader ? '👑 ' : ''}${esc(p.name || '?')}</button>${m.user_id === x.leader ? `<small>${t('pt_leader')}</small>` : ''}${lead && m.user_id !== x.leader ? `<button class="btn sm pt-kick" data-u="${m.user_id}">${t('pt_kick')}</button>` : ''}</li>`; }).join('')}</ul>
        <div class="btn-row">
          ${!amIn && st === 'open' ? `<button class="btn pink pt-join">${t('pt_join')}</button>` : ''}
          ${amIn ? `<button class="btn sm pt-leave">${t('pt_leave')}</button>` : ''}
          ${amIn && x.code ? `<button class="btn sm teal pt-copy">${PXI.img('event/link', '🔗')} ${t('pt_copy')}</button><span class="tag">${t('pt_code')}：<code class="vcode">${esc(x.code)}</code></span>` : ''}
          <a class="btn sm" href="#/party">◀ ${t('hub_party')}</a></div>
        ${lead ? `<div class="sd-manage"><div class="btn-row"><button class="btn sm yellow pt-edit">✎ ${t('pt_edit')}</button><button class="btn sm pt-close">${x.status === 'open' ? t('pt_close') : t('pt_reopen')}</button><button class="btn sm red pt-del">🗑 ${t('pt_del')}</button></div></div>` : ''}
      </div></div>
      <div class="win">${UI.winHTML(t('pt_chat'), 'blue', false)}<div class="win-body"><div class="pt-chat"></div>
        ${amIn ? `<form class="chat-input pt-chatf"><button type="button" class="btn sm emo-btn"><img class="pxemo" src="assets/stickers/c/7.webp?v=1" alt=""></button><input class="input sm" maxlength="200" placeholder="${esc(t('pt_chat_ph'))}"><button class="btn sm pink">${t('chat_send')}</button></form>` : `<p class="note">${t('pt_chat_join')}</p>`}</div></div>`;
    const re = async () => { loadedAt = 0; await load(true); A.render(true); };
    inner.querySelectorAll('.pt-who').forEach(b => (b.onclick = () => b.dataset.h && window.Friends && Friends.openCard(b.dataset.h)));
    const on = (sel, fn) => { const b = inner.querySelector(sel); if (b) b.onclick = fn; };
    on('.pt-join', async () => {
      if (!logged()) return Player.prompt();
      try { await Backend.rpc('party_join', { pid: x.id, p_code: null }); SFX.play('fanfare'); const r = inner.querySelector('.pt-join').getBoundingClientRect(); sparkle(r.x + r.width / 2, r.y, 20); toast(t('pt_joined'), '🚩'); re(); } catch (e) { toast(err(e), '✕'); }
    });
    on('.pt-leave', () => confirmBox(t('pt_leave_q', { n: x.name }), async () => { await Backend.rpc('party_leave', { pid: x.id }); toast(t('pt_left'), '🚩'); loadedAt = 0; A.nav('#/party'); }));
    on('.pt-copy', async () => { try { await navigator.clipboard.writeText(link); toast(t('pt_copied'), '🔗'); } catch (e) { window.prompt('', link); } });
    on('.pt-edit', () => openEditor(x, re));
    on('.pt-close', async () => { try { await Backend.saveParty({ id: x.id, status: x.status === 'open' ? 'closed' : 'open' }); re(); } catch (e) { toast(err(e), '✕'); } });
    on('.pt-del', () => confirmBox(t('pt_del_q', { n: x.name }), async () => { await Backend.deleteParty(x.id); toast(t('deleted'), '✕'); loadedAt = 0; A.nav('#/party'); }));
    inner.querySelectorAll('.pt-kick').forEach(b => (b.onclick = async () => { try { await Backend.rpc('party_kick', { pid: x.id, uid: b.dataset.u }); re(); } catch (e) { toast(err(e), '✕'); } }));
    if (amIn) miniChat(inner, x);
  }
  function confirmBox(q, go) {
    const m = modal({ title: '🚩', color: 'red', body: `<p>${esc(q)}</p><div class="form-foot"><button class="btn no">${t('no')}</button><button class="btn red yes">OK</button></div>` });
    m.el.querySelector('.no').onclick = m.close;
    m.el.querySelector('.yes').onclick = async () => { try { await go(); m.close(); } catch (e) { toast(err(e), '✕'); } };
  }

  /* ---------- 隊伍專用小聊天室（messages 頻道 party:<id>） ---------- */
  async function miniChat(inner, x) {
    const ch = 'party:' + x.id, box = inner.querySelector('.pt-chat'), f = inner.querySelector('.pt-chatf');
    const row = m => { const a = m.author || {}; const d = new Date(m.created_at); return `<div class="pt-msg" data-id="${m.id}"><b>${esc(a.name || '?')}</b><span class="tm">${pad(d.getHours())}:${pad(d.getMinutes())}</span><div data-utr-src="${esc(m.text)}">${Emoji.toHTML(m.text)}</div></div>`; };
    const add = m => { if (box.querySelector(`[data-id="${m.id}"]`)) return; box.insertAdjacentHTML('beforeend', row(m)); box.scrollTop = box.scrollHeight; };
    try { (await Backend.listMessages(ch, 80)).forEach(add); } catch (e) {}
    if (unsub) unsub();
    unsub = Backend.subscribeTable('messages', 'channel=eq.' + ch, p => { if (!box.isConnected) return; if (p.eventType === 'INSERT') add(p.new); if (p.eventType === 'DELETE') box.querySelector(`[data-id="${p.old.id}"]`)?.remove(); });
    const input = f.querySelector('input');
    f.querySelector('.emo-btn').onclick = e => Chat.togglePicker(e.currentTarget, input);
    f.onsubmit = async ev => {
      ev.preventDefault(); const v = input.value.trim(); if (!v) return;
      try { const m = await Backend.sendMessage(ch, v); input.value = ''; add(m); SFX.play('blip'); document.querySelector('.emo-pick')?.remove(); } catch (e) { toast(err(e), '✕'); }
    };
  }

  /* ---------- 開隊 / 編輯 ---------- */
  function openEditor(x, after) {
    const editing = !!x, r = myRegion();
    x = x || { country: r.cc, city: r.city, styles: Player.me && Player.me.style ? [Player.me.style] : [], max_members: 6, public: true };
    const d = x.meet_at ? new Date(x.meet_at) : new Date(Date.now() + 864e5);
    const dv = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, tv = x.meet_at ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '19:00';
    const body = h(`<form class="form" novalidate>
      <label class="field full"><span>${t('pt_name')} <b>*</b></span><input class="input" name="name" maxlength="30" value="${esc(x.name || '')}" placeholder="${esc(t('pt_name_ph'))}"></label>
      <div class="row2 full"><label class="field"><span>${t('pt_when')} <b>*</b></span><div class="row2"><input class="input" type="date" name="date" value="${dv}"><input class="input" type="time" name="time" value="${tv}"></div></label>
        <label class="field"><span>${t('pt_max')}</span><input class="input" type="number" name="max" min="2" max="30" value="${x.max_members}"></label></div>
      <div class="field full"><span>${t('pt_place_f')}</span><div class="row3"><select class="input" name="country">${countryOpts(x.country)}</select><select class="input" name="city"></select><input class="input" name="place" maxlength="100" value="${esc(x.place || '')}" placeholder="${esc(t('pt_place_ph'))}"></div></div>
      <fieldset class="fieldset full"><legend>${t('pt_styles')}</legend><div class="chips">${Store.STYLES.map(s => `<label class="chip ${(x.styles || []).includes(s) ? 'on' : ''}" style="--c:${Store.STYLE_COLOR[s]}"><input type="checkbox" name="styles" value="${esc(s)}" ${(x.styles || []).includes(s) ? 'checked' : ''} hidden><span class="dot"></span>${esc(s)}</label>`).join('')}</div></fieldset>
      <label class="field full"><span>${t('pt_intro_f')}</span><textarea class="input" name="intro" rows="3" maxlength="500" placeholder="${esc(t('pt_intro_ph'))}">${esc(x.intro || '')}</textarea></label>
      <fieldset class="fieldset full"><legend>${t('pt_vis')}</legend>
        <label class="chk"><input type="radio" name="vis" value="1" ${x.public ? 'checked' : ''}> ${t('pt_public')}</label>
        <label class="chk"><input type="radio" name="vis" value="0" ${x.public ? '' : 'checked'}> ${t('pt_private')}</label></fieldset>
      <div class="full"><div class="err"></div><div class="form-foot"><button type="button" class="btn cancel">${t('cancel')}</button><button class="btn pink">${editing ? t('pt_save') : t('pt_create')}</button></div></div>
    </form>`);
    const m = modal({ title: '🚩 ' + (editing ? t('pt_edit') : t('pt_new').replace('＋ ', '')), color: 'red', body, wide: true });
    const f = body;
    f.elements.city.innerHTML = cityOpts(f.elements.country.value, x.city);
    f.elements.country.onchange = () => { f.elements.city.innerHTML = cityOpts(f.elements.country.value); };
    f.querySelectorAll('.chips label.chip').forEach(l => l.addEventListener('click', ev => { ev.preventDefault(); const cb = l.querySelector('input'); cb.checked = !cb.checked; l.classList.toggle('on', cb.checked); SFX.play('select'); }));
    f.querySelector('.cancel').onclick = m.close;
    f.onsubmit = async ev => {
      ev.preventDefault();
      const fd = new FormData(f), g = k => String(fd.get(k) || '').trim();
      const when = g('date') && g('time') ? new Date(`${g('date')}T${g('time')}`) : null;
      if (g('name').length < 2 || !when || isNaN(when)) { f.querySelector('.err').textContent = '✕ ' + t('pt_need'); return; }
      const row = { ...(editing ? { id: x.id } : {}), name: g('name'), intro: g('intro') || null, styles: fd.getAll('styles'), country: g('country'), city: g('city') || null, place: g('place') || null,
        meet_at: when.toISOString(), max_members: Math.max(2, Math.min(30, +g('max') || 6)), public: g('vis') === '1' };
      const btn = f.querySelector('.form-foot .pink'); btn.disabled = true;
      try {
        const saved = await Backend.saveParty(row);
        m.close(); SFX.play('fanfare');
        if (!editing) {
          toast(t('pt_created'), '📯');
          // 公開招募：自動貼到聊天室的組隊頻道
          if (saved.public) { try { await Backend.sendMessage('party', t('pt_ad', { n: saved.name, w: whenStr(saved.meet_at), p: placeOf(saved), c: 1, m: saved.max_members }) + ' #/party/' + saved.id); } catch (e) {} }
        }
        loadedAt = 0;
        if (after) after(); else A.nav('#/party/' + saved.id);
      } catch (e) { SFX.play('error'); f.querySelector('.err').textContent = '✕ ' + err(e); btn.disabled = false; }
    };
  }

  /* ---------- 附近有公開隊伍在招募：用 RPG 對話推送 ---------- */
  const SEEN = 'danceIsland.partySeen';
  const seen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN) || '[]')); } catch (e) { return new Set(); } };
  const markSeen = id => { const s = seen(); s.add(id); try { localStorage.setItem(SEEN, JSON.stringify([...s].slice(-200))); } catch (e) {} };
  const busy = () => {
    const b = document.getElementById('boot'), n = document.getElementById('npc');
    if (b && b.isConnected && getComputedStyle(b).display !== 'none' && +getComputedStyle(b).opacity > 0.05) return true;
    return !!(document.querySelector('.tut, .modal-back') || (n && !n.classList.contains('hidden')));
  };
  let pushing = false;
  function pushOne(x) {
    if (pushing) return; pushing = true; markSeen(x.id);
    const city = x.city ? nm(A.cityOf(x.country, x.city)) : nm(A.byCode[x.country]);
    const text = t('pt_push', { city, n: x.name, w: whenStr(x.meet_at), p: x.place || city });
    npc.ask([{ who: 'choco', mood: 'cool', text }], [{ label: t('pt_push_yes'), value: 'yes' }, { label: t('pt_push_no'), value: 'no' }]).then(v => {
      pushing = false; if (v === 'yes') A.nav('#/party/' + x.id);
    });
  }
  const candidates = () => { const s = seen(); return parties.filter(x => x.public && stateOf(x) === 'open' && x.leader !== Backend.uid && !mine.has(x.id) && !s.has(x.id) && isNear(x) && new Date(x.meet_at) - Date.now() < 14 * 864e5); };
  function waitThenPush(list) {
    let n = 0; const tm = setInterval(() => {
      if (++n > 120 || !list.length) return clearInterval(tm);
      if (busy() || pushing) return;
      clearInterval(tm); pushOne(list[0]);
    }, 2000);
  }
  async function startPush() {
    if (!logged()) return;
    try { await load(true); } catch (e) { return; }
    const c = candidates(); if (c.length) setTimeout(() => waitThenPush(c), 8000);   // 先讓幸運小卡、歡迎詞跑完
    Backend.subscribeTable('parties', 'public=eq.true', p => {
      if (p.eventType !== 'INSERT' || !logged()) return;
      const x = p.new; members[x.id] = [{ party_id: x.id, user_id: x.leader }]; parties.push(x);
      if (candidates().some(y => y.id === x.id)) waitThenPush([x]);
    });
  }
  let started = false;
  const kick = () => { if (started || !logged()) return; started = true; startPush(); };
  if (Backend.enabled) Backend.ready.then(() => setTimeout(kick, 2000));
  Player.onChange(() => setTimeout(kick, 2500));

  /** 聊天訊息裡的 #/party/123 換成按鈕 */
  const linkify = html => String(html).replace(/#\/party\/(\d+)/g, (m, id) => `<a class="party-link" href="#/party/${id}">${esc(t('pt_view'))}</a>`);
  return { linkify, open: () => A.nav('#/party') };
})();
