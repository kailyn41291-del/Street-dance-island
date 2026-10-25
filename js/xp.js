/* =========================================================
 * 經驗值系統（畫面）：成就、每週挑戰、連續登入、排名賽段位、
 * 舞團等級與每週排行、活動現場加成、活動資訊糾錯
 * 經驗值都由伺服器計算，這裡只負責顯示和呼叫
 * ========================================================= */
window.XP = (() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;

  // 成就：圖示 + 經驗值（名稱、說明在下面的 i18n）
  const ACH = [
    ['tw5', '🗺', 100], ['tw22', '🇹🇼', 800], ['country3', '✈', 150], ['country10', '🌏', 600],
    ['comp1', '🎫', 50], ['comp5', '🎟', 200], ['comp10', '🏟', 400],
    ['rhythm_a', '🎵', 100], ['rhythm_s', '🎶', 250], ['npc5', '🥊', 50], ['npc30', '👹', 200],
    ['friend1', '🤝', 30], ['friend10', '👯', 150], ['friend30', '🎉', 300], ['chat100', '💬', 100],
    ['forum1', '📝', 50], ['talk50', '🗣', 150], ['vote10', '🗳', 100], ['streak7', '🔥', 100], ['streak30', '🏝', 400],
    ['pvp1', '⚔', 50], ['pvp10', '🏅', 200], ['gold', '🥇', 300], ['king', '👑', 600],
    ['crew', '🎌', 50], ['crewlead', '🚩', 200], ['verified', '✔', 100], ['spin30', '🎰', 200], ['fav10', '⭐', 50],
    ['submit1', '📮', 100], ['liked10', '❤', 100]
  ];
  const TIERS = [[1000, 'king', '👑'], [500, 'gold', '🥇'], [200, 'silver', '🥈'], [0, 'bronze', '🥉']];
  const tierOf = pts => TIERS.find(([p]) => pts >= p);

  I18N.extend({
    zh: {
      xp_title: '冒險進度', xp_streak: '🔥 連續登入 {n} 天', xp_mult: '經驗值 ×{m}', xp_next: '再連續 {d} 天 → ×{m}', xp_islander: '連續 30 天送「定居島民」稱號',
      wk_title: '本週挑戰', wk_claim: '領取 +200 XP', wk_claimed: '本週已完成 ✔', wk_got: '本週挑戰完成！+{n} XP，獲得稱號「週週挑戰王」',
      wk_checkin: '本週去 1 場活動打卡', wk_pvp: '本週在玩家對戰贏 3 場', wk_talk: '本週留言 / 回覆 8 次', wk_daily: '本週有 4 天把每日任務全清', wk_rhythm: '本週節奏挑戰拿到 5000 分以上', wk_friends: '本週交到 3 位新朋友', wk_votes: '本週投 3 次 Battle 票',
      ach_title: '成就', ach_got: '🏅 成就解鎖：{n}  +{x} XP', ach_n: '{a} / {b}',
      pvp_title: '排名賽', pvp_season: '{s} 賽季', pvp_tier_bronze: '銅牌舞者', pvp_tier_silver: '銀牌舞者', pvp_tier_gold: '金牌舞者', pvp_tier_king: '舞王',
      pvp_pts: '{p} 分・{w} 勝 {l} 敗', pvp_board: '賽季排行榜', pvp_rule: '贏真人 +20 XP、輸了也有 +5 XP；排名分數：贏 +25、輸 −10。同一位對手一天最多算 3 場。', pvp_xp_w: '排名賽勝利！+20 XP、+25 分', pvp_xp_l: '輸了也有 +5 XP，再接再厲！', pvp_none: '這季還沒有人上榜',
      crew_lv: '舞團 Lv.{n}', crew_wk: '本週經驗 {n}', crew_rank_t: '本週舞團排行', crew_rank_note: '每週一結算，前 3 名全團 +100 / +60 / +30 XP',
      os_ask: '你在活動現場嗎？開啟定位就能拿雙倍經驗值！', os_ok: '📍 現場打卡成功！經驗值 ×2（+{n} XP）', os_far: '你好像不在活動附近（距離 {km} km）', os_day: '活動當天才能拿現場加成', os_fail: '拿不到你的位置',
      rp_btn: '回報錯誤', rp_ev_t: '⚠ 回報活動資訊錯誤', rp_ev_ph: '哪裡寫錯了？例：報名截止日應該是 10/31', rp_ev_sent: '收到！管理員確認後你會拿到 +30 XP', rp_admin: '活動糾錯',
      rp_ok: '確認（+30 XP）', rp_no: '不採用'
    },
    en: {
      xp_title: 'Adventure progress', xp_streak: '🔥 {n}-day login streak', xp_mult: 'XP ×{m}', xp_next: '{d} more days → ×{m}', xp_islander: '30 days in a row unlocks the title “Island Resident”',
      wk_title: 'Weekly challenge', wk_claim: 'Claim +200 XP', wk_claimed: 'Done this week ✔', wk_got: 'Weekly challenge complete! +{n} XP and the title “Weekly Challenger”',
      wk_checkin: 'Check in at 1 event this week', wk_pvp: 'Win 3 ranked battles this week', wk_talk: 'Comment or reply 8 times this week', wk_daily: 'Clear all daily quests on 4 days this week', wk_rhythm: 'Score 5000+ in Rhythm this week', wk_friends: 'Make 3 new friends this week', wk_votes: 'Vote in battles 3 times this week',
      ach_title: 'Achievements', ach_got: '🏅 Achievement unlocked: {n}  +{x} XP', ach_n: '{a} / {b}',
      pvp_title: 'Ranked battles', pvp_season: 'Season {s}', pvp_tier_bronze: 'Bronze', pvp_tier_silver: 'Silver', pvp_tier_gold: 'Gold', pvp_tier_king: 'Dance King',
      pvp_pts: '{p} pts · {w}W {l}L', pvp_board: 'Season leaderboard', pvp_rule: 'Win vs a real player +20 XP, lose +5 XP. Rank points: win +25, lose −10. Max 3 counted matches per opponent per day.', pvp_xp_w: 'Ranked win! +20 XP, +25 pts', pvp_xp_l: '+5 XP for showing up — run it back!', pvp_none: 'No one ranked yet this season',
      crew_lv: 'Crew Lv.{n}', crew_wk: '{n} XP this week', crew_rank_t: 'Weekly crew ranking', crew_rank_note: 'Settles every Monday — top 3 crews get +100 / +60 / +30 XP for every member',
      os_ask: 'Are you at the event? Turn on location for double XP!', os_ok: '📍 On-site check-in! XP ×2 (+{n} XP)', os_far: "Looks like you're not near the event ({km} km away)", os_day: 'The on-site bonus only works on event day', os_fail: 'Could not get your location',
      rp_btn: 'Report', rp_ev_t: '⚠ Report wrong event info', rp_ev_ph: "What's wrong? e.g. sign-up deadline should be 10/31", rp_ev_sent: "Thanks! You'll get +30 XP once an admin confirms", rp_admin: 'Event fixes',
      rp_ok: 'Confirm (+30 XP)', rp_no: 'Dismiss'
    },
    ja: {
      xp_title: '冒険の進み具合', xp_streak: '🔥 {n} 日連続ログイン', xp_mult: '経験値 ×{m}', xp_next: 'あと {d} 日で ×{m}', xp_islander: '30 日連続で称号「島に住んでます」',
      wk_title: '今週のチャレンジ', wk_claim: '+200 XP を受け取る', wk_claimed: '今週はクリア済み ✔', wk_got: '今週のチャレンジ達成！+{n} XP、称号「週チャレ王」ゲット',
      wk_checkin: '今週イベントで 1 回チェックイン', wk_pvp: '今週ランク戦で 3 勝', wk_talk: '今週コメント・返信を 8 回', wk_daily: '今週 4 日デイリーを全クリア', wk_rhythm: '今週リズムで 5000 点以上', wk_friends: '今週フレンドを 3 人増やす', wk_votes: '今週バトルに 3 回投票',
      ach_title: '実績', ach_got: '🏅 実績解除：{n}  +{x} XP', ach_n: '{a} / {b}',
      pvp_title: 'ランク戦', pvp_season: '{s} シーズン', pvp_tier_bronze: 'ブロンズ', pvp_tier_silver: 'シルバー', pvp_tier_gold: 'ゴールド', pvp_tier_king: 'ダンスキング',
      pvp_pts: '{p} pt・{w} 勝 {l} 敗', pvp_board: 'シーズンランキング', pvp_rule: '対人で勝つと +20 XP、負けても +5 XP。ランクポイント：勝ち +25、負け −10。同じ相手は 1 日 3 試合まで。', pvp_xp_w: 'ランク戦勝利！+20 XP、+25 pt', pvp_xp_l: '負けても +5 XP、次こそ！', pvp_none: '今シーズンはまだ誰もいません',
      crew_lv: 'クルー Lv.{n}', crew_wk: '今週 {n} XP', crew_rank_t: '今週のクルーランキング', crew_rank_note: '毎週月曜に集計、上位 3 クルーの全員に +100 / +60 / +30 XP',
      os_ask: 'イベント会場にいる？位置情報をオンにすると経験値 2 倍！', os_ok: '📍 会場チェックイン成功！経験値 ×2（+{n} XP）', os_far: '会場の近くにいないみたい（{km} km）', os_day: '会場ボーナスはイベント当日だけ', os_fail: '位置情報を取得できません',
      rp_btn: '間違いを報告', rp_ev_t: '⚠ イベント情報の間違いを報告', rp_ev_ph: 'どこが違う？例：エントリー締切は 10/31 です', rp_ev_sent: 'ありがとう！管理者が確認したら +30 XP', rp_admin: 'イベント修正',
      rp_ok: '確認（+30 XP）', rp_no: '採用しない'
    },
    ko: {
      xp_title: '모험 진행도', xp_streak: '🔥 {n}일 연속 접속', xp_mult: '경험치 ×{m}', xp_next: '{d}일 더 → ×{m}', xp_islander: '30일 연속이면 칭호 「섬에 정착한 주민」',
      wk_title: '이번 주 챌린지', wk_claim: '+200 XP 받기', wk_claimed: '이번 주 완료 ✔', wk_got: '주간 챌린지 완료! +{n} XP, 칭호 「주간 챌린지왕」 획득',
      wk_checkin: '이번 주 이벤트 1곳 체크인', wk_pvp: '이번 주 랭크전 3승', wk_talk: '이번 주 댓글·답글 8번', wk_daily: '이번 주 4일 일일 퀘스트 올클', wk_rhythm: '이번 주 리듬 5000점 이상', wk_friends: '이번 주 새 친구 3명', wk_votes: '이번 주 배틀 투표 3번',
      ach_title: '업적', ach_got: '🏅 업적 달성: {n}  +{x} XP', ach_n: '{a} / {b}',
      pvp_title: '랭크전', pvp_season: '{s} 시즌', pvp_tier_bronze: '브론즈', pvp_tier_silver: '실버', pvp_tier_gold: '골드', pvp_tier_king: '댄스 킹',
      pvp_pts: '{p}점·{w}승 {l}패', pvp_board: '시즌 랭킹', pvp_rule: '진짜 플레이어에게 이기면 +20 XP, 져도 +5 XP. 랭크 점수: 승 +25, 패 −10. 같은 상대는 하루 3판까지.', pvp_xp_w: '랭크전 승리! +20 XP, +25점', pvp_xp_l: '져도 +5 XP, 다시 한 판!', pvp_none: '이번 시즌엔 아직 아무도 없어요',
      crew_lv: '크루 Lv.{n}', crew_wk: '이번 주 {n} XP', crew_rank_t: '이번 주 크루 랭킹', crew_rank_note: '매주 월요일 정산, 상위 3개 크루 전원 +100 / +60 / +30 XP',
      os_ask: '이벤트 현장이야? 위치를 켜면 경험치 2배!', os_ok: '📍 현장 체크인 성공! 경험치 ×2 (+{n} XP)', os_far: '이벤트 근처가 아닌 것 같아요({km} km)', os_day: '현장 보너스는 이벤트 당일만 돼요', os_fail: '위치를 가져올 수 없어요',
      rp_btn: '오류 신고', rp_ev_t: '⚠ 이벤트 정보 오류 신고', rp_ev_ph: '어디가 틀렸나요? 예: 신청 마감은 10/31이에요', rp_ev_sent: '고마워요! 관리자가 확인하면 +30 XP', rp_admin: '이벤트 수정 제보',
      rp_ok: '확인 (+30 XP)', rp_no: '반려'
    }
  });
  // 成就名稱與說明（四種語言）
  const AN = {
    tw5: ['台灣走透透', '在台灣 5 個縣市打卡', 'Taiwan Explorer', 'Check in at 5 Taiwan cities', '台湾めぐり', '台湾の 5 県市でチェックイン', '대만 탐험가', '대만 5개 지역 체크인'],
    tw22: ['寶島全制霸', '集滿台灣 22 縣市', 'All of Taiwan!', 'Check in at all 22 Taiwan cities & counties', '台湾コンプリート', '台湾 22 県市をコンプリート', '대만 올클', '대만 22개 지역 모두 체크인'],
    country3: ['出國比賽囉', '去 3 個國家的活動', 'Going Global', 'Events in 3 countries', '海外遠征', '3 か国のイベントへ', '해외 원정', '3개국 이벤트 참가'],
    country10: ['世界巡迴舞者', '去 10 個國家的活動', 'World Tour Dancer', 'Events in 10 countries', 'ワールドツアー', '10 か国のイベントへ', '월드투어 댄서', '10개국 이벤트 참가'],
    comp1: ['第一次參賽', '第一次活動打卡', 'First Battle', 'Your first event check-in', '初参戦', '初めてのチェックイン', '첫 출전', '첫 이벤트 체크인'],
    comp5: ['比賽常客', '活動打卡 5 次', 'Battle Regular', 'Check in at 5 events', 'バトル常連', '5 回チェックイン', '배틀 단골', '이벤트 5번 체크인'],
    comp10: ['比賽成癮', '活動打卡 10 次', 'Battle Addict', 'Check in at 10 events', 'バトル中毒', '10 回チェックイン', '배틀 중독', '이벤트 10번 체크인'],
    rhythm_a: ['節奏感不錯', '節奏挑戰拿到 5000 分', 'Good Rhythm', 'Score 5000 in Rhythm', 'リズム感あり', 'リズムで 5000 点', '리듬감 굿', '리듬 5000점'],
    rhythm_s: ['S 級律動', '節奏挑戰拿到 S（6000 分）', 'S-Rank Groove', 'Get an S (6000) in Rhythm', 'S ランクグルーヴ', 'リズムで S（6000 点）', 'S랭크 그루브', '리듬 S랭크(6000점)'],
    npc5: ['街頭新秀', '打敗 NPC 5 次', 'Street Rookie', 'Beat NPCs 5 times', 'ストリートの新星', 'NPC に 5 回勝つ', '스트릿 루키', 'NPC 5번 이기기'],
    npc30: ['NPC 剋星', '打敗 NPC 30 次', 'NPC Nemesis', 'Beat NPCs 30 times', 'NPC の天敵', 'NPC に 30 回勝つ', 'NPC 천적', 'NPC 30번 이기기'],
    friend1: ['第一個朋友', '交到第 1 位好友', 'First Friend', 'Make your first friend', 'はじめての友だち', 'フレンドを 1 人作る', '첫 친구', '첫 친구 사귀기'],
    friend10: ['社交舞者', '10 位好友', 'Social Dancer', '10 friends', '社交ダンサー', 'フレンド 10 人', '인싸 댄서', '친구 10명'],
    friend30: ['舞島人氣王', '30 位好友', 'Island Celebrity', '30 friends', '島の人気者', 'フレンド 30 人', '섬의 인기스타', '친구 30명'],
    chat100: ['話匣子', '聊天室說 100 句話', 'Chatterbox', 'Send 100 chat messages', 'おしゃべり', 'チャット 100 回', '수다쟁이', '채팅 100번'],
    forum1: ['第一篇主題', '論壇主題通過審核', 'First Topic', 'Get a forum topic approved', '初投稿', '掲示板のトピックが承認', '첫 게시글', '게시판 주제 승인'],
    talk50: ['熱心回覆', '留言 / 回覆 50 次', 'Super Replier', 'Comment or reply 50 times', 'コメント職人', 'コメント・返信 50 回', '댓글 장인', '댓글·답글 50번'],
    vote10: ['人氣評審', '投 10 次 Battle 票', 'Crowd Judge', 'Vote in 10 battles', '人気審査員', 'バトルに 10 回投票', '인기 심사위원', '배틀 투표 10번'],
    streak7: ['一週不間斷', '連續登入 7 天', 'One Week Strong', '7-day login streak', '1 週間皆勤', '7 日連続ログイン', '일주일 개근', '7일 연속 접속'],
    streak30: ['定居舞島', '連續登入 30 天', 'Island Resident', '30-day login streak', '島に定住', '30 日連続ログイン', '섬에 정착', '30일 연속 접속'],
    pvp1: ['初勝利', '排名賽第一場勝利', 'First Win', 'Win your first ranked battle', '初勝利', 'ランク戦で初勝利', '첫 승리', '랭크전 첫 승'],
    pvp10: ['對戰高手', '排名賽贏 10 場', 'Battle Ace', 'Win 10 ranked battles', 'バトルの達人', 'ランク戦 10 勝', '배틀 고수', '랭크전 10승'],
    gold: ['金牌舞者', '賽季達到金牌（500 分）', 'Gold Dancer', 'Reach Gold (500 pts) in a season', 'ゴールドダンサー', 'シーズンでゴールド（500 pt）', '골드 댄서', '시즌 골드(500점) 달성'],
    king: ['舞王', '賽季達到舞王（1000 分）', 'Dance King', 'Reach Dance King (1000 pts)', 'ダンスキング', 'シーズンでダンスキング（1000 pt）', '댄스 킹', '시즌 댄스 킹(1000점) 달성'],
    crew: ['有家可歸', '加入一個舞團', 'Found a Crew', 'Join a crew', 'クルー加入', 'クルーに入る', '크루 가입', '크루에 들어가기'],
    crewlead: ['開山團長', '成立的舞團通過認證', 'Crew Founder', 'Get your crew verified', 'クルー創設者', '作ったクルーが認証される', '크루 창단', '만든 크루가 인증됨'],
    verified: ['本人認證', '完成實名認證', 'The Real Deal', 'Get verified', '本人確認', '本人確認を完了', '본인 인증', '실명 인증 완료'],
    spin30: ['簽到達人', '每日簽到 30 次', 'Check-in Pro', 'Spin the daily check-in 30 times', 'ログイン名人', 'デイリー 30 回', '출석 달인', '출석 룰렛 30번'],
    fav10: ['收藏家', '收藏 10 個活動', 'Collector', 'Save 10 events', 'コレクター', 'イベントを 10 件お気に入り', '수집가', '이벤트 10개 즐겨찾기'],
    submit1: ['情報員', '投稿的活動被通過', 'Event Scout', 'Get an event submission approved', '情報屋', '投稿イベントが承認', '정보원', '제보한 이벤트 승인'],
    liked10: ['人氣作者', '論壇主題被按讚 10 次', 'Popular Author', 'A forum topic gets 10 likes', '人気作家', 'トピックに 10 いいね', '인기 작성자', '게시글 좋아요 10개']
  };
  const L = { zh: 0, en: 2, ja: 4, ko: 6 };
  const achName = id => (AN[id] || [id])[L[I18N.lang] || 0] || id;
  const achDesc = id => (AN[id] || ['', ''])[(L[I18N.lang] || 0) + 1] || '';

  /* ---------- 成就：定期檢查，解鎖就跳通知 ---------- */
  let achT = null, mine = { ach: new Set(), weekly: null, season: null, pvp: null, top: [], stats: null };
  async function checkAch() {
    if (!logged()) return;
    try {
      const got = await Backend.checkAch();
      (got || []).forEach((a, i) => setTimeout(() => { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 20); toast(t('ach_got', { n: achName(a.id), x: a.xp }), '🏅'); mine.ach.add(a.id); }, i * 1400));
      if (got && got.length) A.refreshStats && A.refreshStats();
    } catch (x) {}
  }
  const changed = () => { clearTimeout(achT); achT = setTimeout(() => { checkAch(); A.refreshStats && A.refreshStats(); }, 2500); };
  window.addEventListener('di:act', changed);

  // 賽季名稱直接在本機算（台灣時間的「年-Q季」），不用多問一次伺服器
  const seasonNow = () => { const d = new Date(Date.now() + 8 * 3600e3); return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };
  let loadedAt = 0, loading = null;
  // 全部同時送出（以前是一個接一個，要等 2～3 秒）；60 秒內重開頁面直接用快取
  function loadMine(force) {
    if (!logged()) return Promise.resolve();
    if (!force && Date.now() - loadedAt < 60000) return Promise.resolve();
    if (loading) return loading;
    mine.season = seasonNow();
    const safe = p => p.catch(() => null);
    loading = Promise.all([safe(Backend.achievementsOf(Backend.uid)), safe(Backend.myWeekly()), safe(Backend.pvpMine(mine.season)), safe(Backend.pvpTop(mine.season, 10)),
      (A.socialState && A.socialState.stats) ? Promise.resolve(A.socialState.stats) : safe(Backend.stats())])
      .then(async ([ach, wk, pvp, top, st]) => {
        if (ach) mine.ach = new Set(ach.map(a => a.id));
        mine.weekly = wk; mine.pvp = pvp; mine.top = top || []; mine.stats = st;
        mine.topPeople = {};
        try { const ids = mine.top.map(x => x.user_id); if (ids.length) (await Backend.playersByIds(ids)).forEach(p => (mine.topPeople[p.user_id] = p)); } catch (x) {}
        loadedAt = Date.now();
      }).finally(() => { loading = null; });
    return loading;
  }

  /* ---------- 「我的頁面」上的冒險進度區塊 ---------- */
  const NEXT = [[3, 1.2], [7, 1.5], [14, 1.75], [30, 2]];
  // 先放一個位置，資料到了再填進去（不會擋住整個頁面）
  A.xpHTML = () => (logged() ? `<div class="xp-slot">${loadedAt ? xpInner() : `<div class="win xp-win">${UI.winHTML('✨ ' + t('xp_title'), 'yellow', false)}<div class="win-body"><p class="note">…</p></div></div>`}</div>` : '');
  const fillSlot = () => { const s = document.querySelector('.xp-slot'); if (s) s.innerHTML = xpInner(); };
  const xpInner = () => {
    const st = mine.stats || {}, s = st.streak || 0, m = +st.mult || 1, nx = NEXT.find(([d]) => s < d);
    const w = mine.weekly, p = mine.pvp, tr = tierOf(p ? p.points : 0);
    const people = mine.topPeople || {};
    return `<div class="win xp-win">${UI.winHTML('✨ ' + t('xp_title'), 'yellow', false)}<div class="win-body xp-grid">
      <section class="xp-card"><div class="xp-big">${t('xp_streak', { n: s })}</div><div>${m > 1 ? `<span class="tag pin">${t('xp_mult', { m })}</span>` : ''} ${nx ? `<small class="note">${t('xp_next', { d: nx[0] - s, m: nx[1] })}</small>` : ''}</div>
        <div class="xp-days">${Array.from({ length: 30 }, (_, i) => `<i class="${i < s ? 'on' : ''} ${[2, 6, 13, 29].includes(i) ? 'mk' : ''}"></i>`).join('')}</div><small class="note">${t('xp_islander')}</small></section>
      <section class="xp-card"><h4>🗓 ${t('wk_title')}</h4>${w ? `<p>${esc(t('wk_' + w.id))} <b>(${w.prog}/${w.n})</b></p><div class="xpbar"><i style="width:${Math.round((w.prog / w.n) * 100)}%"></i></div>
        ${w.claimed ? `<p class="note">${t('wk_claimed')}</p>` : `<button class="btn sm ${w.prog >= w.n ? 'pink' : ''} xp-wk" ${w.prog >= w.n ? '' : 'disabled'}>${t('wk_claim')}</button>`}` : '<p class="note">…</p>'}</section>
      <section class="xp-card"><h4>⚔ ${t('pvp_title')} <small class="note">${t('pvp_season', { s: mine.season || '' })}</small></h4>
        <div class="xp-tier tier-${tr[1]}">${tr[2]} ${t('pvp_tier_' + tr[1])}</div><p class="note">${t('pvp_pts', { p: p ? p.points : 0, w: p ? p.wins : 0, l: p ? p.losses : 0 })}</p>
        <details><summary>${t('pvp_board')}</summary><ol class="xp-board">${(mine.top || []).length ? mine.top.map(r => { const pp = people[r.user_id] || {}; const tt = tierOf(r.points); return `<li><span>${tt[2]} ${esc(pp.name || '…')}</span><b>${r.points}</b></li>`; }).join('') : `<li class="note">${t('pvp_none')}</li>`}</ol><p class="note">${t('pvp_rule')}</p></details></section>
      <section class="xp-card full"><h4>🏅 ${t('ach_title')} <small class="note">${t('ach_n', { a: mine.ach.size, b: ACH.length })}</small></h4>
        <div class="ach-grid">${ACH.map(([id, ic, xp]) => `<div class="ach ${mine.ach.has(id) ? 'on' : ''}" title="${esc(achDesc(id))} (+${xp} XP)"><span class="ach-ic">${ic}</span><b>${esc(achName(id))}</b><small>${esc(achDesc(id))}</small><i>+${xp}</i></div>`).join('')}</div></section>
    </div></div>`;
  };
  A.prefetch = A.prefetch || {};
  const _pf = A.prefetch.me;
  A.prefetch.me = r => { _pf && _pf(r); loadMine(); };
  // 我的頁面：馬上畫出來，冒險進度在背景載入後補上
  const _me = A.views.me;
  A.views.me = (r, stage) => {
    const done = _me(r, stage);
    if (logged()) Promise.all([loadMine(), done]).then(fillSlot);
    return done;
  };
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('.xp-wk'); if (!b) return;
    b.disabled = true;
    try { const r = await Backend.claimWeekly(); SFX.play('fanfare'); sparkle(e.clientX, e.clientY, 24); toast(t('wk_got', { n: r.xp }), '🗓'); A.refreshStats && A.refreshStats(); changed(); await loadMine(true); fillSlot(); }
    catch (x) { b.disabled = false; toast(x.message, '✕'); }
  });

  /* ---------- 排名賽：對戰結束時回報結果（雙方都回報一樣才算） ---------- */
  A.pvpResult = async (room, oppUid, iWon) => {
    if (!logged() || iWon == null) return;
    try {
      const r = await Backend.pvpReport(room, oppUid, iWon ? Backend.uid : oppUid);
      // 對方還沒回報時，等一下再確認
      const show = () => toast(iWon ? t('pvp_xp_w') : t('pvp_xp_l'), iWon ? '🏆' : '💪');
      if (r.status === 'ok') { show(); changed(); }
      else if (r.status === 'waiting') setTimeout(async () => { try { const r2 = await Backend.pvpReport(room, oppUid, iWon ? Backend.uid : oppUid); if (r2.status === 'ok' || r2.status === 'done') { show(); changed(); } } catch (x) {} }, 4000);
    } catch (x) {}
  };

  /* ---------- 活動現場加成：打卡時如果是活動當天，問要不要用定位 ---------- */
  if (Backend.checkin && !Backend.checkin._xp) {
    const f = Backend.checkin;
    Backend.checkin = async function (e) {
      const r = await f.apply(this, arguments);
      try {
        const today = A.todayStr(), end = e.endDate || e.date, near = d => Math.abs((new Date(d + 'T00:00') - new Date(today + 'T00:00')) / 864e5) <= 1;
        if (e.date && (near(e.date) || near(end) || (e.date <= today && today <= end))) setTimeout(() => onsite(e), 1600);
      } catch (x) {}
      changed();
      return r;
    };
    Backend.checkin._xp = 1;
  }
  function onsite(e) {
    npc.ask([{ who: 'choco', mood: 'surprised', text: t('os_ask') }], [{ label: '📍 OK!', value: 'yes' }, { label: t('pvp_decline'), value: 'no' }]).then(v => {
      if (v !== 'yes' || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(async p => {
        try {
          const r = await Backend.checkinOnsite(e.id, p.coords.latitude, p.coords.longitude);
          if (r.ok) { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 26); toast(t('os_ok', { n: r.xp }), '📍'); changed(); }
          else toast(r.why === 'too far' ? t('os_far', { km: r.km }) : r.why === 'not today' ? t('os_day') : t('os_fail'), '📍');
        } catch (x) { toast(x.message, '✕'); }
      }, () => toast(t('os_fail'), '📍'), { timeout: 12000, enableHighAccuracy: true });
    });
  }
  // 管理員儲存活動時，順便記下活動的城市座標和日期（現場加成用）
  if (Backend.upsertEvent && !Backend.upsertEvent._xp) {
    const f = Backend.upsertEvent;
    Backend.upsertEvent = async function (e) {
      const r = await f.apply(this, arguments);
      try { const c = A.cityOf(e.country, e.city); if (c && e.date) await Backend.saveEventGeo({ event_id: e.id, lat: c.lat, lon: ((c.lon + 540) % 360) - 180, start_date: e.date, end_date: e.endDate || e.date }); } catch (x) {}
      return r;
    };
    Backend.upsertEvent._xp = 1;
  }

  /* ---------- 活動資訊糾錯 ---------- */
  A.cardExtras3 = e => (Backend.enabled ? `<button class="btn sm" data-act="evreport" data-ev="${esc(e.id)}">${PXI.img('event/report', '⚠')} ${t('rp_btn')}</button>` : '');
  const _act = A.onCardAct;
  A.onCardAct = (a, ev, tg, redraw) => {
    if (a !== 'evreport') return _act ? _act(a, ev, tg, redraw) : false;
    if (!logged()) { Player.prompt(); return true; }
    const body = h(`<form class="form" novalidate><p class="full"><b>${esc(ev.name)}</b></p><label class="field full"><textarea class="input" name="t" maxlength="300" rows="4" placeholder="${esc(t('rp_ev_ph'))}"></textarea></label>
      <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn yellow">${t('rp_send')}</button></div></div></form>`);
    const m = modal({ title: t('rp_ev_t'), color: 'yellow', body });
    body.onsubmit = async x => {
      x.preventDefault(); const v = body.elements.t.value.trim(); if (v.length < 2) return;
      try { await Backend.reportEvent(ev.id, v); m.close(); SFX.play('coin'); toast(t('rp_ev_sent'), '⚠'); } catch (y) { body.querySelector('.err').textContent = '✕ ' + (/too many/.test(y.message) ? t('cr_e_many') : /spam/.test(y.message) ? t('fr_spam') : y.message); }
    };
    return true;
  };
  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'evrep', label: () => '⚠ ' + t('rp_admin'),
    draw: async (pane, fail) => {
      let rows = []; try { rows = await Backend.eventReports(); } catch (x) { return fail(x); }
      const ps = {}; try { (await Backend.playersByIds([...new Set(rows.map(r => r.user_id))])).forEach(p => (ps[p.user_id] = p)); } catch (x) {}
      pane.innerHTML = rows.length ? '' : `<p class="note">${t('adm_none')}</p>`;
      rows.forEach(r => {
        const ev = Store.get(r.event_id), p = ps[r.user_id] || {};
        const el = h(`<div class="fo-review"><div class="fo-meta"><b>${esc(ev ? ev.name : r.event_id)}</b><span class="tm">${new Date(r.created_at).toLocaleString()}</span></div>
          <p>${esc(r.text)}</p><p class="note">— ${esc(p.name || '?')} @${esc(p.handle || '')}</p>
          <div class="btn-row"><button class="btn sm green ok">✓ ${t('rp_ok')}</button><button class="btn sm no">${t('rp_no')}</button>${ev ? `<button class="btn sm ed">✎ ${t('b_edit')}</button>` : ''}</div></div>`);
        el.querySelector('.ok').onclick = async () => { try { await Backend.reviewEventReport(r.id, true); toast(t('adm_done'), '✔'); el.remove(); } catch (x) { fail(x); } };
        el.querySelector('.no').onclick = async () => { try { await Backend.reviewEventReport(r.id, false); el.remove(); } catch (x) { fail(x); } };
        const ed = el.querySelector('.ed'); if (ed) ed.onclick = () => A.openForm(ev);
        pane.appendChild(el);
      });
    }
  });

  /* ---------- 舞團：等級、本週經驗、每週排行 ---------- */
  A.crewXpHTML = async id => {
    try { const x = await Backend.crewXp(id); const lv = Math.floor(Math.sqrt((x.total || 0) / 100)) + 1; return `<span class="tag pin">${t('crew_lv', { n: lv })}</span> <span class="tag">${t('crew_wk', { n: x.week || 0 })}</span>`; } catch (x) { return ''; }
  };
  A.crewRankHTML = async () => {
    try {
      const rows = (await Backend.crewWeekRank()).filter(r => r.xp > 0).slice(0, 10);
      if (!rows.length) return '';
      return `<div class="win">${UI.winHTML('🏆 ' + t('crew_rank_t'), 'yellow', false)}<div class="win-body"><ol class="xp-board crew-board">${rows.map((r, i) => `<li><a href="#/crew/${r.crew_id}">${['🥇', '🥈', '🥉'][i] || i + 1 + '.'} ${esc(r.name)}</a><b>${r.xp} XP</b></li>`).join('')}</ol><p class="note">${t('crew_rank_note')}</p></div></div>`;
    } catch (x) { return ''; }
  };
  // 舞團頁面畫好之後補上等級 / 排行
  new MutationObserver(async () => {
    const r = A.current; if (!r || r.view !== 'crew') return;
    const inner = document.querySelector('.city-inner'); if (!inner || inner.dataset.xp === location.hash) return;
    if (!inner.querySelector('.win')) return;
    inner.dataset.xp = location.hash;
    if (r.arg && r.arg[0]) { const html = await A.crewXpHTML(+r.arg[0]); const nm = inner.querySelector('.cr-name'); if (nm && html) nm.insertAdjacentHTML('afterend', `<div class="cr-xp">${html}</div>`); }
    else { const html = await A.crewRankHTML(); const first = inner.querySelector('.win'); if (first && html) first.insertAdjacentHTML('afterend', html); }
  }).observe(document.getElementById('stage'), { childList: true, subtree: true });

  // 啟動：結算上週舞團排行、檢查成就
  if (Backend.enabled) {
    Backend.ready.then(() => Player.ready).then(() => {
      Backend.crewWeekSettle().catch(() => {});
      setTimeout(checkAch, 5000);
    });
    Player.onChange(() => setTimeout(checkAch, 3000));
  }

  return { changed, checkAch, achName };
})();
