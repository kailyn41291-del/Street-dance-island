/* =========================================================
 * 稱號收集
 * - 球鞋收藏（12 款）：逛網站每天撿 1 雙、活動打卡保證拿 1 雙沒有的、重複的可以送好友
 * - 新稱號自動檢查（分銅 / 銀 / 金三級，條件都在伺服器 check_titles() 判斷）
 * - 「特別稱號怎麼拿」說明 + 進度
 * - DJ / MC / 評審 / 主辦 身分申請；網站架設者審核、頒發 / 收回稱號
 * 球鞋圖：assets/sneakers/1.png ~ 12.png（之後換成正式圖，檔名一樣就好）
 * ========================================================= */
window.Collect = (() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const N = 12, RARE = [11, 12];
  const shoeImg = (n, cls = '') => `<img class="sk-img ${cls}" src="assets/sneakers/${n}.png?v=1" alt="" draggable="false">`;

  /* 稱號條件：key → [框代表的稱號 id 前綴, 銅 / 銀 / 金門檻] */
  const TIERED = { pvp: [10, 30, 50], vet: [15, 25, 40], hall: [10, 20, 30], crew: [3, 5, 8], graf: [10, 30, 50], drip: [10, 30, 50], stk: [30, 80, 150], relay: [2, 4, 6], skate: [1, 2, 3], shoe: [4, 8, 12] };
  const HONOR = ['champ', 'podium', 'world', 'belt'];
  const ROLE = ['id_dj', 'id_mc', 'id_judge', 'id_host', 'dj_pop', 'mc_pop'];
  const GRANTABLE = ['t_champ', 't_podium', 't_world', 't_belt', 't_id_dj', 't_id_mc', 't_id_judge', 't_id_host', 't_dj_pop', 't_mc_pop'];

  I18N.extend({
    zh: {
      hub_shoes: '球鞋收藏櫃', sk_shelf: '👟 球鞋收藏櫃', sk_have: '已收集 {n} / 12 款', sk_rare: '稀有', sk_unknown: '？？？',
      sk_names: ['經典白鞋', '芝加哥紅', '黑色帆布高筒', '棋盤格板鞋', '藍色麂皮', '熊貓低筒', '復古跑鞋', '氣墊跑鞋', '工裝靴', '綠三線', '黃金限定', '彩虹限定'],
      sk_found_new: '撿到新球鞋「{s}」！', sk_found_dup: '撿到「{s}」，重複了～可以送給好友', sk_ev: '活動打卡獎勵：拿到「{s}」！', sk_today: '今天已經撿過囉，明天再來找找看',
      sk_give: '送好友', sk_give_t: '要把「{s}」送給哪位好友？', sk_no_friends: '要先有好友才能送喔', sk_gave: '已經把「{s}」送給 {n}！',
      sk_e_dup: '要有重複的才能送（自己會留一雙）', sk_e_many: '今天送太多了，明天再送吧', sk_e_friend: '只能送給好友',
      sk_tip: '每天逛網站時會撿到 1 雙；去活動打卡保證拿到 1 雙還沒有的。收集 4 / 8 / 12 款拿「球鞋收藏家」銅 / 銀 / 金。',
      sk_k1: '咦？路上有一雙球鞋！我幫你放進球鞋收藏櫃了～', sk_k2: '全部 12 款收齊就能拿到「球鞋收藏家・金」喔 (๑•̀ㅂ•́)و✧', sk_open: '打開收藏櫃',
      tg_btn: '🎖 特別稱號怎麼拿？', tg_title: '🎖 特別稱號怎麼拿', tg_sec_play: '玩家成就（分銅、銀、金三級）', tg_sec_hon: '榮譽稱號（由網站確認後頒發）', tg_sec_role: 'DJ / MC / 評審 / 主辦 專屬',
      tg_now: '目前 {n}', tg_got: '已獲得', tg_apply: '申請身分', tg_new: '🎖 拿到新稱號「{t}」！', tg_new_k: '拿到新稱號「{t}」了！到「編輯角色 → 稱號」就能掛上喔 ＼(≧▽≦)／',
      tg_c_pvp: '排名賽累積贏 {a} / {b} / {c} 場', tg_c_vet: '活動打卡 {a} / {b} / {c} 場', tg_c_hall: '解鎖成就 {a} / {b} / {c} 個', tg_c_crew: '你的舞團有 {a} / {b} / {c} 位成員',
      tg_c_graf: '論壇文章和回覆被按 Like {a} / {b} / {c} 次', tg_c_drip: '名片被按 Like {a} / {b} / {c} 次', tg_c_stk: '在聊天室用貼圖 {a} / {b} / {c} 次',
      tg_c_relay: '參加每週動作接力 {a} / {b} / {c} 週', tg_c_skate: '分享練舞秘境並通過審核 {a} / {b} / {c} 個', tg_c_shoe: '收集球鞋 {a} / {b} / {c} 款',
      tg_c_champ: '比賽拿到冠軍', tg_c_podium: '比賽拿到前三名', tg_c_world: '世界級大賽冠軍', tg_c_belt: '上一季排名賽第 1 名（自動頒發）',
      tg_c_id_dj: '申請 DJ 身分，審核通過', tg_c_id_mc: '申請 MC 身分，審核通過', tg_c_id_judge: '申請評審身分，審核通過', tg_c_id_host: '申請主辦身分，審核通過',
      tg_c_dj_pop: '認證 DJ ＋ 被「@你的角色ID」列進 3 場活動的 DJ 陣容', tg_c_mc_pop: '認證 MC ＋ 被「@你的角色ID」列進 3 場活動的 MC 陣容',
      tg_honor_note: '比賽冠軍 / 前三名：把成績截圖或連結私訊網站架設者，確認後就會頒發。',
      ra_title: '📝 申請身分', ra_role: '身分', ra_roles: { dj: 'DJ', mc: 'MC', judge: '評審 Judge', host: '主辦 Organizer' }, ra_note: '經歷 / 作品連結 / IG（讓我們確認你的身分）',
      ra_note_ph: '例：IG @xxx，擔任過 XX Battle 的 DJ…', ra_send: '送出申請', ra_sent: '已送出！審核通過後就會拿到專屬稱號', ra_pending: '審核中', ra_approved: '已通過 ✔', ra_rejected: '沒有通過，可以補資料再申請',
      ra_e_short: '請多寫一點經歷（至少 5 個字）', ra_e_dup: '這個身分已經申請過了',
      ag_btn: '🎖 稱號', ag_title: '頒發 / 收回稱號：{n}', ag_give: '頒發', ag_take: '收回', ag_take_q: '確定要收回「{t}」嗎？', ag_apps: '📝 身分申請（{n}）', ag_ok: '通過', ag_no: '退回', ag_none: '目前沒有待審核的身分申請'
    },
    en: {
      hub_shoes: 'Sneaker shelf', sk_shelf: '👟 Sneaker shelf', sk_have: '{n} / 12 collected', sk_rare: 'Rare', sk_unknown: '???',
      sk_names: ['Classic White', 'Chicago Red', 'Black Canvas Hi', 'Checkerboard Slip', 'Blue Suede', 'Panda Low', 'Retro Runner', 'Air Runner', 'Work Boot', 'Green Stripes', 'Gold Limited', 'Rainbow Limited'],
      sk_found_new: 'New sneaker: “{s}”!', sk_found_dup: 'Found “{s}” — a duplicate, you can give it to a friend', sk_ev: 'Check-in reward: “{s}”!', sk_today: 'You already found one today — look again tomorrow',
      sk_give: 'Give', sk_give_t: 'Give “{s}” to which friend?', sk_no_friends: 'Make some friends first', sk_gave: 'Gave “{s}” to {n}!',
      sk_e_dup: 'You can only give duplicates (you keep one)', sk_e_many: 'That’s enough gifts for today', sk_e_friend: 'Friends only',
      sk_tip: 'Find 1 pair a day while browsing; every event check-in guarantees one you don’t have. Collect 4 / 8 / 12 for Sneaker Collector Bronze / Silver / Gold.',
      sk_k1: 'Huh? A sneaker on the street! I put it on your sneaker shelf~', sk_k2: 'Collect all 12 for “Sneaker Collector · Gold” (๑•̀ㅂ•́)و✧', sk_open: 'Open shelf',
      tg_btn: '🎖 How to earn special titles', tg_title: '🎖 Special titles', tg_sec_play: 'Player achievements (Bronze / Silver / Gold)', tg_sec_hon: 'Honors (awarded by the site)', tg_sec_role: 'DJ / MC / Judge / Organizer only',
      tg_now: 'now {n}', tg_got: 'Earned', tg_apply: 'Apply', tg_new: '🎖 New title: “{t}”!', tg_new_k: 'You earned “{t}”! Wear it from Edit character → Titles ＼(≧▽≦)／',
      tg_c_pvp: 'Win {a} / {b} / {c} ranked battles', tg_c_vet: 'Check in at {a} / {b} / {c} events', tg_c_hall: 'Unlock {a} / {b} / {c} achievements', tg_c_crew: 'Your crew has {a} / {b} / {c} members',
      tg_c_graf: 'Get {a} / {b} / {c} likes on forum posts & replies', tg_c_drip: 'Get {a} / {b} / {c} likes on your card', tg_c_stk: 'Use stickers in chat {a} / {b} / {c} times',
      tg_c_relay: 'Join the move relay {a} / {b} / {c} weeks', tg_c_skate: 'Share {a} / {b} / {c} approved practice spots', tg_c_shoe: 'Collect {a} / {b} / {c} sneakers',
      tg_c_champ: 'Win a competition', tg_c_podium: 'Top 3 in a competition', tg_c_world: 'Win a world-level competition', tg_c_belt: '#1 in last season’s ranked battles (automatic)',
      tg_c_id_dj: 'Apply as a DJ and get approved', tg_c_id_mc: 'Apply as an MC and get approved', tg_c_id_judge: 'Apply as a judge and get approved', tg_c_id_host: 'Apply as an organizer and get approved',
      tg_c_dj_pop: 'Certified DJ + listed as “@yourID” in 3 events’ DJ line-up', tg_c_mc_pop: 'Certified MC + listed as “@yourID” in 3 events’ MC line-up',
      tg_honor_note: 'Champion / top 3: DM the site owner a result screenshot or link — the title is awarded after checking.',
      ra_title: '📝 Apply for a role', ra_role: 'Role', ra_roles: { dj: 'DJ', mc: 'MC', judge: 'Judge', host: 'Organizer' }, ra_note: 'Experience / links / IG (so we can confirm)',
      ra_note_ph: 'e.g. IG @xxx, DJ’d at XX Battle…', ra_send: 'Send', ra_sent: 'Sent! You’ll get the title once approved', ra_pending: 'Pending', ra_approved: 'Approved ✔', ra_rejected: 'Not approved — add more info and apply again',
      ra_e_short: 'Please write a bit more (5+ characters)', ra_e_dup: 'You already applied for this role',
      ag_btn: '🎖 Titles', ag_title: 'Award / remove titles: {n}', ag_give: 'Award', ag_take: 'Remove', ag_take_q: 'Remove “{t}”?', ag_apps: '📝 Role applications ({n})', ag_ok: 'Approve', ag_no: 'Reject', ag_none: 'No pending role applications'
    },
    ja: {
      hub_shoes: 'スニーカー棚', sk_shelf: '👟 スニーカー棚', sk_have: '{n} / 12 足', sk_rare: 'レア', sk_unknown: '？？？',
      sk_names: ['クラシックホワイト', 'シカゴレッド', '黒キャンバスハイ', 'チェッカースリッポン', 'ブルースエード', 'パンダロー', 'レトロランナー', 'エアランナー', 'ワークブーツ', 'グリーンストライプ', 'ゴールド限定', 'レインボー限定'],
      sk_found_new: '新しいスニーカー「{s}」ゲット！', sk_found_dup: '「{s}」ゲット（ダブり。フレンドにあげられるよ）', sk_ev: 'チェックイン報酬：「{s}」ゲット！', sk_today: '今日はもう拾ったよ。また明日探してみてね',
      sk_give: 'あげる', sk_give_t: '「{s}」をどのフレンドにあげる？', sk_no_friends: '先にフレンドを作ろう', sk_gave: '「{s}」を {n} にあげたよ！',
      sk_e_dup: 'ダブっている分だけあげられます（1 足は残ります）', sk_e_many: '今日はもうたくさんあげたよ、また明日', sk_e_friend: 'フレンドだけにあげられます',
      sk_tip: 'サイトを見ていると 1 日 1 足拾えるよ。イベントでチェックインすると持っていない 1 足が確定。4 / 8 / 12 種で「スニーカーコレクター」銅 / 銀 / 金。',
      sk_k1: 'あれ？道にスニーカーが！スニーカー棚に入れておいたよ～', sk_k2: '12 種ぜんぶ集めると「スニーカーコレクター・金」だよ (๑•̀ㅂ•́)و✧', sk_open: '棚を見る',
      tg_btn: '🎖 特別な称号の取り方', tg_title: '🎖 特別な称号', tg_sec_play: 'プレイヤー実績（銅・銀・金）', tg_sec_hon: '栄誉（サイトが授与）', tg_sec_role: 'DJ / MC / ジャッジ / 主催 専用',
      tg_now: '現在 {n}', tg_got: '獲得済み', tg_apply: '申請する', tg_new: '🎖 新しい称号「{t}」ゲット！', tg_new_k: '「{t}」ゲット！「キャラ編集 → 称号」でつけられるよ ＼(≧▽≦)／',
      tg_c_pvp: 'ランク戦で {a} / {b} / {c} 勝', tg_c_vet: 'イベントで {a} / {b} / {c} 回チェックイン', tg_c_hall: '実績を {a} / {b} / {c} 個解除', tg_c_crew: 'クルーのメンバーが {a} / {b} / {c} 人',
      tg_c_graf: '掲示板の投稿と返信に いいね {a} / {b} / {c} 回', tg_c_drip: '名刺に いいね {a} / {b} / {c} 回', tg_c_stk: 'チャットでスタンプを {a} / {b} / {c} 回',
      tg_c_relay: 'ムーブリレーに {a} / {b} / {c} 週参加', tg_c_skate: '練習スポットを {a} / {b} / {c} か所シェア（承認済み）', tg_c_shoe: 'スニーカーを {a} / {b} / {c} 種集める',
      tg_c_champ: '大会で優勝', tg_c_podium: '大会で 3 位以内', tg_c_world: '世界大会で優勝', tg_c_belt: '前シーズンのランク戦 1 位（自動）',
      tg_c_id_dj: 'DJ として申請・承認', tg_c_id_mc: 'MC として申請・承認', tg_c_id_judge: 'ジャッジとして申請・承認', tg_c_id_host: '主催として申請・承認',
      tg_c_dj_pop: '認定 DJ ＋ 3 つのイベントの DJ 出演者に「@キャラID」で載る', tg_c_mc_pop: '認定 MC ＋ 3 つのイベントの MC 出演者に「@キャラID」で載る',
      tg_honor_note: '優勝 / 3 位以内：結果のスクショやリンクをサイト管理者に DM してね。確認後に授与します。',
      ra_title: '📝 役割を申請', ra_role: '役割', ra_roles: { dj: 'DJ', mc: 'MC', judge: 'ジャッジ', host: '主催' }, ra_note: '経歴 / 作品リンク / IG（確認用）',
      ra_note_ph: '例：IG @xxx、XX Battle で DJ を担当…', ra_send: '送信', ra_sent: '送信しました！承認されると専用称号がもらえます', ra_pending: '審査中', ra_approved: '承認済み ✔', ra_rejected: '承認されませんでした。情報を足して再申請できます',
      ra_e_short: 'もう少し詳しく書いてね（5 文字以上）', ra_e_dup: 'この役割はもう申請済みです',
      ag_btn: '🎖 称号', ag_title: '称号の授与 / 取り消し：{n}', ag_give: '授与', ag_take: '取り消し', ag_take_q: '「{t}」を取り消しますか？', ag_apps: '📝 役割の申請（{n}）', ag_ok: '承認', ag_no: '却下', ag_none: '審査待ちの申請はありません'
    },
    ko: {
      hub_shoes: '스니커 진열장', sk_shelf: '👟 스니커 진열장', sk_have: '{n} / 12 켤레', sk_rare: '레어', sk_unknown: '???',
      sk_names: ['클래식 화이트', '시카고 레드', '블랙 캔버스 하이', '체커보드 슬립온', '블루 스웨이드', '판다 로우', '레트로 러너', '에어 러너', '워크 부츠', '그린 스트라이프', '골드 한정', '레인보우 한정'],
      sk_found_new: '새 스니커 「{s}」 획득!', sk_found_dup: '「{s}」 획득 (중복이에요, 친구에게 줄 수 있어요)', sk_ev: '체크인 보상: 「{s}」 획득!', sk_today: '오늘은 이미 주웠어요. 내일 또 찾아봐요',
      sk_give: '선물', sk_give_t: '「{s}」를 어느 친구에게 줄까요?', sk_no_friends: '먼저 친구를 만들어요', sk_gave: '「{s}」를 {n}에게 줬어요!',
      sk_e_dup: '중복된 것만 줄 수 있어요 (한 켤레는 남아요)', sk_e_many: '오늘은 많이 줬어요, 내일 또', sk_e_friend: '친구에게만 줄 수 있어요',
      sk_tip: '사이트를 둘러보면 하루 1켤레를 주워요. 이벤트 체크인하면 없는 1켤레 확정. 4 / 8 / 12종으로 「스니커 컬렉터」 브론즈 / 실버 / 골드.',
      sk_k1: '어? 길에 스니커가 있네! 스니커 진열장에 넣어 뒀어요~', sk_k2: '12종을 다 모으면 「스니커 컬렉터 · 골드」예요 (๑•̀ㅂ•́)و✧', sk_open: '진열장 열기',
      tg_btn: '🎖 특별 칭호 얻는 법', tg_title: '🎖 특별 칭호', tg_sec_play: '플레이어 업적 (브론즈 / 실버 / 골드)', tg_sec_hon: '명예 칭호 (사이트에서 수여)', tg_sec_role: 'DJ / MC / 저지 / 주최 전용',
      tg_now: '현재 {n}', tg_got: '획득', tg_apply: '신청하기', tg_new: '🎖 새 칭호 「{t}」 획득!', tg_new_k: '「{t}」를 얻었어요! 「캐릭터 편집 → 칭호」에서 달 수 있어요 ＼(≧▽≦)／',
      tg_c_pvp: '랭크전 {a} / {b} / {c}승', tg_c_vet: '이벤트 체크인 {a} / {b} / {c}회', tg_c_hall: '업적 {a} / {b} / {c}개 달성', tg_c_crew: '내 크루 멤버 {a} / {b} / {c}명',
      tg_c_graf: '게시글과 답글에 좋아요 {a} / {b} / {c}개', tg_c_drip: '명함에 좋아요 {a} / {b} / {c}개', tg_c_stk: '채팅에서 스티커 {a} / {b} / {c}회 사용',
      tg_c_relay: '무브 릴레이 {a} / {b} / {c}주 참가', tg_c_skate: '연습 장소 {a} / {b} / {c}곳 공유 (승인)', tg_c_shoe: '스니커 {a} / {b} / {c}종 모으기',
      tg_c_champ: '대회 우승', tg_c_podium: '대회 3위 이내', tg_c_world: '세계 대회 우승', tg_c_belt: '지난 시즌 랭크전 1위 (자동)',
      tg_c_id_dj: 'DJ로 신청하고 승인받기', tg_c_id_mc: 'MC로 신청하고 승인받기', tg_c_id_judge: '저지로 신청하고 승인받기', tg_c_id_host: '주최자로 신청하고 승인받기',
      tg_c_dj_pop: '인증 DJ + 3개 이벤트 DJ 라인업에 「@내ID」로 등록', tg_c_mc_pop: '인증 MC + 3개 이벤트 MC 라인업에 「@내ID」로 등록',
      tg_honor_note: '우승 / 3위 이내: 결과 스크린샷이나 링크를 사이트 관리자에게 DM 해 주세요. 확인 후 수여해요.',
      ra_title: '📝 역할 신청', ra_role: '역할', ra_roles: { dj: 'DJ', mc: 'MC', judge: '저지', host: '주최자' }, ra_note: '경력 / 작품 링크 / IG (확인용)',
      ra_note_ph: '예: IG @xxx, XX Battle DJ 담당…', ra_send: '신청하기', ra_sent: '신청했어요! 승인되면 전용 칭호를 받아요', ra_pending: '심사 중', ra_approved: '승인 ✔', ra_rejected: '승인되지 않았어요. 정보를 보충해 다시 신청할 수 있어요',
      ra_e_short: '조금 더 자세히 써 주세요 (5자 이상)', ra_e_dup: '이미 신청한 역할이에요',
      ag_btn: '🎖 칭호', ag_title: '칭호 수여 / 회수: {n}', ag_give: '수여', ag_take: '회수', ag_take_q: '「{t}」를 회수할까요?', ag_apps: '📝 역할 신청 ({n})', ag_ok: '승인', ag_no: '반려', ag_none: '심사 대기 중인 신청이 없어요'
    }
  });
  const shoeName = n => (t('sk_names') || [])[n - 1] || '#' + n;
  const err = x => { const m = String((x && x.message) || x); if (/no duplicate/.test(m)) return t('sk_e_dup'); if (/too many/.test(m)) return t('sk_e_many'); if (/friends only/.test(m)) return t('sk_e_friend'); if (/already applied/.test(m)) return t('ra_e_dup'); return m; };

  /* ---------- 新稱號檢查 ---------- */
  let ckT = null;
  async function checkTitles() {
    if (!logged()) return;
    let got = [];
    try { got = (await Backend.rpc('check_titles')) || []; } catch (e) { return; }
    if (!got.length) return;
    try { if (!(Player.me.unlocks instanceof Set)) Player.me.unlocks = new Set(Player.me.unlocks || []); got.forEach(id => Player.me.unlocks.add(id)); } catch (e) {}
    got.forEach((id, i) => setTimeout(() => { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 22); toast(t('tg_new', { t: Titles.label(id) }), '🎖'); }, i * 1400));
    const last = got[got.length - 1];
    setTimeout(() => { if (!(window.RPG && RPG.busy())) npc.say([{ who: 'kailyn', mood: 'celebrate', text: t('tg_new_k', { t: Titles.label(last) }) }]); }, got.length * 1400 + 400);
  }
  const soon = (ms = 4000) => { clearTimeout(ckT); ckT = setTimeout(checkTitles, ms); };
  window.addEventListener('di:act', () => soon());
  if (Backend.enabled) Backend.ready.then(() => setTimeout(checkTitles, 8000));

  /* ---------- 撿球鞋：逛網站時偶爾跳出來（每天 1 雙） ---------- */
  const dayKey = () => `danceIsland.shoe.${Backend.uid}.${A.todayStr()}`;
  const doneToday = () => { try { return !!localStorage.getItem(dayKey()); } catch (e) { return true; } };
  const markToday = () => { try { localStorage.setItem(dayKey(), '1'); } catch (e) {} };
  function maybeDrop() {
    if (!logged() || doneToday() || document.querySelector('.sk-drop') || Math.random() > 0.3) return;
    const b = h(`<button class="sk-drop" aria-label="sneaker" style="left:${8 + Math.random() * 74}vw;top:${30 + Math.random() * 45}vh"><span class="sk-box">?</span></button>`);
    document.body.appendChild(b);
    b.onclick = async () => {
      b.remove();
      let r; try { r = await Backend.rpc('sneaker_find'); } catch (e) { return; }
      markToday();
      if (!r || !r.sid) return toast(t('sk_today'), '👟');
      reveal(r.sid, r.new, t(r.new ? 'sk_found_new' : 'sk_found_dup', { s: shoeName(r.sid) }));
    };
    setTimeout(() => b.remove(), 15000);
  }
  window.addEventListener('hashchange', () => setTimeout(maybeDrop, 2500));
  if (Backend.enabled) Backend.ready.then(() => setTimeout(maybeDrop, 12000));

  function reveal(sid, isNew, text) {
    SFX.play(isNew ? 'fanfare' : 'coin'); sparkle(innerWidth / 2, innerHeight / 2, isNew ? 26 : 10);
    const body = h(`<div class="sk-reveal">${shoeImg(sid, 'big')}<p><b>${esc(text)}</b></p>${RARE.includes(sid) ? `<p class="tag sk-rare-tag">★ ${t('sk_rare')}</p>` : ''}<div class="btn-row"><button class="btn pink sk-go">${t('sk_open')}</button></div></div>`);
    const m = modal({ title: t('sk_shelf'), color: 'teal', body });
    body.querySelector('.sk-go').onclick = () => { m.close(); setTimeout(openShelf, 220); };
    let first = false; try { const k = 'danceIsland.shoeIntro'; first = !localStorage.getItem(k); localStorage.setItem(k, '1'); } catch (e) {}
    if (first) setTimeout(() => npc.say([{ who: 'kailyn', mood: 'surprised', text: t('sk_k1') }, { who: 'choco', mood: 'thumbs', text: t('sk_k2') }]), 900);
    soon(1500);
  }
  async function onCheckin(eid) {
    if (!logged()) return;
    let r; try { r = await Backend.rpc('sneaker_checkin', { eid }); } catch (e) { return; }
    if (r && r.sid) reveal(r.sid, r.new, t('sk_ev', { s: shoeName(r.sid) }));
  }

  /* ---------- 球鞋收藏櫃 ---------- */
  async function openShelf() {
    if (!logged()) return Player.prompt();
    let rows = []; try { rows = await Backend.mySneakers(); } catch (e) {}
    const have = {}; rows.forEach(r => { if (r.n > 0) have[r.sid] = r.n; });
    const n = Object.keys(have).length;
    const body = h(`<div class="sk-shelf"><p class="note">${t('sk_tip')}</p><p><b>${t('sk_have', { n })}</b></p><div class="xpbar"><i style="width:${(n / N) * 100}%"></i></div>
      <div class="sk-grid">${Array.from({ length: N }, (_, i) => i + 1).map(s => `<div class="sk-cell ${have[s] ? 'on' : ''} ${RARE.includes(s) ? 'rare' : ''}">
        ${shoeImg(s, have[s] ? '' : 'sil')}<b>${have[s] ? esc(shoeName(s)) : t('sk_unknown')}</b>
        ${RARE.includes(s) ? `<small class="sk-rare">★ ${t('sk_rare')}</small>` : ''}${have[s] > 1 ? `<span class="sk-n">×${have[s]}</span><button class="btn sm sk-give" data-s="${s}">${t('sk_give')}</button>` : ''}</div>`).join('')}</div></div>`);
    const m = modal({ title: t('sk_shelf'), color: 'teal', body, wide: true });
    body.querySelectorAll('.sk-give').forEach(b => (b.onclick = () => { m.close(); setTimeout(() => give(+b.dataset.s), 220); }));
  }
  function give(s) {
    const fr = (window.Friends && Friends.friends()) || [];
    const body = h(`<div><p>${esc(t('sk_give_t', { s: shoeName(s) }))}</p>${fr.length ? `<div class="sk-fr">${fr.map(p => `<button class="btn sm" data-h="${esc(p.handle)}">${esc(p.name)} <small>@${esc(p.handle)}</small></button>`).join('')}</div>` : `<p class="note">${t('sk_no_friends')}</p>`}</div>`);
    const m = modal({ title: t('sk_give'), color: 'teal', body });
    body.querySelectorAll('[data-h]').forEach(b => (b.onclick = async () => {
      try { await Backend.rpc('sneaker_give', { h: b.dataset.h, s }); SFX.play('coin'); toast(t('sk_gave', { s: shoeName(s), n: b.textContent.trim().split(' @')[0] }), '👟'); m.close(); }
      catch (x) { toast(err(x), '✕'); }
    }));
  }

  /* ---------- 特別稱號怎麼拿 ---------- */
  // 「特別稱號怎麼拿」改成完整的稱號圖鑑頁
  function openGuide() { document.querySelectorAll('.modal-back .x').forEach(x => x.click()); setTimeout(() => A.nav('#/titles'), 250); }
  async function openGuideOld() {
    let prog = {}, mine = (Player.me && Player.me.unlocks instanceof Set) ? Player.me.unlocks : new Set();
    if (logged()) {
      try { prog = (await Backend.rpc('title_progress')) || {}; } catch (e) {}
      try { mine = new Set(await Backend.myUnlocks()); Player.me.unlocks = mine; } catch (e) {}
    }
    const has = id => mine.has(id);
    const row = (id, cond, extra = '') => `<li class="tg-row ${has(id) ? 'got' : ''}"><div class="tg-fr">${Titles.html(id)}</div><div class="tg-c">${esc(cond)}${extra}</div></li>`;
    const tiered = Object.entries(TIERED).map(([k, th]) => {
      const best = [3, 2, 1].find(i => has(`t_${k}_${i}`));
      const id = `t_${k}_${best || 1}`, now = prog[k];
      return `<li class="tg-row ${best ? 'got' : ''}"><div class="tg-fr">${Titles.html(id)}</div><div class="tg-c">${esc(t('tg_c_' + k, { a: th[0], b: th[1], c: th[2] }))}
        ${now != null ? `<br><small class="note">${t('tg_now', { n: now })}</small>` : ''}${best ? ` <span class="tag">${t('tg_got')} ${'★'.repeat(best)}</span>` : ''}${k === 'shoe' ? ` <button class="btn sm tg-shoes">${t('sk_open')}</button>` : ''}</div></li>`;
    }).join('');
    const body = h(`<div class="tg"><h4>${t('tg_sec_play')}</h4><ul class="tg-list">${tiered}</ul>
      <h4>${t('tg_sec_hon')}</h4><p class="note">${t('tg_honor_note')}</p><ul class="tg-list">${HONOR.map(k => row('t_' + k, t('tg_c_' + k), has('t_' + k) ? ` <span class="tag">${t('tg_got')}</span>` : '')).join('')}</ul>
      <h4>${t('tg_sec_role')}</h4><div class="btn-row"><button class="btn pink tg-apply">${t('tg_apply')}</button></div><ul class="tg-list">${ROLE.map(k => row('t_' + k, t('tg_c_' + k), has('t_' + k) ? ` <span class="tag">${t('tg_got')}</span>` : '')).join('')}</ul></div>`);
    const m = modal({ title: t('tg_title'), color: 'yellow', body, wide: true });
    const s = body.querySelector('.tg-shoes'); if (s) s.onclick = () => { m.close(); setTimeout(openShelf, 220); };
    body.querySelector('.tg-apply').onclick = () => { m.close(); setTimeout(openApply, 220); };
  }

  /* ---------- 身分申請 ---------- */
  async function openApply() {
    if (!logged()) return Player.prompt();
    let mine = []; try { mine = await Backend.myRoleApps(); } catch (e) {}
    const R = t('ra_roles'), st = r => { const a = mine.filter(x => x.role === r).sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0]; return a ? a.status : ''; };
    const body = h(`<form class="form" novalidate>
      <ul class="full tg-roles">${Object.keys(R).map(r => `<li><b>${esc(R[r])}</b> ${st(r) ? `<span class="tag">${t('ra_' + st(r))}</span>` : ''}</li>`).join('')}</ul>
      <label class="field"><span>${t('ra_role')}</span><select class="input" name="role">${Object.keys(R).filter(r => !['pending', 'approved'].includes(st(r))).map(r => `<option value="${r}">${esc(R[r])}</option>`).join('')}</select></label>
      <label class="field full"><span>${t('ra_note')}</span><textarea class="input" name="note" rows="4" maxlength="500" placeholder="${esc(t('ra_note_ph'))}"></textarea></label>
      <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn pink">${t('ra_send')}</button></div></div></form>`);
    const m = modal({ title: t('ra_title'), color: 'pink', body });
    if (!body.elements.role.options.length) body.querySelector('.form-foot').hidden = true;
    body.onsubmit = async ev => {
      ev.preventDefault();
      const note = body.elements.note.value.trim(), e2 = body.querySelector('.err');
      if (note.length < 5) { e2.textContent = '✕ ' + t('ra_e_short'); return; }
      try { await Backend.roleApply(body.elements.role.value, note); } catch (x) { e2.textContent = '✕ ' + err(x); return; }
      SFX.play('coin'); toast(t('ra_sent'), '📝'); m.close();
    };
  }

  /* ---------- 網站架設者：審核身分申請、頒發 / 收回稱號 ---------- */
  async function drawRoleApps(el, fail) {
    let rows = []; try { rows = (await Backend.rpc('role_apps_pending')) || []; } catch (x) { el.innerHTML = ''; return; }
    const R = t('ra_roles');
    el.innerHTML = `<details class="ag-apps" ${rows.length ? 'open' : ''}><summary><b>${t('ag_apps', { n: rows.length })}</b></summary>
      ${rows.length ? `<ul class="adm-list">${rows.map(a => `<li data-id="${a.id}"><div class="grow"><b>${esc(a.name)}</b> <span class="note">@${esc(a.handle)}</span> <span class="tag">${esc(R[a.role] || a.role)}</span><br><span class="note">${esc(a.note)}</span></div>
        <button class="btn sm ag-card" data-h="${esc(a.handle)}">${t('ac_card')}</button><button class="btn sm green ag-ok">${t('ag_ok')}</button><button class="btn sm red ag-no">${t('ag_no')}</button></li>`).join('')}</ul>` : `<p class="note">${t('ag_none')}</p>`}</details>`;
    el.onclick = async e => {
      const li = e.target.closest('li[data-id]'); if (!li) return;
      if (e.target.closest('.ag-card')) return Friends.openCard(e.target.closest('.ag-card').dataset.h);
      const ok = e.target.closest('.ag-ok'), no = e.target.closest('.ag-no'); if (!ok && !no) return;
      try { await Backend.rpc('role_review', { aid: +li.dataset.id, approve: !!ok }); toast(t('adm_done'), '✔'); drawRoleApps(el, fail); } catch (x) { fail(x); }
    };
  }
  function openGrant(handle, name) {
    const ids = GRANTABLE.concat(Object.keys(TIERED).flatMap(k => [1, 2, 3].map(i => `t_${k}_${i}`)));
    const body = h(`<div><ul class="tg-list">${ids.map(id => `<li class="tg-row"><div class="tg-fr">${Titles.html(id)}</div><div class="tg-c"><button class="btn sm green" data-g="${id}">${t('ag_give')}</button> <button class="btn sm red" data-x="${id}">${t('ag_take')}</button></div></li>`).join('')}</ul></div>`);
    modal({ title: t('ag_title', { n: name }), color: 'yellow', body, wide: true });
    body.onclick = async e => {
      const g = e.target.closest('[data-g]'), x = e.target.closest('[data-x]'); if (!g && !x) return;
      const id = (g || x).dataset.g || (g || x).dataset.x;
      if (x && !confirm(t('ag_take_q', { t: Titles.label(id) }))) return;
      try { await Backend.rpc('owner_grant', { ph: handle, pitem: id, pgive: !!g }); SFX.play('coin'); toast(t('adm_done') + '：' + Titles.label(id), '🎖'); }
      catch (y) { toast(err(y), '✕'); }
    };
  }

  /* 活動陣容裡的 @角色ID：點了打開名片 */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-card]'); if (!a) return;
    e.preventDefault(); e.stopPropagation(); window.Friends && Friends.openCard(a.dataset.card);
  }, true);

  return { openShelf, openGuide, openApply, onCheckin, checkTitles, drawRoleApps, openGrant };
})();
