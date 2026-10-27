/* =========================================================
 * 第四批・便民：
 * - 練舞場地地圖（#/spots）：公園、地下道、鏡面牆…玩家投稿、回報今天能不能用
 * - 二手市集（#/market）：舞鞋、服裝，玩家上架、管理員審核、找賣家私訊
 * - 舞者戰績資料庫示意版「Bboy IDance」（#/idance）：從網站上的比賽成績、參賽名單、評審名單整理
 * ========================================================= */
(() => {
  const { h, esc, modal, toast, sparkle } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const withTimeout = (p, ms = 10000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const M = () => Daily.map;
  const ago = iso => { const d = Math.floor((Date.now() - new Date(iso)) / 864e5); return d <= 0 ? t('sp_today') : t('sp_days', { n: d }); };
  const err = x => { const m = String(x && x.message || x); if (/too many/.test(m)) return t('sd_e_many'); if (/spam/.test(m)) return t('fr_spam'); if (/need character/.test(m)) return t('cd_login'); if (/duplicate|unique/.test(m)) return t('sp_e_dup'); if (/bad media/.test(m)) return t('mk_e_photo'); return m; };
  const upload = async file => Backend.uploadForumFile(file, (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'));

  I18N.extend({
    zh: {
      hub_spots: '練舞場地', hub_market: '二手市集', hub_idance: '戰績資料庫',
      sp_title: '🗺 練舞場地地圖', sp_intro: '哪裡有鏡面牆、下雨也能練、晚上有燈？大家一起整理！去練之前看看最近的回報，練完也記得回報一下今天能不能用。',
      sp_add: '新增場地', sp_near: '附近的場地', sp_all_kind: '全部類型', sp_none: '這個地區還沒有登錄的場地，新增第一個吧！',
      sp_k_park: '公園', sp_k_underpass: '地下道', sp_k_station: '車站 / 捷運站', sp_k_mall: '商場 / 大樓', sp_k_plaza: '廣場', sp_k_other: '其他',
      sp_mirror: '🪞 有鏡面', sp_roof: '☔ 下雨能練', sp_light: '💡 晚上有燈', sp_ok: '✔ 可以練', sp_bad: '✖ 不能用', sp_rep_ok: '回報：今天可以練', sp_rep_bad: '回報：不能用',
      sp_rep_ph: '補充一下（選填）：例如被警衛趕、施工中、人很多', sp_reported: '感謝回報！', sp_last: '最近回報', sp_no_rep: '還沒有人回報', sp_today: '今天', sp_days: '{n} 天前',
      sp_f_name: '場地名稱', sp_f_kind: '類型', sp_f_feat: '場地條件', sp_f_note: '說明（怎麼走、幾點後比較空、注意事項）', sp_f_photo: '照片', sp_sent: '已送出！管理員確認後就會出現在地圖上', sp_review: '場地審核', sp_e_dup: '你今天已經回報過這個場地了',
      mk_title: '🛍 二手市集', mk_intro: '舞鞋、褲子、帽子……用不到的好物讓給需要的人！上架要經過管理員審核。', mk_safe: '⚠ 舞島不經手金流，交易請自行確認：面交選公共場所，寄件先確認對方身分。',
      mk_sell: '上架商品', mk_mine: '我的上架', mk_all: '全部', mk_none: '目前沒有商品', mk_sold: '已售出', mk_pending: '⏳ 審核中', mk_rejected: '未通過',
      mk_c_shoes: '鞋子', mk_c_top: '上衣 / 外套', mk_c_bottom: '褲子', mk_c_hat: '帽子', mk_c_acc: '配件', mk_c_other: '其他',
      mk_cond_new: '全新', mk_cond_like_new: '近全新', mk_cond_used: '二手', mk_trade_meet: '面交', mk_trade_ship: '寄件', mk_trade_both: '面交 / 寄件',
      mk_f_title: '商品名稱', mk_f_cat: '分類', mk_f_price: '價格', mk_f_cur: '幣別', mk_f_cond: '狀況', mk_f_size: '尺寸（選填）', mk_f_trade: '交易方式', mk_f_place: '所在地區', mk_f_body: '商品說明', mk_f_photos: '照片（最多 4 張）',
      mk_contact: '聯絡賣家', mk_contact_note: '打開賣家名片，加好友後就能私訊', mk_mark_sold: '標記為已售出', mk_edit: '編輯', mk_del: '下架刪除', mk_del_q: '確定要刪除「{n}」嗎？', mk_sent: '已送出！審核通過後就會上架', mk_review: '市集審核', mk_e_photo: '照片上傳失敗，請重新選擇',
      mk_free: '免費贈送', mk_seller: '賣家', mk_size: '尺寸',
      id_title: '🏆 Bboy IDance（示意版）', id_banner: '示意版：正式資料庫要等授權確認後才會上線。目前只整理舞島網站上的比賽成績、參賽名單和評審名單。',
      id_q: '輸入舞者或隊伍名字…', id_recent: '最近的比賽成績', id_none: '找不到這個名字的紀錄', id_results: '🏅 比賽成績', id_teams: '🎟 參賽紀錄', id_judges: '⚖ 擔任評審',
      id_preview: '正式版預覽（範例資料，不是真實舞者）', id_empty: '網站上還沒有登錄比賽成績。管理員在活動編輯頁填「比賽成績」後就會出現在這裡。', id_video: '▶ 影片'
    },
    en: {
      hub_spots: 'Practice spots', hub_market: 'Marketplace', hub_idance: 'Battle records',
      sp_title: '🗺 Practice Spot Map', sp_intro: 'Where are the mirror walls, rain-proof spots and lit plazas? Map them together! Check recent reports before you go, and report back after practice.',
      sp_add: 'Add a spot', sp_near: 'Near me', sp_all_kind: 'All types', sp_none: 'No spots here yet — add the first one!',
      sp_k_park: 'Park', sp_k_underpass: 'Underpass', sp_k_station: 'Station', sp_k_mall: 'Mall / building', sp_k_plaza: 'Plaza', sp_k_other: 'Other',
      sp_mirror: '🪞 Mirror', sp_roof: '☔ Rain-proof', sp_light: '💡 Lit at night', sp_ok: '✔ Usable', sp_bad: '✖ Not usable', sp_rep_ok: 'Report: usable today', sp_rep_bad: 'Report: not usable',
      sp_rep_ph: 'Details (optional): kicked out by security, construction, crowded…', sp_reported: 'Thanks for reporting!', sp_last: 'Latest report', sp_no_rep: 'No reports yet', sp_today: 'today', sp_days: '{n} days ago',
      sp_f_name: 'Spot name', sp_f_kind: 'Type', sp_f_feat: 'Features', sp_f_note: 'Notes (how to get there, quiet hours, tips)', sp_f_photo: 'Photo', sp_sent: 'Sent! It will show on the map once an admin approves it', sp_review: 'Spot review', sp_e_dup: 'You already reported this spot today',
      mk_title: '🛍 Marketplace', mk_intro: 'Dance shoes, pants, caps… pass on what you don’t use! Listings are reviewed by admins.', mk_safe: '⚠ Booto doesn’t handle payments. Meet in public places and verify buyers/sellers before shipping.',
      mk_sell: 'List an item', mk_mine: 'My listings', mk_all: 'All', mk_none: 'No items yet', mk_sold: 'Sold', mk_pending: '⏳ Pending', mk_rejected: 'Rejected',
      mk_c_shoes: 'Shoes', mk_c_top: 'Tops / jackets', mk_c_bottom: 'Pants', mk_c_hat: 'Hats', mk_c_acc: 'Accessories', mk_c_other: 'Other',
      mk_cond_new: 'New', mk_cond_like_new: 'Like new', mk_cond_used: 'Used', mk_trade_meet: 'Meet up', mk_trade_ship: 'Shipping', mk_trade_both: 'Meet up / shipping',
      mk_f_title: 'Item name', mk_f_cat: 'Category', mk_f_price: 'Price', mk_f_cur: 'Currency', mk_f_cond: 'Condition', mk_f_size: 'Size (optional)', mk_f_trade: 'Trade method', mk_f_place: 'Location', mk_f_body: 'Description', mk_f_photos: 'Photos (up to 4)',
      mk_contact: 'Contact seller', mk_contact_note: 'Opens the seller’s card — add them as a friend to message', mk_mark_sold: 'Mark as sold', mk_edit: 'Edit', mk_del: 'Delete listing', mk_del_q: 'Delete “{n}”?', mk_sent: 'Sent! It will be listed once approved', mk_review: 'Market review', mk_e_photo: 'Photo upload failed, please choose again',
      mk_free: 'Free', mk_seller: 'Seller', mk_size: 'Size',
      id_title: '🏆 Bboy IDance (preview)', id_banner: 'Preview: the full database launches after licensing is confirmed. For now it only collects results, line-ups and judges from events on Booto.',
      id_q: 'Search a dancer or crew…', id_recent: 'Recent results', id_none: 'No records for this name', id_results: '🏅 Results', id_teams: '🎟 Competed in', id_judges: '⚖ Judged',
      id_preview: 'Full version preview (sample data, not a real dancer)', id_empty: 'No results on the site yet. They appear here once admins fill in “Results” on an event.', id_video: '▶ Video'
    },
    ja: {
      hub_spots: '練習スポット', hub_market: 'フリマ', hub_idance: '戦績データベース',
      sp_title: '🗺 練習スポットマップ', sp_intro: '鏡になるガラス、雨でも練習できる場所、夜も明るい広場…みんなでまとめよう！行く前に最新の報告をチェック、練習後は報告を。',
      sp_add: 'スポットを追加', sp_near: '近くのスポット', sp_all_kind: 'すべての種類', sp_none: 'この地域にはまだスポットがありません。最初の 1 つを追加しよう！',
      sp_k_park: '公園', sp_k_underpass: '地下道', sp_k_station: '駅', sp_k_mall: 'モール / ビル', sp_k_plaza: '広場', sp_k_other: 'その他',
      sp_mirror: '🪞 鏡あり', sp_roof: '☔ 雨でも OK', sp_light: '💡 夜も明るい', sp_ok: '✔ 使える', sp_bad: '✖ 使えない', sp_rep_ok: '報告：今日は使える', sp_rep_bad: '報告：使えない',
      sp_rep_ph: '詳細（任意）：警備員に注意された、工事中、混雑など', sp_reported: '報告ありがとう！', sp_last: '最新の報告', sp_no_rep: 'まだ報告はありません', sp_today: '今日', sp_days: '{n} 日前',
      sp_f_name: 'スポット名', sp_f_kind: '種類', sp_f_feat: '条件', sp_f_note: '説明（行き方、空いている時間、注意点）', sp_f_photo: '写真', sp_sent: '送信しました！管理者が確認すると地図に表示されます', sp_review: 'スポット審査', sp_e_dup: '今日はもうこのスポットを報告しました',
      mk_title: '🛍 フリマ', mk_intro: 'ダンスシューズ、パンツ、帽子…使わない物を必要な人へ！出品は管理者が審査します。', mk_safe: '⚠ Bootoは代金のやり取りに関与しません。手渡しは人の多い場所で、発送前に相手を確認してください。',
      mk_sell: '出品する', mk_mine: '自分の出品', mk_all: 'すべて', mk_none: '商品はまだありません', mk_sold: '売り切れ', mk_pending: '⏳ 審査中', mk_rejected: '非承認',
      mk_c_shoes: 'シューズ', mk_c_top: 'トップス / アウター', mk_c_bottom: 'パンツ', mk_c_hat: '帽子', mk_c_acc: 'アクセサリー', mk_c_other: 'その他',
      mk_cond_new: '新品', mk_cond_like_new: '未使用に近い', mk_cond_used: '中古', mk_trade_meet: '手渡し', mk_trade_ship: '発送', mk_trade_both: '手渡し / 発送',
      mk_f_title: '商品名', mk_f_cat: 'カテゴリ', mk_f_price: '価格', mk_f_cur: '通貨', mk_f_cond: '状態', mk_f_size: 'サイズ（任意）', mk_f_trade: '取引方法', mk_f_place: '地域', mk_f_body: '説明', mk_f_photos: '写真（4 枚まで）',
      mk_contact: '出品者に連絡', mk_contact_note: '出品者の名刺を開きます。フレンドになるとメッセージできます', mk_mark_sold: '売り切れにする', mk_edit: '編集', mk_del: '削除', mk_del_q: '「{n}」を削除しますか？', mk_sent: '送信しました！承認されると出品されます', mk_review: 'フリマ審査', mk_e_photo: '写真のアップロードに失敗しました',
      mk_free: '無料', mk_seller: '出品者', mk_size: 'サイズ',
      id_title: '🏆 Bboy IDance（プレビュー）', id_banner: 'プレビュー版：正式なデータベースは権利確認後に公開します。今はBooto上のイベントの結果・出場者・ジャッジだけをまとめています。',
      id_q: 'ダンサーやチームの名前を入力…', id_recent: '最近の結果', id_none: 'この名前の記録はありません', id_results: '🏅 戦績', id_teams: '🎟 出場', id_judges: '⚖ ジャッジ',
      id_preview: '正式版プレビュー（サンプルデータ・実在のダンサーではありません）', id_empty: 'まだ結果が登録されていません。管理者がイベントに「結果」を入力すると表示されます。', id_video: '▶ 動画'
    },
    ko: {
      hub_spots: '연습 장소', hub_market: '중고 장터', hub_idance: '전적 데이터베이스',
      sp_title: '🗺 연습 장소 지도', sp_intro: '거울벽, 비 와도 연습할 수 있는 곳, 밤에도 밝은 광장… 함께 정리해요! 가기 전에 최근 제보를 확인하고, 연습 후엔 제보해 주세요.',
      sp_add: '장소 추가', sp_near: '근처 장소', sp_all_kind: '모든 종류', sp_none: '이 지역엔 아직 장소가 없어요. 첫 번째로 추가해 보세요!',
      sp_k_park: '공원', sp_k_underpass: '지하도', sp_k_station: '역', sp_k_mall: '쇼핑몰 / 빌딩', sp_k_plaza: '광장', sp_k_other: '기타',
      sp_mirror: '🪞 거울 있음', sp_roof: '☔ 비 와도 OK', sp_light: '💡 밤에도 밝음', sp_ok: '✔ 사용 가능', sp_bad: '✖ 사용 불가', sp_rep_ok: '제보: 오늘 사용 가능', sp_rep_bad: '제보: 사용 불가',
      sp_rep_ph: '자세히 (선택): 경비원 제지, 공사 중, 사람이 많음 등', sp_reported: '제보 고마워요!', sp_last: '최근 제보', sp_no_rep: '아직 제보가 없어요', sp_today: '오늘', sp_days: '{n}일 전',
      sp_f_name: '장소 이름', sp_f_kind: '종류', sp_f_feat: '조건', sp_f_note: '설명 (가는 법, 한산한 시간, 주의사항)', sp_f_photo: '사진', sp_sent: '보냈어요! 관리자가 확인하면 지도에 표시돼요', sp_review: '장소 심사', sp_e_dup: '오늘 이미 이 장소를 제보했어요',
      mk_title: '🛍 중고 장터', mk_intro: '댄스화, 바지, 모자… 안 쓰는 물건을 필요한 사람에게! 등록은 관리자가 심사해요.', mk_safe: '⚠ Booto는 결제에 관여하지 않아요. 직거래는 사람 많은 곳에서, 택배는 상대를 확인한 뒤에 하세요.',
      mk_sell: '물건 등록', mk_mine: '내 등록', mk_all: '전체', mk_none: '아직 물건이 없어요', mk_sold: '판매 완료', mk_pending: '⏳ 심사 중', mk_rejected: '반려',
      mk_c_shoes: '신발', mk_c_top: '상의 / 아우터', mk_c_bottom: '바지', mk_c_hat: '모자', mk_c_acc: '액세서리', mk_c_other: '기타',
      mk_cond_new: '새 상품', mk_cond_like_new: '거의 새것', mk_cond_used: '중고', mk_trade_meet: '직거래', mk_trade_ship: '택배', mk_trade_both: '직거래 / 택배',
      mk_f_title: '물건 이름', mk_f_cat: '분류', mk_f_price: '가격', mk_f_cur: '통화', mk_f_cond: '상태', mk_f_size: '사이즈 (선택)', mk_f_trade: '거래 방법', mk_f_place: '지역', mk_f_body: '설명', mk_f_photos: '사진 (최대 4장)',
      mk_contact: '판매자에게 연락', mk_contact_note: '판매자 명함을 열어요. 친구가 되면 메시지를 보낼 수 있어요', mk_mark_sold: '판매 완료로 표시', mk_edit: '수정', mk_del: '삭제', mk_del_q: '「{n}」을(를) 삭제할까요?', mk_sent: '보냈어요! 승인되면 등록돼요', mk_review: '장터 심사', mk_e_photo: '사진 업로드에 실패했어요',
      mk_free: '무료 나눔', mk_seller: '판매자', mk_size: '사이즈',
      id_title: '🏆 Bboy IDance (미리보기)', id_banner: '미리보기: 정식 데이터베이스는 권리 확인 후 공개돼요. 지금은 Booto에 등록된 이벤트의 결과·참가자·저지만 모아 보여줘요.',
      id_q: '댄서나 크루 이름 입력…', id_recent: '최근 결과', id_none: '이 이름의 기록이 없어요', id_results: '🏅 전적', id_teams: '🎟 참가', id_judges: '⚖ 저지',
      id_preview: '정식 버전 미리보기 (샘플 데이터, 실제 댄서가 아니에요)', id_empty: '아직 등록된 결과가 없어요. 관리자가 이벤트에 「결과」를 입력하면 여기 표시돼요.', id_video: '▶ 영상'
    }
  });

  const placeName = x => [nm(A.byCode[x.country]), x.city ? nm(A.cityOf(x.country, x.city)) : ''].filter(Boolean).join('・');
  const chips = (name, list, sel) => `<div class="chips">${list.map(([v, label]) => `<label class="chip ${sel.includes(v) ? 'on' : ''}"><input type="checkbox" name="${name}" value="${v}" ${sel.includes(v) ? 'checked' : ''} hidden><span class="dot"></span>${label}</label>`).join('')}</div>`;
  const chipToggle = f => f.querySelectorAll('.chips label.chip').forEach(l => l.addEventListener('click', ev => { ev.preventDefault(); const cb = l.querySelector('input'); cb.checked = !cb.checked; l.classList.toggle('on', cb.checked); SFX.play('select'); }));

  /* =========================================================
   * 練舞場地地圖
   * ========================================================= */
  const KINDS = ['park', 'underpass', 'station', 'mall', 'plaza', 'other'];
  const SF = { cc: '', city: '', kind: '', me: null };
  let spots = [], reps = {};
  A.crumbs.spots = () => '🗺 ' + t('hub_spots');
  A.views.spots = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    try {
      await withTimeout(Backend.ready);
      spots = await withTimeout(Backend.spots());
      reps = {}; (await Backend.spotReports(spots.map(s => s.id)).catch(() => [])).forEach(x => (reps[x.spot_id] = reps[x.spot_id] || []).push(x));
      if (!SF.cc && !SF.me) SF.cc = (Backend.profile && Backend.profile.nat) || 'TW';
      spotsPage(inner);
    } catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(/timeout/.test(x.message) ? t('cr_slow') : err(x))}</p><button class="btn" onclick="location.reload()">↻</button>`; }
  };
  const latest = s => (reps[s.id] || [])[0];
  const posOf = s => (typeof s.lat === 'number' ? [s.lat, s.lon] : M().cityCenter(s.country, s.city));
  function spotsPage(inner) {
    const { countryOpts, cityOpts } = M();
    inner.innerHTML = `<div class="win">${UI.winHTML(t('sp_title'), 'green', false)}<div class="win-body"><p>${t('sp_intro')}</p>
        <div class="sd-bar"><select class="input sm sp-cc">${countryOpts(SF.cc, true)}</select><select class="input sm sp-city"></select>
          <select class="input sm sp-kind"><option value="">${t('sp_all_kind')}</option>${KINDS.map(k => `<option value="${k}" ${SF.kind === k ? 'selected' : ''}>${t('sp_k_' + k)}</option>`).join('')}</select></div>
        <div class="btn-row"><button class="btn sm teal sp-near ${SF.me ? 'on' : ''}">${PXI.img('menu/near', '📍')} ${t('sp_near')}</button><button class="btn sm pink sp-add">＋ ${t('sp_add')}</button></div>
        <div class="sd-map"></div></div></div><div class="sp-list"></div>`;
    const cc = inner.querySelector('.sp-cc'), city = inner.querySelector('.sp-city'), kind = inner.querySelector('.sp-kind');
    const fillCity = () => { city.innerHTML = SF.cc ? cityOpts(SF.cc, SF.city, true) : `<option value="">${t('sd_all_city')}</option>`; city.disabled = !SF.cc; };
    fillCity();
    let mapObj = null, layer = null;
    const list = () => {
      let out = spots.filter(s => s.status === 'approved' || s.user_id === Backend.uid).filter(s => !SF.cc || s.country === SF.cc).filter(s => !SF.city || s.city === SF.city).filter(s => !SF.kind || s.kind === SF.kind);
      if (SF.me) out = out.map(s => Object.assign(s, { _d: M().km(SF.me[0], SF.me[1], ...posOf(s)) })).sort((a, b) => a._d - b._d); else out.forEach(s => delete s._d);
      return out;
    };
    const card = s => {
      const l = latest(s);
      return `<article class="sp-card" data-id="${s.id}">${s.photo ? Backend.thumbImg(s.photo, 'sp-ph') : ''}<div class="sp-main">
        <div class="sp-top"><b>${esc(s.name)}</b><span class="tag">${t('sp_k_' + s.kind)}</span>${s.status !== 'approved' ? `<span class="tag">${t('sd_pending')}</span>` : ''}</div>
        <small>${PXI.img('event/pin', '📍')} ${esc(placeName(s))}${s.address ? '・' + esc(s.address) : ''}${s._d != null ? `　${t('sd_km', { n: s._d < 10 ? s._d.toFixed(1) : Math.round(s._d) })}` : ''}</small>
        <div class="sp-feat">${s.mirror ? `<span class="tag">${t('sp_mirror')}</span>` : ''}${s.roof ? `<span class="tag">${t('sp_roof')}</span>` : ''}${s.light ? `<span class="tag">${t('sp_light')}</span>` : ''}</div>
        ${s.note ? `<p class="sp-note" data-utr>${esc(s.note)}</p>` : ''}
        <div class="sp-rep ${l ? (l.ok ? 'ok' : 'bad') : ''}">${t('sp_last')}：${l ? `<b>${l.ok ? t('sp_ok') : t('sp_bad')}</b>${l.note ? `「${esc(l.note)}」` : ''}<small>（${ago(l.created_at)}・${esc((l.author || {}).name || '')}）</small>` : t('sp_no_rep')}</div>
        <div class="btn-row"><button class="btn sm green sp-ok">${t('sp_rep_ok')}</button><button class="btn sm red sp-bad">${t('sp_rep_bad')}</button>
          <a class="btn sm teal" href="https://www.google.com/maps/dir/?api=1&destination=${posOf(s).join(',')}&travelmode=transit" target="_blank" rel="noopener">🧭 ${t('navx_go')}</a>
          ${s.user_id === Backend.uid || Backend.isAdmin ? `<button class="btn sm sp-del">🗑</button>` : ''}</div></div></article>`;
    };
    const draw = () => {
      const rows = list();
      inner.querySelector('.sp-list').innerHTML = rows.map(card).join('') || `<p class="note">${t('sp_none')}</p>`;
      if (mapObj) {
        const { L, map } = mapObj; if (layer) layer.remove(); layer = L.layerGroup().addTo(map);
        const pts = rows.map(s => { const p = posOf(s), l = latest(s); L.marker(p, { icon: L.divIcon({ className: 'sd-pin sp-pin ' + (l ? (l.ok ? 'ok' : 'bad') : ''), html: PXI.img('event/pin', '📍'), iconSize: [30, 30], iconAnchor: [15, 28], popupAnchor: [0, -26] }) }).addTo(layer).bindPopup(`<b>${esc(s.name)}</b><br>${t('sp_k_' + s.kind)}`); return p; });
        if (SF.me) { L.circleMarker(SF.me, { radius: 7, color: '#2a1f2e', fillColor: '#f07ca3', fillOpacity: 1, weight: 3 }).addTo(layer); pts.push(SF.me); }
        if (pts.length > 1) map.fitBounds(L.latLngBounds(pts.slice(0, 20)).pad(0.15), { maxZoom: 15 }); else if (pts.length === 1) map.setView(pts[0], 15);
        else map.setView(SF.cc ? M().cityCenter(SF.cc, SF.city) : [23.7, 121], SF.city ? 12 : SF.cc ? 7 : 3);
      }
    };
    cc.onchange = () => { SF.cc = cc.value; SF.city = ''; SF.me = null; fillCity(); draw(); };
    city.onchange = () => { SF.city = city.value; draw(); };
    kind.onchange = () => { SF.kind = kind.value; draw(); };
    inner.querySelector('.sp-near').onclick = async ev => {
      const b = ev.currentTarget; if (SF.me) { SF.me = null; b.classList.remove('on'); return draw(); }
      try { SF.me = await M().locate(); SF.cc = ''; SF.city = ''; cc.value = ''; fillCity(); b.classList.add('on'); draw(); } catch (x) { toast(t('sd_geo_fail'), '📍'); }
    };
    inner.querySelector('.sp-add').onclick = () => (logged() ? openSpotEditor(async () => { spots = await Backend.spots(); draw(); }) : Player.prompt());
    inner.querySelector('.sp-list').onclick = async ev => {
      const c = ev.target.closest('[data-id]'); if (!c) return; const id = +c.dataset.id;
      const okB = ev.target.closest('.sp-ok'), badB = ev.target.closest('.sp-bad');
      if (okB || badB) {
        if (!logged()) return Player.prompt();
        const note = badB ? (window.prompt(t('sp_rep_ph')) || '').trim().slice(0, 100) : '';
        try { await Backend.reportSpot(id, !!okB, note); SFX.play('coin'); toast(t('sp_reported'), '🗺'); (reps[id] = reps[id] || []).unshift({ spot_id: id, ok: !!okB, note, created_at: new Date().toISOString(), author: { name: Player.me.name } }); draw(); }
        catch (x) { toast(err(x), '✕'); }
      } else if (ev.target.closest('.sp-del')) {
        if (!confirm(t('del_title'))) return;
        try { await Backend.deleteSpot(id); spots = spots.filter(s => s.id !== id); draw(); } catch (x) { toast(err(x), '✕'); }
      }
    };
    draw();
    M().makeMap(inner.querySelector('.sd-map'), SF.cc ? M().cityCenter(SF.cc, SF.city) : [23.7, 121], 7).then(m => { mapObj = m; draw(); }).catch(() => inner.querySelector('.sd-map')?.remove());
  }
  function openSpotEditor(after) {
    const { countryOpts, cityOpts } = M();
    const cc0 = (Backend.profile && Backend.profile.nat) || 'TW';
    let photo = '', pos = null;
    const body = h(`<form class="form" novalidate>
      <label class="field full"><span>${t('sp_f_name')} <b>*</b></span><input class="input" name="name" maxlength="60"></label>
      <label class="field"><span>${t('sp_f_kind')}</span><select class="input" name="kind">${KINDS.map(k => `<option value="${k}">${t('sp_k_' + k)}</option>`).join('')}</select></label>
      <div class="field"><span>${t('sd_f_place')}</span><div class="row2"><select class="input" name="country">${countryOpts(cc0)}</select><select class="input" name="city"></select></div></div>
      <label class="field full"><span>${t('sd_f_addr')}</span><input class="input" name="address" maxlength="200"></label>
      <fieldset class="fieldset full"><legend>${t('sp_f_feat')}</legend>${chips('feat', [['mirror', t('sp_mirror')], ['roof', t('sp_roof')], ['light', t('sp_light')]], [])}</fieldset>
      <label class="field full"><span>${t('sp_f_note')}</span><textarea class="input" name="note" rows="3" maxlength="500"></textarea></label>
      <fieldset class="fieldset full"><legend>${t('sp_f_photo')}</legend><label class="btn sm">${t('sd_f_cover_up')}<input type="file" accept="image/png,image/jpeg,image/webp" hidden class="sp-file"></label><img class="poster-prev hidden" alt=""></fieldset>
      <fieldset class="fieldset full"><legend>${t('sd_f_pin')}</legend><button type="button" class="btn sm teal sp-here">${t('sd_f_here')}</button><div class="sd-map sd-map-sm"></div></fieldset>
      <div class="full"><div class="err"></div><div class="form-foot"><button type="button" class="btn cancel">${t('cancel')}</button><button class="btn pink">${t('sd_submit')}</button></div></div></form>`);
    const m = modal({ title: '🗺 ' + t('sp_add'), color: 'green', body, wide: true });
    const f = body; f.elements.city.innerHTML = cityOpts(cc0, '');
    chipToggle(f);
    let mapObj = null, marker = null;
    const setPin = (p, fly) => { pos = p; if (!mapObj) return; if (marker) marker.setLatLng(p); else marker = mapObj.L.marker(p, { icon: M().pinIcon(mapObj.L), draggable: true }).addTo(mapObj.map).on('dragend', e => { const ll = e.target.getLatLng(); pos = [ll.lat, ll.lng]; }); if (fly) mapObj.map.setView(p, 17); };
    M().makeMap(f.querySelector('.sd-map'), M().cityCenter(cc0, f.elements.city.value), 12).then(o => { mapObj = o; o.map.on('click', e => setPin([e.latlng.lat, e.latlng.lng])); }).catch(() => {});
    f.elements.country.onchange = () => { f.elements.city.innerHTML = cityOpts(f.elements.country.value, ''); if (mapObj && !marker) mapObj.map.setView(M().cityCenter(f.elements.country.value, f.elements.city.value), 12); };
    f.elements.city.onchange = () => { if (mapObj && !marker) mapObj.map.setView(M().cityCenter(f.elements.country.value, f.elements.city.value), 13); };
    f.querySelector('.sp-here').onclick = async () => { try { setPin(await M().locate(), true); } catch (x) { toast(t('sd_geo_fail'), '📍'); } };
    f.querySelector('.sp-file').onchange = async ev => { const file = ev.target.files[0]; if (!file || file.size > 5 * 1024 * 1024) return; try { photo = await upload(file); const pv = f.querySelector('.poster-prev'); pv.src = photo; pv.classList.remove('hidden'); } catch (x) { toast(err(x), '✕'); } };
    f.querySelector('.cancel').onclick = m.close;
    f.onsubmit = async ev => {
      ev.preventDefault(); const fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), feat = fd.getAll('feat');
      if (g('name').length < 2) { f.querySelector('.err').textContent = '✕ ' + t('sp_f_name'); return; }
      try {
        await Backend.saveSpot({ name: g('name'), kind: g('kind'), country: g('country'), city: g('city') || null, address: g('address') || null, note: g('note') || null, photo: photo || null,
          mirror: feat.includes('mirror'), roof: feat.includes('roof'), light: feat.includes('light'), lat: pos ? +pos[0].toFixed(6) : null, lon: pos ? +pos[1].toFixed(6) : null });
        m.close(); SFX.play('fanfare'); toast(t('sp_sent'), '🗺'); after && after();
      } catch (x) { f.querySelector('.err').textContent = '✕ ' + err(x); }
    };
  }

  /* =========================================================
   * 二手市集
   * ========================================================= */
  const CATS = ['shoes', 'top', 'bottom', 'hat', 'acc', 'other'], CURS = ['TWD', 'JPY', 'KRW', 'USD', 'HKD', 'CNY', 'EUR'];
  const SYM = { TWD: 'NT$', JPY: '¥', KRW: '₩', USD: 'US$', HKD: 'HK$', CNY: 'CN¥', EUR: '€' };
  const price = x => (!x.price ? t('mk_free') : SYM[x.currency] + Number(x.price).toLocaleString());
  const MF = { cat: '', tab: 'all', q: '' };
  let items = [];
  A.crumbs.market = () => '🛍 ' + t('hub_market');
  A.views.market = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    try { await withTimeout(Backend.ready); items = await withTimeout(Backend.marketItems()); marketPage(inner); }
    catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(/timeout/.test(x.message) ? t('cr_slow') : err(x))}</p><button class="btn" onclick="location.reload()">↻</button>`; }
  };
  function marketPage(inner) {
    inner.innerHTML = `<div class="win">${UI.winHTML(t('mk_title'), 'pink', false)}<div class="win-body"><p>${t('mk_intro')}</p><p class="note mk-safe">${t('mk_safe')}</p>
      <div class="fo-bar"><div class="seg mk-tabs">${['all', 'mine'].map(k => `<button type="button" data-t="${k}" class="${MF.tab === k ? 'on' : ''}">${t(k === 'all' ? 'mk_all' : 'mk_mine')}</button>`).join('')}</div>
        <select class="input sm mk-cat"><option value="">${t('mk_all')}</option>${CATS.map(c => `<option value="${c}" ${MF.cat === c ? 'selected' : ''}>${t('mk_c_' + c)}</option>`).join('')}</select>
        <input class="input sm mk-q" placeholder="🔍" value="${esc(MF.q)}"><span class="grow"></span><button class="btn pink mk-sell">＋ ${t('mk_sell')}</button></div></div></div>
      <div class="mk-grid"></div>`;
    const draw = () => {
      const q = MF.q.toLowerCase();
      const rows = items.filter(x => (MF.tab === 'mine' ? x.user_id === Backend.uid : ['approved', 'sold'].includes(x.status))).filter(x => !MF.cat || x.category === MF.cat)
        .filter(x => !q || (x.title + ' ' + (x.body || '')).toLowerCase().includes(q)).sort((a, b) => (a.status === 'sold') - (b.status === 'sold'));
      inner.querySelector('.mk-grid').innerHTML = rows.map(x => `<button class="mk-card ${x.status}" data-id="${x.id}">${(x.photos || [])[0] ? Backend.thumbImg(x.photos[0]) : '<span class="mk-noph">🛍</span>'}
        ${x.status === 'sold' ? `<span class="mk-sold">${t('mk_sold')}</span>` : ''}<span class="mk-b"><b>${esc(x.title)}</b><span class="mk-price">${esc(price(x))}</span>
        <small>${t('mk_cond_' + x.cond)}・${t('mk_trade_' + x.trade)}・${esc(placeName(x))}</small>${x.status === 'pending' ? `<span class="tag">${t('mk_pending')}</span>` : x.status === 'rejected' ? `<span class="tag">${t('mk_rejected')}</span>` : ''}</span></button>`).join('') || `<p class="note">${t('mk_none')}</p>`;
    };
    inner.querySelector('.mk-tabs').onclick = ev => { const b = ev.target.closest('[data-t]'); if (!b) return; MF.tab = b.dataset.t; inner.querySelectorAll('.mk-tabs button').forEach(x => x.classList.toggle('on', x === b)); draw(); };
    inner.querySelector('.mk-cat').onchange = ev => { MF.cat = ev.target.value; draw(); };
    inner.querySelector('.mk-q').oninput = ev => { MF.q = ev.target.value.trim(); draw(); };
    inner.querySelector('.mk-sell').onclick = () => (logged() ? openSell(null, async () => { items = await Backend.marketItems(); MF.tab = 'mine'; marketPage(inner); }) : Player.prompt());
    inner.querySelector('.mk-grid').onclick = ev => { const c = ev.target.closest('[data-id]'); if (c) openItem(items.find(x => x.id === +c.dataset.id), async () => { items = await Backend.marketItems(); draw(); }); };
    draw();
  }
  function openItem(x, after) {
    if (!x) return; SFX.play('open');
    const own = x.user_id === Backend.uid, adm = Backend.isAdmin;
    const body = h(`<div class="mk-item">${(x.photos || []).length ? `<div class="mk-photos">${x.photos.map(u => `<img src="${esc(u)}" alt="">`).join('')}</div>` : ''}
      <div class="mk-price big">${esc(price(x))}${x.status === 'sold' ? ` <span class="tag">${t('mk_sold')}</span>` : ''}</div>
      <dl class="info"><dt>${t('mk_f_cat')}</dt><dd>${t('mk_c_' + x.category)}</dd><dt>${t('mk_f_cond')}</dt><dd>${t('mk_cond_' + x.cond)}</dd>${x.size ? `<dt>${t('mk_size')}</dt><dd>${esc(x.size)}</dd>` : ''}
        <dt>${t('mk_f_trade')}</dt><dd>${t('mk_trade_' + x.trade)}</dd><dt>${t('mk_f_place')}</dt><dd>${esc(placeName(x))}</dd><dt>${t('mk_seller')}</dt><dd>${esc((x.author || {}).name || '')} @${esc((x.author || {}).handle || '')}</dd></dl>
      ${x.body ? `<p class="sd-intro" data-utr>${esc(x.body)}</p>` : ''}<p class="note">${t('mk_safe')}</p>
      <div class="btn-row">${!own && x.status === 'approved' ? `<button class="btn pink mk-contact">💬 ${t('mk_contact')}</button>` : ''}
        ${own && x.status === 'approved' ? `<button class="btn green mk-soldb">✔ ${t('mk_mark_sold')}</button>` : ''}${own ? `<button class="btn yellow mk-edit">✎ ${t('mk_edit')}</button>` : ''}
        ${own || adm ? `<button class="btn red mk-del">🗑 ${t('mk_del')}</button>` : ''}</div>${!own ? `<p class="note">${t('mk_contact_note')}</p>` : ''}</div>`);
    const m = modal({ title: '🛍 ' + esc(x.title), color: 'pink', body, wide: true });
    const on = (s, fn) => { const b = body.querySelector(s); if (b) b.onclick = fn; };
    on('.mk-contact', () => { if (!logged()) return Player.prompt(); m.close(); setTimeout(() => Friends.openCard((x.author || {}).handle), 230); });
    on('.mk-soldb', async () => { try { await Backend.saveMarket({ id: x.id, status: 'sold' }); SFX.play('coin'); m.close(); after && after(); } catch (e) { toast(err(e), '✕'); } });
    on('.mk-edit', () => { m.close(); setTimeout(() => openSell(x, after), 230); });
    on('.mk-del', async () => { if (!confirm(t('mk_del_q', { n: x.title }))) return; try { await Backend.deleteMarket(x.id); m.close(); toast(t('deleted'), '✕'); after && after(); } catch (e) { toast(err(e), '✕'); } });
    body.querySelectorAll('.mk-photos img').forEach(img => (img.onclick = () => modal({ title: '🛍', color: 'pink', wide: true, body: `<div class="lightbox"><img src="${esc(img.src)}" alt=""></div>` })));
  }
  function openSell(x, after) {
    const { countryOpts, cityOpts } = M();
    const editing = !!x; x = x || { country: (Backend.profile && Backend.profile.nat) || 'TW', currency: 'TWD', cond: 'used', trade: 'both', category: 'shoes', photos: [] };
    const photos = (x.photos || []).slice();
    const opts = (list, sel, pre) => list.map(v => `<option value="${v}" ${v === sel ? 'selected' : ''}>${pre ? t(pre + v) : v}</option>`).join('');
    const body = h(`<form class="form" novalidate>
      <label class="field full"><span>${t('mk_f_title')} <b>*</b></span><input class="input" name="title" maxlength="60" value="${esc(x.title || '')}"></label>
      <div class="row3 full"><label class="field"><span>${t('mk_f_cat')}</span><select class="input" name="category">${opts(CATS, x.category, 'mk_c_')}</select></label>
        <label class="field"><span>${t('mk_f_price')}</span><input class="input" name="price" type="number" min="0" inputmode="numeric" value="${x.price ?? ''}" placeholder="0 = ${esc(t('mk_free'))}"></label>
        <label class="field"><span>${t('mk_f_cur')}</span><select class="input" name="currency">${opts(CURS, x.currency)}</select></label></div>
      <div class="row3 full"><label class="field"><span>${t('mk_f_cond')}</span><select class="input" name="cond">${opts(['new', 'like_new', 'used'], x.cond, 'mk_cond_')}</select></label>
        <label class="field"><span>${t('mk_f_size')}</span><input class="input" name="size" maxlength="20" value="${esc(x.size || '')}" placeholder="US 9 / M / 26cm"></label>
        <label class="field"><span>${t('mk_f_trade')}</span><select class="input" name="trade">${opts(['both', 'meet', 'ship'], x.trade, 'mk_trade_')}</select></label></div>
      <div class="field full"><span>${t('mk_f_place')}</span><div class="row2"><select class="input" name="country">${countryOpts(x.country)}</select><select class="input" name="city"></select></div></div>
      <label class="field full"><span>${t('mk_f_body')}</span><textarea class="input" name="body" rows="4" maxlength="1000">${esc(x.body || '')}</textarea></label>
      <fieldset class="fieldset full"><legend>${t('mk_f_photos')}</legend><label class="btn sm">📷 ${t('sd_f_cover_up')}<input type="file" accept="image/png,image/jpeg,image/webp" hidden class="mk-file"></label><div class="mk-prev"></div></fieldset>
      <p class="note full">${t('mk_safe')}</p>
      <div class="full"><div class="err"></div><div class="form-foot"><button type="button" class="btn cancel">${t('cancel')}</button><button class="btn pink">${t('sd_submit')}</button></div></div></form>`);
    const m = modal({ title: '🛍 ' + t(editing ? 'mk_edit' : 'mk_sell'), color: 'pink', body, wide: true });
    const f = body; f.elements.city.innerHTML = cityOpts(x.country, x.city || '');
    f.elements.country.onchange = () => { f.elements.city.innerHTML = cityOpts(f.elements.country.value, ''); };
    const prev = f.querySelector('.mk-prev');
    const drawPrev = () => { prev.innerHTML = photos.map((u, i) => `<span class="mk-pv"><img src="${esc(u)}" alt=""><button type="button" data-i="${i}">✕</button></span>`).join(''); };
    prev.onclick = ev => { const b = ev.target.closest('[data-i]'); if (b) { photos.splice(+b.dataset.i, 1); drawPrev(); } };
    f.querySelector('.mk-file').onchange = async ev => {
      const file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
      if (photos.length >= 4) return toast(t('mk_f_photos'), '✕');
      if (file.size > 5 * 1024 * 1024) return toast(t('ph_big'), '✕');
      try { photos.push(await upload(file)); drawPrev(); } catch (e) { toast(t('mk_e_photo'), '✕'); }
    };
    drawPrev();
    f.querySelector('.cancel').onclick = m.close;
    f.onsubmit = async ev => {
      ev.preventDefault(); const fd = new FormData(f), g = k => String(fd.get(k) || '').trim();
      if (g('title').length < 2) { f.querySelector('.err').textContent = '✕ ' + t('mk_f_title'); return; }
      try {
        await Backend.saveMarket({ ...(editing ? { id: x.id } : {}), title: g('title'), category: g('category'), price: g('price') === '' ? null : Math.max(0, Math.round(+g('price'))), currency: g('currency'),
          cond: g('cond'), size: g('size') || null, trade: g('trade'), country: g('country'), city: g('city') || null, body: g('body') || null, photos });
        m.close(); SFX.play('fanfare'); toast(t('mk_sent'), '🛍'); after && after();
      } catch (e) { f.querySelector('.err').textContent = '✕ ' + err(e); }
    };
  }

  /* ---------- 後台：場地審核、市集審核 ---------- */
  A.adminTabs = A.adminTabs || [];
  const reviewTab = (key, label, load, show, approve) => A.adminTabs.push({
    key, label,
    draw: async (pane, fail) => {
      let rows = []; try { rows = (await load()).filter(x => x.status === 'pending'); } catch (x) { return fail(x); }
      pane.innerHTML = rows.length ? rows.map(x => `<div class="fo-review" data-id="${x.id}">${show(x)}<div class="btn-row"><button class="btn sm green ok">✓ ${t('sd_approve')}</button><button class="btn sm no">${t('sd_reject')}</button></div></div>`).join('') : `<p class="note">${t('adm_none')}</p>`;
      pane.onclick = async ev => { const b = ev.target.closest('.ok, .no'); if (!b) return; const el = b.closest('[data-id]'); try { await approve(+el.dataset.id, b.classList.contains('ok') ? 'approved' : 'rejected'); el.remove(); toast(t('adm_done'), '✔'); } catch (x) { fail(x); } };
    }
  });
  reviewTab('spots', () => '🗺 ' + t('sp_review'), () => Backend.spots(),
    x => `<div class="fo-meta"><b>${esc(x.name)}</b><span class="tm">${t('sp_k_' + x.kind)}・${esc(placeName(x))}</span></div>${x.photo ? `<img class="fo-rv-img" src="${esc(x.photo)}" alt="">` : ''}<p>${esc(x.address || '')} ${esc(x.note || '')}</p>`,
    (id, st) => Backend.reviewSpot(id, st));
  reviewTab('market', () => '🛍 ' + t('mk_review'), () => Backend.marketItems(),
    x => `<div class="fo-meta"><b>${esc(x.title)}</b><span class="tm">${esc(price(x))}・${esc((x.author || {}).name || '')}</span></div><div class="mk-rv">${(x.photos || []).map(u => `<img src="${esc(u)}" alt="">`).join('')}</div><p>${esc(x.body || '')}</p>`,
    (id, st) => Backend.saveMarket({ id, status: st }));

  /* =========================================================
   * Bboy IDance（示意版）
   * ========================================================= */
  A.crumbs.idance = () => '🏆 ' + t('hub_idance');
  const norm = s => String(s || '').replace(/[（(].*?[)）]/g, '').trim().toLowerCase();
  function buildIndex() {
    const idx = new Map();
    const add = (name, kind, e, extra = {}) => {
      const k = norm(name); if (!k) return;
      if (!idx.has(k)) idx.set(k, { name: String(name).replace(/[（(].*?[)）]/g, '').trim(), results: [], teams: [], judges: [] });
      idx.get(k)[kind].push({ e, ...extra });
    };
    Store.all().forEach(e => {
      (e.results || []).forEach(r => add(r.name, 'results', e, { place: r.place }));
      (e.teams || []).forEach(n => add(n, 'teams', e));
      (e.judges || []).forEach(n => add(n, 'judges', e));
    });
    return idx;
  }
  A.views.idance = (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    const idx = buildIndex();
    const evLine = x => `<a class="sr-row" href="#/e/${encodeURIComponent(x.e.id)}"><b>${x.place ? `${esc(x.place)}・` : ''}${esc(x.e.name)}</b><small>${esc(x.e.date.replace(/-/g, '/'))}・${esc(nm(A.cityOf(x.e.country, x.e.city)))}${x.e.video ? `・${t('id_video')}` : ''}</small></a>`;
    const profile = p => `<div class="id-prof"><h3>${esc(p.name)}</h3>
      ${p.results.length ? `<h4>${t('id_results')}</h4>${p.results.map(evLine).join('')}` : ''}
      ${p.teams.length ? `<h4>${t('id_teams')}</h4>${p.teams.map(evLine).join('')}` : ''}
      ${p.judges.length ? `<h4>${t('id_judges')}</h4>${p.judges.map(evLine).join('')}` : ''}</div>`;
    const recent = [...idx.values()].flatMap(p => p.results.map(x => ({ ...x, who: p.name }))).sort((a, b) => b.e.date.localeCompare(a.e.date)).slice(0, 12);
    // 正式版預覽：範例資料（明確標示不是真實舞者）
    const sample = `<div class="id-sample"><span class="tag">${t('id_preview')}</span>
      <div class="id-prof"><h3>B-Boy Sample（範例）</h3><div class="id-stats"><span>🏆 3</span><span>🥈 5</span><span>🎟 18</span><span>⚖ 2</span></div>
        <h4>${t('id_results')}</h4><div class="sr-row"><b>冠軍・Sample Battle 2025（範例）</b><small>2025/08/11・台北市・${t('id_video')}</small></div><div class="sr-row"><b>四強・Example Jam Vol.3（範例）</b><small>2025/03/02・台中市</small></div></div></div>`;
    inner.innerHTML = `<div class="win">${UI.winHTML(t('id_title'), 'yellow', false)}<div class="win-body"><p class="note id-banner">${t('id_banner')}</p>
        <input class="input id-q" type="search" placeholder="${esc(t('id_q'))}"><div class="id-out"></div></div></div>
      <div class="win">${UI.winHTML('🏅 ' + t('id_recent'), 'orange', false)}<div class="win-body">${recent.length ? recent.map(x => `<button class="sr-row id-who" data-n="${esc(x.who)}"><b>${esc(x.place ? x.place + '・' : '')}${esc(x.who)}</b><small>${esc(x.e.name)}・${esc(x.e.date.replace(/-/g, '/'))}</small></button>`).join('') : `<p class="note">${t('id_empty')}</p>`}</div></div>
      ${sample}`;
    const out = inner.querySelector('.id-out'), q = inner.querySelector('.id-q');
    const search = v => {
      const k = norm(v); if (k.length < 2) { out.innerHTML = ''; return; }
      const hits = [...idx.entries()].filter(([key]) => key.includes(k)).map(([, p]) => p).slice(0, 5);
      out.innerHTML = hits.length ? hits.map(profile).join('') : `<p class="note">${t('id_none')}</p>`;
    };
    q.oninput = () => search(q.value);
    inner.onclick = ev => { const b = ev.target.closest('.id-who'); if (b) { q.value = b.dataset.n; search(b.dataset.n); q.scrollIntoView({ block: 'center' }); } };
  };
})();
