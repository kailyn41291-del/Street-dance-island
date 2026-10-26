/* =========================================================
 * 訪客模式：沒登入的人「看得到但碰不到」，在最想要的那一刻請他創角
 * 可以看：世界 / 國家 / 城市地圖、活動、舞蹈教室、練舞秘境、稱號圖鑑、今天、論壇標題
 * 有限制：論壇每天只能點開 1 篇（看不到留言）、聊天室內容模糊、幸運小卡和 NPC Battle 各 1 次
 * 不能進的頁面：顯示「舞島居民限定」，邀請創角
 * 想調整：改下面的 LOCKED_ROUTES / LOCKED_MENU 就好
 * ========================================================= */
window.Guest = (() => {
  const { h, esc } = UI;
  const A = window.App;
  const is = () => Backend.enabled && !Player.me;

  // 訪客不能進的頁面（#/xxx）
  const LOCKED_ROUTES = ['me', 'battle', 'cypher', 'crew', 'party', 'market', 'relay', 'bracket', 'mentor', 'fest'];
  // 功能選單裡要加鎖頭的
  const LOCKED_MENU = ['hub_me', 'hub_char', 'hub_card', 'hub_quests', 'hub_friends', 'hub_find', 'hub_crew', 'hub_party', 'hub_market', 'hub_mentor',
    'hub_battle', 'hub_cypher', 'hub_relay', 'hub_shoes', 'hub_fest', 'hub_bell', 'hub_add', 'hub_bracket', 'hub_games', 'hub_rhythm'];

  I18N.extend({
    zh: {
      gu_gift_got: '歡迎來到舞島！見面禮已送達：「初登舞島」稱號＋100 XP＋1 雙球鞋', gu_gift: '🎁 現在創角送：「初登舞島」稱號＋100 XP＋1 雙球鞋',
      gu_lock_t: '🔒 舞島居民限定', gu_lock_p: '這裡是舞島居民才能進來的地方！創角只要 30 秒，馬上解鎖：',
      gu_perks: ['和全世界的舞者聊天、交朋友', '收藏活動、打卡、標記「我會去」', '組隊練舞、加入舞團、玩家 Battle', '解任務升級、收集稱號和球鞋'],
      gu_create: '✨ 馬上創角', gu_login: '我已經有角色', gu_back: '◀ 回地圖',
      gu_why_forum: '今天的免費閱讀已經用完囉！創角就能看全部的文章和留言',
      gu_why_reply: '創角就能看大家的留言，也能一起討論', gu_why_chat: '創角就能看清楚聊天內容、和大家聊天',
      gu_why_luck: '幸運小卡每天都能抽！創角就能每天抽、還能存下你的好運', gu_why_npc: '還想再 Battle？創角就能一直挑戰，還能拿稱號',
      gu_why_card: '創角就能看完整名片、加好友、邀請 Battle', gu_why_online: '創角就能看到在線的是誰，還能找他們聊天',
      gu_nudge: '你已經逛了 {n} 個頁面！創角就能收藏活動、聊天、拿稱號 →', gu_nudge_btn: '創角',
      gu_reason: '創角只要 30 秒，就能使用這個功能喔！'
    },
    en: {
      gu_gift_got: 'Welcome to Dance Island! Gift delivered: “Just Landed” title + 100 XP + 1 sneaker', gu_gift: '🎁 Join now: “Just Landed” title + 100 XP + 1 sneaker',
      gu_lock_t: '🔒 Islanders only', gu_lock_p: 'This area is for island residents! Create a character in 30 seconds to unlock:',
      gu_perks: ['Chat and make friends with dancers worldwide', 'Save events, check in, mark “I’m going”', 'Practice parties, crews and player battles', 'Level up with quests, collect titles and sneakers'],
      gu_create: '✨ Create a character', gu_login: 'I already have one', gu_back: '◀ Back to map',
      gu_why_forum: 'You’ve used today’s free read! Create a character to read every post and reply',
      gu_why_reply: 'Create a character to read and join the discussion', gu_why_chat: 'Create a character to read the chat and join in',
      gu_why_luck: 'Draw a lucky card every day — create a character to keep your luck', gu_why_npc: 'Want another battle? Create a character to keep challenging and earn titles',
      gu_why_card: 'Create a character to see full cards, add friends and battle', gu_why_online: 'Create a character to see who’s online and chat with them',
      gu_nudge: 'You’ve explored {n} pages! Create a character to save events, chat and earn titles →', gu_nudge_btn: 'Join',
      gu_reason: 'Create a character in 30 seconds to use this!'
    },
    ja: {
      gu_gift_got: 'ようこそ舞島へ！プレゼント：称号「舞島デビュー」＋100 XP＋スニーカー 1 足', gu_gift: '🎁 今キャラを作ると：称号「舞島デビュー」＋100 XP＋スニーカー 1 足',
      gu_lock_t: '🔒 島民限定', gu_lock_p: 'ここは島民だけのエリア！30 秒でキャラを作ればすぐ解放：',
      gu_perks: ['世界中のダンサーとチャット・フレンド', 'イベントの保存・チェックイン・「行く」', 'パーティー練習・クルー・プレイヤーバトル', 'クエストでレベルアップ、称号とスニーカー集め'],
      gu_create: '✨ キャラを作る', gu_login: 'キャラを持っている', gu_back: '◀ マップに戻る',
      gu_why_forum: '今日の無料閲覧は終わり！キャラを作ると全部の投稿と返信が読めるよ',
      gu_why_reply: 'キャラを作ると返信が読めて、話にも参加できるよ', gu_why_chat: 'キャラを作るとチャットがはっきり見えて、話せるよ',
      gu_why_luck: 'ラッキーカードは毎日引けるよ！キャラを作って運を記録しよう', gu_why_npc: 'もう一回バトル？キャラを作ればずっと挑戦できて称号ももらえるよ',
      gu_why_card: 'キャラを作ると名刺を全部見られて、フレンド申請やバトルもできるよ', gu_why_online: 'キャラを作ると誰がオンラインか見られて、話しかけられるよ',
      gu_nudge: 'もう {n} ページ見たね！キャラを作るとイベント保存・チャット・称号ゲット →', gu_nudge_btn: '作る',
      gu_reason: '30 秒でキャラを作ればこの機能が使えるよ！'
    },
    ko: {
      gu_gift_got: '댄스 아일랜드에 온 걸 환영해요! 선물 도착: 칭호 「섬 첫 상륙」 + 100 XP + 스니커 1켤레', gu_gift: '🎁 지금 캐릭터를 만들면: 칭호 「섬 첫 상륙」 + 100 XP + 스니커 1켤레',
      gu_lock_t: '🔒 섬 주민 전용', gu_lock_p: '여기는 섬 주민만 들어올 수 있어요! 30초면 캐릭터를 만들고 바로 열 수 있어요:',
      gu_perks: ['전 세계 댄서와 채팅하고 친구 되기', '이벤트 저장, 체크인, 「갈게요」 표시', '파티 연습, 크루, 플레이어 배틀', '퀘스트로 레벨업, 칭호와 스니커 수집'],
      gu_create: '✨ 캐릭터 만들기', gu_login: '이미 캐릭터가 있어요', gu_back: '◀ 지도로',
      gu_why_forum: '오늘 무료로 읽을 수 있는 글을 다 봤어요! 캐릭터를 만들면 모든 글과 댓글을 볼 수 있어요',
      gu_why_reply: '캐릭터를 만들면 댓글을 보고 대화에 참여할 수 있어요', gu_why_chat: '캐릭터를 만들면 채팅을 선명하게 보고 함께 이야기할 수 있어요',
      gu_why_luck: '행운 카드는 매일 뽑을 수 있어요! 캐릭터를 만들어 행운을 기록해요', gu_why_npc: '한 번 더 배틀? 캐릭터를 만들면 계속 도전하고 칭호도 받아요',
      gu_why_card: '캐릭터를 만들면 명함 전체를 보고, 친구 추가와 배틀을 할 수 있어요', gu_why_online: '캐릭터를 만들면 누가 접속 중인지 보고 대화할 수 있어요',
      gu_nudge: '벌써 {n}페이지를 봤어요! 캐릭터를 만들면 이벤트 저장, 채팅, 칭호 획득 →', gu_nudge_btn: '만들기',
      gu_reason: '30초면 캐릭터를 만들고 이 기능을 쓸 수 있어요!'
    }
  });

  /* ---------- 小工具 ---------- */
  const KEY = k => 'danceIsland.guest.' + k;
  const get = k => { try { return localStorage.getItem(KEY(k)); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(KEY(k), v); } catch (e) {} };
  const invite = reason => Player.prompt(reason ? t(reason) : t('gu_reason'));
  /** 訪客只能用一次的功能：第一次放行，之後請他創角 */
  function once(k, reason) { if (!is()) return true; if (get('once.' + k)) { invite(reason); return false; } set('once.' + k, '1'); return true; }
  /** 論壇：每天只能點開 1 篇（同一篇可以重複看） */
  function forumRead(id) {
    if (!is()) return true;
    const k = 'forum.' + A.todayStr(), cur = get(k);
    if (!cur) { set(k, String(id)); return true; }
    return cur === String(id);
  }
  /** 頁面裡的鎖定區塊（模糊的假內容＋創角按鈕） */
  const lockBox = reason => `<div class="gu-lock"><div class="gu-fake" aria-hidden="true">${'<p>▇▇▇▇ ▇▇▇▇▇▇ ▇▇▇ ▇▇▇▇▇</p>'.repeat(3)}</div>
    <div class="gu-over"><p><b>🔒 ${esc(t(reason))}</b></p><p class="note">${esc(t('gu_gift'))}</p><button class="btn pink gu-go">${t('gu_create')}</button></div></div>`;
  const bindLock = root => root.querySelectorAll('.gu-go').forEach(b => (b.onclick = () => Player.openCreate()));

  /* ---------- 不能進的頁面 ---------- */
  const blocked = r => is() && LOCKED_ROUTES.includes(r.view);
  function lockView(stage) {
    const v = h(`<div class="view city-view"><div class="city-inner"><div class="win gu-page">${UI.winHTML(t('gu_lock_t'), 'pink', false)}<div class="win-body">
      <div class="gu-hero"><img src="${UI.Kailyn.url('please')}" alt="Kailyn"><div><p>${esc(t('gu_lock_p'))}</p><ul>${t('gu_perks').map(x => `<li>★ ${esc(x)}</li>`).join('')}</ul><p class="gu-gift">${esc(t('gu_gift'))}</p></div></div>
      <div class="btn-row"><button class="btn pink gu-c">${t('gu_create')}</button><button class="btn teal gu-l">${t('gu_login')}</button><a class="btn" href="#/">${t('gu_back')}</a></div></div></div></div></div>`);
    v.querySelector('.gu-c').onclick = () => Player.openCreate();
    v.querySelector('.gu-l').onclick = () => Player.openLogin();
    stage.appendChild(v);
  }

  /* ---------- 功能選單加鎖頭 ---------- */
  function decorateMenu(body) {
    if (!is()) return;
    body.querySelectorAll('[data-k]').forEach(b => { if (LOCKED_MENU.includes(b.dataset.k)) { b.classList.add('gu-locked'); b.insertAdjacentHTML('beforeend', '<span class="gu-pad" aria-hidden="true">🔒</span>'); } });
  }

  /* ---------- 逛了幾頁之後的提示條（每次來只出現一次） ---------- */
  function countView() {
    if (!is()) return;
    let n = 0; try { n = +(sessionStorage.getItem(KEY('views')) || 0) + 1; sessionStorage.setItem(KEY('views'), n); } catch (e) { return; }
    let shown = false; try { shown = !!sessionStorage.getItem(KEY('nudged')); } catch (e) {}
    if (n < 5 || shown || document.querySelector('.gu-nudge')) return;
    try { sessionStorage.setItem(KEY('nudged'), '1'); } catch (e) {}
    const bar = h(`<div class="gu-nudge"><span>${esc(t('gu_nudge', { n }))}</span><button class="btn sm pink">${t('gu_nudge_btn')}</button><button class="gu-x" aria-label="close">×</button></div>`);
    bar.querySelector('.btn').onclick = () => { bar.remove(); Player.openCreate(); };
    bar.querySelector('.gu-x').onclick = () => bar.remove();
    document.body.appendChild(bar);
  }
  window.addEventListener('hashchange', () => setTimeout(countView, 600));

  // body 上標記訪客（聊天室模糊等用 CSS 處理）
  const tagChat = () => document.querySelectorAll('.chat-list').forEach(l => { const v = '🔒 ' + t('gu_why_chat'); if (l.dataset.guest !== v) l.dataset.guest = v; });
  const mark = () => { document.body.classList.toggle('is-guest', is()); if (is()) tagChat(); else document.querySelectorAll('.gu-nudge').forEach(x => x.remove()); };
  setInterval(() => { if (is()) tagChat(); }, 1500);   // 聊天室會重建，定期補上提示文字
  // 剛創好角色：跳出見面禮通知
  let wasGuest = null;
  const giftCheck = () => {
    const nowGuest = is();
    if (wasGuest === true && !nowGuest && Player.me && Backend.profile && Date.now() - Date.parse(Backend.profile.created_at || 0) < 10 * 60 * 1000) {
      setTimeout(() => { SFX.play('fanfare'); UI.sparkle(innerWidth / 2, innerHeight / 3, 30); UI.toast(t('gu_gift_got'), '🎁'); window.Collect && Collect.checkTitles && Collect.checkTitles(); }, 1800);
    }
    wasGuest = nowGuest;
  };
  if (Player.onChange) Player.onChange(giftCheck);
  (Backend.enabled ? Backend.ready.then(() => Player.ready) : Promise.resolve()).then(() => { wasGuest = is(); });
  if (Player.onChange) Player.onChange(mark);
  (Backend.enabled ? Backend.ready.then(() => Player.ready) : Promise.resolve()).then(mark, mark);

  return { is, once, forumRead, lockBox, bindLock, blocked, lockView, decorateMenu, invite };
})();
