/* =========================================================
 * 稱號系統：玩家可以自由選一個掛在名字旁邊
 * only: 'owner' = 只有網站架設者、'admin' = 管理員以上
 * 想加稱號：照格式加一行（四種語言）
 * ========================================================= */
window.Titles = (() => {
  const LIST = [
    { id: 'owner',    only: 'owner', color: '#eac45a', zh: '網站架設者',        en: 'Island Architect',      ja: 'サイト創設者',        ko: '사이트 창설자' },
    { id: 'admin',    only: 'admin', color: '#b48ae0', zh: '管理員',            en: 'Admin',                 ja: '管理者',              ko: '관리자' },
    { id: 'verified', only: 'verified', zh: '認證舞者', en: 'Verified Dancer', ja: '認証ダンサー', ko: '인증 댄서' },
    { id: 'r_lucky',     only: 'unlock', color: '#7fcf73', zh: '幸運舞者',     en: 'Lucky Dancer',       ja: 'ラッキーダンサー',  ko: '럭키 댄서' },
    { id: 'r_spinner',   only: 'unlock', zh: '人體轉盤',     en: 'Human Spinner',      ja: '人間ルーレット',    ko: '인간 룰렛' },
    { id: 'r_goldfeet',  only: 'unlock', zh: '黃金腳步',     en: 'Golden Feet',        ja: '黄金の足',          ko: '황금 발' },
    { id: 'r_cypherking',only: 'unlock', zh: 'Cypher 之王',  en: 'Cypher King',        ja: 'サイファーキング',  ko: '사이퍼 킹' },
    { id: 'r_vinyl',     only: 'unlock', zh: '黑膠收藏家',   en: 'Vinyl Collector',    ja: 'レコード収集家',    ko: 'LP 수집가' },
    { id: 'r_rainbow',   only: 'unlock', zh: '彩虹 Groove',  en: 'Rainbow Groove',     ja: 'レインボーグルーヴ', ko: '무지개 그루브' },
    { id: 'r_moonwalk',  only: 'unlock', zh: '月球漫步者',   en: 'Moonwalker',         ja: 'ムーンウォーカー',  ko: '문워커' },
    { id: 'r_sushi',     only: 'unlock', zh: '壽司迴轉王',   en: 'Sushi Spinner',      ja: '回転寿司キング',    ko: '회전초밥 킹' },
    { id: 'r_week7',     only: 'unlock', zh: '七日不間斷',   en: '7-Day Streak',       ja: '7日連続',           ko: '7일 연속' },
    { id: 'r_npcslayer', only: 'unlock', zh: 'NPC 終結者', en: 'NPC Slayer', ja: 'NPC キラー', ko: 'NPC 사냥꾼' },
    { id: 'r_npcboss',   only: 'unlock', zh: '街頭魔王',   en: 'Street Boss', ja: 'ストリートの魔王', ko: '스트릿 마왕' },
    { id: 'r_moveking',  only: 'unlock', color: '#eac45a', zh: '本週動作王',   en: 'Move of the Week King', ja: '今週のムーブ王',          ko: '이번 주 무브왕' },
    { id: 'r_master',    only: 'unlock', color: '#ef8a3a', zh: '名師',         en: 'Master',                ja: '名師',                    ko: '명사' },
    { id: 'r_graduate',  only: 'unlock', color: '#7895df', zh: '出師',         en: 'Graduate',              ja: '卒業',                    ko: '졸업' },
    { id: 'r_reliable',  only: 'unlock', color: '#5bb5a6', zh: '可靠隊友',     en: 'Reliable Teammate',     ja: '頼れる仲間',              ko: '믿음직한 팀원' },
    { id: 'r_duo',       only: 'unlock', color: '#f07ca3', zh: '最佳拍檔',     en: 'Best Duo',              ja: '最高の相棒',              ko: '최고의 짝꿍' },
    { id: 'r_f_newyear',   only: 'unlock', color: '#eac45a', zh: '新年第一跳', en: 'First Dance of the Year', ja: '踊り初め', ko: '새해 첫 춤' },
    { id: 'r_f_lunar',     only: 'unlock', color: '#e0503c', zh: '紅包獵人', en: 'Red Packet Hunter', ja: 'お年玉ハンター', ko: '세뱃돈 사냥꾼' },
    { id: 'r_f_valentine', only: 'unlock', color: '#f07ca3', zh: '情人節雙人組', en: 'Valentine Duo', ja: 'バレンタインペア', ko: '밸런타인 듀오' },
    { id: 'r_f_danceday',  only: 'unlock', color: '#7895df', zh: '世界舞蹈日舞者', en: 'Dance Day Dancer', ja: 'ダンスデーのダンサー', ko: '무용의 날 댄서' },
    { id: 'r_f_summer100', only: 'unlock', color: '#ef8a3a', zh: '百日練舞王', en: 'Practice King', ja: '百日練習王', ko: '백일 연습왕' },
    { id: 'r_f_hiphop',    only: 'unlock', color: '#eac45a', zh: 'Hip Hop 壽星', en: 'Hip Hop Birthday Crew', ja: 'ヒップホップ誕生日', ko: '힙합 생일 크루' },
    { id: 'r_f_moon',      only: 'unlock', color: '#f6c96b', zh: '中秋烤肉 Cypher', en: 'Moon BBQ Cypher', ja: '中秋 BBQ サイファー', ko: '추석 바비큐 사이퍼' },
    { id: 'r_f_halloween', only: 'unlock', color: '#a070d0', zh: '萬聖節搗蛋鬼', en: 'Halloween Trickster', ja: 'ハロウィンのいたずらっ子', ko: '할로윈 장난꾸러기' },
    { id: 'r_f_xmas',      only: 'unlock', color: '#5bb5a6', zh: '聖誕舞者', en: 'Christmas Dancer', ja: 'クリスマスダンサー', ko: '크리스마스 댄서' },
    { id: 't_pvp_1', only: 'unlock', tier: 1, zh: 'Battle 之王・銅', en: 'Battle King · Bronze', ja: 'バトルキング・銅', ko: '배틀 킹 · 브론즈' },
    { id: 't_pvp_2', only: 'unlock', tier: 2, zh: 'Battle 之王・銀', en: 'Battle King · Silver', ja: 'バトルキング・銀', ko: '배틀 킹 · 실버' },
    { id: 't_pvp_3', only: 'unlock', tier: 3, zh: 'Battle 之王・金', en: 'Battle King · Gold', ja: 'バトルキング・金', ko: '배틀 킹 · 골드' },
    { id: 't_vet_1', only: 'unlock', tier: 1, zh: 'Battle 狂熱者・銅', en: 'Battle Addict · Bronze', ja: 'バトル狂・銅', ko: '배틀 매니아 · 브론즈' },
    { id: 't_vet_2', only: 'unlock', tier: 2, zh: 'Battle 狂熱者・銀', en: 'Battle Addict · Silver', ja: 'バトル狂・銀', ko: '배틀 매니아 · 실버' },
    { id: 't_vet_3', only: 'unlock', tier: 3, zh: 'Battle 狂熱者・金', en: 'Battle Addict · Gold', ja: 'バトル狂・金', ko: '배틀 매니아 · 골드' },
    { id: 't_hall_1', only: 'unlock', tier: 1, zh: '殿堂舞者・銅', en: 'Hall of Famer · Bronze', ja: '殿堂入りダンサー・銅', ko: '명예의 전당 · 브론즈' },
    { id: 't_hall_2', only: 'unlock', tier: 2, zh: '殿堂舞者・銀', en: 'Hall of Famer · Silver', ja: '殿堂入りダンサー・銀', ko: '명예의 전당 · 실버' },
    { id: 't_hall_3', only: 'unlock', tier: 3, zh: '殿堂舞者・金', en: 'Hall of Famer · Gold', ja: '殿堂入りダンサー・金', ko: '명예의 전당 · 골드' },
    { id: 't_crew_1', only: 'unlock', tier: 1, zh: '傳奇舞團・銅', en: 'Legendary Crew · Bronze', ja: '伝説のクルー・銅', ko: '전설의 크루 · 브론즈' },
    { id: 't_crew_2', only: 'unlock', tier: 2, zh: '傳奇舞團・銀', en: 'Legendary Crew · Silver', ja: '伝説のクルー・銀', ko: '전설의 크루 · 실버' },
    { id: 't_crew_3', only: 'unlock', tier: 3, zh: '傳奇舞團・金', en: 'Legendary Crew · Gold', ja: '伝説のクルー・金', ko: '전설의 크루 · 골드' },
    { id: 't_graf_1', only: 'unlock', tier: 1, zh: '塗鴉之王・銅', en: 'Graffiti King · Bronze', ja: 'グラフィティキング・銅', ko: '그래피티 킹 · 브론즈' },
    { id: 't_graf_2', only: 'unlock', tier: 2, zh: '塗鴉之王・銀', en: 'Graffiti King · Silver', ja: 'グラフィティキング・銀', ko: '그래피티 킹 · 실버' },
    { id: 't_graf_3', only: 'unlock', tier: 3, zh: '塗鴉之王・金', en: 'Graffiti King · Gold', ja: 'グラフィティキング・金', ko: '그래피티 킹 · 골드' },
    { id: 't_drip_1', only: 'unlock', tier: 1, zh: 'Drip King・銅', en: 'Drip King · Bronze', ja: 'Drip King・銅', ko: 'Drip King · 브론즈' },
    { id: 't_drip_2', only: 'unlock', tier: 2, zh: 'Drip King・銀', en: 'Drip King · Silver', ja: 'Drip King・銀', ko: 'Drip King · 실버' },
    { id: 't_drip_3', only: 'unlock', tier: 3, zh: 'Drip King・金', en: 'Drip King · Gold', ja: 'Drip King・金', ko: 'Drip King · 골드' },
    { id: 't_stk_1', only: 'unlock', tier: 1, zh: '貼圖轟炸機・銅', en: 'Sticker Bomber · Bronze', ja: 'スタンプ爆撃機・銅', ko: '스티커 폭격기 · 브론즈' },
    { id: 't_stk_2', only: 'unlock', tier: 2, zh: '貼圖轟炸機・銀', en: 'Sticker Bomber · Silver', ja: 'スタンプ爆撃機・銀', ko: '스티커 폭격기 · 실버' },
    { id: 't_stk_3', only: 'unlock', tier: 3, zh: '貼圖轟炸機・金', en: 'Sticker Bomber · Gold', ja: 'スタンプ爆撃機・金', ko: '스티커 폭격기 · 골드' },
    { id: 't_relay_1', only: 'unlock', tier: 1, zh: '接力常客・銅', en: 'Relay Regular · Bronze', ja: 'リレー常連・銅', ko: '릴레이 단골 · 브론즈' },
    { id: 't_relay_2', only: 'unlock', tier: 2, zh: '接力常客・銀', en: 'Relay Regular · Silver', ja: 'リレー常連・銀', ko: '릴레이 단골 · 실버' },
    { id: 't_relay_3', only: 'unlock', tier: 3, zh: '接力常客・金', en: 'Relay Regular · Gold', ja: 'リレー常連・金', ko: '릴레이 단골 · 골드' },
    { id: 't_skate_1', only: 'unlock', tier: 1, zh: '街頭遊俠・銅', en: 'Street Ranger · Bronze', ja: 'ストリートレンジャー・銅', ko: '스트리트 레인저 · 브론즈' },
    { id: 't_skate_2', only: 'unlock', tier: 2, zh: '街頭遊俠・銀', en: 'Street Ranger · Silver', ja: 'ストリートレンジャー・銀', ko: '스트리트 레인저 · 실버' },
    { id: 't_skate_3', only: 'unlock', tier: 3, zh: '街頭遊俠・金', en: 'Street Ranger · Gold', ja: 'ストリートレンジャー・金', ko: '스트리트 레인저 · 골드' },
    { id: 't_shoe_1', only: 'unlock', tier: 1, zh: '球鞋收藏家・銅', en: 'Sneaker Collector · Bronze', ja: 'スニーカーコレクター・銅', ko: '스니커 컬렉터 · 브론즈' },
    { id: 't_shoe_2', only: 'unlock', tier: 2, zh: '球鞋收藏家・銀', en: 'Sneaker Collector · Silver', ja: 'スニーカーコレクター・銀', ko: '스니커 컬렉터 · 실버' },
    { id: 't_shoe_3', only: 'unlock', tier: 3, zh: '球鞋收藏家・金', en: 'Sneaker Collector · Gold', ja: 'スニーカーコレクター・金', ko: '스니커 컬렉터 · 골드' },
    { id: 't_champ', only: 'unlock', zh: '冠軍', en: 'Champion', ja: 'チャンピオン', ko: '챔피언' },
    { id: 't_podium', only: 'unlock', zh: '頒獎台', en: 'Podium', ja: '表彰台', ko: '시상대' },
    { id: 't_world', only: 'unlock', zh: '世界冠軍', en: 'World Champion', ja: '世界王者', ko: '월드 챔피언' },
    { id: 't_belt', only: 'unlock', zh: '本季腰帶', en: 'Season Belt', ja: 'シーズンベルト', ko: '시즌 벨트' },
    { id: 't_id_dj', only: 'unlock', zh: '認證 DJ', en: 'Certified DJ', ja: '認定 DJ', ko: '인증 DJ' },
    { id: 't_id_mc', only: 'unlock', zh: '認證 MC', en: 'Certified MC', ja: '認定 MC', ko: '인증 MC' },
    { id: 't_id_judge', only: 'unlock', zh: '認證評審', en: 'Certified Judge', ja: '認定ジャッジ', ko: '인증 저지' },
    { id: 't_id_host', only: 'unlock', zh: '認證主辦', en: 'Certified Organizer', ja: '認定オーガナイザー', ko: '인증 주최자' },
    { id: 't_dj_pop', only: 'unlock', zh: '人氣 DJ', en: 'Popular DJ', ja: '人気 DJ', ko: '인기 DJ' },
    { id: 't_mc_pop', only: 'unlock', zh: '派對主持人', en: 'Party MC', ja: 'パーティー MC', ko: '파티 MC' },
    { id: 'r_islander',  only: 'unlock', color: '#8fd3c7', zh: '定居島民',     en: 'Island Resident',       ja: '島に住んでます',          ko: '섬에 정착한 주민' },
    { id: 'r_comp1',     only: 'unlock', zh: '我有比過賽',   en: "I've Battled Before!",  ja: 'バトル出たことあるもん！', ko: '나 배틀 나가봤어!' },
    { id: 'r_comp5',     only: 'unlock', zh: '我真的有比過', en: 'No, Really, I Battled', ja: 'ほんとに出たってば〜',     ko: '진짜 나가봤다니까~' },
    { id: 'r_comp10',    only: 'unlock', color: '#f48fb1', zh: '我超愛比賽', en: 'Battle Lover ♡', ja: 'バトル大好きっ子♡', ko: '배틀 러버♡' },
    { id: 'r_challenger',only: 'unlock', zh: '週週挑戰王',   en: 'Weekly Challenger',     ja: '週チャレ王',              ko: '주간 챌린지왕' },
    { id: 'lv5',  minLv: 5,  zh: '舞島居民',   en: 'Island Local',    ja: '島の住人',     ko: '섬 주민' },
    { id: 'lv10', minLv: 10, zh: '舞島老手',   en: 'Island Veteran',  ja: '島のベテラン', ko: '섬 베테랑' },
    { id: 'lv20', minLv: 20, zh: '舞島傳說',   en: 'Island Legend',   ja: '島の伝説',     ko: '섬의 전설' },
    { id: 'rookie',   zh: '新手舞者',          en: 'Rookie Dancer',        ja: '新人ダンサー',        ko: '신입 댄서' },
    { id: 'floor',    zh: '地板清潔工',        en: 'Floor Sweeper',        ja: '床掃除係',            ko: '바닥 청소부' },
    { id: 'eight',    zh: '八拍收藏家',        en: '8-Count Collector',    ja: '8カウント収集家',      ko: '8카운트 수집가' },
    { id: 'cypher',   zh: 'Cypher 常駐民',     en: 'Cypher Resident',      ja: 'サイファー常連',      ko: '사이퍼 상주민' },
    { id: 'am3',      zh: '凌晨三點還在練',    en: '3AM Practice Club',    ja: '深夜3時の練習生',      ko: '새벽 3시 연습생' },
    { id: 'mirror',   zh: '鏡子是我好朋友',    en: "Mirror's Best Friend", ja: '鏡が親友',            ko: '거울이 베프' },
    { id: 'knees',    zh: '膝蓋已報廢',        en: 'Knees Retired',        ja: '膝はもう限界',        ko: '무릎 은퇴' },
    { id: 'groove',   zh: '律動仙人',          en: 'Groove Sage',          ja: 'グルーヴ仙人',        ko: '그루브 신선' },
    { id: 'ximen',    zh: '西門町地縛靈',      en: 'Ximending Ghost',      ja: '西門町の地縛霊',      ko: '시먼딩 지박령' },
    { id: 'judge',    zh: '評審緣超好',        en: "Judges' Favorite",     ja: 'ジャッジに好かれる人', ko: '심사위원 픽' },
    { id: 'round1',   zh: '一回合傳說',        en: 'One-Round Legend',     ja: '1回戦の伝説',          ko: '1라운드 전설' },
    { id: 'loud',     zh: '場邊最大聲',        en: 'Loudest in the Crowd', ja: '一番うるさい観客',    ko: '응원 데시벨 1위' },
    { id: 'trophy',   zh: '冠軍收割機',        en: 'Trophy Harvester',     ja: 'トロフィー収穫機',    ko: '트로피 수확기' },
    { id: 'sneaker',  zh: '球鞋殺手',          en: 'Sneaker Destroyer',    ja: 'スニーカー破壊王',    ko: '운동화 파괴자' },
    { id: 'catking',  zh: '貓咪舞王',          en: 'Cat Dance King',       ja: '猫のダンス王',        ko: '고양이 댄스왕' },
    { id: 'chihuahua',zh: '吉娃娃戰士',        en: 'Chihuahua Warrior',    ja: 'チワワ戦士',          ko: '치와와 전사' },
    { id: 'hype',     zh: '人體 Hype 機',      en: 'Human Hype Machine',   ja: '人間ハイプマシン',    ko: '인간 하이프 머신' },
    { id: 'drop',     zh: '音樂一下就起肖',    en: 'Loses It at the Drop', ja: 'ドロップで暴走',      ko: '드롭에 미치는 자' },
    { id: 'freeze',   zh: 'Freeze 定格王',     en: 'Freeze Frame King',    ja: 'フリーズ王',          ko: '프리즈 장인' },
    { id: 'spin',     zh: '旋轉不停歇',        en: 'Never Stop Spinning',  ja: '回転止まらない',      ko: '멈추지 않는 회전' },
    { id: 'lock',     zh: '鎖得超緊',          en: 'Locked In',            ja: 'ロック固め',          ko: '꽉 잠긴 락커' },
    { id: 'pop',      zh: '全身都在 Pop',      en: 'Popping All Over',     ja: '全身ポッピン',        ko: '온몸이 팝핑' },
    { id: 'house',    zh: '腳步停不下來',      en: 'Feet on Fire',         ja: '足が止まらない',      ko: '스텝 폭주' },
    { id: 'waack',    zh: '手臂螺旋槳',        en: 'Arm Propeller',        ja: '腕プロペラ',          ko: '팔 프로펠러' },
    { id: 'krump',    zh: '怒氣值 MAX',        en: 'Rage Meter MAX',       ja: '怒りゲージMAX',      ko: '분노 게이지 MAX' },
    { id: 'vogue',    zh: '走秀走到發光',      en: 'Runway Glow',          ja: 'ランウェイの輝き',    ko: '런웨이 발광' },
    { id: 'dj',       zh: 'BPM 控制者',        en: 'BPM Controller',       ja: 'BPM の支配者',        ko: 'BPM 지배자' },
    { id: 'mc',       zh: '麥克風不離手',      en: 'Mic Never Drops',      ja: 'マイクを離さない',    ko: '마이크 홀릭' },
    { id: 'traveler', zh: '世界巡迴中',        en: 'On World Tour',        ja: 'ワールドツアー中',    ko: '월드 투어 중' },
    { id: 'night',    zh: '夜貓派對咖',        en: 'Night Owl Partier',    ja: '夜型パーティー人',    ko: '올빼미 파티러' },
    { id: 'snack',    zh: '只是來吃零食的',    en: 'Just Here for Snacks', ja: 'お菓子目当て',        ko: '간식 먹으러 옴' }
  ];
  const byId = Object.fromEntries(LIST.map(x => [x.id, x]));
  const label = id => { const x = byId[id]; return x ? x[I18N.lang] || x.zh : ''; };
  /** role: 'owner' | 'admin' | null */
  const allowed = (role, verified, unlocks, level = 1) => LIST.filter(x => {
    if (x.minLv) return level >= x.minLv;
    if (!x.only) return true;
    return (x.only === 'admin' && role) || (x.only === 'owner' && role === 'owner') || (x.only === 'verified' && verified) || (x.only === 'unlock' && unlocks && unlocks.has(x.id));
  });
  // 後來拿到的稱號（成就、節慶、等級、認證…）跟一般稱號分開，用顏色和 ★ 標出來
  // 特別稱號的華麗框（assets/title_frames/NN.webp）：[寬, 高, 拉長的那一欄, 上邊框, 下邊框, 可以放字的左邊界, 右邊界]
  // 左右兩端的裝飾固定，中間的框條會跟著稱號長短拉長
  const FR = {"01":[447,120,223,35,28,158,304],"02":[409,120,204,38,27,140,303],"03":[415,120,208,34,32,157,325],"04":[413,120,207,38,31,118,294],"05":[425,120,212,36,33,166,313],"06":[404,120,202,36,33,142,318],"07":[425,120,212,27,39,174,315],"08":[407,120,204,34,39,141,287],"09":[433,120,216,33,38,190,308],"10":[436,120,218,34,29,169,301],"11":[495,120,248,43,17,233,339],"12":[493,120,247,43,15,201,335],"13":[471,120,236,40,25,190,314],"14":[464,120,232,28,34,185,286],"15":[455,120,228,35,23,194,300],"16":[458,120,229,30,30,187,305],"17":[459,120,229,27,32,183,279],"18":[474,120,237,33,26,212,319],"19":[460,120,230,32,27,176,281],"20":[459,120,229,36,30,198,261],"21":[445,120,222,45,24,123,307],"22":[450,120,225,47,23,110,298],"23":[469,120,234,42,19,182,366],"24":[461,120,231,35,20,183,308],"25":[439,120,220,33,30,157,293],"26":[441,120,221,39,24,138,312],"27":[456,120,228,30,30,164,317],"28":[475,120,237,32,31,155,285],"29":[477,120,238,36,33,169,305],"30":[475,120,237,30,32,158,314],"31":[300,120,164,34,32,89,241],"32":[300,120,180,24,42,69,251],"33":[304,120,109,40,25,72,211],"34":[300,120,159,19,46,38,228],"35":[301,120,155,48,18,93,210],"36":[300,120,174,24,42,77,233],"37":[300,120,184,50,15,72,227],"38":[302,120,144,40,25,96,232],"39":[300,120,153,40,26,96,228],"40":[300,120,200,20,45,89,261],"41":[302,120,201,28,38,67,263],"42":[308,120,200,23,42,99,259],"43":[300,120,150,26,39,38,226],"44":[308,120,177,32,33,82,216],"45":[300,120,182,22,44,65,237],"46":[300,120,148,43,22,41,233],"47":[300,120,127,34,32,83,204],"48":[300,120,152,36,30,58,256],"49":[300,120,150,28,37,89,240],"50":[303,120,92,36,29,67,245]};
  const FRAME = {"owner":"22","admin":"03","verified":"26","r_lucky":"09","r_spinner":"16","r_goldfeet":"17","r_cypherking":"21","r_vinyl":"24","r_rainbow":"27","r_moonwalk":"01","r_sushi":"07","r_week7":"05","r_npcslayer":"30","r_npcboss":"29","r_moveking":"23","r_master":"13","r_graduate":"10","r_reliable":"02","r_duo":"11","r_f_newyear":"18","r_f_lunar":"04","r_f_valentine":"06","r_f_danceday":"28","r_f_summer100":"15","r_f_hiphop":"25","r_f_moon":"12","r_f_halloween":"08","r_f_xmas":"19","r_islander":"20","r_comp1":"14","r_comp5":"21","r_comp10":"23","r_challenger":"30","lv5":"20","lv10":"17","lv20":"01","t_pvp_1":"37_1","t_pvp_2":"37_2","t_pvp_3":"37_3","t_vet_1":"32_1","t_vet_2":"32_2","t_vet_3":"32_3","t_hall_1":"40_1","t_hall_2":"40_2","t_hall_3":"40_3","t_crew_1":"35_1","t_crew_2":"35_2","t_crew_3":"35_3","t_graf_1":"41_1","t_graf_2":"41_2","t_graf_3":"41_3","t_drip_1":"46_1","t_drip_2":"46_2","t_drip_3":"46_3","t_stk_1":"48_1","t_stk_2":"48_2","t_stk_3":"48_3","t_relay_1":"49_1","t_relay_2":"49_2","t_relay_3":"49_3","t_skate_1":"45_1","t_skate_2":"45_2","t_skate_3":"45_3","t_shoe_1":"44_1","t_shoe_2":"44_2","t_shoe_3":"44_3","t_champ":"31","t_podium":"33","t_world":"38","t_belt":"34","t_id_dj":"43","t_id_mc":"47","t_id_judge":"36","t_id_host":"39","t_dj_pop":"42","t_mc_pop":"50"};
  // 新框（31～50）：保持原本比例顯示，不拉長；[高 / 寬, 文字區左, 上, 右, 下]（0～1）
  const FN = {"31":[0.4,0.3281,0.2906,0.7712,0.7094],"32":[0.4,0.3281,0.2906,0.7212,0.7094],"33":[0.3958,0.2631,0.3307,0.6713,0.7484],"34":[0.4,0.2131,0.2703,0.7063,0.6891],"35":[0.4,0.3264,0.3117,0.6831,0.7294],"36":[0.4,0.2931,0.2906,0.7013,0.7094],"37":[0.4,0.3281,0.3281,0.6713,0.7469],"38":[0.3979,0.3247,0.3244,0.6696,0.7421],"39":[0.4,0.3281,0.2906,0.7312,0.7094],"40":[0.4,0.3281,0.2766,0.7812,0.6953],"41":[0.3979,0.3247,0.2911,0.7299,0.7089],"42":[0.3896,0.3275,0.2548,0.7569,0.6747],"43":[0.4,0.1531,0.2906,0.7063,0.7094],"44":[0.3896,0.2775,0.2901,0.6769,0.7099],"45":[0.4,0.3281,0.2891,0.7863,0.7078],"46":[0.4,0.2031,0.3281,0.7362,0.7469],"47":[0.4,0.3081,0.2891,0.6713,0.7078],"48":[0.4,0.2981,0.2906,0.7212,0.7094],"49":[0.4,0.3281,0.2906,0.7362,0.7094],"50":[0.3958,0.231,0.2901,0.809,0.7099]};
  const frameStyle = id => {
    const n = FRAME[id], m = n && FR[n.slice(0, 2)]; if (!m) return '';
    const [w, hh, c, tp, bt, xl, xr] = m, r = v => +(v / hh).toFixed(4);
    return `border-image-source:url(assets/title_frames/${n}.webp?v=2);border-image-slice:${tp} ${w - c - 2} ${bt} ${c} fill;--ft:${r(tp)};--fr:${r(w - c - 2)};--fb:${r(bt)};--fl:${r(c)};--fin:${r(hh - tp - bt)};--fu:${r(xr - xl)};--fo:${r(((xr - c) - (c - xl)) / 2)}`;
  };
  const earned = id => { const x = byId[id]; return !!x && !!(x.only === 'unlock' || x.only === 'verified' || x.minLv); };
  const color = id => (byId[id] && byId[id].color) || '#ffe08a';
  const html = id => {
    const x = byId[id]; if (!x) return '';
    const txt = label(id).replace(/[&<>]/g, ''), fx = frameStyle(id);
    const n = FRAME[id], nat = n && FN[n.slice(0, 2)];
    if (nat) {
      const len = [...txt].reduce((k, ch) => k + (/[\x00-\xff]/.test(ch) ? 0.55 : 1), 0);
      const [ar, x0, y0, x1, y1] = nat;
      return `<span class="ttl ttl-img" style="background-image:url(assets/title_frames/${n}.webp?v=3);--ar:${ar};--x0:${x0};--y0:${y0};--pw:${(x1 - x0).toFixed(4)};--ph:${(y1 - y0).toFixed(4)};--len:${Math.max(len, 2).toFixed(2)}"><span class="ttl-in">${txt}</span></span>`;
    }
    if (fx) {
      // 所有框一樣大；字的大小取「框中間放得下的寬度」和「緞帶高度」比較小的那個
      const len = [...txt].reduce((n, ch) => n + (/[\x00-\xff]/.test(ch) ? 0.55 : 1), 0);
      return `<span class="ttl ttl-fx" style="${fx};--len:${Math.max(len, 2).toFixed(2)}"><span class="ttl-in">${txt}</span></span>`;
    }
    const e = earned(id); return `<span class="ttl ${x.only ? 'ttl-' + x.only : ''} ${e ? 'ttl-earned' : ''}"${e ? ` style="--tc:${color(id)}"` : ''}>${e ? '★ ' : ''}${txt}</span>`;
  };
  return { LIST, label, allowed, html, byId, earned, color, FRAME };
})();
