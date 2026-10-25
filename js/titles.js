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
  const html = id => { const x = byId[id]; if (!x) return ''; return `<span class="ttl ${x.only ? 'ttl-' + x.only : ''}">${label(id).replace(/[&<>]/g, '')}</span>`; };
  return { LIST, label, allowed, html, byId };
})();
