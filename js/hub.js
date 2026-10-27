/* =========================================================
 * 總選單（像素手機）＋ 每日任務框
 * ========================================================= */
window.Hub = (() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;

  I18N.extend({
    zh: {
      hub_sound: '音效開關', 
      q_streak: '連續登入 {n} 天', q_all_bonus: '三個任務全清！額外 +{n} XP', 
      hub_menu: '功能選單', hub_title: '📱 功能選單', hub_sec_ev: '找活動', hub_sec_me: '我的冒險', hub_sec_so: '交朋友', hub_sec_play: '玩一下', hub_sec_etc: '其他',
      hub_events: '活動總覽', hub_near: '附近活動', hub_add: '投稿活動', hub_me: '我的頁面', hub_me_d: '護照・簽到・收藏', hub_char: '編輯角色', hub_card: '我的名片',
      hub_friends: '好友', hub_find: '找好友', hub_chat: '聊天室', hub_forum: '舞者論壇', hub_battle: '人氣 Battle', hub_cypher: 'Cypher 舞池', hub_rhythm: '節奏挑戰',
      snd_now_on: '音效已開啟 ♪', snd_now_off: '音效已關閉', hub_games: '小遊戲', hub_walk: '地圖散步', hub_quests: '每日任務', hub_tut: '新手教學', hub_lang: '切換語言', hub_admin: '管理後台',
      hub_warn: [
        { who: 'kailyn', mood: 'surprised', text: '誒誒誒？！你確定要直接打開功能總表嗎？' },
        { who: 'choco', mood: 'think', text: '建議你先慢慢探索這座島，最後再來翻這本攻略本喔。' },
        { who: 'kailyn', mood: 'laugh', text: '很多隱藏要素自己發掘會更有趣！' },
        { who: 'choco', mood: 'cool', text: '……所以，冒險者，你還是決定要打開功能選單嗎？' }
      ],
      hub_yes: '是，我是懶惰鬼，直接給我攻略！', hub_no: '否，我還是自己先去探險一下好了',
      hub_yes_r: { who: 'kailyn', mood: 'laugh', text: '好啦好啦～攻略本給你！以後隨時都能打開喔 ✦' },
      hub_no_r: { who: 'choco', mood: 'thumbs', text: '這才是真正的冒險者！想看的時候再來找我吧 😎' },
      q_title: '每日任務', q_done_all: '今日任務解完了！明天也要記得來打卡喔 😊', q_done: '任務完成！', q_go: '前往', q_login: '登入角色後會解鎖更多任務',
      q_done_k: '今天的任務全部完成！你真的很棒 ✦', q_done_c: '明天也要記得來打卡喔，我等你 😎',
      q_view: '瀏覽 {n} 個街舞活動', q_country: '到 {n} 個國家逛逛', q_friend: '新增 {n} 位好友', q_card: '看 {n} 張玩家名片', q_emote: '在聊天室出招一次！',
      q_chat: '在聊天室說 {n} 句話', q_vote: '為本週人氣 Battle 投票一次', q_speak: '勇敢的發表你的想法一次！', q_comment: '在活動留言板留言一次', q_fav: '收藏 {n} 個活動',
      q_share: '分享一個活動給朋友', q_rhythm: '玩一場節奏挑戰', q_npc: '打敗一位路過的 NPC 舞者', q_spin: '完成每日簽到抽獎', q_cypher: '在 Cypher 舞池秀一招'
    },
    en: {
      hub_sound: 'Sound on/off', 
      q_streak: '{n}-day login streak', q_all_bonus: 'All 3 quests cleared! Bonus +{n} XP', 
      hub_menu: 'Menu', hub_title: '📱 Menu', hub_sec_ev: 'Events', hub_sec_me: 'My adventure', hub_sec_so: 'Social', hub_sec_play: 'Play', hub_sec_etc: 'More',
      hub_events: 'All events', hub_near: 'Nearby', hub_add: 'Submit event', hub_me: 'My page', hub_me_d: 'Passport · check-in · saved', hub_char: 'Edit character', hub_card: 'My card',
      hub_friends: 'Friends', hub_find: 'Find friends', hub_chat: 'Chat', hub_forum: 'Forum', hub_battle: 'Battle vote', hub_cypher: 'Cypher floor', hub_rhythm: 'Rhythm',
      snd_now_on: 'Sound on ♪', snd_now_off: 'Sound off', hub_games: 'Mini games', hub_walk: 'Map walk', hub_quests: 'Daily quests', hub_tut: 'Tutorial', hub_lang: 'Language', hub_admin: 'Admin',
      hub_warn: [
        { who: 'kailyn', mood: 'surprised', text: 'Whoa whoa whoa?! You want to open the full menu right away?' },
        { who: 'choco', mood: 'think', text: 'Maybe explore the island first, and save this strategy guide for last.' },
        { who: 'kailyn', mood: 'laugh', text: "There's lots of hidden stuff — it's more fun to find it yourself!" },
        { who: 'choco', mood: 'cool', text: '…So, adventurer. Do you still want to open the menu?' }
      ],
      hub_yes: "Yes. I'm lazy — give me the guide!", hub_no: "No, I'll go explore a bit first",
      hub_yes_r: { who: 'kailyn', mood: 'laugh', text: "Fine, fine~ here's the guide! You can open it anytime ✦" },
      hub_no_r: { who: 'choco', mood: 'thumbs', text: "That's a real adventurer! Come back whenever you want 😎" },
      q_title: 'Daily quests', q_done_all: "All of today's quests are done! Come back tomorrow 😊", q_done: 'Quest complete!', q_go: 'Go', q_login: 'Log in to unlock more quests',
      q_done_k: "You finished every quest today! You're amazing ✦", q_done_c: "Don't forget to check in tomorrow — I'll be waiting 😎",
      q_view: 'Browse {n} dance events', q_country: 'Visit {n} countries', q_friend: 'Add {n} friends', q_card: 'View {n} player cards', q_emote: 'Bust a move in the chat!',
      q_chat: 'Send {n} chat messages', q_vote: "Vote in this week's battle", q_speak: 'Share your thoughts once!', q_comment: 'Comment on an event', q_fav: 'Save {n} events',
      q_share: 'Share an event with a friend', q_rhythm: 'Play a round of Rhythm', q_npc: 'Beat a wandering NPC dancer', q_spin: 'Spin the daily check-in', q_cypher: 'Show a move on the cypher floor'
    },
    ja: {
      hub_sound: '効果音', 
      q_streak: '{n} 日連続ログイン', q_all_bonus: '3 つ全部クリア！ボーナス +{n} XP', 
      hub_menu: 'メニュー', hub_title: '📱 メニュー', hub_sec_ev: 'イベント', hub_sec_me: 'わたしの冒険', hub_sec_so: 'ソーシャル', hub_sec_play: 'あそぶ', hub_sec_etc: 'その他',
      hub_events: 'イベント一覧', hub_near: '近くのイベント', hub_add: 'イベント投稿', hub_me: 'マイページ', hub_me_d: 'パスポート・チェックイン・お気に入り', hub_char: 'キャラ編集', hub_card: '自分の名刺',
      hub_friends: 'フレンド', hub_find: 'フレンド検索', hub_chat: 'チャット', hub_forum: '掲示板', hub_battle: '人気バトル', hub_cypher: 'サイファー', hub_rhythm: 'リズム',
      snd_now_on: 'サウンド ON ♪', snd_now_off: 'サウンド OFF', hub_games: 'ミニゲーム', hub_walk: 'マップ散歩', hub_quests: 'デイリークエスト', hub_tut: 'チュートリアル', hub_lang: '言語', hub_admin: '管理画面',
      hub_warn: [
        { who: 'kailyn', mood: 'surprised', text: 'えええっ？！いきなり機能一覧を開いちゃうの？' },
        { who: 'choco', mood: 'think', text: 'まずは島をゆっくり探検して、この攻略本は最後に読むのがおすすめだよ。' },
        { who: 'kailyn', mood: 'laugh', text: '隠し要素がいっぱいあるから、自分で見つけたほうが楽しいよ！' },
        { who: 'choco', mood: 'cool', text: '……それで、冒険者。それでもメニューを開く？' }
      ],
      hub_yes: 'はい、めんどくさがりなので攻略本ください！', hub_no: 'いいえ、まずは自分で冒険してみる',
      hub_yes_r: { who: 'kailyn', mood: 'laugh', text: 'しょうがないなぁ～はい、攻略本！いつでも開けるよ ✦' },
      hub_no_r: { who: 'choco', mood: 'thumbs', text: 'それでこそ冒険者！見たくなったらまた来てね 😎' },
      q_title: 'デイリークエスト', q_done_all: '今日のクエストは全部クリア！明日もチェックインしに来てね 😊', q_done: 'クエスト達成！', q_go: '行く', q_login: 'ログインするとクエストが増えるよ',
      q_done_k: '今日のクエスト全部クリア！すごいね ✦', q_done_c: '明日もチェックインしに来てね、待ってるよ 😎',
      q_view: 'ダンスイベントを {n} 件見る', q_country: '{n} か国を見て回る', q_friend: 'フレンドを {n} 人増やす', q_card: 'プレイヤー名刺を {n} 枚見る', q_emote: 'チャットで技を出す！',
      q_chat: 'チャットで {n} 回話す', q_vote: '今週の人気バトルに投票する', q_speak: '勇気を出して意見を書いてみよう！', q_comment: 'イベントにコメントする', q_fav: 'イベントを {n} 件お気に入りにする',
      q_share: 'イベントを友だちにシェアする', q_rhythm: 'リズムチャレンジを 1 回遊ぶ', q_npc: '通りすがりの NPC ダンサーに勝つ', q_spin: 'デイリーチェックインを回す', q_cypher: 'サイファーで技を見せる'
    },
    ko: {
      hub_sound: '효과음', 
      q_streak: '{n}일 연속 접속', q_all_bonus: '퀘스트 3개 올클! 보너스 +{n} XP', 
      hub_menu: '메뉴', hub_title: '📱 메뉴', hub_sec_ev: '이벤트', hub_sec_me: '나의 모험', hub_sec_so: '소셜', hub_sec_play: '놀기', hub_sec_etc: '기타',
      hub_events: '이벤트 전체', hub_near: '내 주변', hub_add: '이벤트 제보', hub_me: '마이 페이지', hub_me_d: '여권·출석·즐겨찾기', hub_char: '캐릭터 편집', hub_card: '내 명함',
      hub_friends: '친구', hub_find: '친구 찾기', hub_chat: '채팅', hub_forum: '게시판', hub_battle: '인기 배틀', hub_cypher: '사이퍼', hub_rhythm: '리듬',
      snd_now_on: '효과음 켜짐 ♪', snd_now_off: '효과음 꺼짐', hub_games: '미니게임', hub_walk: '지도 산책', hub_quests: '일일 퀘스트', hub_tut: '튜토리얼', hub_lang: '언어', hub_admin: '관리자',
      hub_warn: [
        { who: 'kailyn', mood: 'surprised', text: '어어어?! 바로 기능 전체 목록을 열겠다고?' },
        { who: 'choco', mood: 'think', text: '먼저 섬을 천천히 탐험하고, 이 공략집은 마지막에 보는 걸 추천해.' },
        { who: 'kailyn', mood: 'laugh', text: '숨겨진 요소가 많아서 직접 찾는 게 더 재밌어!' },
        { who: 'choco', mood: 'cool', text: '……그래서, 모험가. 그래도 메뉴를 열 거야?' }
      ],
      hub_yes: '응, 나 귀차니스트야. 공략집 줘!', hub_no: '아니, 먼저 직접 탐험해 볼래',
      hub_yes_r: { who: 'kailyn', mood: 'laugh', text: '알았어 알았어~ 공략집 여기! 언제든 열 수 있어 ✦' },
      hub_no_r: { who: 'choco', mood: 'thumbs', text: '그게 진짜 모험가지! 보고 싶을 때 다시 와 😎' },
      q_title: '일일 퀘스트', q_done_all: '오늘 퀘스트 다 깼어! 내일도 출석하러 와 😊', q_done: '퀘스트 완료!', q_go: '가기', q_login: '로그인하면 퀘스트가 더 열려요',
      q_done_k: '오늘 퀘스트 전부 완료! 정말 대단해 ✦', q_done_c: '내일도 출석하러 와, 기다릴게 😎',
      q_view: '댄스 이벤트 {n}개 보기', q_country: '나라 {n}곳 둘러보기', q_friend: '친구 {n}명 추가하기', q_card: '플레이어 명함 {n}장 보기', q_emote: '채팅에서 기술 한 번 쓰기!',
      q_chat: '채팅에서 {n}번 말하기', q_vote: '이번 주 인기 배틀에 투표하기', q_speak: '용기 내서 생각을 한 번 말해 보기!', q_comment: '이벤트에 댓글 달기', q_fav: '이벤트 {n}개 즐겨찾기',
      q_share: '친구에게 이벤트 공유하기', q_rhythm: '리듬 챌린지 한 판 하기', q_npc: '지나가는 NPC 댄서 이기기', q_spin: '출석 룰렛 돌리기', q_cypher: '사이퍼 플로어에서 기술 보여주기'
    }
  });

  /* =========================================================
   * 每日任務
   * ========================================================= */
  const nav = h => () => A.nav(h);
  const POOL = [
    { id: 'view', n: 3, go: nav('#/events') },
    { id: 'country', n: 3, go: nav('#/') },
    { id: 'friend', n: 2, login: 1, go: () => Friends.openPanel('find') },
    { id: 'card', n: 3, login: 1, go: () => Friends.openPanel('find') },
    { id: 'emote', n: 1, login: 1, go: () => Chat.toggle(true) },
    { id: 'chat', n: 3, login: 1, go: () => Chat.toggle(true) },
    { id: 'vote', n: 1, login: 1, battle: 1, go: nav('#/battle') },
    { id: 'speak', n: 1, login: 1, go: nav('#/forum') },
    { id: 'comment', n: 1, login: 1, go: nav('#/events') },
    { id: 'fav', n: 2, login: 1, go: nav('#/events') },
    { id: 'share', n: 1, go: nav('#/events') },
    { id: 'rhythm', n: 1, go: () => Games.open('rhythm') },
    { id: 'npc', n: 1, go: nav('#/') },
    { id: 'spin', n: 1, login: 1, go: nav('#/me') },
    { id: 'cypher', n: 1, login: 1, go: nav('#/cypher') }
  ];
  const label = q => t('q_' + q.id, { n: q.n });
  const who = () => (Player.me ? Player.me.id : 'guest');
  const key = () => `danceIsland.quest.${who()}.${A.todayStr()}`;
  // 同一個人同一天抽到的任務固定（用帳號 + 日期當種子）
  const seeded = str => { let x = 2166136261; for (const c of str) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)) >>> 0) / 4294967296; };
  let state = null, liveBattle = null;
  async function hasLiveBattle() {
    if (liveBattle !== null) return liveBattle;
    try { const now = new Date().toISOString(); liveBattle = (await Backend.listBattles()).some(b => b.ends_at > now); } catch (x) { liveBattle = false; }
    return liveBattle;
  }
  // 登入後：任務、進度、經驗值都由伺服器決定（不能作弊）；沒登入：只在這台裝置記進度
  let server = false, refreshT = null, claiming = false;
  const CLIENT_KINDS = ['view', 'country', 'card', 'share', 'cypher'];
  function applyServer(r) {
    const prog = {}, claimed = {};
    r.quests.forEach(q => { prog[q.id] = q.prog; claimed[q.id] = q.claimed; });
    state = { ids: r.quests.map(q => q.id), prog, claimed, allDone: r.all, streak: r.streak, mult: +r.mult, server: true, guest: false };
  }
  async function load() {
    if (logged()) {
      try { const r = await Backend.myQuests(); if (r && r.quests) { server = true; applyServer(r); draw(); autoClaim(); return; } } catch (x) {}
    }
    server = false;
    try { state = JSON.parse(localStorage.getItem(key()) || 'null'); } catch (x) { state = null; }
    if (!state || !state.ids || state.server || !state.ids.every(id => POOL.some(q => q.id === id))) {
      const lg = logged(), lb = lg && await hasLiveBattle();
      const ok = POOL.filter(q => (!q.login || lg) && (!q.battle || lb));
      const rnd = seeded(who() + A.todayStr()), pick = [];
      const bag = ok.slice();
      while (pick.length < 3 && bag.length) pick.push(bag.splice(Math.floor(rnd() * bag.length), 1)[0].id);
      state = { ids: pick, prog: {}, allDone: false, guest: !lg };
      save();
    }
    draw();
  }
  // 完成的任務自動領經驗值
  async function autoClaim() {
    if (!server || claiming || !state) return;
    const todo = state.ids.filter(id => (state.prog[id] || 0) >= POOL.find(q => q.id === id).n && !state.claimed[id]);
    if (!todo.length) return;
    claiming = true;
    let bonus = 0;
    for (const id of todo) {
      try {
        const r = await Backend.claimQuest(id);
        SFX.play('coin'); toast(`${t('q_done')} ${label(POOL.find(q => q.id === id))}  +${r.xp} XP`, '📜');
        bonus += r.bonus || 0;
      } catch (x) {}
    }
    claiming = false;
    try { applyServer(await Backend.myQuests()); } catch (x) {}
    draw();
    if (bonus) {
      setTimeout(() => { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 30); toast(`🎉 ${t('q_all_bonus', { n: bonus })}`, '✨');
        npc.say([{ who: 'kailyn', mood: 'celebrate', text: t('q_done_k') }, { who: 'choco', mood: 'peace', text: t('q_done_c') }]); }, 700);
    }
    window.XP && XP.changed();
  }
  const refresh = () => { clearTimeout(refreshT); refreshT = setTimeout(async () => { if (!server) return; try { applyServer(await Backend.myQuests()); draw(); autoClaim(); } catch (x) {} }, 1500); };
  const save = () => { try { localStorage.setItem(key(), JSON.stringify(state)); } catch (x) {} };
  const done = id => { const q = POOL.find(x => x.id === id); return (state.prog[id] || 0) >= q.n; };
  const seenCountry = new Set();
  function act(k, n = 1, ref = null) {
    if (server) {
      if (CLIENT_KINDS.includes(k)) Backend.logAct(k, ref || k).then(refresh, () => {});
      else refresh();
      return;
    }
    if (!state || !state.ids.includes(k) || done(k)) return;
    const q = POOL.find(x => x.id === k);
    state.prog[k] = Math.min(q.n, (state.prog[k] || 0) + n); save();
    if (done(k)) {
      SFX.play('coin'); toast(`${t('q_done')} ${label(q)}`, '📜');
      if (state.ids.every(done) && !state.allDone) {
        state.allDone = true; save();
        setTimeout(() => { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 30); npc.say([{ who: 'kailyn', mood: 'celebrate', text: t('q_done_k') }, { who: 'choco', mood: 'peace', text: t('q_done_c') }]); }, 900);
      }
    }
    draw();
  }
  window.addEventListener('di:act', e => act(e.detail.k, e.detail.n, e.detail.ref));
  // 逛國家：每天不同的國家才算
  window.addEventListener('hashchange', () => { const m = /^#\/c\/([A-Z]{2})/.exec(location.hash); if (m && !seenCountry.has(m[1])) { seenCountry.add(m[1]); act('country', 1, m[1]); } });
  // 把會改變進度的動作包起來（成功才算）
  const wrap = (obj, name, k, test) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name]._q) return;
    const f = obj[name];
    obj[name] = async function (...a) { const r = await f.apply(this, a); try { const kk = typeof k === 'function' ? k(...a) : k; if (kk && (!test || test(...a))) [].concat(kk).forEach(x => act(x)); } catch (x) {} return r; };
    obj[name]._q = 1;
  };
  wrap(Backend, 'vote', 'vote');
  wrap(Backend, 'sendFriend', 'friend');
  wrap(Backend, 'respondFriend', 'friend', (id, st) => st === 'accepted');
  wrap(Backend, 'addPost', 'speak');
  wrap(Backend, 'addReply', 'speak');
  wrap(Backend, 'addFavorite', 'fav');
  wrap(Backend, 'dailySpin', 'spin');
  wrap(Social, 'comment', ['comment', 'speak']);
  wrap(Social, 'send', (ch, text) => (window.Emotes && Emotes.parse(text) ? 'emote' : 'chat'));

  /* 任務框（可以展開 / 收起） */
  const OPEN = 'danceIsland.questOpen';
  let box = null;
  function draw() {
    if (!state) return;
    if (!box) {
      box = h(`<aside class="qbox" aria-label="${esc(t('q_title'))}"><button class="qb-head"><span class="qb-t"></span><span class="qb-n"></span><span class="qb-arrow">▾</span></button><div class="qb-body"></div></aside>`);
      document.body.appendChild(box);
      box.querySelector('.qb-head').onclick = () => { const o = !box.classList.contains('open'); box.classList.toggle('open', o); try { localStorage.setItem(OPEN, o ? '1' : '0'); } catch (x) {} SFX.play('select'); };
      const pref = () => { try { return localStorage.getItem(OPEN) !== '0'; } catch (x) { return true; } };
      // 在地圖上照使用者的設定；進到其他頁面先收起來，避免蓋住內容
      const onMap = () => { const r = location.hash.replace(/^#\/?/, ''); return r === '' || /^c\/[A-Z]{2}$/.test(r); };
      box.classList.toggle('open', pref() && onMap());
      window.addEventListener('hashchange', () => box.classList.toggle('open', pref() && onMap()));
      box.querySelector('.qb-body').onclick = e => { const b = e.target.closest('[data-go]'); if (b) { SFX.play('select'); const q = POOL.find(x => x.id === b.dataset.go); q && q.go(); } else if (e.target.closest('.qb-login')) Player.prompt(); };
    }
    const n = state.ids.filter(done).length, all = n === state.ids.length;
    box.classList.toggle('all', all);
    queueMicrotask(() => window.Newbie && Newbie.inject(box.querySelector('.qb-body')));
    box.querySelector('.qb-t').textContent = '📜 ' + t('q_title');
    box.querySelector('.qb-n').textContent = `${n}/${state.ids.length}`;
    box.querySelector('.qb-body').innerHTML = `${state.server ? `<div class="qb-streak">🔥 ${t('q_streak', { n: state.streak || 0 })}${state.mult > 1 ? ` <b>×${state.mult}</b>` : ''}</div>` : ''}<ul>${state.ids.map(id => { const q = POOL.find(x => x.id === id), p = state.prog[id] || 0, d = p >= q.n;
        return `<li class="${d ? 'ok' : ''}"><span class="qb-c">${d ? '✔' : '☐'}</span><span class="qb-l">${esc(label(q))} <b>(${p}/${q.n})</b>${state.server ? ` <i class="qb-xp">+${Math.round(15 * (state.mult || 1))} XP</i>` : ''}</span>${d ? '' : `<button class="qb-go" data-go="${q.id}">${t('q_go')} ▸</button>`}</li>`; }).join('')}</ul>
      ${all ? `<p class="qb-done">🎉 ${t('q_done_all')}</p>` : ''}${state.guest && Backend.enabled ? `<button class="qb-login">🔑 ${t('q_login')}</button>` : ''}`;
  }

  /* =========================================================
   * 像素手機：總選單
   * ========================================================= */
  const OK_KEY = () => 'danceIsland.menuOK.' + who();
  const seenWarn = () => { try { if (localStorage.getItem(OK_KEY())) return true; } catch (x) {} return !!(Backend.profile && Backend.profile.card && Backend.profile.card.menuOK); };
  async function markWarn() {
    try { localStorage.setItem(OK_KEY(), 1); } catch (x) {}
    if (logged()) { try { await Backend.saveProfile({ card: { ...(Backend.profile.card || {}), menuOK: true } }); } catch (x) {} }
  }
  async function openMenu() {
    SFX.play('select');
    if (!seenWarn()) {
      const v = await npc.ask(t('hub_warn'), [{ label: t('hub_yes'), value: 'yes' }, { label: t('hub_no'), value: 'no' }]);
      if (v !== 'yes') { npc.say([t('hub_no_r')]); return; }
      await markWarn();
      return npc.say([t('hub_yes_r')], showMenu);
    }
    showMenu();
  }
  const click = sel => () => { const b = document.querySelector(sel); b && b.click(); };
  function showMenu() {
    const S = [
      ['hub_sec_ev', [['🏠', 'hub_today', nav('#/today')], ['🔍', 'hub_search', () => Search.open()], ['🔔', 'hub_bell', () => Notify.open()], ['📋', 'hub_events', nav('#/events')], ['📍', 'hub_near', nav('#/events/near')], ['➕', 'hub_add', click('.hud-add')], ['🏫', 'hub_studio', nav('#/studios')], ['🗺', 'hub_spots', nav('#/spots')], ['🏆', 'hub_idance', nav('#/idance')], ['📊', 'hub_bracket', nav('#/bracket')]]],
      ['hub_sec_me', [['🛂', 'hub_me', () => (logged() ? A.nav('#/me') : Player.prompt())], ['🧢', 'hub_char', () => Player.openMenu()], ['🪪', 'hub_card', () => Friends.openCardEditor()], ['📜', 'hub_quests', () => { box && box.classList.add('open'); }], ['🍀', 'hub_luck', () => (logged() ? Daily.openLuck() : Player.prompt())], ['📦', 'hub_shoes', () => Collect.openShelf()], ['🎖', 'hub_titles', nav('#/titles')]]],
      ['hub_sec_so', [['👥', 'hub_friends', () => Friends.openPanel()], ['🔍', 'hub_find', () => Friends.openPanel('find')], ['💬', 'hub_chat', () => Chat.toggle(true)], ['🗂', 'hub_forum', nav('#/forum')], ['👯', 'hub_crew', nav('#/crew')], ['🚩', 'hub_party', nav('#/party')], ['🛍', 'hub_market', nav('#/market')], ['🥋', 'hub_mentor', nav('#/mentor')]]],
      ['hub_sec_play', [['🎪', 'hub_fest', nav('#/fest')], ['🚩', 'hub_battle', nav('#/battle')], ['🕺', 'hub_cypher', nav('#/cypher')], ['🎵', 'hub_rhythm', () => Games.open('rhythm')], ['🃏', 'hub_games', () => Games.open()], ['🎬', 'hub_relay', nav('#/relay')], ['🚶', 'hub_walk', () => { A.nav('#/'); setTimeout(() => A.startWalk && A.startWalk(), 900); }]]],
      ['hub_sec_etc', [['📢', 'hub_notice', () => Notices.open()], ['📰', 'hub_daily', () => Daily.openPick()], ['🎨', 'hub_display', () => Settings.open()], ['❓', 'hub_tut', () => Tutorial.run()], ['🌐', 'hub_lang', click('.hud-lang')], ['🔊', 'hub_sound', () => { click('.hud-sound')(); UI.toast(t(SFX.on ? 'snd_now_on' : 'snd_now_off'), PXI.img(SFX.on ? 'menu/sound_on' : 'menu/sound_off', SFX.on ? '🔊' : '🔇')); }]].concat(Backend.isAdmin ? [['🛠', 'hub_admin', click('.hud-admin')]] : [])]
    ];
    const items = [];
    const body = h(`<div class="phone-ui"><div class="ph-bar"><span>BOOTO</span><span class="ph-clock"></span></div>
      ${S.map(([sec, list]) => `<div class="ph-sec">${t(sec)}</div><div class="ph-grid">${list.map(([ic, k, fn]) => { items.push(fn); return `<button class="ph-app" data-i="${items.length - 1}" data-k="${k}"><span class="ph-ic">${PXI.img('menu/' + ({ sound: 'sound_on' }[k.replace('hub_', '')] || k.replace('hub_', '')), ic)}</span><span>${t(k)}</span></button>`; }).join('')}</div>`).join('')}</div>`);
    const d = new Date(); body.querySelector('.ph-clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    window.Guest && Guest.decorateMenu(body);
    const m = modal({ title: t('hub_title'), color: 'blue', body });
    body.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; SFX.play('confirm'); m.close(); setTimeout(items[+b.dataset.i], 230); };
  }
  // 主畫面上方：舞者論壇、人氣 Battle（之前藏在小遊戲裡太難找）
  function mountHudButtons() {
    const ev = document.querySelector('.hud-events'); if (!ev || document.querySelector('.hud-forum')) return;
    const mk = (cls, color, ic, file, key, go) => {
      const b = h(`<button class="btn ${color} ${cls}"><span class="ic hud-ico">${PXI.img('menu/' + file, ic)}</span><span class="label"></span></button>`);
      b.onclick = () => { SFX.play('select'); A.nav(go); };
      const lab = () => { b.querySelector('.label').textContent = t(key); b.title = t(key); };
      lab(); I18N.onChange && I18N.onChange(lab);
      return b;
    };
    ev.after(mk('hud-forum', 'teal', '🗂', 'forum', 'hud_forum', '#/forum'), mk('hud-battle', 'orange', '🆚', 'battle', 'hud_battle', '#/battle'));
  }
  function mountPhone() {
    mountHudButtons();
    if (document.querySelector('.hub-phone')) return;
    const el = h(`<button class="hub-phone" aria-label="${esc(t('hub_menu'))}"><span class="hp-body hp-img"><img src="assets/menu_phone.webp?v=1" alt=""></span><span class="hp-label"></span></button>`);
    el.onclick = openMenu;
    document.body.appendChild(el);
    const lab = () => { el.querySelector('.hp-label').textContent = t('hub_menu'); };
    lab(); I18N.onChange && I18N.onChange(lab);
  }

  /* 手機版：底部導覽列（地圖 / 活動 / 選單 / 聊天 / 好友 / 我的） */
  function mountNav() {
    if (document.querySelector('.mnav')) return;
    const el = h(`<nav class="mnav" aria-label="menu"></nav>`);
    const draw = () => {
      const r = location.hash.replace(/^#\/?/, '').split('/')[0] || '';
      // 「今天」在功能選單最上面，底部改放「好友」
      const items = [['map', PXI.img('menu/world', '🌏'), t('nav_map'), r === '' || r === 'c'], ['events', PXI.img('menu/events', '📋'), t('nav_events'), r === 'events' || r === 'e'], ['menu', '📱', t('hub_menu'), false], ['chat', PXI.img('menu/chat', '💬'), t('nav_chat'), false], ['friends', PXI.img('menu/friends', '👥'), t('hud_friends'), false], ['me', PXI.img('menu/me', '🧑'), t('nav_me'), r === 'me']];
      el.innerHTML = items.map(([k, ic, lb, on]) => `<button class="mn-b ${on ? 'on' : ''}" data-k="${k}"><span class="mn-i">${k === 'menu' ? '<img src="assets/menu_phone.webp?v=1" alt="">' : ic}</span><span class="mn-l">${esc(lb)}</span>${k === 'menu' ? '<i class="mn-dot"></i><span class="bell-badge" hidden></span>' : ''}${k === 'friends' ? '<span class="mn-badge fr-badge" hidden></span>' : ''}</button>`).join('');
      window.Friends && Friends.badge && setTimeout(Friends.badge, 0);
      window.Notify && setTimeout(() => window.Notify.unread && document.querySelectorAll('.bell-badge').forEach(b => { const n = Notify.unread(); b.textContent = n > 9 ? '9+' : n; b.hidden = !n; }), 0);
    };
    el.onclick = e => {
      const b = e.target.closest('[data-k]'); if (!b) return; SFX.play('select');
      const k = b.dataset.k;
      if (k !== 'chat' && document.getElementById('chat')?.classList.contains('open')) Chat.toggle(false);   // 點其他按鈕就收起聊天室
      if (k === 'friends') { if (logged()) Friends.openPanel(); else Player.prompt(); } else if (k === 'map') A.nav('#/'); else if (k === 'events') A.nav('#/events'); else if (k === 'menu') openMenu();
      else if (k === 'chat') Chat.toggle(!document.getElementById('chat')?.classList.contains('open'));
      else if (k === 'me') (logged() ? A.nav('#/me') : Player.prompt());
    };
    document.body.appendChild(el); draw();
    window.addEventListener('hashchange', draw);
    // 手機 / 平板：換頁時收起聊天室（不然會一直蓋在畫面上）
    window.addEventListener('hashchange', () => { if (!desktopHud() && document.getElementById('chat')?.classList.contains('open')) Chat.toggle(false); });
    if (I18N.onChange) I18N.onChange(draw);
    // 手機上任務框預設收起來
    if (matchMedia('(max-width: 1024px), (pointer: coarse) and (max-width: 1400px)').matches) { try { if (localStorage.getItem(OPEN) === null) localStorage.setItem(OPEN, '0'); } catch (x) {} }
  }

  /* 電腦版上方按鈕列：放不下時，依重要程度一組一組藏起按鈕文字（只留圖示） */
  const desktopHud = () => !matchMedia('(max-width: 1024px), (pointer: coarse) and (max-width: 1400px)').matches;
  let fitting = false;
  // 記下上方列的底部位置，跑馬燈、每日任務、功能選單手機就排在它下面（不會被壓到）
  const markHudBottom = () => { const hud = document.getElementById('hud'); if (!hud || hud.classList.contains('hidden')) return;
    let b = 0; hud.querySelectorAll('.logo, .crumbs, .hud-btns > *').forEach(e => { if (e.offsetParent) b = Math.max(b, e.getBoundingClientRect().bottom); });
    if (b) document.documentElement.style.setProperty('--hud-b', Math.round(b + 4) + 'px'); };
  function fitHud() {
    const hud = document.getElementById('hud'), btns = hud && hud.querySelector('.hud-btns');
    if (!btns || fitting) return;
    setTimeout(markHudBottom, 0);
    if (!desktopHud()) { delete hud.dataset.fit; return; }
    fitting = true;
    const crumbs = hud.querySelector('.crumbs');
    const fits = () => { const b = btns.getBoundingClientRect(); const c = crumbs && crumbs.offsetParent ? crumbs.getBoundingClientRect() : { right: 0 }; return b.right <= innerWidth - 8 && c.right <= b.left + 1; };
    // 0～4：一組一組藏文字；5：按鈕縮小；6：還是放不下就排成兩排（字體調大時）
    for (let lv = 0; lv <= 6; lv++) { hud.dataset.fit = lv; if (lv === 6 || fits()) break; }
    fitting = false;
  }
  let fitT = null;
  const fitSoon = () => { clearTimeout(fitT); fitT = setTimeout(fitHud, 60); };
  window.addEventListener('resize', fitSoon);
  window.addEventListener('hashchange', () => setTimeout(fitHud, 120));
  if (I18N.onChange) I18N.onChange(fitSoon);
  setTimeout(() => { const b = document.querySelector('#hud .hud-btns'); if (b) new MutationObserver(fitSoon).observe(b, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] }); fitHud(); }, 0);

  // 啟動：等登入狀態確定後建立任務、放上手機
  const boot = () => { mountPhone(); mountNav(); load(); };
  (Backend.enabled ? Backend.ready.then(() => Player.ready) : Promise.resolve()).then(boot, boot);
  if (Player.onChange) Player.onChange(() => setTimeout(load, 100));
  if (I18N.onChange) I18N.onChange(() => draw());

  // 本週任務板裡也放今天的每日任務
  function boardHTML() {
    if (!state) return '';
    const n = state.ids.filter(done).length;
    return `<div class="qb-inboard"><div class="qb-ih">📜 ${t('q_title')} <b>${n}/${state.ids.length}</b></div><ul>${state.ids.map(id => { const q = POOL.find(x => x.id === id), p = state.prog[id] || 0, d = p >= q.n;
      return `<li class="${d ? 'ok' : ''}"><span class="qb-c">${d ? '✔' : '☐'}</span><span class="qb-l">${esc(label(q))} <b>(${p}/${q.n})</b></span>${d ? '' : `<button class="qb-go" data-qgo="${q.id}">${t('q_go')} ▸</button>`}</li>`; }).join('')}</ul>${n === state.ids.length ? `<p class="qb-done">🎉 ${t('q_done_all')}</p>` : ''}</div>`;
  }
  const goQuest = id => { const q = POOL.find(x => x.id === id); q && q.go(); };
  return { openMenu, act, reload: load, boardHTML, goQuest, fitHud };
})();
