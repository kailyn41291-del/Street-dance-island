/* 多國語言：雙 NPC（Kailyn + Choco）對話、新手任務、分享邀請文字 */
I18N.extend({
  zh: {
    hud_forum: '論壇', hud_battle: '人氣投票',
    nav_map: '地圖', nav_events: '活動', nav_chat: '聊天', nav_me: '我的', 
    guide_choco: '夥伴 Choco',
    tut: [
      '嗨！歡迎來到「舞島 BOOTO」！我是嚮導 Kailyn ✦',
      '我是 Choco！接下來我們兩個帶你跑完新手任務，準備好了嗎？',
      '任務 1：中間這座主島就是「台灣」！點它就能看到各縣市的活動。',
      '任務 2：整個世界都在這裡～拖曳移動，滾輪或兩指縮放。點任何國家就能進去看城市。',
      '任務 3：找不到國家？點左下角的指南針🧭「快速傳送」，可以搜尋國家，或依洲別切換。',
      '任務 4：右下角可以放大縮小、看整個世界。迷路了就按 ⌂ 回台灣！',
      '任務 5：知道哪裡有 Battle 或 Workshop？按「新增活動」登錄進行事曆！',
      '任務 6：練舞累了就來這裡玩小遊戲，也可以找我 Battle，我不會手下留情喔 😎',
      '任務 7：這裡可以切換 中文 / English / 日本語 / 한국어。',
      '最終任務——捏一個屬於你的舞者角色，正式加入舞島吧！'
    ],
    tut_quest: '新手任務',
    welcome_back_c: '{n}，今天也來找 Battle 吧！任務板已經幫你整理好了 👇',
    welcome_new_c: '新夥伴報到！{n}，之後 Cypher 見 ✌',
    quest_npc: [
      { who: 'kailyn', mood: 'thumbs', text: '冒險者，這是本週的任務清單！挑一個去打卡吧 ✦' },
      { who: 'choco', mood: 'cool', text: '這週的 Battle 都在這裡了，報名別拖到最後一天喔。' },
      { who: 'choco', mood: 'think', text: '嗯…這週要去哪一場呢？我全部都想去 🤔' },
      { who: 'kailyn', mood: 'cheer', text: '完成任務（去活動打卡）可以拿經驗值和護照印章喔！' }
    ],
    invite: [
      '【📜 任務委託】\n冒險者，舞島傳來新的挑戰！\n🆚 {name}\n📅 {date}\n📍 {place}\n接下任務 ▶ {url}',
      '【💬 NPC 對話】\nKailyn：「聽說 {place} 有一場超熱的活動！」\nChoco：「是 {name}！{date}，一起去吧 😎」\n▶ {url}',
      '【✨ 野生的街舞活動出現了！】\n{name}\n{date}・{place}\n要怎麼做？\n▶ 前往冒險　{url}'
    ]
  },
  en: {
    hud_forum: 'Forum', hud_battle: 'Battle vote',
    nav_map: 'Map', nav_events: 'Events', nav_chat: 'Chat', nav_me: 'Me', 
    guide_choco: 'Choco',
    tut: [
      "Hi! Welcome to BOOTO! I'm your guide Kailyn ✦",
      "And I'm Choco! We'll walk you through the starter quests. Ready?",
      'Quest 1: The island in the middle is Taiwan! Tap it to see events in every city.',
      'Quest 2: The whole world is here — drag to move, scroll or pinch to zoom. Tap any country to see its cities.',
      "Quest 3: Can't find a country? Tap the compass 🧭 at the bottom left (Fast Travel) to search or browse by continent.",
      'Quest 4: Zoom in and out down here. Lost? Tap ⌂ to return to Taiwan!',
      'Quest 5: Know a battle or workshop? Add it to the calendar with "Add Event"!',
      "Quest 6: Need a break? Play mini games here — or battle me. I won't go easy 😎",
      'Quest 7: Switch between 中文 / English / 日本語 / 한국어 here.',
      'Final quest — create your own dancer and join the island!'
    ],
    tut_quest: 'Starter quests',
    welcome_back_c: "{n}, let's find a battle today! Your quest board is ready 👇",
    welcome_new_c: 'New crew member! See you in the cypher, {n} ✌',
    quest_npc: [
      { who: 'kailyn', mood: 'thumbs', text: 'Adventurer, here are this week’s quests! Pick one and check in ✦' },
      { who: 'choco', mood: 'cool', text: "All of this week's battles are here. Don't wait until the last day to sign up." },
      { who: 'choco', mood: 'think', text: 'Hmm… which one should I hit this week? I want to go to all of them 🤔' },
      { who: 'kailyn', mood: 'cheer', text: 'Complete a quest (check in at an event) to earn XP and passport stamps!' }
    ],
    invite: [
      '[📜 QUEST REQUEST]\nAdventurer, a new challenge has arrived on Booto!\n🆚 {name}\n📅 {date}\n📍 {place}\nAccept quest ▶ {url}',
      '[💬 NPC TALK]\nKailyn: "I heard there\'s a hot event in {place}!"\nChoco: "It\'s {name}! {date} — let\'s go 😎"\n▶ {url}',
      '[✨ A wild dance event appeared!]\n{name}\n{date} · {place}\nWhat will you do?\n▶ GO ON ADVENTURE  {url}'
    ]
  },
  ja: {
    hud_forum: '掲示板', hud_battle: '人気投票',
    nav_map: 'マップ', nav_events: 'イベント', nav_chat: 'チャット', nav_me: 'マイ', 
    guide_choco: '相棒 Choco',
    tut: [
      'やあ！「BOOTO」へようこそ！ガイドの Kailyn だよ ✦',
      'オレは Choco！ふたりでチュートリアルクエストを案内するよ。準備はいい？',
      'クエスト 1：真ん中の島がメインの「台湾」！タップすると各都市のイベントが見られるよ。',
      'クエスト 2：世界中がここに。ドラッグで移動、スクロールやピンチでズーム。どの国もタップで都市が見られる。',
      'クエスト 3：国が見つからない？左下のコンパス🧭「ワープ」で検索したり、大陸ごとに切り替えたりできるよ。',
      'クエスト 4：右下で拡大・縮小。迷ったら ⌂ で台湾に戻ろう！',
      'クエスト 5：バトルやワークショップを知ってる？「イベント追加」でカレンダーに登録しよう！',
      'クエスト 6：休憩はここでミニゲーム。オレとバトルもできるよ、手加減しないけどね 😎',
      'クエスト 7：ここで 中文 / English / 日本語 / 한국어 を切り替えられるよ。',
      '最終クエスト——自分だけのダンサーを作って、島の仲間になろう！'
    ],
    tut_quest: 'チュートリアル',
    welcome_back_c: '{n}、今日もバトルを探そう！クエストボードを用意したよ 👇',
    welcome_new_c: '新しい仲間だ！{n}、サイファーで会おう ✌',
    quest_npc: [
      { who: 'kailyn', mood: 'thumbs', text: '冒険者さん、今週のクエストだよ！ひとつ選んでチェックインしよう ✦' },
      { who: 'choco', mood: 'cool', text: '今週のバトルはここに全部ある。エントリーは早めにね。' },
      { who: 'choco', mood: 'think', text: 'うーん…今週はどれに行こう？全部行きたい 🤔' },
      { who: 'kailyn', mood: 'cheer', text: 'クエスト達成（イベントでチェックイン）で経験値とパスポートのスタンプがもらえるよ！' }
    ],
    invite: [
      '【📜 クエスト依頼】\n冒険者よ、Bootoに新たな挑戦が届いた！\n🆚 {name}\n📅 {date}\n📍 {place}\n依頼を受ける ▶ {url}',
      '【💬 NPC の会話】\nKailyn「{place} ですごいイベントがあるって！」\nChoco「{name} だよ！{date}、一緒に行こう 😎」\n▶ {url}',
      '【✨ やせいの ダンスイベントが あらわれた！】\n{name}\n{date}・{place}\nどうする？\n▶ ぼうけんに でる　{url}'
    ]
  },
  ko: {
    hud_forum: '게시판', hud_battle: '인기 투표',
    nav_map: '지도', nav_events: '이벤트', nav_chat: '채팅', nav_me: '마이', 
    guide_choco: '동료 Choco',
    tut: [
      '안녕! 「BOOTO」에 온 걸 환영해! 나는 가이드 Kailyn ✦',
      '나는 Choco! 우리 둘이 초보자 퀘스트를 안내해 줄게. 준비됐어?',
      '퀘스트 1: 가운데 섬이 메인 섬 「대만」이야! 누르면 각 도시의 이벤트를 볼 수 있어.',
      '퀘스트 2: 전 세계가 여기 있어. 드래그로 이동, 스크롤이나 핀치로 확대/축소. 어느 나라든 누르면 도시가 보여.',
      '퀘스트 3: 나라를 못 찾겠어? 왼쪽 아래 나침반🧭 「순간이동」에서 검색하거나 대륙별로 볼 수 있어.',
      '퀘스트 4: 오른쪽 아래에서 확대/축소. 길을 잃으면 ⌂ 로 대만에 돌아와!',
      '퀘스트 5: 배틀이나 워크숍을 알고 있어? 「이벤트 추가」로 캘린더에 등록해!',
      '퀘스트 6: 쉬고 싶으면 여기서 미니게임. 나랑 배틀도 할 수 있어, 봐주진 않을 거야 😎',
      '퀘스트 7: 여기서 中文 / English / 日本語 / 한국어 를 바꿀 수 있어.',
      '최종 퀘스트 — 나만의 댄서를 만들고 섬의 동료가 되자!'
    ],
    tut_quest: '초보자 퀘스트',
    welcome_back_c: '{n}, 오늘도 배틀 찾으러 가자! 퀘스트 보드 준비했어 👇',
    welcome_new_c: '새 동료 등장! {n}, 사이퍼에서 만나 ✌',
    quest_npc: [
      { who: 'kailyn', mood: 'thumbs', text: '모험가님, 이번 주 퀘스트야! 하나 골라서 체크인해 봐 ✦' },
      { who: 'choco', mood: 'cool', text: '이번 주 배틀은 전부 여기 있어. 신청은 미리미리!' },
      { who: 'choco', mood: 'think', text: '음… 이번 주엔 어디 가지? 다 가고 싶다 🤔' },
      { who: 'kailyn', mood: 'cheer', text: '퀘스트 완료(이벤트 체크인)하면 경험치랑 여권 도장을 받을 수 있어!' }
    ],
    invite: [
      '【📜 퀘스트 의뢰】\n모험가여, Booto에 새로운 도전이 도착했다!\n🆚 {name}\n📅 {date}\n📍 {place}\n의뢰 수락 ▶ {url}',
      '【💬 NPC 대화】\nKailyn: "{place}에서 엄청난 이벤트가 열린대!"\nChoco: "{name}이야! {date}, 같이 가자 😎"\n▶ {url}',
      '【✨ 야생의 댄스 이벤트가 나타났다!】\n{name}\n{date}・{place}\n어떻게 할까?\n▶ 모험을 떠난다　{url}'
    ]
  }
});
