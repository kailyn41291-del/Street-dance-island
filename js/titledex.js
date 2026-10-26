/* =========================================================
 * 稱號圖鑑（#/titles）：所有特別稱號一覽、怎麼拿、自己的進度（像任務一樣 0/1、12/30）
 * 每一個都有「導覽」按鈕：Kailyn 說明後帶你去該去的地方
 * 節日稱號不在節日期間時：「現在還沒到專屬節日喔！到時候再來看看吧！」
 * ========================================================= */
(() => {
  const { h, esc, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const L4 = (zh, en, ja, ko) => ({ zh, en, ja, ko });
  const tx = o => o[I18N.lang] || o.zh;

  I18N.extend({
    zh: { hub_titles: '稱號圖鑑', dx_title: '🎖 稱號圖鑑', dx_total: '已收集 {a} / {b} 個稱號', dx_all: '全部', dx_got: '已獲得', dx_not: '還沒拿到', dx_go: '導覽', dx_wear: '掛上', dx_done: '已獲得 ✔',
      dx_guide: '「{c}」就能拿到喔！我帶你過去～', dx_stay: '「{c}」就能拿到喔！加油 (๑•̀ㅂ•́)و✧', dx_fest_not: '現在還沒到專屬節日喔！到時候再來看看吧！', dx_fest_when: '{f}是 {d}，節日任務 {a} ~ {b} 開放，記得回來喔～', dx_fest_go: '{f}進行中！我帶你去節慶活動頁～',
      dx_login: '登入角色後才看得到自己的進度', dx_next: '下一級', dx_max: '最高級了！',
      dx_c_id: '身分', dx_c_daily: '每天都來', dx_c_battle: '對戰', dx_c_event: '活動', dx_c_social: '交朋友', dx_c_create: '分享 / 收集', dx_c_fest: '節日限定', dx_c_honor: '榮譽', dx_c_role: 'DJ / MC / 評審 / 主辦' },
    en: { hub_titles: 'Title book', dx_title: '🎖 Title book', dx_total: '{a} / {b} titles collected', dx_all: 'All', dx_got: 'Earned', dx_not: 'Not yet', dx_go: 'Guide', dx_wear: 'Wear', dx_done: 'Earned ✔',
      dx_guide: '“{c}” and it’s yours! Let me take you there~', dx_stay: '“{c}” and it’s yours! You got this (๑•̀ㅂ•́)و✧', dx_fest_not: 'That festival isn’t here yet! Come back when it starts!', dx_fest_when: '{f} is on {d} — festival quests open {a} ~ {b}, see you then~', dx_fest_go: '{f} is on now! Let me take you to the festival page~',
      dx_login: 'Create a character to see your progress', dx_next: 'Next tier', dx_max: 'Max tier!',
      dx_c_id: 'Identity', dx_c_daily: 'Every day', dx_c_battle: 'Battles', dx_c_event: 'Events', dx_c_social: 'Friends', dx_c_create: 'Share / collect', dx_c_fest: 'Festival only', dx_c_honor: 'Honors', dx_c_role: 'DJ / MC / Judge / Organizer' },
    ja: { hub_titles: '称号図鑑', dx_title: '🎖 称号図鑑', dx_total: '{a} / {b} 個の称号を収集', dx_all: 'すべて', dx_got: '獲得済み', dx_not: '未獲得', dx_go: 'ガイド', dx_wear: 'つける', dx_done: '獲得済み ✔',
      dx_guide: '「{c}」でもらえるよ！案内するね～', dx_stay: '「{c}」でもらえるよ！がんばって (๑•̀ㅂ•́)و✧', dx_fest_not: 'まだそのイベントの時期じゃないよ！始まったらまた見に来てね！', dx_fest_when: '{f}は {d}！イベントクエストは {a} ~ {b}、また来てね～', dx_fest_go: '{f}開催中！イベントページに案内するね～',
      dx_login: 'キャラを作ると進捗が見られます', dx_next: '次のランク', dx_max: '最高ランク！',
      dx_c_id: '身分', dx_c_daily: '毎日', dx_c_battle: 'バトル', dx_c_event: 'イベント', dx_c_social: 'フレンド', dx_c_create: 'シェア / 収集', dx_c_fest: 'イベント限定', dx_c_honor: '栄誉', dx_c_role: 'DJ / MC / ジャッジ / 主催' },
    ko: { hub_titles: '칭호 도감', dx_title: '🎖 칭호 도감', dx_total: '칭호 {a} / {b}개 수집', dx_all: '전체', dx_got: '획득', dx_not: '미획득', dx_go: '안내', dx_wear: '달기', dx_done: '획득 ✔',
      dx_guide: '「{c}」하면 받을 수 있어요! 제가 데려다줄게요~', dx_stay: '「{c}」하면 받을 수 있어요! 화이팅 (๑•̀ㅂ•́)و✧', dx_fest_not: '아직 그 기념일이 아니에요! 그때 다시 와 주세요!', dx_fest_when: '{f}는 {d}예요! 이벤트 퀘스트는 {a} ~ {b}, 그때 꼭 와요~', dx_fest_go: '{f} 진행 중! 이벤트 페이지로 데려다줄게요~',
      dx_login: '캐릭터를 만들면 진행도를 볼 수 있어요', dx_next: '다음 단계', dx_max: '최고 단계!',
      dx_c_id: '신분', dx_c_daily: '매일', dx_c_battle: '배틀', dx_c_event: '이벤트', dx_c_social: '친구', dx_c_create: '공유 / 수집', dx_c_fest: '기념일 한정', dx_c_honor: '명예', dx_c_role: 'DJ / MC / 저지 / 주최' }
  });

  /* 導覽目的地 */
  const nav = r => () => A.nav(r);
  const GO = {
    verify: () => Player.openVerify(), luck: () => Daily.openLuck(), me: nav('#/me'), events: nav('#/events'), walk: () => { A.nav('#/'); setTimeout(() => A.startWalk && A.startWalk(), 900); },
    friends: () => Friends.openPanel(), crew: nav('#/crew'), party: nav('#/party'), card: () => Friends.openCardEditor(), forum: nav('#/forum'), chat: () => Chat.toggle(true),
    mentor: nav('#/mentor'), relay: nav('#/relay'), spots: nav('#/spots'), shoes: () => Collect.openShelf(), apply: () => Collect.openApply(), fest: nav('#/fest'), today: nav('#/today')
  };
  /* 每一個稱號：id、條件說明、進度 key、需要的數量、導覽 */
  const C = (zh, en, ja, ko) => L4(zh, en, ja, ko);
  const RANDOM = ['r_lucky', 'r_spinner', 'r_goldfeet', 'r_cypherking', 'r_vinyl', 'r_rainbow', 'r_moonwalk', 'r_sushi'];
  const T = (k, a, b, c) => ({ tier: k, th: [a, b, c] });
  const CATS = [
    ['id', [
      { id: 'verified', c: C('完成實名認證（IG 認證）', 'Get verified (IG)', '本人認証（IG）を完了', '실명 인증 (IG) 완료'), p: 'verified', n: 1, go: 'verify' },
      { id: 'lv5', c: C('等級到 Lv.5', 'Reach Lv.5', 'Lv.5 になる', 'Lv.5 달성'), p: 'lv', n: 5, go: 'today' },
      { id: 'lv10', c: C('等級到 Lv.10', 'Reach Lv.10', 'Lv.10 になる', 'Lv.10 달성'), p: 'lv', n: 10, go: 'today' },
      { id: 'lv20', c: C('等級到 Lv.20', 'Reach Lv.20', 'Lv.20 になる', 'Lv.20 달성'), p: 'lv', n: 20, go: 'today' }]],
    ['daily', [
      { id: 'r_islander', c: C('連續登入 30 天', 'Log in 30 days in a row', '30 日連続ログイン', '30일 연속 접속'), p: 'streak', n: 30, go: 'today' },
      { id: 'r_week7', c: C('每日幸運卡連續抽 7 天', 'Draw the daily lucky card 7 days in a row', 'デイリーラッキーカードを 7 日連続', '데일리 행운 카드 7일 연속'), p: 'dstreak', n: 7, go: 'luck' },
      ...RANDOM.map(id => ({ id, c: C('每日幸運卡隨機抽中', 'Random prize from the daily lucky card', 'デイリーラッキーカードでランダムに当たる', '데일리 행운 카드에서 랜덤 당첨'), n: 1, go: 'luck' })),
      { id: 'r_challenger', c: C('完成一次「本週挑戰」', 'Clear a weekly challenge', '「今週のチャレンジ」をクリア', '「이번 주 챌린지」 완료'), n: 1, go: 'me' }]],
    ['battle', [
      { id: 'r_npcslayer', c: C('打贏地圖上的路人 NPC 5 次', 'Beat street NPCs 5 times', 'マップの NPC に 5 回勝つ', '지도 NPC에게 5번 승리'), p: 'npc', n: 5, go: 'walk' },
      { id: 'r_npcboss', c: C('打贏地圖上的路人 NPC 30 次', 'Beat street NPCs 30 times', 'マップの NPC に 30 回勝つ', '지도 NPC에게 30번 승리'), p: 'npc', n: 30, go: 'walk' },
      { id: 't_pvp', ...T('pvp', 10, 30, 50), c: C('跟好友打排名賽並獲勝', 'Win ranked battles vs friends', 'フレンドとのランク戦で勝つ', '친구와 랭크전에서 승리'), p: 'pvp', go: 'friends' },
      { id: 't_belt', c: C('上一季排名賽第 1 名', '#1 in last season’s ranked battles', '前シーズンのランク戦 1 位', '지난 시즌 랭크전 1위'), n: 1, go: 'friends' }]],
    ['event', [
      { id: 'r_comp1', c: C('活動打卡 1 場', 'Check in at 1 event', 'イベントで 1 回チェックイン', '이벤트 체크인 1회'), p: 'vet', n: 1, go: 'events' },
      { id: 'r_comp5', c: C('活動打卡 5 場', 'Check in at 5 events', 'イベントで 5 回チェックイン', '이벤트 체크인 5회'), p: 'vet', n: 5, go: 'events' },
      { id: 'r_comp10', c: C('活動打卡 10 場', 'Check in at 10 events', 'イベントで 10 回チェックイン', '이벤트 체크인 10회'), p: 'vet', n: 10, go: 'events' },
      { id: 't_vet', ...T('vet', 15, 25, 40), c: C('活動打卡', 'Event check-ins', 'イベントでチェックイン', '이벤트 체크인'), p: 'vet', go: 'events' },
      { id: 'r_duo', c: C('跟 5 位不同的好友在同一場活動打卡', 'Check in at the same event with 5 different friends', '5 人の違うフレンドと同じイベントでチェックイン', '서로 다른 친구 5명과 같은 이벤트 체크인'), p: 'duo', n: 5, go: 'events' }]],
    ['social', [
      { id: 'r_reliable', c: C('組隊練舞被隊友評為「可靠」5 次', 'Rated “reliable” by party members 5 times', 'パーティーで「頼れる」評価を 5 回', '파티에서 「믿음직」 평가 5회'), p: 'rel', n: 5, go: 'party' },
      { id: 't_crew', ...T('crew', 3, 5, 8), c: C('你的舞團成員人數', 'Members in your crew', 'クルーのメンバー数', '크루 멤버 수'), p: 'crew', go: 'crew' },
      { id: 't_drip', ...T('drip', 10, 30, 50), c: C('名片被按 Like', 'Likes on your card', '名刺の いいね', '명함 좋아요'), p: 'drip', go: 'card' },
      { id: 't_graf', ...T('graf', 10, 30, 50), c: C('論壇文章和回覆被按 Like', 'Likes on forum posts & replies', '掲示板の いいね', '게시판 좋아요'), p: 'graf', go: 'forum' },
      { id: 't_stk', ...T('stk', 30, 80, 150), c: C('在聊天室用貼圖', 'Stickers sent in chat', 'チャットでスタンプ', '채팅 스티커'), p: 'stk', go: 'chat' },
      { id: 'r_master', c: C('當師父，帶徒弟升到 Lv.10 出師', 'Mentor an apprentice to Lv.10', '師匠として弟子を Lv.10 まで育てる', '스승으로 제자를 Lv.10까지'), n: 1, go: 'mentor' },
      { id: 'r_graduate', c: C('當徒弟，跟著師父升到 Lv.10 出師', 'Graduate as an apprentice at Lv.10', '弟子として Lv.10 で卒業', '제자로 Lv.10 졸업'), n: 1, go: 'mentor' },
      { id: 't_hall', ...T('hall', 10, 20, 30), c: C('解鎖成就', 'Achievements unlocked', '実績を解除', '업적 달성'), p: 'hall', go: 'me' }]],
    ['create', [
      { id: 't_relay', ...T('relay', 2, 4, 6), c: C('參加每週動作接力（週數）', 'Weeks in the move relay', 'ムーブリレー参加（週）', '무브 릴레이 참가 (주)'), p: 'relay', go: 'relay' },
      { id: 'r_moveking', c: C('每週動作接力拿到第 1 名', '#1 in a weekly move relay', 'ムーブリレーで週 1 位', '주간 무브 릴레이 1위'), n: 1, go: 'relay' },
      { id: 't_skate', ...T('skate', 1, 2, 3), c: C('分享練舞秘境並通過審核', 'Approved practice spots shared', '練習スポットをシェア（承認）', '연습 장소 공유 (승인)'), p: 'skate', go: 'spots' },
      { id: 't_shoe', ...T('shoe', 4, 8, 12), c: C('收集球鞋（款）', 'Sneakers collected', 'スニーカー収集（種）', '스니커 수집 (종)'), p: 'shoe', go: 'shoes' }]],
    ['fest', ['newyear', 'lunar', 'valentine', 'danceday', 'summer100', 'hiphop', 'moon', 'halloween', 'xmas'].map(f => ({ id: 'r_f_' + f, fest: f, n: 1,
      c: f === 'danceday' ? C('世界舞蹈日期間在世界地圖打卡', 'Pin the world map during Dance Day', 'ダンスデー期間に世界地図にピン', '무용의 날 기간에 세계 지도 핀')
        : f === 'summer100' ? C('暑假百日練舞打卡滿 100 天', 'Practice check-in 100 days in summer', '夏休みに 100 日練習記録', '여름 100일 연습 기록')
        : C('節日期間登入，並把當天每日任務全清', 'Log in during the festival and clear that day’s quests', '期間中にログインしてデイリーを全クリア', '기간 중 접속하고 일일 퀘스트 모두 완료') }))],
    ['honor', [
      { id: 't_champ', c: C('比賽拿到冠軍（截圖私訊網站架設者確認）', 'Win a competition (DM the owner a screenshot)', '大会で優勝（スクショを管理者に DM）', '대회 우승 (스크린샷을 관리자에게 DM)'), n: 1, go: 'honor' },
      { id: 't_podium', c: C('比賽拿到前三名（截圖私訊網站架設者確認）', 'Top 3 in a competition (DM the owner)', '大会で 3 位以内（管理者に DM）', '대회 3위 이내 (관리자에게 DM)'), n: 1, go: 'honor' },
      { id: 't_world', c: C('世界級大賽冠軍', 'Win a world-level competition', '世界大会で優勝', '세계 대회 우승'), n: 1, go: 'honor' }]],
    ['role', [
      { id: 't_id_dj', c: C('申請 DJ 身分，審核通過', 'Apply as a DJ and get approved', 'DJ として申請・承認', 'DJ 신청 후 승인'), n: 1, go: 'apply' },
      { id: 't_id_mc', c: C('申請 MC 身分，審核通過', 'Apply as an MC and get approved', 'MC として申請・承認', 'MC 신청 후 승인'), n: 1, go: 'apply' },
      { id: 't_id_judge', c: C('申請評審身分，審核通過', 'Apply as a judge and get approved', 'ジャッジとして申請・承認', '저지 신청 후 승인'), n: 1, go: 'apply' },
      { id: 't_id_host', c: C('申請主辦身分，審核通過', 'Apply as an organizer and get approved', '主催として申請・承認', '주최자 신청 후 승인'), n: 1, go: 'apply' },
      { id: 't_dj_pop', c: C('認證 DJ ＋ 被 @ 列進 3 場活動的 DJ 陣容', 'Certified DJ + @-listed in 3 events’ DJ line-up', '認定 DJ ＋ 3 イベントの DJ に @ で掲載', '인증 DJ + 3개 이벤트 DJ 라인업에 @ 등록'), n: 1, go: 'apply' },
      { id: 't_mc_pop', c: C('認證 MC ＋ 被 @ 列進 3 場活動的 MC 陣容', 'Certified MC + @-listed in 3 events’ MC line-up', '認定 MC ＋ 3 イベントの MC に @ で掲載', '인증 MC + 3개 이벤트 MC 라인업에 @ 등록'), n: 1, go: 'apply' }]]
  ];

  const S = { filter: 'all', mine: new Set(), prog: {} };
  const has = id => S.mine.has(id) || (id === 'verified' && Player.me && Player.me.verified) || (/^lv\d+$/.test(id) && Player.me && (Player.me.level || 1) >= +id.slice(2));
  const cur = it => (it.p === 'lv' ? (Player.me && Player.me.level) || 1 : it.p === 'verified' ? (S.prog.verified ? 1 : 0) : it.p ? +S.prog[it.p] || 0 : null);

  // 每一列：框（沒拿到是灰色）、條件、進度條、導覽 / 掛上
  function rowHTML(it) {
    let id = it.id, got, n = it.n, now = cur(it), stars = '';
    if (it.tier) {
      const best = [3, 2, 1].find(i => S.mine.has(`t_${it.tier}_${i}`)) || 0;
      id = `t_${it.tier}_${best || 1}`; got = best > 0;
      n = best >= 3 ? it.th[2] : it.th[best];
      stars = `<span class="dx-stars">${[1, 2, 3].map(i => `<i class="${i <= best ? 'on' : ''}">★</i>`).join('')}</span>`;
    } else got = has(id);
    if (now == null) now = got ? 1 : 0;
    const shown = Math.min(now, n), pct = Math.round((shown / n) * 100);
    const label = it.tier ? `${esc(tx(it.c))}　${it.th.join(' / ')}` : esc(tx(it.c));
    return `<li class="dx-row ${got ? 'got' : ''}" data-id="${it.id}"><div class="dx-fr">${Titles.html(id)}</div>
      <div class="dx-info"><div>${label} ${stars}</div>${logged() ? `<div class="dx-prog"><div class="xpbar"><i style="width:${pct}%"></i></div><b>(${shown}/${n})</b>${it.tier && now >= it.th[2] ? `<small>${t('dx_max')}</small>` : ''}</div>` : ''}</div>
      <div class="dx-act">${got ? `<span class="tag">${t('dx_done')}</span><button class="btn sm yellow dx-wear">${t('dx_wear')}</button>` : ''}${!got || (it.tier && now < it.th[2]) ? `<button class="btn sm pink dx-go">${t('dx_go')}</button>` : ''}</div></li>`;
  }

  function guide(it) {
    const say = (text, mood, then) => npc.say([{ who: 'kailyn', mood, text }], then);
    if (it.fest) {
      const now = window.Festivals ? Festivals.active() : [];
      const fn = t('fs_' + it.fest);
      if (now.includes(it.fest)) return say(t('dx_fest_go', { f: fn }), 'celebrate', () => GO.fest());
      const up = window.Festivals && Festivals.upcoming().find(x => x.f === it.fest);
      return npc.say([{ who: 'kailyn', mood: 'sad', text: t('dx_fest_not') }].concat(up ? [{ who: 'choco', mood: 'thumbs', text: t('dx_fest_when', { f: fn, d: Festivals.mainDay(it.fest, up.w).replace(/-/g, '/'), a: up.w[0].slice(5).replace('-', '/'), b: up.w[1].slice(5).replace('-', '/') }) }] : []));
    }
    if (it.go === 'honor') return say(t('dx_stay', { c: tx(it.c) }), 'cheer');
    if (!logged()) return Player.prompt();
    const go = GO[it.go];
    if (it.go === 'today' && it.p === 'streak') return say(t('dx_stay', { c: tx(it.c) }), 'cheer');
    say(t('dx_guide', { c: tx(it.c) }), 'thumbs', () => go && go());
  }

  A.crumbs.titles = () => '🎖 ' + t('hub_titles');
  A.views.titles = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (logged()) {
      try { S.mine = new Set(await Backend.myUnlocks()); Player.me.unlocks = S.mine; } catch (e) { S.mine = Player.me.unlocks instanceof Set ? Player.me.unlocks : new Set(); }
      try { S.prog = (await Backend.rpc('title_progress')) || {}; } catch (e) { S.prog = {}; }
      window.Collect && Collect.checkTitles();
    } else { S.mine = new Set(); S.prog = {}; }
    const all = CATS.flatMap(([, list]) => list.flatMap(it => (it.tier ? [1, 2, 3].map(i => `t_${it.tier}_${i}`) : [it.id])));
    const draw = () => {
      const gotN = all.filter(id => has(id)).length;
      const keep = it => { if (S.filter === 'all') return true; const g = it.tier ? S.mine.has(`t_${it.tier}_1`) : has(it.id); return S.filter === 'got' ? g : !g; };
      inner.innerHTML = `<div class="win">${UI.winHTML(t('dx_title'), 'yellow', false)}<div class="win-body">
          ${logged() ? `<p><b>${t('dx_total', { a: gotN, b: all.length })}</b></p><div class="xpbar"><i style="width:${(gotN / all.length) * 100}%"></i></div>` : `<p class="note">${t('dx_login')}</p>`}
          <div class="chips dx-filter">${['all', 'got', 'not'].map(f => `<button class="chip ${S.filter === f ? 'on' : ''}" data-f="${f}">${t('dx_' + f)}</button>`).join('')}</div></div></div>
        ${CATS.map(([cat, list]) => { const rows = list.filter(keep); return rows.length ? `<div class="win">${UI.winHTML(t('dx_c_' + cat), 'teal', false)}<div class="win-body"><ul class="dx-list">${rows.map(rowHTML).join('')}</ul></div></div>` : ''; }).join('')}`;
    };
    draw();
    inner.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'); if (f) { S.filter = f.dataset.f; SFX.play('select'); return draw(); }
      const li = e.target.closest('.dx-row'); if (!li) return;
      const it = CATS.flatMap(([, l]) => l).find(x => x.id === li.dataset.id); if (!it) return;
      if (e.target.closest('.dx-go')) { SFX.play('select'); guide(it); }
      if (e.target.closest('.dx-wear')) Player.openMenu('title');
    });
  };
})();
