/* =========================================================
 * 第六批：真的護照本（封面、資料頁、台灣頁、簽證頁、可以翻頁和下載）、
 * 贊助商廣告（彈窗 / 橫幅 / 圖片廣播，管理員後台管理和看成效）
 * ========================================================= */
(() => {
  const { h, esc, modal, toast, sparkle, download } = UI;
  const A = window.App;
  const pad2 = n => String(n).padStart(2, '0');

  I18N.extend({
    zh: {
      pp_open: '打開護照本', pp_title: '📘 舞島護照', pp_cover1: '舞島護照', pp_cover2: 'BOOTO PASSPORT', pp_cover3: '街舞冒險者通行證',
      pp_info: '持照人資料', pp_name: '姓名 / Name', pp_id: '角色 ID', pp_nat: '國籍 / Nationality', pp_style: '舞風 / Style', pp_job: '職業 / Role', pp_title_f: '稱號 / Title',
      pp_lv: '等級 / Level', pp_issue: '發照日期 / Date of issue', pp_stamps: '印章數', pp_tw: '台灣 22 縣市', pp_tw_d: '去台灣各縣市的活動打卡，把這頁集滿吧！',
      pp_visa: '簽證 VISAS', pp_visa_empty: '這頁還空空的…去活動現場打卡就會蓋上印章！', pp_back: '舞島護照局 · 願你在每個 Cypher 都找到自己的節奏',
      pp_prev: '上一頁', pp_next: '下一頁', pp_dl: '下載資料頁', pp_page: '第 {n} / {t} 頁', pp_login: '登入角色才能領護照喔',
      sp_tag: '贊助', sp_more: '了解更多', sp_admin: '贊助商廣告', sp_new: '新增廣告', sp_name: '贊助商名稱', sp_kind: '類型', sp_popup: '彈窗', sp_banner: '橫幅', sp_broadcast: '圖片廣播',
      sp_img: '圖片', sp_img_up: '或上傳圖片（3MB 內）', sp_link: '連結（https://…）', sp_text: '文字（200 字內）', sp_start: '開始', sp_end: '結束（可留空）', sp_weight: '權重 1–10',
      sp_active: '啟用', sp_save: '儲存', sp_imp: '曝光', sp_click: '點擊', sp_ctr: '點擊率', sp_none: '還沒有廣告', sp_edit: '編輯', sp_bad_link: '連結要用 https:// 開頭',
      sp_note: '彈窗：每台裝置每天最多看到一次，新手教學期間不會出現。橫幅：顯示在活動總覽、城市行事曆、論壇上方。圖片廣播：每隔幾分鐘從左下角滑出。'
    },
    en: {
      pp_open: 'Open passport', pp_title: '📘 Booto passport', pp_cover1: 'BOOTO', pp_cover2: 'PASSPORT', pp_cover3: 'Street dance adventurer pass',
      pp_info: 'Holder information', pp_name: 'Name', pp_id: 'Character ID', pp_nat: 'Nationality', pp_style: 'Style', pp_job: 'Role', pp_title_f: 'Title',
      pp_lv: 'Level', pp_issue: 'Date of issue', pp_stamps: 'Stamps', pp_tw: 'Taiwan · 22 cities & counties', pp_tw_d: 'Check in at events around Taiwan to fill this page!',
      pp_visa: 'VISAS', pp_visa_empty: 'Still empty… check in at an event to get a stamp!', pp_back: 'Booto Passport Office · May you find your rhythm in every cypher',
      pp_prev: 'Previous', pp_next: 'Next', pp_dl: 'Download ID page', pp_page: 'Page {n} / {t}', pp_login: 'Log in to get your passport',
      sp_tag: 'Sponsored', sp_more: 'Learn more', sp_admin: 'Sponsors', sp_new: 'New ad', sp_name: 'Sponsor name', sp_kind: 'Type', sp_popup: 'Popup', sp_banner: 'Banner', sp_broadcast: 'Image broadcast',
      sp_img: 'Image URL', sp_img_up: 'or upload an image (max 3MB)', sp_link: 'Link (https://…)', sp_text: 'Text (max 200)', sp_start: 'Start', sp_end: 'End (optional)', sp_weight: 'Weight 1–10',
      sp_active: 'Active', sp_save: 'Save', sp_imp: 'Views', sp_click: 'Clicks', sp_ctr: 'CTR', sp_none: 'No ads yet', sp_edit: 'Edit', sp_bad_link: 'Links must start with https://',
      sp_note: 'Popup: at most once per device per day, never during the tutorial. Banner: shown above events, city calendars and the forum. Image broadcast: slides in from the bottom-left every few minutes.'
    },
    ja: {
      pp_open: 'パスポートを開く', pp_title: '📘 Booto パスポート', pp_cover1: 'Booto', pp_cover2: 'PASSPORT', pp_cover3: 'ストリートダンス冒険者の通行証',
      pp_info: '所持人情報', pp_name: '氏名 / Name', pp_id: 'キャラ ID', pp_nat: '国籍 / Nationality', pp_style: 'ジャンル / Style', pp_job: '職業 / Role', pp_title_f: '称号 / Title',
      pp_lv: 'レベル / Level', pp_issue: '発行日 / Date of issue', pp_stamps: 'スタンプ数', pp_tw: '台湾 22 県市', pp_tw_d: '台湾各地のイベントでチェックインして、このページを集めよう！',
      pp_visa: '査証 VISAS', pp_visa_empty: 'まだ空っぽ…イベントでチェックインするとスタンプが押されるよ！', pp_back: 'Booto旅券局 · すべてのサイファーで君のリズムが見つかりますように',
      pp_prev: '前へ', pp_next: '次へ', pp_dl: '身分事項ページを保存', pp_page: '{n} / {t} ページ', pp_login: 'ログインするとパスポートがもらえるよ',
      sp_tag: '広告', sp_more: '詳しく見る', sp_admin: 'スポンサー広告', sp_new: '広告を追加', sp_name: 'スポンサー名', sp_kind: '種類', sp_popup: 'ポップアップ', sp_banner: 'バナー', sp_broadcast: '画像配信',
      sp_img: '画像 URL', sp_img_up: 'または画像をアップロード（3MB まで）', sp_link: 'リンク（https://…）', sp_text: 'テキスト（200 文字まで）', sp_start: '開始', sp_end: '終了（任意）', sp_weight: '重み 1–10',
      sp_active: '有効', sp_save: '保存', sp_imp: '表示', sp_click: 'クリック', sp_ctr: 'クリック率', sp_none: 'まだ広告はありません', sp_edit: '編集', sp_bad_link: 'リンクは https:// で始めてください',
      sp_note: 'ポップアップ：端末ごとに 1 日 1 回まで、チュートリアル中は出ません。バナー：イベント一覧・都市カレンダー・掲示板の上に表示。画像配信：数分ごとに左下から表示。'
    },
    ko: {
      pp_open: '여권 열기', pp_title: '📘 Booto 여권', pp_cover1: 'Booto', pp_cover2: 'PASSPORT', pp_cover3: '스트리트 댄스 모험가 통행증',
      pp_info: '소지인 정보', pp_name: '이름 / Name', pp_id: '캐릭터 ID', pp_nat: '국적 / Nationality', pp_style: '장르 / Style', pp_job: '직업 / Role', pp_title_f: '칭호 / Title',
      pp_lv: '레벨 / Level', pp_issue: '발급일 / Date of issue', pp_stamps: '도장 수', pp_tw: '대만 22개 지역', pp_tw_d: '대만 곳곳의 이벤트에서 체크인해서 이 페이지를 채워 봐요!',
      pp_visa: '사증 VISAS', pp_visa_empty: '아직 비어 있어요… 이벤트에서 체크인하면 도장이 찍혀요!', pp_back: 'Booto 여권국 · 모든 사이퍼에서 당신의 리듬을 찾길',
      pp_prev: '이전', pp_next: '다음', pp_dl: '인적 사항 페이지 저장', pp_page: '{n} / {t} 페이지', pp_login: '로그인하면 여권을 받을 수 있어요',
      sp_tag: '광고', sp_more: '자세히 보기', sp_admin: '스폰서 광고', sp_new: '광고 추가', sp_name: '스폰서 이름', sp_kind: '종류', sp_popup: '팝업', sp_banner: '배너', sp_broadcast: '이미지 방송',
      sp_img: '이미지 URL', sp_img_up: '또는 이미지 업로드(3MB 이하)', sp_link: '링크(https://…)', sp_text: '문구(200자 이하)', sp_start: '시작', sp_end: '종료(선택)', sp_weight: '가중치 1–10',
      sp_active: '사용', sp_save: '저장', sp_imp: '노출', sp_click: '클릭', sp_ctr: '클릭률', sp_none: '아직 광고가 없어요', sp_edit: '편집', sp_bad_link: '링크는 https://로 시작해야 해요',
      sp_note: '팝업: 기기당 하루 최대 1번, 튜토리얼 중에는 안 나와요. 배너: 이벤트 목록, 도시 캘린더, 게시판 위에 표시. 이미지 방송: 몇 분마다 왼쪽 아래에서 나와요.'
    }
  });

  /* =========================================================
   * 護照本
   * ========================================================= */
  const asciiName = s => String(s || '').normalize('NFKD').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  function mrz(me, issued, stamps) {
    const L = 36, fill = s => (s + '<'.repeat(L)).slice(0, L);
    const nat = (me.nat || 'XXX').toUpperCase().padEnd(3, '<');
    const d = issued ? `${String(issued.getFullYear()).slice(2)}${pad2(issued.getMonth() + 1)}${pad2(issued.getDate())}` : '000000';
    return [fill(`P<DIS${asciiName(me.id)}<<${asciiName(me.name) || 'DANCER'}`), fill(`${asciiName(me.id).padEnd(9, '<').slice(0, 9)}<${nat}${d}<${String(stamps).padStart(3, '0')}<LV${pad2(me.level || 1)}`)];
  }
  function pages() {
    const me = Player.me, S = A.socialState || {};
    const stamps = S.checks ? [...S.checks.values()].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)) : [];
    const issued = Backend.profile && Backend.profile.created_at ? new Date(Backend.profile.created_at) : null;
    const nat = me.nat && A.byCode[me.nat], J = t('jobs') || {};
    const twSet = new Set(stamps.filter(s => s.country === 'TW').map(s => s.city));
    const [m1, m2] = mrz(me, issued, stamps.length);
    const out = [];
    out.push(`<div class="pp-page pp-img"><img src="assets/passport/cover.webp?v=1" alt="${esc(t('pp_cover1'))} ${esc(t('pp_cover2'))}"></div>`);
    out.push(`<div class="pp-page pp-in pp-info"><i class="pp-k k1"></i><i class="pp-k k2"></i><i class="pp-k k3"></i><i class="pp-k k4"></i><div class="pp-ph">${esc(t('pp_info'))}<span>BOOTO</span></div>
      <div class="pp-grid"><div class="pp-photo"></div><dl>
        <dt>${t('pp_name')}</dt><dd>${esc(me.name)}</dd><dt>${t('pp_id')}</dt><dd>@${esc(me.id)}</dd>
        <dt>${t('pp_nat')}</dt><dd>${nat ? esc(nm(nat)) : '—'}</dd><dt>${t('pp_style')}</dt><dd>${esc(me.style || '—')}</dd>
        <dt>${t('pp_job')}</dt><dd>${esc(J[me.job] || me.job || '—')}</dd><dt>${t('pp_title_f')}</dt><dd>${me.title ? Titles.html(me.title) : '—'}</dd>
        <dt>${t('pp_lv')}</dt><dd>Lv.${S.level || me.level || 1}</dd><dt>${t('pp_issue')}</dt><dd>${issued ? issued.toLocaleDateString() : '—'}</dd>
        <dt>${t('pp_stamps')}</dt><dd>${stamps.length}</dd></dl></div>
      <div class="pp-mrz">${esc(m1)}<br>${esc(m2)}</div></div>`);
    out.push(`<div class="pp-page pp-in pp-tw"><i class="pp-k k1"></i><i class="pp-k k2"></i><i class="pp-k k3"></i><i class="pp-k k4"></i><div class="pp-ph">🇹🇼 ${esc(t('pp_tw'))}<span>${twSet.size} / ${A.byCode.TW.cities.length}</span></div><p class="note">${t('pp_tw_d')}</p>
      <div class="pp-twgrid">${A.byCode.TW.cities.map((c, i) => `<div class="pp-tc ${twSet.has(c.id) ? 'on' : ''}" style="--sc:${A.STAMP_COLORS[i % A.STAMP_COLORS.length]}"><span>${esc(nm(c))}</span></div>`).join('')}</div></div>`);
    const per = 6, n = Math.max(2, Math.ceil(stamps.length / per));
    for (let i = 0; i < n; i++) {
      const chunk = stamps.slice(i * per, i * per + per);
      out.push(`<div class="pp-page pp-in pp-visa"><i class="pp-k k1"></i><i class="pp-k k2"></i><i class="pp-k k3"></i><i class="pp-k k4"></i><div class="pp-ph">${t('pp_visa')}<span>${pad2(i + 1)}</span></div>
        <div class="pp-stamps">${chunk.length ? chunk.map((s, k) => `<div class="stamp" style="--sc:${A.STAMP_COLORS[(i * per + k) % A.STAMP_COLORS.length]};--rot:${(((i * per + k) * 37) % 18) - 9}deg">${A.stampInner(s.country, s.city, s.created_at)}</div>`).join('') : `<p class="note">${t('pp_visa_empty')}</p>`}</div></div>`);
    }
    out.push(`<div class="pp-page pp-img"><img src="assets/passport/back.webp?v=1" alt="${esc(t('pp_back'))}"></div>`);
    return { out, me, issued, stamps, nat, m1, m2 };
  }
  function openPassport() {
    if (!Player.me || !Backend.enabled) { toast(t('pp_login'), '📘'); return Player.prompt(); }
    const P = pages();
    let i = 0;
    const body = h(`<div class="pp"><div class="pp-book"><div class="pp-slot"></div></div>
      <div class="pp-nav"><button class="btn sm pv">◀ ${t('pp_prev')}</button><span class="pp-no"></span><button class="btn sm nx">${t('pp_next')} ▶</button><span class="grow"></span><button class="btn sm yellow dl">⬇ ${t('pp_dl')}</button></div></div>`);
    const m = modal({ title: t('pp_title'), color: 'blue', body, wide: true });
    const slot = body.querySelector('.pp-slot');
    const show = dir => {
      slot.innerHTML = P.out[i];
      const pg = slot.firstElementChild; if (dir) { pg.classList.add(dir > 0 ? 'flip-in' : 'flip-back'); SFX.play('select'); }
      const ph = slot.querySelector('.pp-photo'); if (ph) { try { const d = Avatar.dancer(4, P.me.look); ph.appendChild(d.el); A.beatLoop(d, 420); } catch (x) {} }
      body.querySelector('.pp-no').textContent = t('pp_page', { n: i + 1, t: P.out.length });
      body.querySelector('.pv').disabled = i === 0; body.querySelector('.nx').disabled = i === P.out.length - 1;
    };
    body.querySelector('.pv').onclick = () => { if (i > 0) { i--; show(-1); } };
    body.querySelector('.nx').onclick = () => { if (i < P.out.length - 1) { i++; show(1); } };
    const key = e => { if (!body.isConnected) return document.removeEventListener('keydown', key); if (e.key === 'ArrowRight') body.querySelector('.nx').click(); if (e.key === 'ArrowLeft') body.querySelector('.pv').click(); };
    document.addEventListener('keydown', key);
    // 手機：左右滑動翻頁
    let sx = null; slot.addEventListener('pointerdown', e => (sx = e.clientX)); slot.addEventListener('pointerup', e => { if (sx === null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) body.querySelector(d < 0 ? '.nx' : '.pv').click(); });
    body.querySelector('.dl').onclick = () => drawInfo(P).then(cv => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `booto-passport-${P.me.id}.png`; a.click(); SFX.play('coin'); });
    show(0);
    sparkle(innerWidth / 2, innerHeight / 3, 14);
  }
  // 資料頁畫成圖片（下載用）
  async function drawInfo(P) {
    try { await document.fonts.ready; } catch (x) {}
    const W = 1200, H = 840, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), F = n => `${n}px Cubic11, "PingFang TC", sans-serif`;
    g.fillStyle = '#f3ead6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(58,79,138,.10)'; g.lineWidth = 2;
    for (let y = -40; y < H + 40; y += 24) { g.beginPath(); for (let x = 0; x <= W; x += 12) g.lineTo(x, y + Math.sin(x / 40) * 8); g.stroke(); }
    g.strokeStyle = '#1f2d6b'; g.lineWidth = 20; g.strokeRect(10, 10, W - 20, H - 20); g.strokeStyle = '#e9b949'; g.lineWidth = 4; g.strokeRect(28, 28, W - 56, H - 56);
    g.fillStyle = '#1f2d6b'; g.fillRect(20, 20, W - 40, 80); g.fillStyle = '#e9b949'; g.font = F(40); g.textBaseline = 'middle'; g.fillText('🏝 ' + t('pp_cover1') + '  ' + t('pp_cover2'), 50, 60);
    g.fillStyle = '#fff'; g.fillRect(60, 130, 290, 380); g.strokeStyle = '#1f2d6b'; g.lineWidth = 6; g.strokeRect(60, 130, 290, 380);
    try { const av = Avatar.render(P.me.look, 0, 8); const k = Math.min(260 / av.width, 340 / av.height); g.imageSmoothingEnabled = false; g.drawImage(av, 200 - av.width * k / 2, 320 - av.height * k / 2, av.width * k, av.height * k); } catch (x) {}
    const J = t('jobs') || {};
    const rows = [[t('pp_name'), P.me.name], [t('pp_id'), '@' + P.me.id], [t('pp_nat'), P.nat ? nm(P.nat) : '—'], [t('pp_style'), P.me.style || '—'],
      [t('pp_job'), J[P.me.job] || P.me.job || '—'], [t('pp_lv'), 'Lv.' + ((A.socialState || {}).level || P.me.level || 1)], [t('pp_issue'), P.issued ? P.issued.toLocaleDateString() : '—'], [t('pp_stamps'), String(P.stamps.length)]];
    rows.forEach(([k, v], j) => { g.fillStyle = '#6b5552'; g.font = F(24); g.fillText(k, 400, 150 + j * 46); g.fillStyle = '#3b2b2b'; g.font = F(32); g.fillText(String(v).slice(0, 24), 700, 150 + j * 46); });
    g.fillStyle = 'rgba(31,45,107,.07)'; g.fillRect(40, 640, W - 80, 150);
    g.fillStyle = '#1f2d6b'; g.font = '38px "Courier New", monospace'; g.fillText(P.m1, 50, 690); g.fillText(P.m2, 50, 750);
    return cv;
  }
  window.Passport = { open: openPassport };

  /* =========================================================
   * 贊助商廣告
   * ========================================================= */
  let ads = null;
  const shown = new Set();
  const nowIso = () => new Date().toISOString();
  const live = kind => (ads || []).filter(a => a.active && a.kind === kind && a.starts_at <= nowIso() && (!a.ends_at || a.ends_at > nowIso()) && (a.image_url || a.text));
  const pickAd = list => { const tot = list.reduce((s, a) => s + a.weight, 0); let r = Math.random() * tot; for (const a of list) { r -= a.weight; if (r <= 0) return a; } return list[0]; };
  const imp = a => { if (shown.has(a.id)) return; shown.add(a.id); Backend.bumpSponsor(a.id, 'imp').catch(() => {}); };
  const clk = a => Backend.bumpSponsor(a.id, 'click').catch(() => {});
  const safeUrl = u => (/^https:\/\//i.test(u || '') ? u : '');
  const adInner = a => `${safeUrl(a.image_url) ? `<img src="${esc(a.image_url)}" alt="${esc(a.name)}" loading="lazy">` : ''}${a.text ? `<p>${esc(a.text)}</p>` : ''}`;
  async function loadAds() { if (ads || !Backend.enabled) return ads || []; try { ads = await Backend.sponsors(); } catch (x) { ads = []; } return ads; }

  // 彈窗：每台裝置每天最多一次、看完新手教學之後、進站 8 秒後
  async function popup() {
    await loadAds();
    const list = live('popup'); if (!list.length) return;
    let o = {}; try { o = JSON.parse(localStorage.getItem('danceIsland.spPop') || '{}'); } catch (x) {}
    if (o.day === A.todayStr()) return;
    if (!Tutorial.seen() || document.querySelector('.tut, .modal-back')) return;
    const a = pickAd(list);
    try { localStorage.setItem('danceIsland.spPop', JSON.stringify({ day: A.todayStr() })); } catch (x) {}
    const body = h(`<div class="sp-pop"><span class="sp-tag">${t('sp_tag')} · ${esc(a.name)}</span>${adInner(a)}${safeUrl(a.link) ? `<a class="btn pink sp-go" href="${esc(a.link)}" target="_blank" rel="sponsored noopener">${t('sp_more')} ▶</a>` : ''}</div>`);
    modal({ title: '📣 ' + t('sp_tag'), color: 'yellow', body });
    imp(a);
    const go = body.querySelector('.sp-go'); if (go) go.onclick = () => clk(a);
  }
  // 橫幅：活動總覽、城市行事曆、論壇最上面
  async function banner() {
    const inner = document.querySelector('.city-inner'); if (!inner || inner.querySelector('.sp-banner')) return;
    const r = A.current; if (!r || !['city', 'events', 'forum'].includes(r.view)) return;
    await loadAds();
    const list = live('banner'); if (!list.length || !inner.isConnected || inner.querySelector('.sp-banner')) return;
    const a = pickAd(list);
    const el = h(`<a class="sp-banner" ${safeUrl(a.link) ? `href="${esc(a.link)}" target="_blank" rel="sponsored noopener"` : ''}><span class="sp-tag">${t('sp_tag')}</span>${adInner(a)}</a>`);
    el.onclick = () => clk(a);
    const first = inner.querySelector('.win'); first ? first.after(el) : inner.prepend(el);
    imp(a);
  }
  // 圖片廣播：每 4 分鐘從左下角滑出 10 秒
  async function broadcast() {
    await loadAds();
    const list = live('broadcast'); if (!list.length || document.querySelector('.sp-cast, .tut')) return;
    const a = pickAd(list);
    const el = h(`<div class="sp-cast"><button class="sp-x" aria-label="close">✕</button><span class="sp-tag">📣 ${t('sp_tag')} · ${esc(a.name)}</span>
      <a ${safeUrl(a.link) ? `href="${esc(a.link)}" target="_blank" rel="sponsored noopener"` : ''}>${adInner(a)}</a></div>`);
    el.querySelector('a').onclick = () => clk(a);
    el.querySelector('.sp-x').onclick = () => el.remove();
    document.body.appendChild(el); imp(a);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 10000);
  }
  if (Backend.enabled) {
    Backend.ready.then(() => {
      setTimeout(popup, 8000);
      setTimeout(broadcast, 90000); setInterval(broadcast, 240000);
      new MutationObserver(() => banner()).observe(document.getElementById('stage') || document.body, { childList: true });
      banner();
    });
  }

  /* 後台：贊助商管理 */
  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'sponsor', label: () => '📣 ' + t('sp_admin'),
    draw: async (pane, fail) => {
      let rows = [], stats = [];
      try { rows = await Backend.sponsors(); stats = await Backend.sponsorStats(); } catch (x) { return fail(x); }
      ads = rows;
      const sum = (id, k) => stats.filter(s => s.sponsor_id === id && s.kind === k).reduce((n, s) => n + s.n, 0);
      const local = d => (d ? A.ymd(new Date(d)) : '');
      const form = (a = {}) => `<form class="form sp-form" novalidate data-id="${a.id || ''}">
        <label class="field"><span>${t('sp_name')} *</span><input class="input" name="name" maxlength="60" value="${esc(a.name || '')}"></label>
        <label class="field"><span>${t('sp_kind')}</span><select class="input" name="kind">${['popup', 'banner', 'broadcast'].map(k => `<option value="${k}" ${a.kind === k ? 'selected' : ''}>${t('sp_' + k)}</option>`).join('')}</select></label>
        <label class="field full"><span>${t('sp_img')}</span><input class="input" name="image_url" type="url" value="${esc(a.image_url || '')}" placeholder="https://…"><small class="note">${t('sp_img_up')}</small><input class="input" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
        <label class="field full"><span>${t('sp_link')}</span><input class="input" name="link" type="url" value="${esc(a.link || '')}" placeholder="https://…"></label>
        <label class="field full"><span>${t('sp_text')}</span><input class="input" name="text" maxlength="200" value="${esc(a.text || '')}"></label>
        <label class="field"><span>${t('sp_start')}</span><input class="input" name="starts_at" type="date" value="${local(a.starts_at) || A.todayStr()}"></label>
        <label class="field"><span>${t('sp_end')}</span><input class="input" name="ends_at" type="date" value="${local(a.ends_at)}"></label>
        <label class="field"><span>${t('sp_weight')}</span><input class="input" name="weight" type="number" min="1" max="10" value="${a.weight || 1}"></label>
        <label class="chk"><input type="checkbox" name="active" ${a.active === false ? '' : 'checked'}> ${t('sp_active')}</label>
        <div class="full form-foot"><span class="grow"></span><button class="btn pink">${t('sp_save')}</button></div></form>`;
      pane.innerHTML = `<p class="note">${t('sp_note')}</p><details class="sp-newbox"><summary>＋ ${t('sp_new')}</summary>${form()}</details>
        <div class="st-tw"><table class="st-table"><thead><tr><th>${t('sp_name')}</th><th>${t('sp_kind')}</th><th>${t('sp_start')}</th><th class="n">${t('sp_imp')}</th><th class="n">${t('sp_click')}</th><th class="n">${t('sp_ctr')}</th><th></th></tr></thead>
        <tbody>${rows.length ? rows.map(a => { const i1 = sum(a.id, 'imp'), c1 = sum(a.id, 'click'); return `<tr data-id="${a.id}"><td>${a.active ? '' : '⏸ '}${esc(a.name)}</td><td>${t('sp_' + a.kind)}</td><td>${local(a.starts_at)}${a.ends_at ? ' – ' + local(a.ends_at) : ''}</td>
          <td class="n">${i1.toLocaleString()}</td><td class="n">${c1.toLocaleString()}</td><td class="n">${i1 ? ((c1 / i1) * 100).toFixed(1) + '%' : '–'}</td>
          <td><button class="btn sm ed">${t('sp_edit')}</button> <button class="btn sm red del">${t('b_del')}</button></td></tr>`; }).join('') : `<tr><td colspan="7" class="note">${t('sp_none')}</td></tr>`}</tbody></table></div>
        <div class="sp-editbox"></div>`;
      const bind = f => f.onsubmit = async ev => {
        ev.preventDefault();
        const E = f.elements, v = k => E[k].value.trim();
        if (!v('name')) return toast(t('e_name'), '✕');
        if (v('link') && !/^https:\/\//i.test(v('link'))) return toast(t('sp_bad_link'), '✕');
        const btn = f.querySelector('button.pink'); btn.disabled = true;
        try {
          let img = v('image_url') || null;
          const file = E.file.files[0]; if (file) { if (file.size > 3 * 1024 * 1024) throw new Error('3MB'); img = await Backend.uploadSponsorImage(file); }
          await Backend.saveSponsor({ ...(f.dataset.id ? { id: +f.dataset.id } : {}), name: v('name'), kind: v('kind'), image_url: img, link: v('link') || null, text: v('text') || null,
            starts_at: new Date((v('starts_at') || A.todayStr()) + 'T00:00').toISOString(), ends_at: v('ends_at') ? new Date(v('ends_at') + 'T23:59:59').toISOString() : null,
            weight: Math.max(1, Math.min(10, +v('weight') || 1)), active: E.active.checked });
          toast(t('adm_done'), '📣'); ads = null; A.adminTabs.find(x => x.key === 'sponsor').draw(pane, fail);
        } catch (x) { btn.disabled = false; fail(x); }
      };
      bind(pane.querySelector('.sp-newbox form'));
      pane.querySelector('tbody').onclick = async e => {
        const tr = e.target.closest('tr[data-id]'); if (!tr) return; const a = rows.find(x => x.id === +tr.dataset.id);
        if (e.target.closest('.del')) { if (!confirm(t('del_title'))) return; try { await Backend.deleteSponsor(a.id); ads = null; tr.remove(); } catch (x) { fail(x); } }
        if (e.target.closest('.ed')) { const box = pane.querySelector('.sp-editbox'); box.innerHTML = `<h4>✎ ${esc(a.name)}</h4>` + form(a); bind(box.querySelector('form')); box.scrollIntoView({ behavior: 'smooth' }); }
      };
    }
  });
})();
