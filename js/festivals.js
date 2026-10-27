/* =========================================================
 * 節慶活動（#/fest）
 * - 自動偵測今天是什麼節日（獎勵由伺服器的節日日曆判斷，不能作弊）
 * - 節日期間登入 + 當天每日任務全清 → 節日限定稱號
 * - 新年紅包（藏在網站各頁）、情人節雙人任務、中秋烤肉 cypher（組隊）、暑假百日練舞、4/29 世界舞蹈日打卡地圖
 * - 裝飾：十二月島上積雪
 * 節慶造型圖到了以後，換上 assets/avatar_v1/fest/ 的配件即可
 * ========================================================= */
window.Festivals = (() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;

  /* ---------- 節日日曆（畫面用；獎勵以伺服器的 fest_days 為準） ---------- */
  // 每個節日活動大約兩週，最後一天就是節日當天；跨年接在聖誕節後面（12/26 ~ 隔年 1/1）
  const FIXED = { valentine: ['02-01', '02-14'], danceday: ['04-16', '04-29'], hiphop: ['07-29', '08-11'], halloween: ['10-18', '10-31'], xmas: ['12-12', '12-25'] };
  const LUNAR = { 2027: ['2027-01-24', '2027-02-06'], 2028: ['2028-01-13', '2028-01-26'] };
  const MOON = { 2027: ['2027-09-02', '2027-09-15'], 2028: ['2028-09-20', '2028-10-03'] };
  const ORDER = ['newyear', 'lunar', 'valentine', 'danceday', 'summer100', 'hiphop', 'moon', 'halloween', 'xmas'];
  // 有專屬圖示就用，沒有就用後面那個（第三批圖示到了會自動換上）
  const ICON = { newyear: ['fest/newyear'], lunar: ['fest/lunar'], valentine: ['fest/valentine'], danceday: ['fest/danceday', 'xp/island'], summer100: ['fest/summer', 'xp/streak'], hiphop: ['fest/hiphop', 'fest/party'], moon: ['fest/moon', 'fest/party'], halloween: ['fest/halloween'], xmas: ['fest/xmas'] };
  const FALLBACK = { newyear: '★', lunar: '☆', valentine: '♡', danceday: '♪', summer100: '★', hiphop: '♪', moon: '☾', halloween: '☆', xmas: '★' };
  const ymd = d => A.ymd(d);
  const addDays = (s, n) => ymd(new Date(new Date(s + 'T00:00:00').getTime() + n * 864e5));
  function windowOf(fid, year) {
    if (fid === 'newyear') return [`${year}-12-26`, `${year + 1}-01-01`];
    if (FIXED[fid]) return [`${year}-${FIXED[fid][0]}`, `${year}-${FIXED[fid][1]}`];
    if (fid === 'summer100') return [`${year}-07-01`, addDays(`${year}-07-01`, 99)];
    if (fid === 'lunar') return LUNAR[year] || null;
    if (fid === 'moon') return MOON[year] || null;
    return null;
  }
  // 今天所在的活動期間（跨年會跨到隔年，所以也看前一年）
  const curWindow = (f, today = A.todayStr()) => { const y = +today.slice(0, 4); return [windowOf(f, y), windowOf(f, y - 1)].find(w => w && today >= w[0] && today <= w[1]) || null; };
  const active = (today = A.todayStr()) => ORDER.filter(f => curWindow(f, today));
  // 節日當天（活動最後一天；跨年顯示 12/31）
  const mainDay = (f, w) => (f === 'newyear' ? w[0].slice(0, 4) + '-12-31' : f === 'summer100' ? w[0] : w[1]);
  const upcoming = (today = A.todayStr()) => {
    const y = +today.slice(0, 4), out = [];
    [y, y + 1].forEach(yy => ORDER.forEach(f => { const w = windowOf(f, yy); if (w && w[0] > today) out.push({ f, w }); }));
    return out.sort((a, b) => a.w[0].localeCompare(b.w[0])).slice(0, 6);
  };
  const icon = f => PXI.img(ICON[f].find(PXI.has) || '', FALLBACK[f]);

  I18N.extend({
    zh: {
      fs_wear: '去掛上稱號', fs_wear_tip: '拿到「{t}」了！到「編輯角色 → 稱號」就能掛在名字旁邊喔，特別稱號會發光 ★', hub_fest: '節慶活動', fs_title: '🎪 節慶活動', fs_now: '進行中的節日', fs_none_now: '現在沒有進行中的節日，看看接下來的節日吧！', fs_next: '接下來的節日', fs_days: '還有 {n} 天',
      fs_newyear: '跨年', fs_lunar: '農曆新年', fs_valentine: '情人節', fs_danceday: '世界舞蹈日', fs_summer100: '暑假百日練舞挑戰', fs_hiphop: 'Hip Hop 生日週', fs_moon: '中秋節', fs_halloween: '萬聖節', fs_xmas: '聖誕節',
      fs_q_title: '節日期間登入，並把今天的每日任務全部解完 → 限定稱號「{t}」+50 XP', fs_claim: '領取', fs_claimed: '已領取 ✔', fs_got: '🎉 拿到節日限定稱號「{t}」！+{n} XP', fs_e_quests: '先把今天的每日任務全部解完再來領喔！', fs_e_today: '今天不是活動期間',
      fs_q_rp: '新年紅包：每天有 3 個紅包藏在網站的各個頁面，找到一個 +8 XP', fs_rp_found: '今天找到 {n} / 3 個', fs_rp_got: '🧧 找到紅包了！+{n} XP', fs_rp_tip: '紅包會在你逛不同頁面時突然出現，看到就快點它！',
      fs_q_val: '情人節雙人任務：跟一位朋友組隊練舞（集合時間在情人節期間）→ +80 XP 和稱號', fs_q_moon: '中秋烤肉 Cypher：揪人組隊一起跳（集合時間在中秋期間）→ +80 XP 和稱號', fs_go_party: '去組隊', fs_e_party: '還沒找到符合的隊伍：要 2 人以上、集合時間在節日期間',
      fs_q_100: '每天練完舞按一下「今天練舞了」，累積 30 / 60 / 100 天有獎勵（+50 / +100 / +300 XP，100 天拿稱號「百日練舞王」）', fs_practice: '今天練舞了！', fs_practiced: '今天已經打卡 ✔', fs_p_n: '已經練了 {n} / 100 天', fs_p_got: '🔥 累積 {d} 天！+{n} XP',
      fs_q_dd: '在世界地圖上打卡「我在這裡跳舞」，看看全世界的舞者都在哪裡！（+30 XP 和稱號）', fs_dd_here: '📍 用我的位置打卡', fs_dd_pick: '或選城市打卡', fs_dd_go: '打卡', fs_dd_n: '全世界已經有 {n} 位舞者打卡', fs_dd_done: '你今年已經打過卡了 ✔', fs_dd_ok: '🌍 打卡成功！+30 XP',
      fs_q_only: '這個節日的限定稱號和裝飾', fs_banner: '{f}進行中！點這裡看節慶任務 ▶', fs_login: '登入角色後才能參加節慶任務',
      fs_k1: '{f}到了！島上有限定任務，解完就能拿到只有這段時間才有的稱號喔！', fs_k2: '快去看看節慶活動頁，不要錯過了！'
    },
    en: {
      fs_wear: 'Wear title', fs_wear_tip: 'You got “{t}”! Go to Edit character → Titles to show it next to your name ★', hub_fest: 'Festivals', fs_title: '🎪 Festival events', fs_now: 'Happening now', fs_none_now: 'No festival right now — here’s what’s coming up!', fs_next: 'Coming up', fs_days: 'in {n} days',
      fs_newyear: 'New Year’s Eve', fs_lunar: 'Lunar New Year', fs_valentine: 'Valentine’s Day', fs_danceday: 'International Dance Day', fs_summer100: '100-Day Summer Practice', fs_hiphop: 'Hip Hop Birthday Week', fs_moon: 'Mid-Autumn Festival', fs_halloween: 'Halloween', fs_xmas: 'Christmas',
      fs_q_title: 'Log in during the festival and clear today’s daily quests → limited title “{t}” +50 XP', fs_claim: 'Claim', fs_claimed: 'Claimed ✔', fs_got: '🎉 Festival title “{t}” unlocked! +{n} XP', fs_e_quests: 'Clear all of today’s daily quests first!', fs_e_today: 'The festival isn’t on today',
      fs_q_rp: 'Red packets: 3 are hidden around the site every day, +8 XP each', fs_rp_found: '{n} / 3 found today', fs_rp_got: '🧧 Red packet found! +{n} XP', fs_rp_tip: 'Red packets pop up as you browse different pages — tap them quickly!',
      fs_q_val: 'Valentine duo quest: practice in a party with a friend (meet-up during the festival) → +80 XP and a title', fs_q_moon: 'Mid-Autumn BBQ cypher: form a party and dance together (meet-up during the festival) → +80 XP and a title', fs_go_party: 'Find a party', fs_e_party: 'No matching party yet: 2+ members, meeting during the festival',
      fs_q_100: 'Tap “I practiced today” after each practice — 30 / 60 / 100 days give +50 / +100 / +300 XP, and 100 days unlocks “Practice King”', fs_practice: 'I practiced today!', fs_practiced: 'Checked in today ✔', fs_p_n: '{n} / 100 days', fs_p_got: '🔥 {d} days! +{n} XP',
      fs_q_dd: 'Pin “I’m dancing here” on the world map and see where dancers are! (+30 XP and a title)', fs_dd_here: '📍 Use my location', fs_dd_pick: 'or pick a city', fs_dd_go: 'Pin', fs_dd_n: '{n} dancers pinned worldwide', fs_dd_done: 'You’ve pinned this year ✔', fs_dd_ok: '🌍 Pinned! +30 XP',
      fs_q_only: 'Limited title and decorations for this festival', fs_banner: '{f} is on! Tap for festival quests ▶', fs_login: 'Create a character to join festival quests',
      fs_k1: 'It’s {f}! The island has limited-time quests — clear them for a title you can only get now!', fs_k2: 'Check the festival page so you don’t miss out!'
    },
    ja: {
      fs_wear: '称号をつける', fs_wear_tip: '「{t}」ゲット！「キャラ編集 → 称号」で名前の横につけられるよ ★', hub_fest: 'イベント', fs_title: '🎪 季節イベント', fs_now: '開催中', fs_none_now: '今は開催中のイベントはありません。次のイベントをチェック！', fs_next: 'これからのイベント', fs_days: 'あと {n} 日',
      fs_newyear: '年越し', fs_lunar: '旧正月', fs_valentine: 'バレンタイン', fs_danceday: '国際ダンスデー', fs_summer100: '夏休み 100 日練習チャレンジ', fs_hiphop: 'ヒップホップ誕生週間', fs_moon: '中秋節', fs_halloween: 'ハロウィン', fs_xmas: 'クリスマス',
      fs_q_title: '期間中にログインして今日のデイリークエストを全部クリア → 限定称号「{t}」+50 XP', fs_claim: '受け取る', fs_claimed: '受け取り済み ✔', fs_got: '🎉 限定称号「{t}」を獲得！+{n} XP', fs_e_quests: '先に今日のデイリークエストを全部クリアしよう！', fs_e_today: '今日は期間外です',
      fs_q_rp: 'お年玉：毎日 3 つ、サイトのどこかに隠れています。見つけたら +8 XP', fs_rp_found: '今日 {n} / 3 個', fs_rp_got: '🧧 お年玉発見！+{n} XP', fs_rp_tip: 'いろんなページを見ているとお年玉が現れます。見つけたらすぐタップ！',
      fs_q_val: 'バレンタイン二人クエスト：友達とパーティーを組んで練習（集合が期間中）→ +80 XP と称号', fs_q_moon: '中秋 BBQ サイファー：パーティーを組んで踊ろう（集合が期間中）→ +80 XP と称号', fs_go_party: 'パーティーへ', fs_e_party: '条件に合うパーティーがありません：2 人以上・集合が期間中',
      fs_q_100: '練習したら「今日練習した」を押そう。30 / 60 / 100 日で +50 / +100 / +300 XP、100 日で称号「百日練習王」', fs_practice: '今日練習した！', fs_practiced: '今日は記録済み ✔', fs_p_n: '{n} / 100 日', fs_p_got: '🔥 {d} 日達成！+{n} XP',
      fs_q_dd: '世界地図に「ここで踊ってる」をピン！世界中のダンサーの場所を見よう（+30 XP と称号）', fs_dd_here: '📍 現在地でピン', fs_dd_pick: 'または都市を選ぶ', fs_dd_go: 'ピン', fs_dd_n: '世界で {n} 人がピン', fs_dd_done: '今年はピン済み ✔', fs_dd_ok: '🌍 ピンしました！+30 XP',
      fs_q_only: 'このイベントの限定称号とデコレーション', fs_banner: '{f}開催中！タップしてイベントクエストへ ▶', fs_login: 'キャラを作るとイベントに参加できます',
      fs_k1: '{f}だよ！期間限定のクエストをクリアすると、今しか取れない称号がもらえるよ！', fs_k2: 'イベントページを見逃さないでね！'
    },
    ko: {
      fs_wear: '칭호 달기', fs_wear_tip: '「{t}」 획득! 「캐릭터 편집 → 칭호」에서 이름 옆에 달 수 있어요 ★', hub_fest: '시즌 이벤트', fs_title: '🎪 시즌 이벤트', fs_now: '진행 중', fs_none_now: '지금은 진행 중인 이벤트가 없어요. 다음 이벤트를 확인해 보세요!', fs_next: '다가오는 이벤트', fs_days: '{n}일 남음',
      fs_newyear: '새해 카운트다운', fs_lunar: '설날', fs_valentine: '밸런타인데이', fs_danceday: '세계 무용의 날', fs_summer100: '여름 100일 연습 챌린지', fs_hiphop: '힙합 생일 주간', fs_moon: '추석', fs_halloween: '할로윈', fs_xmas: '크리스마스',
      fs_q_title: '기간 중 접속하고 오늘 일일 퀘스트를 모두 완료 → 한정 칭호 「{t}」 +50 XP', fs_claim: '받기', fs_claimed: '받음 ✔', fs_got: '🎉 한정 칭호 「{t}」 획득! +{n} XP', fs_e_quests: '오늘 일일 퀘스트를 먼저 모두 완료하세요!', fs_e_today: '오늘은 이벤트 기간이 아니에요',
      fs_q_rp: '세뱃돈 봉투: 매일 3개가 사이트 곳곳에 숨어 있어요. 찾으면 +8 XP', fs_rp_found: '오늘 {n} / 3개', fs_rp_got: '🧧 봉투 발견! +{n} XP', fs_rp_tip: '여러 페이지를 둘러보다 보면 봉투가 나타나요. 보이면 바로 누르세요!',
      fs_q_val: '밸런타인 2인 퀘스트: 친구와 파티를 짜서 연습 (집합이 기간 중) → +80 XP와 칭호', fs_q_moon: '추석 바비큐 사이퍼: 파티를 짜서 함께 춤춰요 (집합이 기간 중) → +80 XP와 칭호', fs_go_party: '파티 찾기', fs_e_party: '조건에 맞는 파티가 없어요: 2명 이상, 집합이 기간 중',
      fs_q_100: '연습한 날 「오늘 연습했어요」를 누르세요. 30 / 60 / 100일에 +50 / +100 / +300 XP, 100일이면 칭호 「백일 연습왕」', fs_practice: '오늘 연습했어요!', fs_practiced: '오늘 체크 완료 ✔', fs_p_n: '{n} / 100일', fs_p_got: '🔥 {d}일 달성! +{n} XP',
      fs_q_dd: '세계 지도에 「여기서 춤추는 중」을 핀! 전 세계 댄서가 어디 있는지 보세요 (+30 XP와 칭호)', fs_dd_here: '📍 내 위치로 핀', fs_dd_pick: '또는 도시 선택', fs_dd_go: '핀', fs_dd_n: '전 세계 {n}명이 핀', fs_dd_done: '올해는 이미 핀했어요 ✔', fs_dd_ok: '🌍 핀 완료! +30 XP',
      fs_q_only: '이 이벤트의 한정 칭호와 장식', fs_banner: '{f} 진행 중! 눌러서 이벤트 퀘스트 보기 ▶', fs_login: '캐릭터를 만들면 이벤트에 참여할 수 있어요',
      fs_k1: '{f}예요! 기간 한정 퀘스트를 깨면 지금만 받을 수 있는 칭호를 줘요!', fs_k2: '이벤트 페이지를 놓치지 마세요!'
    }
  });
  const fname = f => t('fs_' + f);
  const titleName = f => (window.Titles && Titles.label ? Titles.label('r_f_' + f) : fname(f));
  const err = x => { const m = String(x && x.message || x); if (/quests first/.test(m)) return t('fs_e_quests'); if (/not today/.test(m)) return t('fs_e_today'); if (/no party/.test(m)) return t('fs_e_party'); if (/need character/.test(m)) return t('fs_login'); if (/duplicate|unique/.test(m)) return t('fs_dd_done'); return m; };
  const claimedKey = f => `danceIsland.fest.${Backend.uid}.${f}.${((curWindow(f) || [])[1] || A.todayStr()).slice(0, 4)}`;
  const isClaimed = f => { try { return !!localStorage.getItem(claimedKey(f)); } catch (e) { return false; } };
  const setClaimed = f => { try { localStorage.setItem(claimedKey(f), '1'); } catch (e) {} };

  // 領到稱號：馬上加進自己的稱號清單，並提醒去哪裡掛
  const wearBtn0 = () => `<button class="btn sm yellow fs-wear">★ ${t('fs_wear')}</button>`;
  function gotTitle(f) {
    try { if (Player.me) { if (!(Player.me.unlocks instanceof Set)) Player.me.unlocks = new Set(Player.me.unlocks || []); Player.me.unlocks.add('r_f_' + f); } } catch (e) {}
    setTimeout(() => npc.say([{ who: 'kailyn', mood: 'celebrate', text: t('fs_wear_tip', { t: titleName(f) }) }]), 1500);
  }
  /* ---------- 新年紅包：逛頁面時偶爾跳出來 ---------- */
  const rpKey = () => `danceIsland.rp.${Backend.uid}.${A.todayStr()}`;
  const rpFound = () => { try { return +localStorage.getItem(rpKey()) || 0; } catch (e) { return 0; } };
  function maybeRedPacket() {
    if (!logged() || !active().includes('lunar') || rpFound() >= 3 || document.querySelector('.fs-rp') || Math.random() > 0.35) return;
    const b = h(`<button class="fs-rp" aria-label="red packet" style="left:${10 + Math.random() * 75}vw;top:${25 + Math.random() * 50}vh">${PXI.img('fest/lunar', '<span class="fs-rp-box"></span>')}</button>`);
    document.body.appendChild(b);
    b.onclick = async () => {
      b.remove(); const k = rpFound() + 1;
      try { const n = await Backend.rpc('fest_redpacket', { k }); try { localStorage.setItem(rpKey(), k); } catch (e) {} if (n > 0) { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 20); toast(t('fs_rp_got', { n }), PXI.img('fest/lunar', '★')); window.XP && XP.changed && XP.changed(); } } catch (e) {}
    };
    setTimeout(() => b.remove(), 12000);
  }
  window.addEventListener('hashchange', () => setTimeout(maybeRedPacket, 1500));

  /* ---------- 節慶活動頁 ---------- */
  A.crumbs.fest = () => '🎪 ' + t('hub_fest');
  A.views.fest = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    const today = A.todayStr(), now = active(today), next = upcoming(today);
    const card = f => {
      const w = curWindow(f, today);
      let quests = '';
      if (f !== 'summer100') quests += quest('title', t('fs_q_title', { t: titleName(f) }), isClaimed(f) ? `<span class="tag">${t('fs_claimed')}</span>${wearBtn0()}` : `<button class="btn sm pink fs-claim" data-f="${f}">${t('fs_claim')}</button>`);
      if (f === 'lunar') quests += quest('rp', t('fs_q_rp'), `<span class="tag">${t('fs_rp_found', { n: rpFound() })}</span>`, t('fs_rp_tip'));
      if (f === 'valentine' || f === 'moon') quests += quest('party', t(f === 'valentine' ? 'fs_q_val' : 'fs_q_moon'), `<a class="btn sm" href="#/party">${t('fs_go_party')}</a><button class="btn sm yellow fs-party" data-f="${f}">${t('fs_claim')}</button>`);
      if (f === 'summer100') quests += `<div class="fs-q"><p>${t('fs_q_100')}</p><div class="fs-100"></div></div>`;
      if (f === 'danceday') quests += `<div class="fs-q"><p>${t('fs_q_dd')}</p><div class="fs-dd"></div></div>`;
      return `<div class="win fs-card" data-f="${f}">${UI.winHTML(`${icon(f)} ${esc(fname(f))}`, 'pink', false)}<div class="win-body">
        <p class="note">${esc(w[0].slice(5).replace('-', '/'))} ～ ${esc(w[1].slice(5).replace('-', '/'))}</p>${logged() ? quests : `<p class="note">${t('fs_login')}</p><button class="btn pink fs-login">🔑 ${t('login')}</button>`}</div></div>`;
    };
    const quest = (k, text, act, tip) => `<div class="fs-q"><p>${esc(text)}</p>${tip ? `<p class="note">${esc(tip)}</p>` : ''}<div class="btn-row">${act}</div></div>`;
    inner.innerHTML = `${look() ? `<div class="fs-hero" style="background-image:url('${art(look(), 'banner.webp')}')"></div>` : ''}<div class="win">${UI.winHTML(t('fs_title'), 'pink', false)}<div class="win-body"><h4>${t('fs_now')}</h4>${now.length ? '' : `<p class="note">${t('fs_none_now')}</p>`}</div></div>
      ${now.map(card).join('')}
      <div class="win">${UI.winHTML(t('fs_next'), 'teal', false)}<div class="win-body"><ul class="fs-next">${next.map(x => `<li>${icon(x.f)} <b>${esc(fname(x.f))}</b><span>${esc(mainDay(x.f, x.w).replace(/-/g, '/'))} <small>(${esc(x.w[0].slice(5).replace('-', '/'))} ~ ${esc(x.w[1].slice(5).replace('-', '/'))})</small></span><small>${t('fs_days', { n: Math.ceil((new Date(x.w[0] + 'T00:00:00') - new Date(today + 'T00:00:00')) / 864e5) })}</small></li>`).join('')}</ul></div></div>`;
    const on = (s, fn) => inner.querySelectorAll(s).forEach(b => (b.onclick = () => fn(b)));
    const bindWear = () => on('.fs-wear', () => Player.openMenu('title'));
    bindWear();
    on('.fs-login', () => Player.prompt());
    on('.fs-claim', async b => {
      try { const r2 = await Backend.rpc('fest_claim', { f: b.dataset.f }); setClaimed(b.dataset.f); gotTitle(b.dataset.f); SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 26); toast(t('fs_got', { t: titleName(b.dataset.f), n: r2.xp }), '🎉'); b.outerHTML = `<span class="tag">${t('fs_claimed')}</span>${wearBtn0()}`; bindWear(); window.XP && XP.changed && XP.changed(); }
      catch (x) { toast(err(x), '✕'); }
    });
    on('.fs-party', async b => {
      try { const n = await Backend.rpc('fest_party_claim', { f: b.dataset.f }); gotTitle(b.dataset.f); SFX.play('fanfare'); toast(t('fs_got', { t: titleName(b.dataset.f), n }), '🎉'); b.disabled = true; b.insertAdjacentHTML('afterend', wearBtn0()); bindWear(); } catch (x) { toast(err(x), '✕'); }
    });
    const p100 = inner.querySelector('.fs-100'); if (p100 && logged()) practice(p100);
    const dd = inner.querySelector('.fs-dd'); if (dd) danceday(dd);
  };

  /* ---------- 暑假百日練舞 ---------- */
  async function practice(el) {
    let n = 0, done = false;
    try { const rows = await Backend.myPractice(+A.todayStr().slice(0, 4)); n = rows.length; done = rows.some(r => r.day === A.todayStr()); } catch (e) {}
    el.innerHTML = `<div class="xpbar"><i style="width:${Math.min(100, n)}%"></i></div><p>${t('fs_p_n', { n })}</p>
      <div class="fs-ms">${[30, 60, 100].map(d => `<span class="tag ${n >= d ? 'on' : ''}">${PXI.img('fest/day' + d, '★')} ${d}</span>`).join('')}</div>
      ${done ? `<span class="tag">${t('fs_practiced')}</span>` : `<button class="btn pink fs-prac">${t('fs_practice')}</button>`}`;
    const b = el.querySelector('.fs-prac');
    if (b) b.onclick = async () => {
      try {
        await Backend.logPractice(); SFX.play('coin');
        const r = await Backend.rpc('fest_practice_claim');
        (r.got || []).forEach((g, i) => setTimeout(() => { SFX.play('fanfare'); toast(t('fs_p_got', { d: g.days, n: g.xp }), '🔥'); }, i * 1200));
        practice(el); window.XP && XP.changed && XP.changed();
      } catch (x) { toast(err(x), '✕'); }
    };
  }

  /* ---------- 4/29 世界舞蹈日打卡地圖 ---------- */
  async function danceday(el) {
    const y = +A.todayStr().slice(0, 4);
    let pins = []; try { pins = await Backend.dancedayPins(y); } catch (e) {}
    const mine = pins.find(p => p.user_id === Backend.uid);
    const M = window.Daily && Daily.map;
    el.innerHTML = `<p><b>${t('fs_dd_n', { n: pins.length })}</b></p>
      ${!logged() ? '' : mine ? `<p class="tag">${t('fs_dd_done')}</p>` : `<div class="btn-row"><button class="btn pink fs-dd-here">${t('fs_dd_here')}</button></div>
        <div class="btn-row"><span class="note">${t('fs_dd_pick')}</span>${M ? `<select class="input sm fs-cc">${M.countryOpts((Backend.profile && Backend.profile.nat) || 'TW')}</select><select class="input sm fs-city"></select>` : ''}<button class="btn sm fs-dd-go">${t('fs_dd_go')}</button></div>`}
      <div class="sd-map fs-ddmap"></div>`;
    if (!M) return;
    const cc = el.querySelector('.fs-cc'), city = el.querySelector('.fs-city');
    if (cc) { const fill = () => { city.innerHTML = M.cityOpts(cc.value, ''); }; cc.onchange = fill; fill(); }
    const pin = async (lat, lon, country, cityId) => {
      try { await Backend.dancedayPin({ lat, lon, country, city: cityId || null }); SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 26); toast(t('fs_dd_ok'), '🌍'); danceday(el); window.XP && XP.changed && XP.changed(); }
      catch (x) { toast(err(x), '✕'); }
    };
    const here = el.querySelector('.fs-dd-here');
    if (here) here.onclick = async () => {
      try {
        const [lat, lon] = await M.locate();
        let best = null, bd = 1e9; GEO.countries.forEach(k => (k.cities || []).forEach(ci => { const d = M.km(lat, lon, ci.lat, ((ci.lon + 540) % 360) - 180); if (d < bd) { bd = d; best = { cc: k.code, city: ci.id }; } }));
        pin(lat, lon, best ? best.cc : 'TW', best && best.city);
      } catch (x) { toast(t('sd_geo_fail'), '📍'); }
    };
    const go = el.querySelector('.fs-dd-go');
    if (go) go.onclick = () => { const [lat, lon] = M.cityCenter(cc.value, city.value); pin(lat, lon, cc.value, city.value); };
    M.makeMap(el.querySelector('.fs-ddmap'), [20, 121], 2).then(({ L, map }) => {
      pins.forEach(p => L.circleMarker([p.lat, p.lon], { radius: 6, color: '#2a1f2e', weight: 2, fillColor: p.user_id === Backend.uid ? '#f07ca3' : '#eac45a', fillOpacity: 1 }).addTo(map).bindPopup(esc((p.author || {}).name || '')));
    }).catch(() => {});
  }

  /* ---------- 節日美術（橫幅、地圖小物件、飄落效果、嚮導節日裝） ---------- */
  // 有畫好美術的節日；測試用：網址加 ?fest=xmas，或 localStorage danceIsland.festLook = xmas（off 關掉）
  const ART = ['xmas', 'newyear', 'lunar', 'halloween', 'valentine', 'moon'];
  const forced = () => {
    try { const q = new URLSearchParams(location.search).get('fest'); if (q) localStorage.setItem('danceIsland.festLook', q); return localStorage.getItem('danceIsland.festLook') || ''; } catch (e) { return ''; }
  };
  const look = () => { const f = forced(); if (f === 'off') return null; if (ART.includes(f)) return f; return active().find(x => ART.includes(x)) || null; };
  const art = (f, n) => `assets/fest/${f}/${n}?v=1`;
  // 嚮導：開心 / 慶祝的表情換成節日裝
  const guideArt = (who, mood) => {
    const f = look(); if (!f) return null;
    const ok = who === 'choco' ? ['cheer', 'peace', 'love', 'thumbs', 'celebrate', 'happy'] : ['celebrate', 'cheer', 'happy', 'love'];
    return ok.includes(mood) ? art(f, who + '_face.webp') : null;
  };
  // 世界地圖：大陸上擺節日小物件 + 畫面飄落小東西
  function decorateWorld(world, L, C, view) {
    const f = look(); if (!f) return;
    const H = (i, k) => PX.hash(i, k);
    const land = (gx, gy) => gx >= 0 && gy >= 0 && gx < L.GW && gy < L.GH && L.ids[gy * L.GW + gx] > 0;
    const S = 13, HS = 6;   // 物件大小（格）、一半
    const used = [];
    // 地圖小物件：目前的圖太陽春，先關掉（新圖到了把 PROPS 改成 true）
    const PROPS = false;
    const big = !PROPS ? [] : L.info.map((f2, i) => [f2, i]).filter(([f2]) => f2 && f2.n > 260).sort((a, b) => b[0].n - a[0].n).slice(0, 16);
    let k = 0;
    big.forEach(([fi, i]) => {
      const cp = L.comps[fi.comp]; if (!cp) return;
      const el = [...world.querySelectorAll('.isle')].find(e => e._k === fi.comp);
      for (let tries = 0; tries < 30; tries++) {
        const gx = Math.floor(fi.x0 + H(i * 31 + tries, 41) * (fi.x1 - fi.x0)), gy = Math.floor(fi.y0 + H(i * 31 + tries, 43) * (fi.y1 - fi.y0));
        // 腳下和四周都要是陸地，離國名遠一點，不要互相疊到
        if (!(land(gx, gy) && land(gx - HS, gy) && land(gx + HS, gy) && land(gx, gy - S) && land(gx - HS, gy - S) && land(gx + HS, gy - S))) continue;
        if (Math.hypot(gx - fi.cx, gy - fi.cy) < 6) continue;
        if (used.some(([ux, uy]) => Math.hypot(ux - gx, uy - gy) < S * 2.2)) continue;
        used.push([gx, gy]);
        const host = el ? el.querySelector('.float') : null; if (!host) break;
        const im = document.createElement('img');
        im.className = 'fs-prop'; im.alt = ''; im.decoding = 'async';
        im.src = art(f, `prop_${(k++ % 5) + 1}.png`);
        im.style.left = (gx - cp.x0 - S / 2) * C + 'px'; im.style.top = (gy - cp.y0 - S) * C + 'px';
        im.style.width = im.style.height = S * C + 'px';
        host.appendChild(im);
        break;
      }
    });
    // 飄落效果（固定在畫面上，不跟著地圖縮放）
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lite = matchMedia('(max-width: 1024px), (pointer: coarse)').matches;
    const fx = document.createElement('div'); fx.className = 'fs-fx'; fx.setAttribute('aria-hidden', 'true');
    const n = lite ? 10 : 18;
    for (let i = 0; i < n; i++) {
      const im = document.createElement('img'); im.alt = ''; im.src = art(f, `fx_${(i % 3) + 1}.png`);
      const dur = 10 + Math.random() * 9, sz = 24 + Math.round(Math.random() * 12);
      im.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${sz}px;height:${sz}px;animation-duration:${dur.toFixed(1)}s,${(2.5 + Math.random() * 2).toFixed(1)}s;animation-delay:${(-Math.random() * dur).toFixed(1)}s,0s`;
      fx.appendChild(im);
    }
    view.appendChild(fx);
  }

  /* ---------- 開機畫面、登入視窗的節日樣式 ---------- */
  const ACCENT = { xmas: '#d9534f', newyear: '#eac45a', lunar: '#d9534f', halloween: '#f08c3a', valentine: '#f07ca3', moon: '#eac45a' };
  const fxRain = (host, f, n) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fx = document.createElement('div'); fx.className = 'fs-fx'; fx.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) {
      const im = document.createElement('img'); im.alt = ''; im.src = art(f, `fx_${(i % 3) + 1}.png`);
      const dur = 10 + Math.random() * 9, sz = 22 + Math.round(Math.random() * 12);
      im.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${sz}px;height:${sz}px;animation-duration:${dur.toFixed(1)}s,${(2.5 + Math.random() * 2).toFixed(1)}s;animation-delay:${(-Math.random() * dur).toFixed(1)}s,0s`;
      fx.appendChild(im);
    }
    host.appendChild(fx);
  };
  function decorateBoot() {
    const f = look(), boot = document.getElementById('boot'); if (!f || !boot || boot.classList.contains('fs-boot')) return;
    boot.classList.add('fs-boot'); boot.style.setProperty('--fs-c', ACCENT[f]);
    const logo = boot.querySelector('.boot-logo'); if (logo) logo.style.backgroundImage = `url('${art(f, 'banner.webp')}')`;
    fxRain(boot, f, innerWidth < 760 ? 10 : 16);
    boot.insertAdjacentHTML('beforeend', `<img class="fs-boot-k" src="${art(f, 'kailyn.webp')}" alt=""><img class="fs-boot-c" src="${art(f, 'choco.webp')}" alt="">`);
  }
  // 等所有程式都載入完（日期工具在 app.js）再裝飾；出錯也不能影響網站
  const safeBoot = () => { try { decorateBoot(); } catch (e) { console.warn(e); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeBoot); else setTimeout(safeBoot, 0);
  // 登入視窗（選擇冒險者）：上面的圖換成節日橫幅＋節日裝的凱琳
  function decorateChoose(body, m) {
    const f = look(); if (!f) return;
    const a = body.querySelector('.choose-art'); if (!a) return;
    a.classList.add('fs-choose'); a.style.backgroundImage = `url('${art(f, 'banner.webp')}')`;
    const k = a.querySelector('.choose-k'); if (k) k.src = art(f, 'kailyn.webp');
    const win = m && m.el && m.el.closest('.modal'); if (win) win.style.setProperty('--fs-c', ACCENT[f]), win.classList.add('fs-modal');
  }

  /* ---------- 今天首頁的節日橫幅、第一次遇到節日的對話 ---------- */
  const bannerHTML = () => {
    const now = active(), f = look();
    if (f) { const ff = now.includes(f) ? f : (now[0] || f); return `<a class="fs-banner fs-banner-art" href="#/fest" style="background-image:url('${art(f, 'banner.webp')}')"><span>${icon(ff)} ${esc(t('fs_banner', { f: fname(ff) }))}</span></a>`; }
    return now.length ? `<a class="fs-banner" href="#/fest">${icon(now[0])} ${esc(t('fs_banner', { f: fname(now[0]) }))}</a>` : '';
  };
  const introOnce = () => {
    const now = active(); if (!now.length) return;
    const k = 'danceIsland.festIntro.' + now[0] + '.' + curWindow(now[0])[1];
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (e) { return; }
    setTimeout(() => npc.say([{ who: 'kailyn', mood: 'celebrate', text: t('fs_k1', { f: fname(now[0]) }) }, { who: 'choco', mood: 'thumbs', text: t('fs_k2') }]), 6000);
  };
  if (Backend.enabled) Backend.ready.then(() => setTimeout(introOnce, 3000));

  /* ---------- 裝飾：十二月島上積雪 ---------- */
  const islandPal = () => (A.todayStr().slice(5, 7) === '12' || look() === 'xmas' ? { grass: '#eef3fb', grass2: '#dde7f5', grassHi: '#ffffff' } : null);

  return { active, upcoming, bannerHTML, islandPal, windowOf, mainDay, look, guideArt, decorateWorld, art, decorateChoose };
})();
