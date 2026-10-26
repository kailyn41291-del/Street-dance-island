/* =========================================================
 * 更多 RPG 對話
 * - 第一次逛到各個頁面：Kailyn 和 Choco 出來介紹
 * - 升級、解成就：慶祝對話
 * - 地圖上偶爾出現的神秘路人：可以聊天拿小彩蛋 XP（每天最多 3 次）
 * ========================================================= */
window.RPG = (() => {
  const { npc, toast, sparkle } = UI;
  const K = (text, mood) => ({ who: 'kailyn', mood, text });
  const C = (text, mood) => ({ who: 'choco', mood, text });

  I18N.extend({
    zh: {
      rpg_studios: ['歡迎來到舞蹈教室地圖！全世界的舞蹈教室都在這裡 (๑•̀ㅂ•́)و✧', '想找地方上課，就用國家、城市或舞風篩選看看吧！'],
      rpg_party: ['這裡是組隊佈告欄！想找人一起練舞，就在這裡貼一張 ＼(≧▽≦)／', '加入隊伍以後會有隊伍聊天室，集合前可以先聊聊喔。'],
      rpg_market: ['歡迎光臨跳蚤市場～二手舞鞋、衣服、配件都可以在這裡交易 (＾▽＾)', '每件商品都會經過管理員確認，交易時記得當面確認東西喔！'],
      rpg_spots: ['這是練舞秘境地圖！公園、捷運站、廣場……大家常去練舞的地方都在這 ♪', '知道好地方的話，也可以分享給大家！'],
      rpg_relay: ['每週動作接力！每個人接著上一個人的動作再加一招 (ง •̀_•́)ง', '一週結束時，大家最愛的接力會拿到獎勵喔！'],
      rpg_mentor: ['這裡是師徒系統。厲害的舞者可以收徒弟，新手可以找師父 (人´∀`)', '一起完成目標的話，師父和徒弟都會拿到經驗值！'],
      rpg_idance: ['iDance 比賽專區！這裡會整理比賽資訊和結果 ☆', '記得常常回來看看喔～'],
      rpg_bracket: ['這是賽程表工具！輸入參賽者就能自動排好對戰表 (•̀ᴗ•́)و', '做好以後還可以匯出成 PDF，比賽當天超方便！'],
      rpg_today: ['這裡是「今天」頁面，今天島上發生的事都整理在這裡 (｀・ω・´)ノ', '每天來看一下，就不會錯過活動跟任務囉！'],
      rpg_fest: ['節慶活動頁！每到節日，島上就會有限定任務和限定稱號 ＼(≧▽≦)／', '有些稱號錯過了就要再等一年喔，快點把握！'],
      rpg_crew: ['舞團廣場！可以找舞團、加入舞團，或是自己創一個 ♪', '跟團員一起解任務，舞團等級也會變高喔！'],
      rpg_forum: ['這裡是論壇，大家會在這裡討論舞蹈的大小事 (・ω・)', '有問題也可以發問，島民們都很熱心的！'],
      rpg_lv: ['恭喜升到 Lv.{n}！你越來越強了 ＼(≧▽≦)／', '照這個速度，很快就能挑戰更厲害的對手了！'],
      rpg_lv_big: ['哇！Lv.{n}！這可是很少人能到的等級 (☆▽☆)', '整座島都在為你歡呼喔！'],
      rpg_ach: ['解鎖成就「{a}」！做得好 (•̀ᴗ•́)و', '成就都可以在「我的」頁面看到喔～'],
      rpg_w_hi: ['……嘿，你看得到我？', '我是傳說中到處流浪的神秘舞者 (⌐■_■)'],
      rpg_w_q: '要做什麼？', rpg_w_battle: '來一場 Battle！', rpg_w_secret: '告訴我一個秘密', rpg_w_bye: '下次見',
      rpg_w_secrets: ['聽說每年 8/11 是 Hip Hop 的生日，那天島上會特別熱鬧喔。', '練 Freeze 的秘訣是……核心！核心！還是核心！', '有人說在地圖上散步走到海邊，會遇到奇怪的東西……', '跳舞最重要的不是動作，是你聽到音樂時的那份開心 ♪', '每天解完任務的人，運氣好像都會變好喔～', '其實 Kailyn 練舞的時候常常偷吃零食 (・x・)'],
      rpg_w_got: '神秘舞者送你一點經驗值！+{n} XP', rpg_w_none: '（今天已經聽了很多秘密了，明天再來吧）', rpg_w_bye_l: '有緣再見啦～ (｀・ω・´)ノ'
    },
    en: {
      rpg_studios: ['Welcome to the studio map! Dance studios from all over the world are here (๑•̀ㅂ•́)و✧', 'Looking for classes? Filter by country, city or style!'],
      rpg_party: ['This is the party board! Want someone to practice with? Post here ＼(≧▽≦)／', 'Once you join a party you get a party chat — say hi before meeting up.'],
      rpg_market: ['Welcome to the flea market~ trade used dance shoes, clothes and gear here (＾▽＾)', 'Every item is checked by an admin. Always check things in person when you trade!'],
      rpg_spots: ['This is the practice-spot map! Parks, stations, plazas… where dancers like to practice ♪', 'Know a good spot? Share it with everyone!'],
      rpg_relay: ['Weekly move relay! Everyone adds one move after the last person (ง •̀_•́)ง', 'The favorite relay of the week gets a reward!'],
      rpg_mentor: ['This is the mentor system. Skilled dancers take apprentices, beginners find a mentor (人´∀`)', 'Reach goals together and both of you earn XP!'],
      rpg_idance: ['The iDance corner! Competition info and results live here ☆', 'Come back often~'],
      rpg_bracket: ['This is the bracket tool! Enter the dancers and the battles are set up for you (•̀ᴗ•́)و', 'You can export it as a PDF too — super handy on event day!'],
      rpg_today: ['This is the Today page — everything happening on the island today (｀・ω・´)ノ', 'Check in daily and you won’t miss events or quests!'],
      rpg_fest: ['The festival page! Each festival brings limited quests and titles ＼(≧▽≦)／', 'Miss one and you’ll wait a whole year, so don’t miss out!'],
      rpg_crew: ['Crew plaza! Find a crew, join one, or start your own ♪', 'Clear quests with your crew to level it up!'],
      rpg_forum: ['This is the forum, where everyone talks about dance (・ω・)', 'Ask anything — the islanders are super helpful!'],
      rpg_lv: ['Congrats on Lv.{n}! You’re getting stronger ＼(≧▽≦)／', 'At this pace you’ll be taking on tougher rivals soon!'],
      rpg_lv_big: ['Whoa! Lv.{n}! Very few dancers get this far (☆▽☆)', 'The whole island is cheering for you!'],
      rpg_ach: ['Achievement “{a}” unlocked! Nice (•̀ᴗ•́)و', 'You can see all your achievements on your page~'],
      rpg_w_hi: ['…Hey, you can see me?', 'I’m the legendary wandering dancer (⌐■_■)'],
      rpg_w_q: 'What do you want?', rpg_w_battle: 'Battle me!', rpg_w_secret: 'Tell me a secret', rpg_w_bye: 'See you',
      rpg_w_secrets: ['They say August 11 is Hip Hop’s birthday — the island gets extra lively.', 'The secret to freezes is… core! Core! And more core!', 'Rumor has it if you walk to the sea on the map, you’ll find something strange…', 'Dancing isn’t about moves — it’s the joy you feel when the music hits ♪', 'People who clear their daily quests seem to get luckier~', 'Kailyn sneaks snacks during practice, you know (・x・)'],
      rpg_w_got: 'The mystery dancer gave you some XP! +{n} XP', rpg_w_none: '(You’ve heard plenty of secrets today — come back tomorrow)', rpg_w_bye_l: 'Until next time~ (｀・ω・´)ノ'
    },
    ja: {
      rpg_studios: ['ダンススタジオマップへようこそ！世界中のスタジオが載ってるよ (๑•̀ㅂ•́)و✧', 'レッスンを探すなら、国・都市・ジャンルで絞り込んでみてね！'],
      rpg_party: ['ここはパーティー掲示板！一緒に練習する仲間を探すならここに貼ってね ＼(≧▽≦)／', 'パーティーに入るとチャットが使えるよ。集合前に話してみよう。'],
      rpg_market: ['フリマへようこそ～中古のダンスシューズや服、小物をやりとりできるよ (＾▽＾)', '商品はぜんぶ管理者がチェックしてるよ。取引のときは直接確認してね！'],
      rpg_spots: ['練習スポットマップだよ！公園や駅、広場……みんながよく練習する場所 ♪', 'いい場所を知ってたらシェアしてね！'],
      rpg_relay: ['毎週のムーブリレー！前の人の動きに一つずつ技を足していくよ (ง •̀_•́)ง', '週の終わりに一番人気のリレーにはごほうびがあるよ！'],
      rpg_mentor: ['ここは師弟システム。うまいダンサーは弟子をとれて、初心者は師匠を探せるよ (人´∀`)', '一緒に目標を達成すると、二人とも XP がもらえるよ！'],
      rpg_idance: ['iDance コーナー！大会の情報と結果をまとめてるよ ☆', 'またチェックしに来てね～'],
      rpg_bracket: ['トーナメント表ツールだよ！参加者を入れると対戦表を自動で作るよ (•̀ᴗ•́)و', 'PDF にも出せるから、大会当日に便利！'],
      rpg_today: ['ここは「今日」のページ。今日の島のできごとがまとまってるよ (｀・ω・´)ノ', '毎日見ればイベントもクエストも見逃さない！'],
      rpg_fest: ['季節イベントのページ！イベントのたびに限定クエストと称号があるよ ＼(≧▽≦)／', '逃すと一年待ちだから、お見逃しなく！'],
      rpg_crew: ['クルー広場！クルーを探したり、入ったり、作ったりできるよ ♪', 'メンバーとクエストをクリアするとクルーのレベルも上がるよ！'],
      rpg_forum: ['ここは掲示板。みんながダンスのことを話してるよ (・ω・)', '質問も大歓迎、島のみんなは親切だよ！'],
      rpg_lv: ['Lv.{n} おめでとう！どんどん強くなってるね ＼(≧▽≦)／', 'この調子なら、もっと強い相手にも挑めるよ！'],
      rpg_lv_big: ['わあ！Lv.{n}！ここまで来る人はなかなかいないよ (☆▽☆)', '島じゅうがあなたを応援してるよ！'],
      rpg_ach: ['実績「{a}」解除！やったね (•̀ᴗ•́)و', '実績はマイページで見られるよ～'],
      rpg_w_hi: ['……ねえ、ボクが見えるの？', 'ボクは伝説のさすらいダンサーさ (⌐■_■)'],
      rpg_w_q: 'どうする？', rpg_w_battle: 'バトルしよう！', rpg_w_secret: '秘密を教えて', rpg_w_bye: 'またね',
      rpg_w_secrets: ['毎年 8/11 はヒップホップの誕生日なんだって。その日は島がにぎやかになるよ。', 'フリーズのコツは……体幹！体幹！そして体幹！', 'マップを散歩して海まで行くと、不思議なものに会えるらしい……', 'ダンスで大事なのは技じゃなくて、音楽を聴いたときのワクワクだよ ♪', '毎日クエストをクリアする人は、運がよくなるみたい～', '実は Kailyn、練習中によくおやつをつまみ食いしてるんだ (・x・)'],
      rpg_w_got: 'さすらいダンサーが XP をくれた！+{n} XP', rpg_w_none: '（今日はもうたくさん秘密を聞いたね、また明日）', rpg_w_bye_l: 'またどこかで～ (｀・ω・´)ノ'
    },
    ko: {
      rpg_studios: ['댄스 스튜디오 지도에 온 걸 환영해요! 전 세계 스튜디오가 여기 다 있어요 (๑•̀ㅂ•́)و✧', '수업을 찾는다면 나라, 도시, 장르로 골라 보세요!'],
      rpg_party: ['여기는 파티 게시판! 같이 연습할 사람을 찾으면 여기 올려요 ＼(≧▽≦)／', '파티에 들어가면 파티 채팅이 생겨요. 모이기 전에 인사해 봐요.'],
      rpg_market: ['벼룩시장에 어서 오세요~ 중고 댄스화, 옷, 소품을 거래할 수 있어요 (＾▽＾)', '모든 상품은 관리자가 확인해요. 거래할 땐 꼭 직접 확인하세요!'],
      rpg_spots: ['연습 장소 지도예요! 공원, 역, 광장… 댄서들이 자주 가는 곳 ♪', '좋은 곳을 알면 모두에게 공유해 주세요!'],
      rpg_relay: ['매주 무브 릴레이! 앞사람 동작에 한 가지씩 더해 가요 (ง •̀_•́)ง', '한 주가 끝나면 가장 인기 있는 릴레이에 보상이 있어요!'],
      rpg_mentor: ['여기는 사제 시스템이에요. 잘하는 댄서는 제자를, 초보는 스승을 찾을 수 있어요 (人´∀`)', '함께 목표를 이루면 둘 다 XP를 받아요!'],
      rpg_idance: ['iDance 코너! 대회 정보와 결과를 모아 뒀어요 ☆', '자주 들러 주세요~'],
      rpg_bracket: ['대진표 도구예요! 참가자를 넣으면 대진이 자동으로 짜여요 (•̀ᴗ•́)و', 'PDF로도 뽑을 수 있어서 대회 날 정말 편해요!'],
      rpg_today: ['여기는 「오늘」 페이지, 오늘 섬에서 일어나는 일을 모았어요 (｀・ω・´)ノ', '매일 보면 이벤트도 퀘스트도 놓치지 않아요!'],
      rpg_fest: ['시즌 이벤트 페이지! 이벤트마다 한정 퀘스트와 칭호가 있어요 ＼(≧▽≦)／', '놓치면 1년을 기다려야 하니 꼭 챙기세요!'],
      rpg_crew: ['크루 광장! 크루를 찾거나, 가입하거나, 직접 만들 수 있어요 ♪', '크루원과 퀘스트를 깨면 크루 레벨도 올라가요!'],
      rpg_forum: ['여기는 게시판, 모두 춤 이야기를 나눠요 (・ω・)', '궁금한 건 물어보세요, 섬 주민들이 친절해요!'],
      rpg_lv: ['Lv.{n} 달성 축하해요! 점점 강해지고 있어요 ＼(≧▽≦)／', '이 속도라면 곧 더 강한 상대에게 도전할 수 있어요!'],
      rpg_lv_big: ['와! Lv.{n}! 여기까지 오는 사람은 정말 드물어요 (☆▽☆)', '섬 전체가 당신을 응원하고 있어요!'],
      rpg_ach: ['업적 「{a}」 달성! 잘했어요 (•̀ᴗ•́)و', '업적은 내 페이지에서 볼 수 있어요~'],
      rpg_w_hi: ['……어, 내가 보여?', '나는 전설의 떠돌이 댄서야 (⌐■_■)'],
      rpg_w_q: '뭐 할래?', rpg_w_battle: '배틀하자!', rpg_w_secret: '비밀 알려 줘', rpg_w_bye: '다음에 봐',
      rpg_w_secrets: ['매년 8월 11일은 힙합의 생일이래. 그날은 섬이 특히 북적여.', '프리즈의 비결은… 코어! 코어! 그리고 코어!', '지도에서 산책해서 바다까지 가면 이상한 걸 만난대…', '춤에서 중요한 건 동작이 아니라 음악을 들을 때의 신남이야 ♪', '매일 퀘스트를 깨는 사람은 운이 좋아지는 것 같아~', '사실 Kailyn은 연습하면서 간식을 몰래 먹어 (・x・)'],
      rpg_w_got: '떠돌이 댄서가 XP를 줬어요! +{n} XP', rpg_w_none: '(오늘은 비밀을 많이 들었네, 내일 또 와)', rpg_w_bye_l: '또 만나자~ (｀・ω・´)ノ'
    }
  });

  // 對話框或彈出視窗已經開著的時候就不打擾
  const busy = () => !!document.querySelector('.modal-back, .tut, #npc:not(.hidden)');
  const once = k => { try { const key = 'danceIsland.rpg.' + k; if (localStorage.getItem(key)) return false; localStorage.setItem(key, '1'); return true; } catch (e) { return false; } };
  const fill = (x, v) => (v ? String(x).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? '')) : x);
  const pair = (key, vars, m1 = 'happy', m2 = 'thumbs') => { const L = [].concat(t(key, vars)).map(x => fill(x, vars)); return L.length > 1 ? [K(L[0], m1), C(L[1], m2)] : [K(L[0], m1)]; };

  /* ---------- 第一次逛到某個頁面 ---------- */
  const INTRO = { studios: 'happy', party: 'cheer', market: 'happy', spots: 'happy', relay: 'cheer', mentor: 'love', idance: 'cool', bracket: 'thumbs', today: 'happy', fest: 'celebrate', crew: 'cheer', forum: 'ok' };
  const routeOf = () => (location.hash.replace(/^#\/?/, '').split('/')[0] || '');
  function intro() {
    const r = routeOf();
    if (!INTRO[r]) return;
    setTimeout(() => {
      if (routeOf() !== r || busy() || !once('intro.' + r)) return;
      npc.say(pair('rpg_' + r, null, INTRO[r]));
    }, 1200);
  }
  window.addEventListener('hashchange', intro);
  setTimeout(intro, 4000);

  /* ---------- 升級、解成就 ---------- */
  function levelUp(lv) {
    if (!once('lv.' + (Backend.uid || '') + '.' + lv)) return;
    setTimeout(() => { if (!busy()) npc.say(pair(lv >= 20 && lv % 5 === 0 ? 'rpg_lv_big' : 'rpg_lv', { n: lv }, 'celebrate', 'cheer')); }, 1600);
  }
  function ach(name) {
    setTimeout(() => { if (!busy()) npc.say(pair('rpg_ach', { a: name }, 'cheer', 'thumbs')); }, 1800);
  }

  /* ---------- 神秘路人 ---------- */
  async function walker(name, battle) {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const hi = t('rpg_w_hi');
    const choice = await npc.ask([{ who: 'kailyn', mood: 'surprised', text: hi[0] }, { who: 'kailyn', mood: 'cool', text: `${name}：${hi[1]}` }, { who: 'kailyn', mood: 'confused', text: t('rpg_w_q') }],
      [{ label: t('rpg_w_battle'), value: 'battle' }, { label: t('rpg_w_secret'), value: 'secret' }, { label: t('rpg_w_bye'), value: 'bye' }]);
    if (choice === 'battle') return battle && battle();
    if (choice === 'bye') return npc.say([{ who: 'kailyn', mood: 'happy', text: t('rpg_w_bye_l') }]);
    let n = 0;
    if (Backend.enabled && Backend.uid && Player.me) { try { n = await Backend.rpc('rpg_egg', { k: 'walker' }); } catch (e) {} }
    npc.say([{ who: 'kailyn', mood: 'smug', text: `${name}：${pick(t('rpg_w_secrets'))}` }].concat(n > 0 ? [] : Player.me ? [{ who: 'kailyn', mood: 'sleepy', text: t('rpg_w_none') }] : []));
    if (n > 0) { SFX.play('coin'); sparkle(innerWidth / 2, innerHeight / 2, 16); toast(t('rpg_w_got', { n }), PXI.img('xp/egg', '★')); window.XP && XP.changed && XP.changed(); }
  }

  return { levelUp, ach, walker, busy };
})();
