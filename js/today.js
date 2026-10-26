/* =========================================================
 * 第二批・介面：
 * - 「今天」首頁（#/today）：通知、新手任務、每日任務、本週活動、收藏的活動、附近隊伍、好友在線
 * - 全站搜尋：活動、教室、玩家、論壇、舞團、隊伍一起搜
 * - 通知中心：好友邀請、私訊、舞團邀請、被 @、提醒、組隊召集令集中在一起
 * - 新手任務：伺服器檢查、完成一步領一次經驗值
 * - 手機左右滑切換分頁
 * ========================================================= */
(() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const pad = n => String(n).padStart(2, '0');

  I18N.extend({
    zh: {
      nav_today: '今天', hub_today: '今天', hub_search: '全站搜尋', hub_bell: '通知中心',
      td_morning: '早安', td_noon: '午安', td_evening: '晚安', td_hi: '{g}，{n}！', td_guest: '冒險者', td_date: '今天是 {d}',
      td_search_ph: '搜尋活動、教室、玩家、論壇、舞團、隊伍…', td_bell: '🔔 通知', td_bell_n: '{n} 則新通知', td_bell_none: '沒有新通知',
      td_luck: '🍀 今日幸運小卡', td_pick: '📰 今日一推', td_week: '📅 本週活動', td_week_none: '這 7 天沒有活動，看看全部活動吧！',
      td_saved: '⭐ 我收藏的活動', td_saved_none: '還沒有收藏的活動，在活動卡片按「收藏」就會出現在這裡', td_party: '🚩 附近招募中的隊伍', td_party_none: '附近目前沒有招募中的隊伍',
      td_friends: '👥 好友在線', td_friends_none: '目前沒有好友在線', td_more: '看全部 ▶', td_login: '登入角色後，這裡會出現你的專屬資訊！',
      td_quests: '任務', nb_title: '🌱 新手任務', nb_char: '建立你的角色', nb_island: '逛一座國家的島', nb_view: '看一個街舞活動', nb_fav: '收藏一個活動', nb_card: '編輯你的玩家名片',
      nb_chat: '在聊天室說一句話', nb_friend: '交到第一個好友', nb_quest: '完成一個每日任務', nb_go: '前往', nb_claim: '領取', nb_done_all: '新手任務全部完成！你已經是正式的島民了 🎉',
      nb_got: '新手任務完成：{s}　+{n} XP', nb_grad: '🎓 新手畢業！額外 +{n} XP',
      sr_title: '🔍 全站搜尋', sr_events: '活動', sr_studios: '教室', sr_players: '玩家', sr_forum: '論壇', sr_crews: '舞團', sr_parties: '隊伍', sr_none: '找不到符合的結果', sr_hint: '輸入 2 個字以上開始搜尋。找玩家請輸入玩家 ID。',
      nt_center: '🔔 通知中心', nt_read_all: '全部標為已讀', nt_empty: '目前沒有通知', nt_friend_req: '{n} 想加你好友', nt_dm: '{n} 傳了私訊給你', nt_crew_inv: '你收到舞團邀請', nt_luck: '今天的幸運小卡還沒翻開喔！'
    },
    en: {
      nav_today: 'Today', hub_today: 'Today', hub_search: 'Search', hub_bell: 'Notifications',
      td_morning: 'Good morning', td_noon: 'Good afternoon', td_evening: 'Good evening', td_hi: '{g}, {n}!', td_guest: 'adventurer', td_date: 'Today is {d}',
      td_search_ph: 'Search events, studios, players, forum, crews, parties…', td_bell: '🔔 Notifications', td_bell_n: '{n} new', td_bell_none: 'Nothing new',
      td_luck: '🍀 Today’s lucky card', td_pick: '📰 Daily pick', td_week: '📅 This week', td_week_none: 'No events in the next 7 days — browse all events!',
      td_saved: '⭐ My saved events', td_saved_none: 'No saved events yet — tap “Save” on an event card', td_party: '🚩 Parties recruiting nearby', td_party_none: 'No parties recruiting nearby right now',
      td_friends: '👥 Friends online', td_friends_none: 'No friends online', td_more: 'See all ▶', td_login: 'Create a character to see your personal dashboard!',
      td_quests: 'Quests', nb_title: '🌱 Newbie quests', nb_char: 'Create your character', nb_island: 'Visit a country island', nb_view: 'Look at a dance event', nb_fav: 'Save an event', nb_card: 'Edit your player card',
      nb_chat: 'Say something in chat', nb_friend: 'Make your first friend', nb_quest: 'Finish a daily quest', nb_go: 'Go', nb_claim: 'Claim', nb_done_all: 'All newbie quests done — you’re a real islander now 🎉',
      nb_got: 'Newbie quest done: {s}  +{n} XP', nb_grad: '🎓 Newbie graduation! Bonus +{n} XP',
      sr_title: '🔍 Search', sr_events: 'Events', sr_studios: 'Studios', sr_players: 'Players', sr_forum: 'Forum', sr_crews: 'Crews', sr_parties: 'Parties', sr_none: 'No results', sr_hint: 'Type 2+ characters to search. For players, type their ID.',
      nt_center: '🔔 Notifications', nt_read_all: 'Mark all as read', nt_empty: 'No notifications', nt_friend_req: '{n} wants to be friends', nt_dm: '{n} sent you a message', nt_crew_inv: 'You got a crew invite', nt_luck: 'You haven’t flipped today’s lucky card yet!'
    },
    ja: {
      nav_today: '今日', hub_today: '今日', hub_search: 'サイト内検索', hub_bell: 'お知らせ',
      td_morning: 'おはよう', td_noon: 'こんにちは', td_evening: 'こんばんは', td_hi: '{g}、{n}！', td_guest: '冒険者', td_date: '今日は {d}',
      td_search_ph: 'イベント・スタジオ・プレイヤー・掲示板・チーム・パーティーを検索…', td_bell: '🔔 お知らせ', td_bell_n: '新着 {n} 件', td_bell_none: '新着なし',
      td_luck: '🍀 今日のラッキーカード', td_pick: '📰 今日のピック', td_week: '📅 今週のイベント', td_week_none: '7 日以内のイベントはありません。すべてのイベントを見よう！',
      td_saved: '⭐ お気に入りのイベント', td_saved_none: 'まだお気に入りはありません。イベントカードの「お気に入り」を押そう', td_party: '🚩 近くで募集中のパーティー', td_party_none: '近くで募集中のパーティーはありません',
      td_friends: '👥 オンラインのフレンド', td_friends_none: 'オンラインのフレンドはいません', td_more: 'すべて見る ▶', td_login: 'キャラを作るとあなた専用の情報が表示されます！',
      td_quests: 'クエスト', nb_title: '🌱 初心者クエスト', nb_char: 'キャラを作る', nb_island: '国の島を見に行く', nb_view: 'ダンスイベントを見る', nb_fav: 'イベントをお気に入り登録', nb_card: 'プレイヤー名刺を編集',
      nb_chat: 'チャットで一言話す', nb_friend: '初めてのフレンドを作る', nb_quest: 'デイリークエストを 1 つ達成', nb_go: '行く', nb_claim: '受け取る', nb_done_all: '初心者クエスト全部クリア！立派な島民です 🎉',
      nb_got: '初心者クエスト達成：{s}　+{n} XP', nb_grad: '🎓 初心者卒業！ボーナス +{n} XP',
      sr_title: '🔍 サイト内検索', sr_events: 'イベント', sr_studios: 'スタジオ', sr_players: 'プレイヤー', sr_forum: '掲示板', sr_crews: 'チーム', sr_parties: 'パーティー', sr_none: '見つかりませんでした', sr_hint: '2 文字以上入力してください。プレイヤーは ID で検索します。',
      nt_center: '🔔 お知らせ', nt_read_all: 'すべて既読にする', nt_empty: 'お知らせはありません', nt_friend_req: '{n} さんからフレンド申請', nt_dm: '{n} さんからメッセージ', nt_crew_inv: 'チームの招待が届きました', nt_luck: '今日のラッキーカードがまだです！'
    },
    ko: {
      nav_today: '오늘', hub_today: '오늘', hub_search: '전체 검색', hub_bell: '알림',
      td_morning: '좋은 아침', td_noon: '좋은 오후', td_evening: '좋은 저녁', td_hi: '{g}, {n}!', td_guest: '모험가', td_date: '오늘은 {d}',
      td_search_ph: '이벤트·학원·플레이어·게시판·크루·파티 검색…', td_bell: '🔔 알림', td_bell_n: '새 알림 {n}개', td_bell_none: '새 알림 없음',
      td_luck: '🍀 오늘의 행운 카드', td_pick: '📰 오늘의 픽', td_week: '📅 이번 주 이벤트', td_week_none: '7일 안에 이벤트가 없어요. 전체 이벤트를 보세요!',
      td_saved: '⭐ 저장한 이벤트', td_saved_none: '저장한 이벤트가 없어요. 이벤트 카드에서 「저장」을 눌러 보세요', td_party: '🚩 근처 모집 중인 파티', td_party_none: '근처에 모집 중인 파티가 없어요',
      td_friends: '👥 접속 중인 친구', td_friends_none: '접속 중인 친구가 없어요', td_more: '전체 보기 ▶', td_login: '캐릭터를 만들면 나만의 정보가 여기 표시돼요!',
      td_quests: '퀘스트', nb_title: '🌱 초보자 퀘스트', nb_char: '캐릭터 만들기', nb_island: '나라 섬 둘러보기', nb_view: '댄스 이벤트 하나 보기', nb_fav: '이벤트 저장하기', nb_card: '플레이어 명함 수정하기',
      nb_chat: '채팅에서 한마디 하기', nb_friend: '첫 친구 사귀기', nb_quest: '일일 퀘스트 하나 완료', nb_go: '가기', nb_claim: '받기', nb_done_all: '초보자 퀘스트 완료! 이제 진짜 섬 주민이에요 🎉',
      nb_got: '초보자 퀘스트 완료: {s}  +{n} XP', nb_grad: '🎓 초보자 졸업! 보너스 +{n} XP',
      sr_title: '🔍 전체 검색', sr_events: '이벤트', sr_studios: '학원', sr_players: '플레이어', sr_forum: '게시판', sr_crews: '크루', sr_parties: '파티', sr_none: '결과가 없어요', sr_hint: '2글자 이상 입력하세요. 플레이어는 ID로 검색해요.',
      nt_center: '🔔 알림 센터', nt_read_all: '모두 읽음으로 표시', nt_empty: '알림이 없어요', nt_friend_req: '{n} 님이 친구 신청을 보냈어요', nt_dm: '{n} 님이 메시지를 보냈어요', nt_crew_inv: '크루 초대가 왔어요', nt_luck: '오늘의 행운 카드를 아직 안 뒤집었어요!'
    }
  });

  /* =========================================================
   * 通知中心
   * ========================================================= */
  const NKEY = () => 'danceIsland.notify.' + (Backend.uid || 'guest');
  let items = [];
  const loadItems = () => { try { items = JSON.parse(localStorage.getItem(NKEY()) || '[]'); } catch (e) { items = []; } };
  const saveItems = () => { try { localStorage.setItem(NKEY(), JSON.stringify(items.slice(0, 60))); } catch (e) {} };
  let dyn = [];          // 即時算的：好友邀請、未讀私訊、舞團邀請
  const READ = () => 'danceIsland.notifyRead.' + (Backend.uid || 'guest');
  const readSet = () => { try { return new Set(JSON.parse(localStorage.getItem(READ()) || '[]')); } catch (e) { return new Set(); } };
  const markRead = keys => { const s = readSet(); keys.forEach(k => s.add(k)); try { localStorage.setItem(READ(), JSON.stringify([...s].slice(-300))); } catch (e) {} };
  const Notify = {
    /** add({ key, ic, text, href }) — 同一個 key 只會出現一次 */
    add(n) {
      if (!n || !n.text) return;
      loadItems();
      const key = n.key || n.text;
      if (items.some(x => x.key === key)) return;
      items.unshift({ key, ic: n.ic || '🔔', text: n.text, href: n.href || '', at: Date.now() });
      saveItems(); paintBadge();
    },
    all() { loadItems(); return [...dyn, ...items]; },
    unread() { const r = readSet(); return Notify.all().filter(x => !r.has(x.key)).length; },
    async refresh() {
      dyn = [];
      if (!logged()) return paintBadge();
      try {
        const [reqs, dms, invs] = await Promise.all([
          Backend.friendRequests().catch(() => []), Backend.unreadDMs().catch(() => []), Backend.crewInvites().catch(() => [])
        ]);
        const inReq = reqs.filter(r => r.to_user === Backend.uid && r.status === 'pending');
        const fromIds = [...new Set([...inReq.map(r => r.from_user), ...dms.map(d => d.from_user)])];
        const ps = {}; if (fromIds.length) (await Backend.playersByIds(fromIds).catch(() => [])).forEach(p => (ps[p.user_id] = p));
        inReq.forEach(r => dyn.push({ key: 'fr:' + r.id, ic: '👥', text: t('nt_friend_req', { n: (ps[r.from_user] || {}).name || '?' }), act: 'friends', at: Date.parse(r.created_at) }));
        const byFrom = {}; dms.forEach(d => (byFrom[d.from_user] = (byFrom[d.from_user] || 0) + 1));
        Object.keys(byFrom).forEach(u => dyn.push({ key: 'dm:' + u + ':' + byFrom[u], ic: '💌', text: t('nt_dm', { n: (ps[u] || {}).name || '?' }) + (byFrom[u] > 1 ? ` ×${byFrom[u]}` : ''), act: 'dm', handle: (ps[u] || {}).handle, at: Date.now() }));
        invs.forEach(iv => dyn.push({ key: 'ci:' + iv.id, ic: '👯', text: t('nt_crew_inv'), href: '#/crew', at: Date.parse(iv.created_at) || Date.now() }));
        // 幸運小卡還沒翻
        let seen = ''; try { seen = localStorage.getItem('danceIsland.luck.' + Backend.uid) || ''; } catch (e) {}
        if (seen !== A.todayStr()) dyn.push({ key: 'luck:' + A.todayStr(), ic: '🍀', text: t('nt_luck'), act: 'luck', at: Date.now() });
      } catch (e) {}
      paintBadge();
    },
    open() {
      SFX.play('open');
      const r = readSet(), list = Notify.all().sort((a, b) => (b.at || 0) - (a.at || 0));
      const body = h(`<div class="nt-center">${list.length ? `<div class="btn-row"><span class="grow"></span><button class="btn sm nt-all">${t('nt_read_all')}</button></div>
        <ul class="nt-list">${list.map((x, i) => `<li class="${r.has(x.key) ? '' : 'new'}" data-i="${i}"><span class="ic">${PXI.emo(x.ic)}</span><span class="tx">${esc(x.text)}</span><span class="tm">${x.at ? when(x.at) : ''}</span></li>`).join('')}</ul>` : `<p class="note">${t('nt_empty')}</p>`}</div>`);
      const m = modal({ title: t('nt_center'), color: 'yellow', body });
      body.onclick = ev => {
        if (ev.target.closest('.nt-all')) { markRead(list.map(x => x.key)); body.querySelectorAll('li.new').forEach(li => li.classList.remove('new')); paintBadge(); SFX.play('select'); return; }
        const li = ev.target.closest('[data-i]'); if (!li) return;
        const x = list[+li.dataset.i]; markRead([x.key]); paintBadge(); m.close();
        setTimeout(() => {
          if (x.href) A.nav(x.href);
          else if (x.act === 'friends') Friends.openPanel('req');
          else if (x.act === 'dm' && x.handle) Friends.openCard(x.handle);
          else if (x.act === 'luck') Daily.openLuck();
        }, 230);
      };
    }
  };
  const when = ms => { const d = new Date(ms), now = new Date(); return d.toDateString() === now.toDateString() ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${d.getMonth() + 1}/${d.getDate()}`; };
  function paintBadge() {
    const n = Notify.unread();
    document.querySelectorAll('.bell-badge').forEach(b => { b.textContent = n > 9 ? '9+' : n; b.hidden = !n; });
  }
  window.Notify = Notify;
  // 被 @、提醒、組隊召集令：從現有的 toast 轉存一份到通知中心
  const CAPTURE = { '📣': 1, '⏰': 1 };
  window.__toastHook = (msg, ic) => { if (CAPTURE[ic]) Notify.add({ key: ic + msg + A.todayStr(), ic, text: msg }); };

  /* =========================================================
   * 新手任務
   * ========================================================= */
  const STEP_GO = {
    char: () => Player.prompt(), island: () => A.nav('#/c/TW'), view: () => A.nav('#/events'), fav: () => A.nav('#/events'),
    card: () => Friends.openCardEditor(), chat: () => Chat.toggle(true), friend: () => Friends.openPanel('find'), quest: () => document.querySelector('.qbox')?.classList.add('open')
  };
  let nb = null, nbBusy = false;
  const Newbie = {
    get list() { return nb; },
    allClaimed: () => nb && nb.length && nb.every(s => s.claimed),
    async load() {
      if (!logged()) { nb = null; return; }
      try { nb = await Backend.newbieStatus(); } catch (e) { nb = null; }      // 還沒跑第十二批 SQL：先不顯示
      await Newbie.autoClaim();
    },
    async autoClaim() {
      if (!nb || nbBusy) return;
      const todo = nb.filter(s => s.done && !s.claimed); if (!todo.length) return;
      nbBusy = true;
      for (const s of todo) {
        try {
          const r = await Backend.newbieClaim(s.id); s.claimed = true;
          if (r.xp) { SFX.play('coin'); toast(t('nb_got', { s: t('nb_' + s.id), n: r.xp }), '🌱'); }
          if (r.bonus) setTimeout(() => { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 30); toast(t('nb_grad', { n: r.bonus }), '🎓'); }, 900);
        } catch (e) {}
      }
      nbBusy = false; window.XP && XP.changed && XP.changed(); window.Hub && Hub.reload && Hub.reload();
    },
    html() {
      if (!nb || Newbie.allClaimed()) return '';
      const n = nb.filter(s => s.claimed).length;
      return `<div class="nb-box"><div class="nb-h">${t('nb_title')} <b>${n}/${nb.length}</b></div><ul>${nb.map(s => `<li class="${s.claimed ? 'ok' : ''}"><span class="qb-c">${s.claimed ? '✔' : '☐'}</span><span class="qb-l">${esc(t('nb_' + s.id))} <i class="qb-xp">+${s.xp} XP</i></span>${s.claimed ? '' : `<button class="qb-go" data-nb="${s.id}">${t('nb_go')}</button>`}</li>`).join('')}</ul></div>`;
    },
    inject(el) { if (!el) return; el.querySelector('.nb-box')?.remove(); const x = Newbie.html(); if (x) el.insertAdjacentHTML('afterbegin', x); }
  };
  window.Newbie = Newbie;
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-nb]'); if (!b) return; ev.stopPropagation(); SFX.play('select'); const go = STEP_GO[b.dataset.nb]; go && go(); }, true);
  // 做完動作後重新檢查（伺服器那邊的紀錄要一點時間）
  let nbT = null;
  const nbRecheck = () => { clearTimeout(nbT); nbT = setTimeout(async () => { if (!logged() || !nb || Newbie.allClaimed()) return; await Newbie.load(); window.Hub && Hub.reload && Hub.reload(); }, 2500); };
  window.addEventListener('di:act', nbRecheck);
  window.addEventListener('hashchange', nbRecheck);
  ['addFavorite', 'sendMessage', 'respondFriend', 'claimQuest', 'saveProfile'].forEach(k => { const f = Backend[k]; if (typeof f === 'function' && !f._nb) { Backend[k] = async function (...a) { const r = await f.apply(this, a); nbRecheck(); return r; }; Backend[k]._nb = 1; } });

  /* =========================================================
   * 全站搜尋
   * ========================================================= */
  async function runSearch(q, out) {
    const k = q.trim().toLowerCase();
    if (k.length < 2) { out.innerHTML = `<p class="note">${t('sr_hint')}</p>`; return; }
    out.innerHTML = '<p class="note">…</p>';
    const has = (...xs) => xs.filter(Boolean).join(' ').toLowerCase().includes(k);
    const evs = Store.all().filter(e => has(e.name, e.organizer, e.venue, e.address, (e.styles || []).join(' '), nm(A.byCode[e.country]), nm(A.cityOf(e.country, e.city)), (e.teams || []).join(' '), (e.judges || []).join(' ')))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    const safe = p => p.catch(() => []);
    const [studios, players, posts, crews, parties] = await Promise.all([
      Backend.enabled ? safe(Daily.loadStudios()) : [], Backend.enabled ? safe(Backend.searchPlayers(k)) : [], Backend.enabled ? safe(Backend.forumPosts()) : [],
      Backend.enabled ? safe(Backend.crews()) : [], Backend.enabled ? safe(Backend.parties()) : []
    ]);
    const S = (studios || []).filter(s => s.status === 'approved' && has(s.name, s.address, s.intro, (s.styles || []).join(' '))).slice(0, 6);
    const F = (posts || []).filter(p => p.status === 'approved' && has(p.title, p.body)).slice(0, 6);
    const C = (crews || []).filter(c => c.status === 'approved' && has(c.name, c.intro, c.ig)).slice(0, 6);
    const P = (parties || []).filter(x => x.public && has(x.name, x.intro, x.place)).slice(0, 6);
    const sec = (title, rows) => rows.length ? `<div class="sr-sec"><h4>${title} <small>${rows.length}</small></h4>${rows.join('')}</div>` : '';
    const row = (href, main, sub, extra = '') => `<a class="sr-row" href="${href}" ${extra}><b>${esc(main)}</b><small>${esc(sub || '')}</small></a>`;
    const html = [
      sec(t('sr_events'), evs.map(e => row('#/e/' + encodeURIComponent(e.id), e.name, `${e.date.replace(/-/g, '/')}・${nm(A.cityOf(e.country, e.city))}`))),
      sec(t('sr_studios'), S.map(s => row('#/studios/' + s.id, s.name, (s.styles || []).join(' / ')))),
      sec(t('sr_players'), (players || []).slice(0, 8).map(p => `<button class="sr-row sr-player" data-h="${esc(p.handle)}"><b>${esc(p.name)}</b><small>@${esc(p.handle)}${p.style ? '・' + esc(p.style) : ''}</small></button>`)),
      sec(t('sr_forum'), F.map(p => row('#/forum/' + p.id, p.title, (p.body || '').slice(0, 40)))),
      sec(t('sr_crews'), C.map(c => row('#/crew/' + c.id, c.name, c.ig ? '@' + c.ig : ''))),
      sec(t('sr_parties'), P.map(x => row('#/party/' + x.id, x.name, x.place || '')))
    ].join('');
    out.innerHTML = html || `<p class="note">${t('sr_none')}</p>`;
  }
  function openSearch(initial = '') {
    SFX.play('open');
    const body = h(`<div class="sr"><input class="input sr-q" type="search" placeholder="${esc(t('td_search_ph'))}" value="${esc(initial)}" autocomplete="off"><div class="sr-out"></div></div>`);
    const m = modal({ title: t('sr_title'), color: 'blue', body, wide: true });
    const q = body.querySelector('.sr-q'), out = body.querySelector('.sr-out');
    let tm = null;
    q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => runSearch(q.value, out), 300); };
    out.onclick = ev => {
      const p = ev.target.closest('.sr-player'); if (p) { m.close(); setTimeout(() => Friends.openCard(p.dataset.h), 230); return; }
      if (ev.target.closest('a.sr-row')) { SFX.play('confirm'); m.close(); }
    };
    runSearch(initial, out);
    setTimeout(() => q.focus(), 80);
  }
  // 電腦版：按「/」開搜尋
  document.addEventListener('keydown', ev => {
    if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.target.closest('input, textarea, select, [contenteditable]')) return;
    ev.preventDefault(); openSearch();
  });

  /* =========================================================
   * 「今天」首頁  #/today
   * ========================================================= */
  A.crumbs.today = () => '🏠 ' + t('nav_today');
  A.views.today = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner td"></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    const me = Player.me, d = new Date(), hr = d.getHours();
    const g = t(hr < 11 ? 'td_morning' : hr < 18 ? 'td_noon' : 'td_evening');
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}（${(t('week') || [])[d.getDay()] || ''}）`;
    const today = A.todayStr(), in7 = A.ymd(new Date(Date.now() + 7 * 864e5));
    const S = A.socialState || {};
    const week = Store.all().filter(e => (e.endDate || e.date) >= today && e.date <= in7).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    const saved = Store.all().filter(e => S.favs && S.favs.has && S.favs.has(e.id) && (e.endDate || e.date) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const evRow = e => `<a class="sr-row" href="#/e/${encodeURIComponent(e.id)}"><b>${esc(e.name)}</b><small>${esc(e.date.slice(5).replace('-', '/'))}・${esc(nm(A.cityOf(e.country, e.city)))}</small></a>`;
    const box = (title, html, color, more) => `<div class="win">${UI.winHTML(title, color, false)}<div class="win-body">${html}${more ? `<a class="td-more" href="${more}">${t('td_more')}</a>` : ''}</div></div>`;
    inner.innerHTML = `
      <div class="win td-head">${UI.winHTML('🏠 ' + t('nav_today'), 'pink', false)}<div class="win-body">
        <h2 class="td-hi">${esc(t('td_hi', { g, n: me ? me.name : t('td_guest') }))}</h2><p class="td-date">${esc(t('td_date', { d: dateStr }))}</p>
        <button class="input td-search">🔍 ${esc(t('td_search_ph'))}</button>
        <div class="btn-row">${logged() ? `<button class="btn yellow td-bell">${t('td_bell')} <span class="bell-badge td-badge" hidden></span></button><button class="btn green td-luck">${t('td_luck')}</button>` : ''}<button class="btn blue td-pick">${t('td_pick')}</button></div>
        ${logged() ? '' : `<p class="note">${t('td_login')}</p><button class="btn pink td-login">🔑 ${t('login')}</button>`}
      </div></div>
      <div class="td-quests"></div>
      ${box(t('td_week'), week.map(evRow).join('') || `<p class="note">${t('td_week_none')}</p>`, 'teal', '#/events')}
      ${logged() ? box(t('td_saved'), saved.map(evRow).join('') || `<p class="note">${t('td_saved_none')}</p>`, 'yellow') : ''}
      <div class="td-party"></div><div class="td-friends"></div>`;
    const on = (sel, fn) => { const b = inner.querySelector(sel); if (b) b.onclick = fn; };
    on('.td-search', () => openSearch());
    on('.td-bell', () => Notify.open());
    on('.td-luck', () => Daily.openLuck());
    on('.td-pick', () => Daily.openPick());
    on('.td-login', () => Player.prompt());
    paintBadge();
    // 任務（新手任務 + 每日任務）
    const qs = inner.querySelector('.td-quests');
    const drawQ = () => { qs.innerHTML = `<div class="win">${UI.winHTML('📜 ' + t('td_quests'), 'orange', false)}<div class="win-body">${Newbie.html()}${window.Hub && Hub.boardHTML ? Hub.boardHTML() : ''}</div></div>`; };
    drawQ();
    qs.onclick = ev => { const b = ev.target.closest('[data-qgo]'); if (b) { SFX.play('select'); Hub.goQuest(b.dataset.qgo); } };
    // 附近招募中的隊伍、好友在線（要等資料）
    if (logged()) {
      Party.nearby().then(list => {
        const el = inner.querySelector('.td-party'); if (!el.isConnected) return;
        el.innerHTML = box(t('td_party'), list.slice(0, 4).map(x => `<a class="sr-row" href="#/party/${x.id}"><b>${esc(x.name)}</b><small>${esc(Party.whenStr(x.meet_at))}・${esc(x.place || '')}</small></a>`).join('') || `<p class="note">${t('td_party_none')}</p>`, 'red', '#/party');
      }).catch(() => {});
      try {
        const fr = (Friends.friends ? Friends.friends() : []).filter(p => Friends.online && Friends.online.has(p.user_id));
        inner.querySelector('.td-friends').innerHTML = box(t('td_friends'), fr.length ? `<div class="td-fr">${fr.slice(0, 12).map(p => `<button class="btn sm td-f" data-h="${esc(p.handle)}">🟢 ${esc(p.name)}</button>`).join('')}</div>` : `<p class="note">${t('td_friends_none')}</p>`, 'green');
        inner.querySelector('.td-friends').onclick = ev => { const b = ev.target.closest('[data-h]'); if (b) Friends.openCard(b.dataset.h); };
      } catch (e) {}
    }
  };

  /* =========================================================
   * 上方按鈕（電腦版）：🔍 搜尋、🔔 通知
   * ========================================================= */
  function mountHud() {
    const btns = document.querySelector('#hud .hud-btns'); if (!btns || btns.querySelector('.hud-search')) return;
    const s = h(`<button class="btn icon hud-search" aria-label="${esc(t('hub_search'))}" title="${esc(t('hub_search'))} ( / )">🔍</button>`);
    const b = h(`<button class="btn icon hud-bell" aria-label="${esc(t('hub_bell'))}" title="${esc(t('hub_bell'))}">🔔<span class="bell-badge" hidden></span></button>`);
    s.onclick = () => openSearch(); b.onclick = () => Notify.open();
    const pl = btns.querySelector('.hud-player'); btns.insertBefore(s, pl); btns.insertBefore(b, pl);
    paintBadge();
  }

  /* =========================================================
   * 手機：左右滑切換分頁（今天 ↔ 地圖 ↔ 活動 ↔ 我的）
   * 地圖本身可以拖曳，所以在地圖上不會觸發；輸入框、可以橫向捲動的地方也不會
   * ========================================================= */
  const PAGES = ['#/today', '#/', '#/events', '#/me'];
  const pageIdx = () => { const r = location.hash.replace(/^#\/?/, '').split('/')[0]; return r === 'today' ? 0 : r === '' || r === 'c' ? 1 : r === 'events' ? 2 : r === 'me' ? 3 : -1; };
  let sx = 0, sy = 0, st = 0, ok = false;
  const blocked = el => !!el.closest('input, textarea, select, canvas, .world-vp, .leaflet-container, .modal-back, .modal, #chat, .chips, .seg, .crumbs, .qbox, .mnav') ||
    (() => { for (let n = el; n && n !== document.body; n = n.parentElement) { if (n.scrollWidth > n.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true; } return false; })();
  document.addEventListener('touchstart', e => {
    ok = e.touches.length === 1 && matchMedia('(pointer: coarse)').matches && pageIdx() >= 0 && !document.querySelector('#chat.open') && !blocked(e.target);
    if (!ok) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!ok) return; ok = false;
    const tch = e.changedTouches[0], dx = tch.clientX - sx, dy = tch.clientY - sy;
    if (Date.now() - st > 700 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const i = pageIdx(), j = i + (dx < 0 ? 1 : -1);
    if (j < 0 || j >= PAGES.length) return;
    if (PAGES[j] === '#/me' && !logged()) return Player.prompt();
    SFX.play('select'); A.nav(PAGES[j]);
  }, { passive: true });

  /* ---------- 啟動 ---------- */
  const boot = async () => { mountHud(); loadItems(); await Promise.all([Newbie.load(), Notify.refresh()]); window.Hub && Hub.reload && Hub.reload(); };
  if (Backend.enabled) Backend.ready.then(() => setTimeout(boot, 1500)); else setTimeout(mountHud, 500);
  Player.onChange(() => setTimeout(boot, 800));
  setInterval(() => { if (logged() && document.visibilityState === 'visible') Notify.refresh(); }, 90000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && logged()) Notify.refresh(); });

  window.Search = { open: openSearch };
})();
