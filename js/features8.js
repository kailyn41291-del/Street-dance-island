/* =========================================================
 * 第八批：街舞教室地圖、每日幸運小卡、每日一推
 * - 街舞教室：玩家可以登錄自己的教室（管理員審核），教室負責人自己管理
 *   公告 / 近期課程（workshop）/ 每週課表 / 師資 / 特殊活動 / 教室自己辦的比賽
 * - 每日幸運小卡：每天第一次登入跳出，勵志語 + 依舞風推薦的活動和 workshop
 * - 每日一推：街舞品牌 / 故事 / 文化 / 新聞（管理員可以指定某天要推什麼）
 * ========================================================= */
window.Daily = (() => {
  const { h, esc, modal, toast, sparkle } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const lonN = l => ((l + 540) % 360) - 180;
  const km = (la1, lo1, la2, lo2) => {
    const r = Math.PI / 180, dl = (la2 - la1) * r, dn = (lo2 - lo1) * r;
    const a = Math.sin(dl / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dn / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  };
  // 角色職業 → 舞風（推薦用）
  const JOB_STYLE = { bboy: 'Breaking', bgirl: 'Breaking', locker: 'Locking', popper: 'Popping', hiphop: 'Hip Hop', house: 'House', waacker: 'Waacking', krumper: 'Krump', voguer: 'Vogue', choreo: 'Choreography' };
  const myStyles = () => { const me = Player.me || {}; return [...new Set([me.style, JOB_STYLE[me.job]].filter(Boolean))]; };
  const err = x => {
    const m = String(x && x.message || x);
    if (/too many/.test(m)) return t('sd_e_many'); if (/spam/.test(m)) return t('fr_spam'); if (/need character/.test(m)) return t('cd_login');
    if (/not allowed|permission|row-level/.test(m)) return t('cr_e_perm'); if (/no such player/.test(m)) return t('sd_e_player'); if (/check constraint/.test(m)) return t('sd_e_check');
    return m;
  };
  const withTimeout = (p, ms = 10000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const ig = v => { const s = String(v || '').trim(); if (!s) return ''; if (/^https?:\/\//i.test(s)) return s; return 'https://www.instagram.com/' + encodeURIComponent(s.replace(/^@/, '')) + '/'; };
  const safeUrl = v => (/^https?:\/\//i.test(String(v || '')) ? String(v) : '');
  const weekName = d => (t('week') || [])[d] || '';

  I18N.extend({
    zh: {
      hub_studio: '街舞教室', hub_luck: '幸運小卡', hub_daily: '每日一推',
      sd_title: '🏫 街舞教室地圖', sd_intro: '找找附近的街舞教室！可以依地區、舞風搜尋，或用現在的位置找最近的教室。你也可以登錄自己的教室，通過審核後就能自己管理公告、課表和師資。',
      sd_near: '附近的教室', sd_add: '登錄我的教室', sd_all_cc: '全部國家', sd_all_city: '全部城市', sd_all_style: '全部舞風', sd_q: '搜尋教室名稱…',
      sd_none: '這個地區還沒有登錄的教室，成為第一個吧！', sd_km: '距離 {n} km', sd_pending: '⏳ 審核中', sd_rejected: '未通過', sd_mine: '我的教室',
      sd_gone: '找不到這間教室', sd_owner: '負責人', sd_map: '地圖', sd_ig: 'IG', sd_web: '官網', sd_phone: '電話',
      sd_notice: '📢 公告', sd_course: '📚 近期課程 / Workshop', sd_sched: '🗓 每週課表', sd_teachers: '🧑‍🏫 師資', sd_special: '✨ 特殊活動', sd_battles: '🏆 教室舉辦的比賽',
      sd_past: '過去的課程', sd_nothing: '目前沒有資料', sd_manage: '管理教室', sd_edit: '編輯教室資料', sd_post: '新增公告 / 課程 / 活動', sd_del: '刪除教室', sd_del_q: '確定要刪除「{n}」嗎？所有公告和課程都會一起刪掉。',
      sd_review: '教室審核', sd_approve: '通過', sd_reject: '不通過', sd_set_owner: '綁定負責人', sd_owner_ph: '輸入玩家 ID（例：kailyn）', sd_owner_ok: '已綁定！',
      sd_f_name: '教室名稱', sd_f_place: '國家 / 城市', sd_f_addr: '地址', sd_f_styles: '教學舞風', sd_f_phone: '電話', sd_f_ig: 'IG 帳號或網址', sd_f_link: '官網 / 報名連結',
      sd_f_intro: '教室介紹', sd_f_cover: '封面圖片', sd_f_cover_up: '上傳圖片（5MB 內）', sd_f_pin: '地圖位置（點地圖可以移動圖釘）', sd_f_here: '📍 用我現在的位置',
      sd_f_teachers: '師資', sd_f_sched: '每週課表', sd_f_battles: '教室舉辦的比賽（勾選網站上的活動）', sd_f_battles_q: '搜尋活動…',
      sd_t_name: '老師名字', sd_t_styles: '舞風', sd_t_ig: 'IG', sd_t_handle: '舞島玩家 ID（選填）',
      sd_s_title: '課程名稱', sd_s_teacher: '老師', sd_s_level: '程度', sd_add_row: '新增一列',
      sd_save: '儲存', sd_submit: '送出登錄', sd_sent: '已送出！管理員審核通過後就會出現在地圖上', sd_saved: '已儲存！',
      sd_p_kind: '類型', sd_p_notice: '公告', sd_p_course: '課程 / Workshop', sd_p_special: '特殊活動', sd_p_title: '標題', sd_p_date: '日期', sd_p_time: '時間', sd_p_teacher: '老師', sd_p_body: '內容', sd_p_link: '報名 / 詳情連結', sd_p_img: '圖片',
      sd_need_name: '請填教室名稱（至少 2 個字）', sd_e_many: '數量超過上限了', sd_e_player: '找不到這個玩家 ID', sd_e_check: '有欄位太長了，請縮短一點',
      sd_host_tag: '🏫 {n} 主辦', sd_geo_fail: '拿不到你的位置，請確認有開啟定位權限', sd_login: '登入角色後才能登錄教室',
      lk_title: '🍀 今日幸運小卡', lk_tap: '點一下翻開今天的小卡', lk_luck: '今日舞運', lk_move: '幸運舞步', lk_color: '幸運色', lk_event: '🎫 推薦你去', lk_ws: '📚 推薦 Workshop', lk_ws_none: '還沒有符合你舞風的 workshop，去教室地圖逛逛吧！',
      lk_ev_none: '最近沒有符合你舞風的活動，看看全部活動吧！', lk_pick: '📰 今日一推', lk_go: '去看看 ▶', lk_why: '因為你跳 {s}',
      dp_title: '📰 每日一推', dp_brand: '街舞品牌', dp_story: '街舞故事', dp_culture: '街舞文化', dp_news: '街舞新聞', dp_more: '看更多', dp_admin: '每日一推',
      dp_day: '日期', dp_kind: '類型', dp_t: '標題', dp_b: '內容', dp_link: '連結（選填）', dp_img: '圖片網址（選填）', dp_add: '儲存這一天', dp_list: '已排定的每日一推', dp_hint: '沒有排定的日子，網站會自動從內建的街舞小知識裡挑一則。'
    },
    en: {
      hub_studio: 'Dance studios', hub_luck: 'Lucky card', hub_daily: 'Daily pick',
      sd_title: '🏫 Dance Studio Map', sd_intro: 'Find dance studios near you! Search by region or style, or use your location. You can also list your own studio — once approved you can manage its news, timetable and teachers.',
      sd_near: 'Near me', sd_add: 'List my studio', sd_all_cc: 'All countries', sd_all_city: 'All cities', sd_all_style: 'All styles', sd_q: 'Search studios…',
      sd_none: 'No studios listed here yet — be the first!', sd_km: '{n} km away', sd_pending: '⏳ Pending', sd_rejected: 'Rejected', sd_mine: 'My studio',
      sd_gone: 'Studio not found', sd_owner: 'Owner', sd_map: 'Map', sd_ig: 'IG', sd_web: 'Website', sd_phone: 'Phone',
      sd_notice: '📢 News', sd_course: '📚 Upcoming classes / Workshops', sd_sched: '🗓 Weekly timetable', sd_teachers: '🧑‍🏫 Teachers', sd_special: '✨ Special events', sd_battles: '🏆 Battles hosted here',
      sd_past: 'Past classes', sd_nothing: 'Nothing here yet', sd_manage: 'Manage studio', sd_edit: 'Edit studio info', sd_post: 'Add news / class / event', sd_del: 'Delete studio', sd_del_q: 'Delete “{n}”? All its posts will be removed too.',
      sd_review: 'Studio review', sd_approve: 'Approve', sd_reject: 'Reject', sd_set_owner: 'Set owner', sd_owner_ph: 'Player ID (e.g. kailyn)', sd_owner_ok: 'Owner set!',
      sd_f_name: 'Studio name', sd_f_place: 'Country / city', sd_f_addr: 'Address', sd_f_styles: 'Styles taught', sd_f_phone: 'Phone', sd_f_ig: 'IG account or URL', sd_f_link: 'Website / sign-up link',
      sd_f_intro: 'About the studio', sd_f_cover: 'Cover image', sd_f_cover_up: 'Upload image (max 5MB)', sd_f_pin: 'Map location (click the map to move the pin)', sd_f_here: '📍 Use my location',
      sd_f_teachers: 'Teachers', sd_f_sched: 'Weekly timetable', sd_f_battles: 'Battles hosted by the studio (tick events on this site)', sd_f_battles_q: 'Search events…',
      sd_t_name: 'Teacher', sd_t_styles: 'Styles', sd_t_ig: 'IG', sd_t_handle: 'Dance Island ID (optional)',
      sd_s_title: 'Class', sd_s_teacher: 'Teacher', sd_s_level: 'Level', sd_add_row: 'Add row',
      sd_save: 'Save', sd_submit: 'Submit', sd_sent: 'Sent! It will show on the map once an admin approves it', sd_saved: 'Saved!',
      sd_p_kind: 'Type', sd_p_notice: 'News', sd_p_course: 'Class / Workshop', sd_p_special: 'Special event', sd_p_title: 'Title', sd_p_date: 'Date', sd_p_time: 'Time', sd_p_teacher: 'Teacher', sd_p_body: 'Details', sd_p_link: 'Sign-up / info link', sd_p_img: 'Image',
      sd_need_name: 'Please enter a studio name (2+ characters)', sd_e_many: 'Limit reached', sd_e_player: 'No player with that ID', sd_e_check: 'Some fields are too long',
      sd_host_tag: '🏫 Hosted by {n}', sd_geo_fail: "Couldn't get your location — please allow location access", sd_login: 'Create a character to list a studio',
      lk_title: '🍀 Today’s Lucky Card', lk_tap: 'Tap to flip today’s card', lk_luck: 'Dance luck', lk_move: 'Lucky move', lk_color: 'Lucky color', lk_event: '🎫 You should check out', lk_ws: '📚 Workshop for you', lk_ws_none: 'No workshops for your style yet — explore the studio map!',
      lk_ev_none: 'No events for your style soon — browse all events!', lk_pick: '📰 Daily pick', lk_go: 'Go ▶', lk_why: 'Because you dance {s}',
      dp_title: '📰 Daily Pick', dp_brand: 'Brand', dp_story: 'Story', dp_culture: 'Culture', dp_news: 'News', dp_more: 'Read more', dp_admin: 'Daily pick',
      dp_day: 'Date', dp_kind: 'Type', dp_t: 'Title', dp_b: 'Text', dp_link: 'Link (optional)', dp_img: 'Image URL (optional)', dp_add: 'Save this day', dp_list: 'Scheduled picks', dp_hint: 'Days without a scheduled pick show one of the built-in dance facts.'
    },
    ja: {
      hub_studio: 'ダンススタジオ', hub_luck: 'ラッキーカード', hub_daily: '今日のピック',
      sd_title: '🏫 ダンススタジオマップ', sd_intro: '近くのダンススタジオを探そう！地域やジャンルで検索、現在地から近い順にも並べられます。自分のスタジオを登録して、審査後はお知らせ・時間割・講師を自分で管理できます。',
      sd_near: '近くのスタジオ', sd_add: 'スタジオを登録', sd_all_cc: 'すべての国', sd_all_city: 'すべての都市', sd_all_style: 'すべてのジャンル', sd_q: 'スタジオ名で検索…',
      sd_none: 'この地域にはまだ登録がありません。最初の登録者になろう！', sd_km: '{n} km', sd_pending: '⏳ 審査中', sd_rejected: '非承認', sd_mine: '自分のスタジオ',
      sd_gone: 'スタジオが見つかりません', sd_owner: '担当者', sd_map: '地図', sd_ig: 'IG', sd_web: '公式サイト', sd_phone: '電話',
      sd_notice: '📢 お知らせ', sd_course: '📚 近日のクラス / WS', sd_sched: '🗓 週間時間割', sd_teachers: '🧑‍🏫 講師', sd_special: '✨ 特別イベント', sd_battles: '🏆 主催バトル',
      sd_past: '過去のクラス', sd_nothing: 'まだありません', sd_manage: 'スタジオ管理', sd_edit: 'スタジオ情報を編集', sd_post: 'お知らせ / クラス / イベントを追加', sd_del: 'スタジオを削除', sd_del_q: '「{n}」を削除しますか？投稿もすべて消えます。',
      sd_review: 'スタジオ審査', sd_approve: '承認', sd_reject: '非承認', sd_set_owner: '担当者を設定', sd_owner_ph: 'プレイヤー ID（例：kailyn）', sd_owner_ok: '設定しました！',
      sd_f_name: 'スタジオ名', sd_f_place: '国 / 都市', sd_f_addr: '住所', sd_f_styles: '教えているジャンル', sd_f_phone: '電話', sd_f_ig: 'IG アカウントか URL', sd_f_link: '公式サイト / 申込リンク',
      sd_f_intro: 'スタジオ紹介', sd_f_cover: 'カバー画像', sd_f_cover_up: '画像をアップロード（5MB まで）', sd_f_pin: '地図の位置（地図をクリックでピン移動）', sd_f_here: '📍 現在地を使う',
      sd_f_teachers: '講師', sd_f_sched: '週間時間割', sd_f_battles: 'スタジオ主催のバトル（サイト上のイベントにチェック）', sd_f_battles_q: 'イベントを検索…',
      sd_t_name: '講師名', sd_t_styles: 'ジャンル', sd_t_ig: 'IG', sd_t_handle: 'ダンスアイランド ID（任意）',
      sd_s_title: 'クラス名', sd_s_teacher: '講師', sd_s_level: 'レベル', sd_add_row: '行を追加',
      sd_save: '保存', sd_submit: '登録する', sd_sent: '送信しました！管理者が承認すると地図に表示されます', sd_saved: '保存しました！',
      sd_p_kind: '種類', sd_p_notice: 'お知らせ', sd_p_course: 'クラス / WS', sd_p_special: '特別イベント', sd_p_title: 'タイトル', sd_p_date: '日付', sd_p_time: '時間', sd_p_teacher: '講師', sd_p_body: '内容', sd_p_link: '申込 / 詳細リンク', sd_p_img: '画像',
      sd_need_name: 'スタジオ名を入力してください（2 文字以上）', sd_e_many: '上限に達しました', sd_e_player: 'その ID のプレイヤーはいません', sd_e_check: '長すぎる項目があります',
      sd_host_tag: '🏫 {n} 主催', sd_geo_fail: '位置情報を取得できません。許可を確認してください', sd_login: 'キャラを作るとスタジオを登録できます',
      lk_title: '🍀 今日のラッキーカード', lk_tap: 'タップしてカードをめくろう', lk_luck: '今日のダンス運', lk_move: 'ラッキームーブ', lk_color: 'ラッキーカラー', lk_event: '🎫 おすすめイベント', lk_ws: '📚 おすすめ WS', lk_ws_none: 'まだあなたのジャンルの WS はありません。スタジオマップを見てみよう！',
      lk_ev_none: '近日あなたのジャンルのイベントはありません。すべてのイベントを見よう！', lk_pick: '📰 今日のピック', lk_go: '見る ▶', lk_why: '{s} を踊るあなたに',
      dp_title: '📰 今日のピック', dp_brand: 'ブランド', dp_story: 'ストーリー', dp_culture: 'カルチャー', dp_news: 'ニュース', dp_more: 'もっと見る', dp_admin: '今日のピック',
      dp_day: '日付', dp_kind: '種類', dp_t: 'タイトル', dp_b: '本文', dp_link: 'リンク（任意）', dp_img: '画像 URL（任意）', dp_add: 'この日を保存', dp_list: '予定済みのピック', dp_hint: '予定がない日は内蔵のダンス豆知識から 1 つ表示します。'
    },
    ko: {
      hub_studio: '댄스 학원', hub_luck: '행운 카드', hub_daily: '오늘의 픽',
      sd_title: '🏫 댄스 학원 지도', sd_intro: '가까운 댄스 학원을 찾아보세요! 지역·장르로 검색하거나 현재 위치로 가까운 곳을 찾을 수 있어요. 내 학원을 등록하면 승인 후 공지·시간표·강사를 직접 관리할 수 있어요.',
      sd_near: '내 주변 학원', sd_add: '내 학원 등록', sd_all_cc: '모든 나라', sd_all_city: '모든 도시', sd_all_style: '모든 장르', sd_q: '학원 이름 검색…',
      sd_none: '이 지역에는 아직 등록된 학원이 없어요. 첫 번째가 되어 보세요!', sd_km: '{n} km', sd_pending: '⏳ 심사 중', sd_rejected: '반려', sd_mine: '내 학원',
      sd_gone: '학원을 찾을 수 없어요', sd_owner: '담당자', sd_map: '지도', sd_ig: 'IG', sd_web: '홈페이지', sd_phone: '전화',
      sd_notice: '📢 공지', sd_course: '📚 예정 수업 / 워크숍', sd_sched: '🗓 주간 시간표', sd_teachers: '🧑‍🏫 강사', sd_special: '✨ 특별 이벤트', sd_battles: '🏆 주최 배틀',
      sd_past: '지난 수업', sd_nothing: '아직 없어요', sd_manage: '학원 관리', sd_edit: '학원 정보 수정', sd_post: '공지 / 수업 / 이벤트 추가', sd_del: '학원 삭제', sd_del_q: '「{n}」을(를) 삭제할까요? 모든 글도 함께 삭제돼요.',
      sd_review: '학원 심사', sd_approve: '승인', sd_reject: '반려', sd_set_owner: '담당자 지정', sd_owner_ph: '플레이어 ID (예: kailyn)', sd_owner_ok: '지정했어요!',
      sd_f_name: '학원 이름', sd_f_place: '나라 / 도시', sd_f_addr: '주소', sd_f_styles: '수업 장르', sd_f_phone: '전화', sd_f_ig: 'IG 계정 또는 URL', sd_f_link: '홈페이지 / 신청 링크',
      sd_f_intro: '학원 소개', sd_f_cover: '커버 이미지', sd_f_cover_up: '이미지 업로드 (5MB 이하)', sd_f_pin: '지도 위치 (지도를 클릭해 핀 이동)', sd_f_here: '📍 현재 위치 사용',
      sd_f_teachers: '강사', sd_f_sched: '주간 시간표', sd_f_battles: '학원 주최 배틀 (사이트의 이벤트 선택)', sd_f_battles_q: '이벤트 검색…',
      sd_t_name: '강사 이름', sd_t_styles: '장르', sd_t_ig: 'IG', sd_t_handle: '댄스 아일랜드 ID (선택)',
      sd_s_title: '수업 이름', sd_s_teacher: '강사', sd_s_level: '레벨', sd_add_row: '행 추가',
      sd_save: '저장', sd_submit: '등록하기', sd_sent: '보냈어요! 관리자가 승인하면 지도에 표시돼요', sd_saved: '저장했어요!',
      sd_p_kind: '종류', sd_p_notice: '공지', sd_p_course: '수업 / 워크숍', sd_p_special: '특별 이벤트', sd_p_title: '제목', sd_p_date: '날짜', sd_p_time: '시간', sd_p_teacher: '강사', sd_p_body: '내용', sd_p_link: '신청 / 상세 링크', sd_p_img: '이미지',
      sd_need_name: '학원 이름을 입력해 주세요 (2자 이상)', sd_e_many: '한도에 도달했어요', sd_e_player: '그 ID의 플레이어가 없어요', sd_e_check: '너무 긴 항목이 있어요',
      sd_host_tag: '🏫 {n} 주최', sd_geo_fail: '위치를 가져올 수 없어요. 위치 권한을 확인해 주세요', sd_login: '캐릭터를 만들면 학원을 등록할 수 있어요',
      lk_title: '🍀 오늘의 행운 카드', lk_tap: '눌러서 오늘의 카드를 뒤집어 보세요', lk_luck: '오늘의 댄스 운', lk_move: '행운의 무브', lk_color: '행운의 색', lk_event: '🎫 추천 이벤트', lk_ws: '📚 추천 워크숍', lk_ws_none: '아직 내 장르의 워크숍이 없어요. 학원 지도를 둘러보세요!',
      lk_ev_none: '곧 열리는 내 장르 이벤트가 없어요. 전체 이벤트를 보세요!', lk_pick: '📰 오늘의 픽', lk_go: '보러 가기 ▶', lk_why: '{s}를 추는 당신에게',
      dp_title: '📰 오늘의 픽', dp_brand: '브랜드', dp_story: '스토리', dp_culture: '문화', dp_news: '뉴스', dp_more: '더 보기', dp_admin: '오늘의 픽',
      dp_day: '날짜', dp_kind: '종류', dp_t: '제목', dp_b: '내용', dp_link: '링크 (선택)', dp_img: '이미지 URL (선택)', dp_add: '이 날 저장', dp_list: '예약된 픽', dp_hint: '예약이 없는 날은 내장된 댄스 상식 중 하나를 보여줘요.'
    }
  });

  /* =========================================================
   * 地圖（Leaflet + OpenStreetMap，用到才載入）
   * ========================================================= */
  let leafP = null;
  const loadLeaflet = () => leafP || (leafP = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => res(window.L); s.onerror = () => { leafP = null; rej(new Error('map')); }; document.head.appendChild(s);
  }));
  const pinIcon = L => L.divIcon({ className: 'sd-pin', html: PXI.img('event/pin', '📍'), iconSize: [30, 30], iconAnchor: [15, 28], popupAnchor: [0, -26] });
  const makeMap = async (el, center, zoom) => {
    const L = await loadLeaflet();
    const map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    // 頁面動畫結束、視窗大小改變時重新量一次大小（不然右邊會有一塊灰的）
    [250, 700, 1500].forEach(ms => setTimeout(() => map.invalidateSize(), ms));
    if (window.ResizeObserver) new ResizeObserver(() => map.invalidateSize()).observe(el);
    return { L, map };
  };

  /* =========================================================
   * 教室資料
   * ========================================================= */
  let studios = [], loadedAt = 0;
  const cityCenter = (cc, city) => { const c = city && A.cityOf(cc, city); if (c) return [c.lat, lonN(c.lon)]; const k = A.byCode[cc]; const c0 = k && (k.cities || [])[0]; return c0 ? [c0.lat, lonN(c0.lon)] : [23.7, 121]; };
  const posOf = s => (typeof s.lat === 'number' && typeof s.lon === 'number' ? [s.lat, s.lon] : cityCenter(s.country, s.city));
  const canManage = s => Backend.isAdmin || (s && s.owner && s.owner === Backend.uid);
  async function loadStudios(force) {
    if (!Backend.enabled) return [];
    if (!force && Date.now() - loadedAt < 60000 && studios.length) return studios;
    await Backend.ready;
    studios = await Backend.studios(); loadedAt = Date.now();
    hostIndex();
    return studios;
  }
  // 活動 → 主辦教室（活動卡片上顯示「🏫 ○○ 主辦」）
  let hostOf = {};
  const hostIndex = () => { hostOf = {}; studios.filter(s => s.status === 'approved').forEach(s => (s.events || []).forEach(id => { if (!hostOf[id]) hostOf[id] = s; })); };
  const prevViewTag = A.viewTag;
  A.viewTag = e => (hostOf[e.id] ? `<a class="tag sd-host" href="#/studios/${hostOf[e.id].id}">${esc(t('sd_host_tag', { n: hostOf[e.id].name }))}</a>` : '') + (prevViewTag ? prevViewTag(e) : '');
  if (Backend.enabled) Backend.ready.then(() => loadStudios().catch(() => {}));

  const styleTags = list => (list || []).map(s => `<span class="tag" style="--c:${Store.STYLE_COLOR[s] || 'var(--cream)'}">${esc(s)}</span>`).join('');
  const placeName = s => [nm(A.byCode[s.country]), s.city ? nm(A.cityOf(s.country, s.city)) : ''].filter(Boolean).join('・');
  const coverHTML = (s, cls = '') => (safeUrl(s.cover) ? `<img class="sd-cover ${cls}" src="${esc(s.cover)}" alt="" loading="lazy">` : `<span class="sd-cover ${cls} sd-cover-none">🏫</span>`);
  const countryOpts = (sel, any) => (any ? `<option value="">${t('sd_all_cc')}</option>` : '') + GEO.countries.slice().sort((a, b) => (!!b.home - !!a.home) || nm(a).localeCompare(nm(b))).map(k => `<option value="${k.code}" ${k.code === sel ? 'selected' : ''}>${esc(nm(k))}</option>`).join('');
  const cityOpts = (cc, sel, any) => (any ? `<option value="">${t('sd_all_city')}</option>` : '') + ((A.byCode[cc] || {}).cities || []).map(ci => `<option value="${esc(ci.id)}" ${ci.id === sel ? 'selected' : ''}>${esc(nm(ci))}</option>`).join('');
  const locate = () => new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('geo'));
    navigator.geolocation.getCurrentPosition(p => res([p.coords.latitude, p.coords.longitude]), rej, { timeout: 10000, maximumAge: 6e5 });
  });

  /* =========================================================
   * 教室地圖（列表 + 地圖）  #/studios
   * ========================================================= */
  A.crumbs.studios = r => '🏫 ' + (r.arg && r.arg[0] ? (studios.find(s => s.id === +r.arg[0]) || {}).name || t('hub_studio') : t('hub_studio'));
  A.prefetch = A.prefetch || {};
  A.prefetch.studios = () => { if (Backend.enabled) loadStudios().catch(() => {}); };
  const FS = { cc: '', city: '', style: '', q: '', me: null };
  A.views.studios = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    try {
      await withTimeout(loadStudios());
      if (r.arg && r.arg[0]) return studioPage(inner, +r.arg[0]);
      if (FS.cc === '' && !FS.me) FS.cc = (Backend.profile && Backend.profile.nat) || 'TW';
      directory(inner);
    } catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(/timeout/.test(x.message) ? t('cr_slow') : err(x))}</p><button class="btn" onclick="location.reload()">↻</button>`; }
  };

  function directory(inner) {
    inner.innerHTML = `<div class="win">${UI.winHTML(t('sd_title'), 'teal', false)}<div class="win-body"><p>${t('sd_intro')}</p>
        <div class="sd-bar">
          <select class="input sm sd-cc">${countryOpts(FS.cc, true)}</select><select class="input sm sd-city"></select>
          <select class="input sm sd-style"><option value="">${t('sd_all_style')}</option>${Store.STYLES.map(s => `<option ${s === FS.style ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <input class="input sm sd-q" placeholder="${esc(t('sd_q'))}" value="${esc(FS.q)}">
        </div>
        <div class="btn-row"><button class="btn sm teal sd-near ${FS.me ? 'on' : ''}">${PXI.img('menu/near', '📍')} ${t('sd_near')}</button>
          <button class="btn sm pink sd-addb">＋ ${t('sd_add')}</button></div>
        <div class="sd-map"></div>
      </div></div>
      <div class="sd-mine"></div><div class="sd-grid"></div>`;
    const cc = inner.querySelector('.sd-cc'), city = inner.querySelector('.sd-city'), sty = inner.querySelector('.sd-style'), q = inner.querySelector('.sd-q');
    city.innerHTML = FS.cc ? cityOpts(FS.cc, FS.city, true) : `<option value="">${t('sd_all_city')}</option>`; city.disabled = !FS.cc;
    let mapObj = null, layer = null;
    const list = () => {
      let out = studios.filter(s => s.status === 'approved')
        .filter(s => !FS.cc || s.country === FS.cc).filter(s => !FS.city || s.city === FS.city)
        .filter(s => !FS.style || (s.styles || []).includes(FS.style))
        .filter(s => !FS.q || (s.name + ' ' + (s.address || '') + ' ' + (s.intro || '')).toLowerCase().includes(FS.q));
      if (FS.me) out = out.map(s => ({ s, d: km(FS.me[0], FS.me[1], ...posOf(s)) })).sort((a, b) => a.d - b.d).map(x => Object.assign(x.s, { _d: x.d }));
      else out.forEach(s => delete s._d);
      return out;
    };
    const card = s => `<a class="sd-card" href="#/studios/${s.id}">${coverHTML(s)}<span class="sd-main"><b>${esc(s.name)}</b>
        <small>${PXI.img('event/pin', '📍')} ${esc(placeName(s))}${s._d != null ? `　${t('sd_km', { n: s._d < 10 ? s._d.toFixed(1) : Math.round(s._d) })}` : ''}</small>
        <span class="sd-tags">${styleTags(s.styles)}</span>
        ${s.status !== 'approved' ? `<span class="tag">${t(s.status === 'pending' ? 'sd_pending' : 'sd_rejected')}</span>` : ''}</span></a>`;
    const draw = () => {
      const rows = list();
      inner.querySelector('.sd-grid').innerHTML = rows.map(card).join('') || `<p class="note">${t('sd_none')}</p>`;
      const mine = studios.filter(s => s.owner === Backend.uid);
      inner.querySelector('.sd-mine').innerHTML = mine.length ? `<div class="win">${UI.winHTML('🏫 ' + t('sd_mine'), 'yellow', false)}<div class="win-body"><div class="sd-grid">${mine.map(card).join('')}</div></div></div>` : '';
      if (mapObj) {
        const { L, map } = mapObj;
        if (layer) layer.remove();
        layer = L.layerGroup().addTo(map);
        const pts = [];
        rows.forEach(s => { const p = posOf(s); pts.push(p); L.marker(p, { icon: pinIcon(L) }).addTo(layer).bindPopup(`<a class="sd-pop" href="#/studios/${s.id}"><b>${esc(s.name)}</b><br>${styleTags(s.styles)}</a>`); });
        if (FS.me) { L.circleMarker(FS.me, { radius: 7, color: '#2a1f2e', fillColor: '#f07ca3', fillOpacity: 1, weight: 3 }).addTo(layer); pts.push(FS.me); }
        if (FS.me && pts.length > 1) map.fitBounds(L.latLngBounds([FS.me, ...pts.slice(0, 6)]).pad(0.2), { maxZoom: 15 });
        else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 14 });
        else if (pts.length === 1) map.setView(pts[0], 14);
        else map.setView(FS.cc ? cityCenter(FS.cc, FS.city) : [23.7, 121], FS.city ? 12 : FS.cc ? 7 : 3);
      }
    };
    cc.onchange = () => { FS.cc = cc.value; FS.city = ''; FS.me = null; city.innerHTML = FS.cc ? cityOpts(FS.cc, '', true) : `<option value="">${t('sd_all_city')}</option>`; city.disabled = !FS.cc; inner.querySelector('.sd-near').classList.remove('on'); draw(); };
    city.onchange = () => { FS.city = city.value; draw(); };
    sty.onchange = () => { FS.style = sty.value; draw(); };
    q.oninput = () => { FS.q = q.value.trim().toLowerCase(); draw(); };
    inner.querySelector('.sd-near').onclick = async ev => {
      const b = ev.currentTarget; SFX.play('select');
      if (FS.me) { FS.me = null; b.classList.remove('on'); return draw(); }
      try { FS.me = await locate(); FS.cc = ''; FS.city = ''; cc.value = ''; city.innerHTML = `<option value="">${t('sd_all_city')}</option>`; city.disabled = true; b.classList.add('on'); draw(); }
      catch (x) { toast(t('sd_geo_fail'), '📍'); }
    };
    inner.querySelector('.sd-addb').onclick = () => { if (!logged()) { toast(t('sd_login'), '🏫'); return Player.prompt(); } openEditor(null); };
    draw();
    makeMap(inner.querySelector('.sd-map'), FS.cc ? cityCenter(FS.cc, FS.city) : [23.7, 121], 7).then(m => { mapObj = m; draw(); }).catch(() => { inner.querySelector('.sd-map').remove(); });
  }

  /* =========================================================
   * 單一教室頁  #/studios/<id>
   * ========================================================= */
  async function studioPage(inner, id) {
    let s = studios.find(x => x.id === id);
    if (!s) { try { s = await Backend.studio(id); } catch (x) {} }
    if (!s) { inner.innerHTML = `<div class="win"><div class="win-body"><p>${t('sd_gone')}</p><a class="btn" href="#/studios">◀ ${t('hub_studio')}</a></div></div>`; return; }
    const [posts, owners] = await Promise.all([Backend.studioPosts(id).catch(() => []), s.owner ? Backend.playersByIds([s.owner]).catch(() => []) : []]);
    const owner = owners[0];
    const today = A.todayStr();
    const mg = canManage(s);
    const by = k => posts.filter(p => p.kind === k);
    const upcoming = by('course').filter(p => !p.date || p.date >= today).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    const past = by('course').filter(p => p.date && p.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    const specials = by('special').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const postHTML = p => `<article class="sd-post" data-pid="${p.id}">${safeUrl(p.image) ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}<div class="sd-post-main">
        <b>${esc(p.title)}</b><small>${[p.date ? p.date.replace(/-/g, '/') : '', p.time, p.teacher].filter(Boolean).map(esc).join('・')}</small>
        ${(p.styles || []).length ? `<span class="sd-tags">${styleTags(p.styles)}</span>` : ''}
        ${p.body ? `<p data-utr>${esc(p.body)}</p>` : ''}${safeUrl(p.link) ? `<a class="btn sm orange" href="${esc(p.link)}" target="_blank" rel="noopener">${PXI.img('event/link', '🔗')} ${t('lk_go')}</a>` : ''}
        ${mg ? `<button class="btn sm sd-pdel">✕</button>` : ''}</div></article>`;
    const sec = (title, html, color) => `<div class="win">${UI.winHTML(title, color, false)}<div class="win-body">${html || `<p class="note">${t('sd_nothing')}</p>`}</div></div>`;
    const sched = (s.schedule || []).slice().sort((a, b) => (a.d - b.d) || String(a.s || '').localeCompare(String(b.s || '')));
    const schedHTML = sched.length ? `<div class="sd-week">${[1, 2, 3, 4, 5, 6, 0].map(d => { const rows = sched.filter(x => +x.d === d); return rows.length ? `<div class="sd-day"><b>${esc(weekName(d))}</b>${rows.map(x => `<div class="sd-slot"><span class="tm">${esc([x.s, x.e].filter(Boolean).join('–'))}</span><span>${esc(x.title || '')}</span><small>${esc([x.teacher, x.level].filter(Boolean).join('・'))}</small></div>`).join('')}</div>` : ''; }).join('')}</div>` : '';
    const teachHTML = (s.teachers || []).length ? `<div class="sd-teachers">${s.teachers.map((x, i) => `<div class="sd-teacher"><b>${esc(x.name || '')}</b>${x.styles ? `<small>${esc(x.styles)}</small>` : ''}${x.bio ? `<p data-utr>${esc(x.bio)}</p>` : ''}
        <span class="btn-row">${ig(x.ig) ? `<a class="btn sm" href="${esc(ig(x.ig))}" target="_blank" rel="noopener">IG</a>` : ''}${x.handle ? `<button class="btn sm yellow sd-tcard" data-h="${esc(String(x.handle).replace(/^@/, '').toLowerCase())}">🪪</button>` : ''}</span></div>`).join('')}</div>` : '';
    const evs = (s.events || []).map(eid => Store.get(eid)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    const evHTML = evs.length ? `<ul class="sd-evs">${evs.map(e => `<li><a href="#/e/${esc(e.id)}"><span class="tm">${esc(e.date.replace(/-/g, '/'))}</span> ${esc(e.name)}</a></li>`).join('')}</ul>` : '';
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address || s.name)}`;
    inner.innerHTML = `<div class="win sd-head">${UI.winHTML('🏫 ' + esc(s.name), 'teal', false)}<div class="win-body">
        ${safeUrl(s.cover) ? `<img class="sd-banner" src="${esc(s.cover)}" alt="">` : ''}
        <div class="sd-tags">${styleTags(s.styles)}${s.status !== 'approved' ? `<span class="tag">${t(s.status === 'pending' ? 'sd_pending' : 'sd_rejected')}</span>` : ''}</div>
        <dl class="info">
          <dt>${PXI.img('event/pin', '📍')}</dt><dd>${esc(placeName(s))}${s.address ? '・' + esc(s.address) : ''}</dd>
          ${s.phone ? `<dt>☎</dt><dd><a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a></dd>` : ''}
          ${owner ? `<dt>${t('sd_owner')}</dt><dd><button class="linkish sd-owner" data-h="${esc(owner.handle)}">${esc(owner.name)} @${esc(owner.handle)}</button></dd>` : ''}
        </dl>
        ${s.intro ? `<p class="sd-intro" data-utr>${esc(s.intro)}</p>` : ''}
        <div class="btn-row"><a class="btn sm teal" href="${esc(mapUrl)}" target="_blank" rel="noopener">${PXI.img('event/pin', '📍')} ${t('sd_map')}</a>
          ${ig(s.ig) ? `<a class="btn sm pink" href="${esc(ig(s.ig))}" target="_blank" rel="noopener">IG</a>` : ''}
          ${safeUrl(s.link) ? `<a class="btn sm orange" href="${esc(s.link)}" target="_blank" rel="noopener">${PXI.img('event/link', '🔗')} ${t('sd_web')}</a>` : ''}
          <a class="btn sm" href="#/studios">◀ ${t('hub_studio')}</a></div>
        ${mg ? `<div class="sd-manage"><b>🔧 ${t('sd_manage')}</b><div class="btn-row"><button class="btn sm yellow sd-edit">✎ ${t('sd_edit')}</button><button class="btn sm pink sd-newp">＋ ${t('sd_post')}</button><button class="btn sm red sd-del">🗑 ${t('sd_del')}</button></div>
          ${Backend.isAdmin ? `<div class="btn-row">${s.status !== 'approved' ? `<button class="btn sm green sd-ok">✓ ${t('sd_approve')}</button>` : ''}${s.status !== 'rejected' ? `<button class="btn sm sd-no">${t('sd_reject')}</button>` : ''}
            <form class="chat-input sd-ownf"><input class="input sm" placeholder="${esc(t('sd_owner_ph'))}"><button class="btn sm">${t('sd_set_owner')}</button></form></div>` : ''}</div>` : ''}
      </div></div>
      ${by('notice').length || mg ? sec(t('sd_notice'), by('notice').map(postHTML).join(''), 'yellow') : ''}
      ${sec(t('sd_course'), upcoming.map(postHTML).join('') + (past.length ? `<details class="sd-past"><summary>${t('sd_past')}（${past.length}）</summary>${past.map(postHTML).join('')}</details>` : ''), 'pink')}
      ${sec(t('sd_sched'), schedHTML, 'blue')}
      ${sec(t('sd_teachers'), teachHTML, 'orange')}
      ${specials.length || mg ? sec(t('sd_special'), specials.map(postHTML).join(''), 'yellow') : ''}
      ${evs.length || mg ? sec(t('sd_battles'), evHTML, 'red') : ''}`;
    const reload = async () => { await loadStudios(true); A.render(true); };
    inner.querySelectorAll('.sd-tcard, .sd-owner').forEach(b => (b.onclick = () => window.Friends && Friends.openCard(b.dataset.h)));
    if (!mg) return;
    inner.querySelector('.sd-edit').onclick = () => openEditor(s, reload);
    inner.querySelector('.sd-newp').onclick = () => openPostEditor(s, reload);
    inner.querySelector('.sd-del').onclick = () => {
      const m = modal({ title: '🗑 ' + t('sd_del'), color: 'red', body: `<p>${esc(t('sd_del_q', { n: s.name }))}</p><div class="form-foot"><button class="btn no">${t('no')}</button><button class="btn red yes">${t('yes_del')}</button></div>` });
      m.el.querySelector('.no').onclick = m.close;
      m.el.querySelector('.yes').onclick = async () => { try { await Backend.deleteStudio(s.id); m.close(); toast(t('deleted'), '✕'); await loadStudios(true); A.nav('#/studios'); } catch (x) { toast(err(x), '✕'); } };
    };
    inner.querySelectorAll('.sd-pdel').forEach(b => (b.onclick = async () => {
      const pid = +b.closest('[data-pid]').dataset.pid;
      try { await Backend.deleteStudioPost(pid); b.closest('[data-pid]').remove(); SFX.play('cancel'); } catch (x) { toast(err(x), '✕'); }
    }));
    const ok = inner.querySelector('.sd-ok'), no = inner.querySelector('.sd-no'), of = inner.querySelector('.sd-ownf');
    if (ok) ok.onclick = async () => { try { await Backend.rpc('studio_review', { sid: s.id, ok: true }); SFX.play('fanfare'); toast(t('adm_done'), '✔'); reload(); } catch (x) { toast(err(x), '✕'); } };
    if (no) no.onclick = async () => { try { await Backend.rpc('studio_review', { sid: s.id, ok: false }); toast(t('adm_done'), '✔'); reload(); } catch (x) { toast(err(x), '✕'); } };
    if (of) of.onsubmit = async ev => { ev.preventDefault(); const v = of.querySelector('input').value.trim().replace(/^@/, ''); if (!v) return; try { await Backend.rpc('studio_set_owner', { sid: s.id, p_handle: v }); toast(t('sd_owner_ok'), '✔'); reload(); } catch (x) { toast(err(x), '✕'); } };
  }

  /* ---------- 一列一列的編輯器（師資 / 課表） ---------- */
  function rowsEditor(wrap, fields, rows) {
    const draw = () => {
      wrap.innerHTML = rows.map((r, i) => `<div class="re-row" data-i="${i}">${fields.map(f => f.type === 'day'
        ? `<select class="input sm" data-k="${f.k}">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${+r[f.k] === d ? 'selected' : ''}>${esc(weekName(d))}</option>`).join('')}</select>`
        : `<input class="input sm" data-k="${f.k}" type="${f.type || 'text'}" maxlength="${f.max || 60}" placeholder="${esc(f.ph || '')}" value="${esc(r[f.k] || '')}" style="flex:${f.w || 1}">`).join('')}<button type="button" class="btn sm re-x" aria-label="remove">✕</button></div>`).join('')
        + `<button type="button" class="btn sm re-add">＋ ${t('sd_add_row')}</button>`;
    };
    const upd = ev => { const row = ev.target.closest('.re-row'); if (!row || !ev.target.dataset.k) return; const k = ev.target.dataset.k; rows[+row.dataset.i][k] = ev.target.tagName === 'SELECT' ? +ev.target.value : ev.target.value; };
    wrap.addEventListener('input', upd); wrap.addEventListener('change', upd);
    wrap.addEventListener('click', ev => {
      if (ev.target.closest('.re-x')) { rows.splice(+ev.target.closest('.re-row').dataset.i, 1); draw(); }
      else if (ev.target.closest('.re-add')) { const n = {}; fields.forEach(f => (n[f.k] = f.type === 'day' ? 1 : '')); rows.push(n); draw(); wrap.querySelectorAll('.re-row input')[wrap.querySelectorAll('.re-row').length * 0 + (rows.length - 1) * fields.filter(f => f.type !== 'day').length]?.focus(); }
    });
    draw();
  }

  /* ---------- 登錄 / 編輯教室 ---------- */
  function openEditor(s, after) {
    const editing = !!s;
    s = s || { country: (Backend.profile && Backend.profile.nat) || 'TW', styles: [], teachers: [], schedule: [], events: [] };
    const teachers = (s.teachers || []).map(x => ({ ...x })), schedule = (s.schedule || []).map(x => ({ ...x }));
    const linked = new Set(s.events || []);
    let cover = s.cover || '', pos = typeof s.lat === 'number' ? [s.lat, s.lon] : null;
    const body = h(`<form class="form sd-form" novalidate>
      <label class="field full"><span>${t('sd_f_name')} <b>*</b></span><input class="input" name="name" maxlength="60" value="${esc(s.name || '')}"></label>
      <div class="field"><span>${t('sd_f_place')} <b>*</b></span><div class="row2"><select class="input" name="country">${countryOpts(s.country)}</select><select class="input" name="city"></select></div></div>
      <label class="field"><span>${t('sd_f_addr')}</span><input class="input" name="address" maxlength="200" value="${esc(s.address || '')}"></label>
      <fieldset class="fieldset full"><legend>${t('sd_f_styles')}</legend><div class="chips">${Store.STYLES.map(x => `<label class="chip ${(s.styles || []).includes(x) ? 'on' : ''}" style="--c:${Store.STYLE_COLOR[x]}"><input type="checkbox" name="styles" value="${esc(x)}" ${(s.styles || []).includes(x) ? 'checked' : ''} hidden><span class="dot"></span>${esc(x)}</label>`).join('')}</div></fieldset>
      <div class="row3 full"><label class="field"><span>${t('sd_f_phone')}</span><input class="input" name="phone" maxlength="40" value="${esc(s.phone || '')}"></label>
        <label class="field"><span>${t('sd_f_ig')}</span><input class="input" name="ig" maxlength="200" value="${esc(s.ig || '')}" placeholder="@studio"></label>
        <label class="field"><span>${t('sd_f_link')}</span><input class="input" name="link" type="url" maxlength="300" value="${esc(s.link || '')}" placeholder="https://"></label></div>
      <label class="field full"><span>${t('sd_f_intro')}</span><textarea class="input" name="intro" rows="4" maxlength="2000">${esc(s.intro || '')}</textarea></label>
      <fieldset class="fieldset full"><legend>${t('sd_f_cover')}</legend><label class="btn sm">${t('sd_f_cover_up')}<input type="file" accept="image/png,image/jpeg,image/webp" hidden class="sd-cov"></label>
        <img class="poster-prev sd-cov-prev ${cover ? '' : 'hidden'}" src="${esc(cover)}" alt=""></fieldset>
      <fieldset class="fieldset full"><legend>${t('sd_f_pin')}</legend><button type="button" class="btn sm teal sd-here">${t('sd_f_here')}</button><div class="sd-map sd-map-sm"></div></fieldset>
      <fieldset class="fieldset full"><legend>${t('sd_f_teachers')}</legend><div class="re sd-te"></div></fieldset>
      <fieldset class="fieldset full"><legend>${t('sd_f_sched')}</legend><div class="re sd-sc"></div></fieldset>
      ${editing ? `<fieldset class="fieldset full"><legend>${t('sd_f_battles')}</legend><input class="input sm sd-evq" placeholder="${esc(t('sd_f_battles_q'))}"><div class="sd-evpick"></div></fieldset>` : ''}
      <div class="full"><div class="err"></div><div class="form-foot"><button type="button" class="btn cancel">${t('cancel')}</button><button class="btn pink">${editing ? t('sd_save') : t('sd_submit')}</button></div></div>
    </form>`);
    const m = modal({ title: '🏫 ' + (editing ? t('sd_edit') : t('sd_add')), color: 'teal', body, wide: true });
    const f = body, cc = f.elements.country, city = f.elements.city;
    city.innerHTML = cityOpts(cc.value, s.city);
    rowsEditor(f.querySelector('.sd-te'), [{ k: 'name', ph: t('sd_t_name'), w: 1.2 }, { k: 'styles', ph: t('sd_t_styles') }, { k: 'ig', ph: t('sd_t_ig') }, { k: 'handle', ph: t('sd_t_handle'), max: 20 }], teachers);
    rowsEditor(f.querySelector('.sd-sc'), [{ k: 'd', type: 'day' }, { k: 's', type: 'time' }, { k: 'e', type: 'time' }, { k: 'title', ph: t('sd_s_title'), w: 1.4 }, { k: 'teacher', ph: t('sd_s_teacher') }, { k: 'level', ph: t('sd_s_level'), max: 20 }], schedule);
    f.querySelectorAll('.chips label.chip').forEach(l => l.addEventListener('click', ev => { ev.preventDefault(); const cb = l.querySelector('input'); cb.checked = !cb.checked; l.classList.toggle('on', cb.checked); SFX.play('select'); }));
    // 地圖圖釘
    let mapObj = null, marker = null;
    const setPin = (p, fly) => { pos = p; if (!mapObj) return; if (marker) marker.setLatLng(p); else marker = mapObj.L.marker(p, { icon: pinIcon(mapObj.L), draggable: true }).addTo(mapObj.map).on('dragend', e => { const ll = e.target.getLatLng(); pos = [ll.lat, ll.lng]; }); if (fly) mapObj.map.setView(p, 16); };
    makeMap(f.querySelector('.sd-map'), pos || cityCenter(cc.value, city.value), pos ? 16 : 12).then(o => { mapObj = o; if (pos) setPin(pos); o.map.on('click', e => setPin([e.latlng.lat, e.latlng.lng])); }).catch(() => f.querySelector('.sd-map').remove());
    cc.onchange = () => { city.innerHTML = cityOpts(cc.value); if (!pos && mapObj) mapObj.map.setView(cityCenter(cc.value, city.value), 12); };
    city.onchange = () => { if (mapObj && !marker) mapObj.map.setView(cityCenter(cc.value, city.value), 12); };
    f.querySelector('.sd-here').onclick = async () => { try { setPin(await locate(), true); SFX.play('coin'); } catch (x) { toast(t('sd_geo_fail'), '📍'); } };
    // 封面
    f.querySelector('.sd-cov').onchange = async ev => {
      const file = ev.target.files[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) return toast(t('fo_big') !== 'fo_big' ? t('fo_big') : '5MB', '✕');
      try { cover = await Backend.uploadForumFile(file, (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')); const pv = f.querySelector('.sd-cov-prev'); pv.src = cover; pv.classList.remove('hidden'); SFX.play('coin'); } catch (x) { toast(err(x), '✕'); }
    };
    // 教室比賽：勾選網站上的活動
    const pick = f.querySelector('.sd-evpick');
    if (pick) {
      const drawPick = q => {
        const all = Store.all().filter(e => linked.has(e.id) || ((!q || e.name.toLowerCase().includes(q)) && e.country === cc.value)).sort((a, b) => (linked.has(b.id) - linked.has(a.id)) || b.date.localeCompare(a.date)).slice(0, 60);
        pick.innerHTML = all.map(e => `<label class="chk"><input type="checkbox" value="${esc(e.id)}" ${linked.has(e.id) ? 'checked' : ''}> <span class="tm">${esc(e.date.replace(/-/g, '/'))}</span> ${esc(e.name)}</label>`).join('') || `<p class="note">${t('sd_nothing')}</p>`;
      };
      pick.onchange = ev => { const v = ev.target.value; if (ev.target.checked) linked.add(v); else linked.delete(v); };
      const q = f.querySelector('.sd-evq'); q.oninput = () => drawPick(q.value.trim().toLowerCase());
      drawPick('');
    }
    f.querySelector('.cancel').onclick = m.close;
    f.onsubmit = async ev => {
      ev.preventDefault();
      const fd = new FormData(f), g = k => String(fd.get(k) || '').trim();
      const errEl = f.querySelector('.err');
      if (g('name').length < 2) { errEl.textContent = '✕ ' + t('sd_need_name'); f.elements.name.classList.add('bad'); return; }
      const row = {
        ...(editing ? { id: s.id } : {}),
        name: g('name'), country: g('country'), city: g('city') || null, address: g('address') || null, styles: fd.getAll('styles'),
        phone: g('phone') || null, ig: g('ig') || null, link: safeUrl(g('link')) || null, intro: g('intro') || null, cover: cover || null,
        lat: pos ? +pos[0].toFixed(6) : null, lon: pos ? +pos[1].toFixed(6) : null,
        teachers: teachers.filter(x => String(x.name || '').trim()).map(x => ({ name: String(x.name).trim(), styles: String(x.styles || '').trim(), ig: String(x.ig || '').trim(), handle: String(x.handle || '').trim().replace(/^@/, '').toLowerCase(), bio: x.bio || '' })),
        schedule: schedule.filter(x => String(x.title || '').trim() || x.s).map(x => ({ d: +x.d || 0, s: x.s || '', e: x.e || '', title: String(x.title || '').trim(), teacher: String(x.teacher || '').trim(), level: String(x.level || '').trim() }))
      };
      if (editing) row.events = [...linked];
      const btn = f.querySelector('.form-foot .pink'); btn.disabled = true;
      try {
        const saved = await Backend.saveStudio(row);
        m.close(); SFX.play('fanfare');
        toast(editing ? t('sd_saved') : t('sd_sent'), '🏫');
        await loadStudios(true);
        if (after) after(); else A.nav('#/studios/' + saved.id);
      } catch (x) { SFX.play('error'); errEl.textContent = '✕ ' + err(x); btn.disabled = false; }
    };
  }

  /* ---------- 新增公告 / 課程 / 特殊活動 ---------- */
  function openPostEditor(s, after) {
    let image = '';
    const body = h(`<form class="form" novalidate>
      <div class="field full"><span>${t('sd_p_kind')}</span><div class="seg sd-kind">${['notice', 'course', 'special'].map((k, i) => `<button type="button" data-k="${k}" class="${i === 1 ? 'on' : ''}">${t('sd_p_' + k)}</button>`).join('')}</div></div>
      <label class="field full"><span>${t('sd_p_title')} <b>*</b></span><input class="input" name="title" maxlength="80"></label>
      <div class="row3 full"><label class="field"><span>${t('sd_p_date')}</span><input class="input" type="date" name="date"></label>
        <label class="field"><span>${t('sd_p_time')}</span><input class="input" name="time" maxlength="20" placeholder="19:00–21:00"></label>
        <label class="field"><span>${t('sd_p_teacher')}</span><input class="input" name="teacher" maxlength="60"></label></div>
      <fieldset class="fieldset full"><legend>${t('sd_f_styles')}</legend><div class="chips">${Store.STYLES.map(x => `<label class="chip" style="--c:${Store.STYLE_COLOR[x]}"><input type="checkbox" name="styles" value="${esc(x)}" hidden><span class="dot"></span>${esc(x)}</label>`).join('')}</div></fieldset>
      <label class="field full"><span>${t('sd_p_body')}</span><textarea class="input" name="body" rows="4" maxlength="2000"></textarea></label>
      <label class="field full"><span>${t('sd_p_link')}</span><input class="input" name="link" type="url" maxlength="300" placeholder="https://"></label>
      <fieldset class="fieldset full"><legend>${t('sd_p_img')}</legend><label class="btn sm">${t('sd_f_cover_up')}<input type="file" accept="image/png,image/jpeg,image/webp" hidden class="sd-pimg"></label><img class="poster-prev hidden" alt=""></fieldset>
      <div class="full"><div class="err"></div><div class="form-foot"><button type="button" class="btn cancel">${t('cancel')}</button><button class="btn pink">${t('sd_save')}</button></div></div>
    </form>`);
    const m = modal({ title: '＋ ' + t('sd_post'), color: 'pink', body, wide: true });
    const f = body; let kind = 'course';
    f.querySelector('.sd-kind').onclick = ev => { const b = ev.target.closest('[data-k]'); if (!b) return; kind = b.dataset.k; f.querySelectorAll('.sd-kind button').forEach(x => x.classList.toggle('on', x === b)); SFX.play('select'); };
    f.querySelectorAll('.chips label.chip').forEach(l => l.addEventListener('click', ev => { ev.preventDefault(); const cb = l.querySelector('input'); cb.checked = !cb.checked; l.classList.toggle('on', cb.checked); }));
    f.querySelector('.sd-pimg').onchange = async ev => {
      const file = ev.target.files[0]; if (!file || file.size > 5 * 1024 * 1024) return;
      try { image = await Backend.uploadForumFile(file, (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')); const pv = f.querySelector('.poster-prev'); pv.src = image; pv.classList.remove('hidden'); } catch (x) { toast(err(x), '✕'); }
    };
    f.querySelector('.cancel').onclick = m.close;
    f.onsubmit = async ev => {
      ev.preventDefault();
      const fd = new FormData(f), g = k => String(fd.get(k) || '').trim();
      if (!g('title')) { f.querySelector('.err').textContent = '✕ ' + t('sd_p_title'); return; }
      try {
        await Backend.saveStudioPost({ studio_id: s.id, kind, title: g('title'), date: g('date') || null, time: g('time') || null, teacher: g('teacher') || null, styles: fd.getAll('styles'), body: g('body') || null, link: safeUrl(g('link')) || null, image: image || null });
        m.close(); SFX.play('coin'); toast(t('sd_saved'), '🏫'); after && after();
      } catch (x) { f.querySelector('.err').textContent = '✕ ' + err(x); }
    };
  }

  /* ---------- 管理後台：教室審核、每日一推排程 ---------- */
  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'studio', label: () => '🏫 ' + t('sd_review'),
    draw: async (pane, fail) => {
      try { await loadStudios(true); } catch (x) { return fail(x); }
      const rows = studios.filter(s => s.status === 'pending');
      pane.innerHTML = rows.length ? rows.map(s => `<div class="fo-review"><div class="fo-meta"><b>${esc(s.name)}</b><span class="tm">${esc(placeName(s))}</span></div>${s.intro ? `<p>${esc(s.intro.slice(0, 200))}</p>` : ''}
        <div class="btn-row"><a class="btn sm" href="#/studios/${s.id}">▶ ${t('lk_go')}</a><button class="btn sm green" data-ok="${s.id}">✓ ${t('sd_approve')}</button><button class="btn sm" data-no="${s.id}">${t('sd_reject')}</button></div></div>`).join('') : `<p class="note">${t('adm_none')}</p>`;
      pane.onclick = async ev => {
        const b = ev.target.closest('[data-ok],[data-no]'); if (!b) return;
        try { await Backend.rpc('studio_review', { sid: +(b.dataset.ok || b.dataset.no), ok: !!b.dataset.ok }); b.closest('.fo-review').remove(); toast(t('adm_done'), '✔'); loadStudios(true).catch(() => {}); } catch (x) { fail(x); }
      };
    }
  });
  A.adminTabs.push({
    key: 'daily', label: () => '📰 ' + t('dp_admin'),
    draw: async (pane, fail) => {
      let rows = []; try { rows = await Backend.dailyPicks(); } catch (x) { return fail(x); }
      pane.innerHTML = `<p class="note">${t('dp_hint')}</p><form class="form dp-form">
          <div class="row2 full"><label class="field"><span>${t('dp_day')}</span><input class="input" type="date" name="day" value="${A.todayStr()}"></label>
            <label class="field"><span>${t('dp_kind')}</span><select class="input" name="kind">${['news', 'brand', 'story', 'culture'].map(k => `<option value="${k}">${t('dp_' + k)}</option>`).join('')}</select></label></div>
          <label class="field full"><span>${t('dp_t')}</span><input class="input" name="title" maxlength="100"></label>
          <label class="field full"><span>${t('dp_b')}</span><textarea class="input" name="body" rows="5" maxlength="3000"></textarea></label>
          <div class="row2 full"><label class="field"><span>${t('dp_link')}</span><input class="input" name="link" type="url"></label><label class="field"><span>${t('dp_img')}</span><input class="input" name="image" type="url"></label></div>
          <div class="full form-foot"><button class="btn pink">${t('dp_add')}</button></div></form>
        <h4>${t('dp_list')}</h4><ul class="adm-list">${rows.map(r => `<li><span class="tm">${esc(r.day)}</span> <span class="tag">${t('dp_' + r.kind)}</span> <span class="grow">${esc(r.title)}</span><button class="btn sm" data-del="${esc(r.day)}">✕</button></li>`).join('') || `<li class="note">${t('adm_none')}</li>`}</ul>`;
      const f = pane.querySelector('.dp-form');
      f.onsubmit = async ev => {
        ev.preventDefault(); const fd = new FormData(f), g = k => String(fd.get(k) || '').trim();
        if (!g('day') || !g('title') || !g('body')) return toast(t('dp_t') + ' / ' + t('dp_b'), '✕');
        try { await Backend.saveDailyPick({ day: g('day'), kind: g('kind'), title: g('title'), body: g('body'), link: safeUrl(g('link')) || null, image: safeUrl(g('image')) || null }); toast(t('adm_done'), '✔'); pickCache = {}; A.adminTabs.find(x => x.key === 'daily').draw(pane, fail); } catch (x) { fail(x); }
      };
      pane.querySelectorAll('[data-del]').forEach(b => (b.onclick = async () => { try { await Backend.deleteDailyPick(b.dataset.del); b.closest('li').remove(); pickCache = {}; } catch (x) { fail(x); } }));
    }
  });

  /* =========================================================
   * 每日一推：內建的街舞小知識（管理員沒排定的日子用這些）
   * ========================================================= */
  const FACTS = [
    ['culture', 'Breaking 的起源', '1970 年代的紐約布朗克斯，DJ Kool Herc 在派對上把唱片裡只有鼓聲的「Break」段落接起來重複播放，舞者就在這段時間下場跳舞，於是被叫做 B-Boy / B-Girl。1973 年 8 月 11 日他在 Sedgwick Avenue 1520 號辦的派對，常被當作 Hip Hop 的生日。'],
    ['culture', 'Locking 是怎麼來的', '1970 年前後，Don Campbell 在洛杉磯想學當時流行的舞步卻一直卡住，沒想到「卡住」的停格反而成了招牌，Locking 就這樣誕生。後來他組成 The Lockers，透過電視節目讓 Locking 紅遍全美。'],
    ['culture', 'Popping 的核心', '1970 年代後期，Boogaloo Sam 在加州 Fresno 發展出 Popping，並成立傳奇團體 Electric Boogaloos。Popping 的核心是讓肌肉快速收縮、放鬆，做出「Pop / Hit」的震動感。'],
    ['culture', 'Hip Hop 的元素', 'Hip Hop 文化常被說有四大元素：DJ、MC、Breaking 和塗鴉（Graffiti）。Afrika Bambaataa 和 Universal Zulu Nation 還提倡把「Knowledge（知識）」當作第五元素。'],
    ['culture', 'Waacking 的舞台', 'Waacking 在 1970 年代洛杉磯的同志夜店文化中誕生，以快速的手臂甩動、旋轉和帥氣的 Pose 為特色，風格深受 Disco 音樂和老電影明星的影響。'],
    ['culture', 'Vogue 與 Ballroom', 'Vogue 來自紐約哈林區的 Ballroom 文化，由 LGBTQ+ 社群（特別是黑人和拉丁裔）發展，大家以「House（家族）」為單位互相競賽。1990 年 Madonna 的歌曲《Vogue》讓更多人認識了它。'],
    ['culture', 'Krump 的力量', 'Krump 在 2000 年代初的洛杉磯中南部誕生，由 Tight Eyez、Big Mijo 等舞者從 Clowning 發展出來，充滿爆發力和情緒。2005 年的紀錄片《Rize》讓全世界看見了 Krump。'],
    ['culture', 'House Dance 的夜店血統', 'House Dance 在 1980 年代芝加哥與紐約的夜店裡成形，跟著 House 音樂一起長大。芝加哥的 The Warehouse 夜店（DJ Frankie Knuckles）就是「House 音樂」名字的由來之一。Footwork、Jacking、Lofting 是常見的基本元素。'],
    ['culture', 'Cypher 的禮儀', 'Cypher 是舞者圍成一圈輪流進場跳舞，沒有評審、沒有輸贏，是街舞最原始的交流方式。小禮儀：不要搶別人的時間、跳完記得讓位、給每個進場的人 respect。'],
    ['culture', 'Battle 常用語', 'Call out：點名挑戰某人。Burn：用動作嘲諷對手。Bite：抄別人的動作（大忌！）。Freeze：定格動作。下次看 battle 的時候注意聽 MC 和觀眾的反應吧！'],
    ['culture', 'Popping 家族的技巧', '很多技巧常被放在 Popping 這個大家族裡：Animation（動畫感）、Tutting（像古埃及壁畫的直角手勢）、Waving（波浪）、Boogaloo（滾動的身體律動）、Strobing（像閃光燈的斷格）。'],
    ['culture', 'Locking 的經典動作', 'Lock（停格）、Point（指）、Wrist Roll（轉手腕）、Scooby Doo、Stop and Go、Uncle Sam Point……Locking 的動作很多都帶著幽默感，跳的時候記得笑！'],
    ['culture', '為什麼叫「街舞」', '這些舞蹈大多誕生在派對、夜店、街頭和社區，而不是舞蹈教室，所以被統稱為街舞（Street Dance）。它們一開始就是大家玩在一起、互相學習的文化。'],
    ['culture', 'Peace, Love, Unity & Having Fun', '「和平、愛、團結、玩得開心」是 Afrika Bambaataa 提出的 Hip Hop 精神。Battle 結束後擁抱對手、謝謝 DJ 和評審，就是這份精神的延續。'],
    ['culture', '什麼是 Groove', 'Groove 是身體跟著音樂自然律動的感覺，不只是動作，而是「跟音樂玩在一起」。很多舞者說：技巧可以練，但 groove 要靠大量聽音樂、享受音樂。'],
    ['culture', 'Musicality 音樂性', 'Musicality 指的是舞者對音樂的理解：抓到鼓點、旋律、歌詞或樂器的變化，並用動作表現出來。比賽評審常常把它當作很重要的評分標準。'],
    ['story', 'Rock Steady Crew', '1977 年在紐約布朗克斯成立的 Breaking 傳奇團體。Crazy Legs 等成員透過 1983 年的電影《Wild Style》和《Flashdance》片段，把 Breaking 帶到了全世界。'],
    ['story', 'Juste Debout', '2002 年由 Bruce Ykanji 在法國巴黎創辦，以 2 vs 2 對決聞名，項目包含 Hip Hop、House、Locking、Popping 等站舞（Standing dance），是世界各地站舞舞者的夢想舞台。'],
    ['story', 'Battle of the Year', '1990 年在德國創辦的 Battle of the Year（BOTY），是歷史最悠久的國際 Breaking 團體賽之一，各國的 crew 都以站上 BOTY 為目標。'],
    ['story', 'Red Bull BC One', '2004 年開始舉辦的 1 對 1 Breaking 世界賽，2018 年加入了 B-Girl 組別。每年的總決賽都吸引全球的 B-Boy、B-Girl 關注。'],
    ['story', 'Breaking 登上奧運', 'Breaking 在 2018 年布宜諾斯艾利斯青年奧運首次登場，2024 年巴黎奧運成為正式比賽項目，首屆金牌由日本 B-Girl Ami 和加拿大 B-Boy Phil Wizard 拿下。'],
    ['story', 'Soul Train', '1971 年開播的美國音樂節目，由 Don Cornelius 主持。節目中舞者排成兩排輪流秀舞的「Soul Train Line」讓許多舞者被看見，也是 Locking 走紅的重要舞台。'],
    ['brand', 'adidas Superstar', '1969 年推出的「貝殼頭」籃球鞋。1986 年 Run-DMC 發表歌曲《My Adidas》後，Superstar 成為 Hip Hop 文化最具代表性的鞋款之一。'],
    ['brand', 'PUMA Suede', '1968 年推出的麂皮鞋款，鞋底好轉、耐磨又好看，深受早期 B-Boy 喜愛，到現在都是 Breaking 圈的經典鞋。'],
    ['brand', 'Kangol', '英國的帽子品牌。80 年代 LL Cool J 戴著 Kangol 漁夫帽的形象深植人心，讓 Kangol 成為 Hip Hop 穿搭的經典配件。'],
    ['brand', 'Dickies', '1922 年在美國德州起家的工作服品牌。寬鬆耐磨的工作褲成了街頭穿搭的常見單品，也常出現在 Locking、Popping 舞者的穿搭裡。']
  ];
  let pickCache = {};
  const dayIndex = day => Math.floor(new Date(day + 'T00:00:00Z').getTime() / 864e5);
  async function pickOf(day) {
    if (pickCache[day]) return pickCache[day];
    let p = null;
    if (Backend.enabled) { try { await Backend.ready; p = await Backend.dailyPick(day); } catch (x) {} }
    if (!p) { const f = FACTS[((dayIndex(day) % FACTS.length) + FACTS.length) % FACTS.length]; p = { day, kind: f[0], title: f[1], body: f[2] }; }
    return (pickCache[day] = p);
  }
  const KIND_IC = { brand: '👟', story: '📖', culture: '🎶', news: '📰' };
  async function openPick() {
    const p = await pickOf(A.todayStr());
    modal({ title: t('dp_title'), color: 'blue', body: `<div class="dp-card">
      <span class="tag">${KIND_IC[p.kind] || '📰'} ${t('dp_' + p.kind)}</span><span class="tm">${esc(p.day.replace(/-/g, '/'))}</span>
      ${safeUrl(p.image) ? `<img class="dp-img" src="${esc(p.image)}" alt="">` : ''}
      <h3 data-utr>${esc(p.title)}</h3><p class="dp-body" data-utr>${esc(p.body)}</p>
      ${safeUrl(p.link) ? `<a class="btn sm orange" href="${esc(p.link)}" target="_blank" rel="noopener">${PXI.img('event/link', '🔗')} ${t('dp_more')}</a>` : ''}</div>` });
  }

  /* =========================================================
   * 每日幸運小卡
   * ========================================================= */
  const QUOTES = [
    '今天的你，比昨天的你多會一個八拍。', '跳錯也沒關係，跳下去就是你的風格。', '不用跟別人比，跟昨天的自己 battle 就好。', '每個大神都曾經是在鏡子前卡關的新手。',
    '音樂一下，煩惱先放旁邊。', '練基本功不帥，但它會讓你變很帥。', '慢慢來比較快，扎實的每一步都算數。', '敢進 cypher 的你，已經贏一半了。',
    '流汗的每一分鐘，都在幫未來的你存分數。', '今天就算只練 10 分鐘，也是有練。', '找到讓你笑出來的那首歌，跳就對了。', '你的 groove，是別人學不來的。',
    '輸掉的 battle 也是一堂課，記得帶走筆記。', '跟喜歡的人一起跳，再累都值得。', '別怕被看，舞台本來就是為你準備的。', '每次覺得卡住，就是要升級的前兆。',
    '先享受音樂，技巧會自己跟上來。', '給別人 respect，你也會收到 respect。', '今天適合大膽一點，換一個沒試過的動作吧。', '休息也是練習的一部分，好好照顧身體。',
    '你不需要完美，你需要的是開始。', '把每一次練習都當成表演，把每一次表演都當成練習。', '跳舞最酷的地方，是每個人都不一樣。', '今天也要記得：跳舞是為了開心！',
    '再練一次，這次會更好。', '你喜歡跳舞的樣子，就是最好看的樣子。', '把緊張變成能量，把能量變成 groove。', '小小的進步，累積起來就是大大的不同。'
  ];
  const MOVES = ['Wrist Roll', 'Toprock', 'Six Step', 'Wave', 'Running Man', 'Scooby Doo', 'Boogaloo Roll', 'Jack', 'Lofting', 'Vogue Hands', 'Arm Swing', 'Stomp', 'Freeze', 'Point', 'Kick Ball Change', 'Shuffle'];
  const COLORS = [['粉紅', '#f07ca3'], ['薄荷綠', '#3fb3a6'], ['陽光黃', '#eac45a'], ['天空藍', '#7895df'], ['活力橘', '#ef8a3a'], ['葡萄紫', '#9b7fd4'], ['經典黑', '#2a1f2e'], ['奶油白', '#fff4e6']];
  const COLOR_N = { en: ['Pink', 'Mint', 'Sunny yellow', 'Sky blue', 'Orange', 'Grape', 'Classic black', 'Cream'], ja: ['ピンク', 'ミント', 'イエロー', 'スカイブルー', 'オレンジ', 'パープル', 'ブラック', 'クリーム'], ko: ['핑크', '민트', '옐로', '스카이 블루', '오렌지', '퍼플', '블랙', '크림'] };
  const rng = seed => { let a = 0; for (const c of seed) a = (a * 31 + c.charCodeAt(0)) | 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  const LKEY = uid => 'danceIsland.luck.' + uid;

  async function workshopFor(styles, seedFn) {
    if (!Backend.enabled) return null;
    try {
      await loadStudios();
      const ok = new Map(studios.filter(s => s.status === 'approved').map(s => [s.id, s]));
      const nat = (Backend.profile && Backend.profile.nat) || 'TW';
      const list = (await Backend.upcomingCourses()).filter(p => ok.has(p.studio_id)).map(p => {
        const s = ok.get(p.studio_id); const st = (p.styles && p.styles.length ? p.styles : s.styles) || [];
        let score = 0; if (styles.some(x => st.includes(x))) score += 4; if (s.country === nat) score += 2; if (st.includes('All Style')) score += 1;
        return { p, s, score };
      }).filter(x => x.score >= 4 || (!styles.length && x.score > 0));
      if (!list.length) return null;
      list.sort((a, b) => b.score - a.score || String(a.p.date).localeCompare(String(b.p.date)));
      const top = list.slice(0, 3); return top[Math.floor(seedFn() * top.length)];
    } catch (x) { return null; }
  }

  async function openLuck(auto) {
    const today = A.todayStr(), uid = Backend.uid || 'guest';
    const R = rng(uid + today);
    const quote = window.Lines ? Lines.quoteOf(uid, today) : QUOTES[Math.floor(R() * QUOTES.length)]; R(); const move = MOVES[Math.floor(R() * MOVES.length)];
    const ci = Math.floor(R() * COLORS.length), color = COLORS[ci], stars = 3 + Math.floor(R() * 3);
    const colorName = I18N.lang === 'zh' ? color[0] : (COLOR_N[I18N.lang] || COLOR_N.en)[ci];
    const styles = myStyles();
    const recs = A.recommend ? A.recommend(3) : [];
    const ev = recs.length ? recs[Math.floor(R() * recs.length)] : null;
    const [ws, pk] = await Promise.all([workshopFor(styles, R), pickOf(today)]);
    const evHTML = ev ? `<a class="lk-rec" href="#/e/${esc(ev.e.id)}"><b>${esc(ev.e.name)}</b><small>${esc(ev.e.date.replace(/-/g, '/'))}・${esc(nm(A.cityOf(ev.e.country, ev.e.city)))}</small>${ev.why[0] ? `<small class="why">${esc(ev.why[0])}</small>` : ''}</a>` : `<a class="lk-rec" href="#/events"><small>${t('lk_ev_none')}</small></a>`;
    const wsHTML = ws ? `<a class="lk-rec" href="#/studios/${ws.s.id}"><b>${esc(ws.p.title)}</b><small>${esc([ws.s.name, ws.p.date ? ws.p.date.replace(/-/g, '/') : '', ws.p.time].filter(Boolean).join('・'))}</small>${styles[0] ? `<small class="why">${esc(t('lk_why', { s: styles[0] }))}</small>` : ''}</a>` : `<a class="lk-rec" href="#/studios"><small>${t('lk_ws_none')}</small></a>`;
    const body = h(`<div class="lk-wrap"><button class="lk-card" type="button" aria-label="${esc(t('lk_tap'))}">
        <span class="lk-face lk-back"><span class="lk-clover">🍀</span><b>DANCE ISLAND</b><small>${t('lk_tap')}</small></span>
        <span class="lk-face lk-front" style="--lc:${color[1]}">
          <span class="lk-row"><span>${t('lk_luck')}</span><b class="lk-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</b></span>
          <span class="lk-quote" data-utr>${esc(quote)}</span>
          <span class="lk-row"><span>${t('lk_move')}</span><b>${esc(move)}</b></span>
          <span class="lk-row"><span>${t('lk_color')}</span><b><i class="lk-dot"></i>${esc(colorName)}</b></span>
        </span></button>
      <div class="lk-more" hidden>
        <div class="lk-sec"><h4>${t('lk_event')}</h4>${evHTML}</div>
        <div class="lk-sec"><h4>${t('lk_ws')}</h4>${wsHTML}</div>
        <div class="lk-sec"><h4>${t('lk_pick')}</h4><button class="lk-rec lk-pick" type="button"><b>${KIND_IC[pk.kind] || '📰'} ${esc(pk.title)}</b><small>${esc(pk.body.slice(0, 48))}…</small></button></div>
      </div></div>`);
    const m = modal({ title: t('lk_title'), color: 'green', body });
    const card = body.querySelector('.lk-card');
    const flip = () => {
      if (card.classList.contains('flip')) return;
      card.classList.add('flip'); SFX.play('fanfare');
      const r = card.getBoundingClientRect(); sparkle(r.x + r.width / 2, r.y + r.height / 2, 22);
      setTimeout(() => { body.querySelector('.lk-more').hidden = false; }, 450);
    };
    card.onclick = flip;
    if (!auto) setTimeout(flip, 350);
    body.querySelectorAll('a.lk-rec').forEach(a => a.addEventListener('click', () => m.close()));
    body.querySelector('.lk-pick').onclick = () => { m.close(); setTimeout(openPick, 230); };
    try { localStorage.setItem(LKEY(uid), today); } catch (x) {}
  }

  // 每天第一次登入：等開機畫面、教學、對話框、其他視窗都結束後才跳出
  const busy = () => {
    const b = document.getElementById('boot');
    if (b && b.isConnected && getComputedStyle(b).display !== 'none' && getComputedStyle(b).visibility !== 'hidden' && +getComputedStyle(b).opacity > 0.05) return true;
    const n = document.getElementById('npc');
    return !!(document.querySelector('.tut, .modal-back') || (n && !n.classList.contains('hidden')));
  };
  let luckTimer = null;
  function maybeLuck() {
    if (!logged()) return;
    let seen = ''; try { seen = localStorage.getItem(LKEY(Backend.uid)) || ''; } catch (x) {}
    if (seen === A.todayStr()) return;
    clearInterval(luckTimer);
    let n = 0;
    luckTimer = setInterval(() => {
      if (++n > 200 || !logged()) return clearInterval(luckTimer);
      if (busy()) return;
      clearInterval(luckTimer); openLuck(true);
    }, 1500);
  }
  if (Backend.enabled) Backend.ready.then(() => setTimeout(maybeLuck, 1200));
  Player.onChange(() => setTimeout(maybeLuck, 1500));

  return { openLuck: () => openLuck(false), openPick, loadStudios, map: { makeMap, pinIcon, cityCenter, locate, km, countryOpts, cityOpts, styleTags } };
})();
