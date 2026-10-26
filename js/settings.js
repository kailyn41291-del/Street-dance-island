/* =========================================================
 * 顯示設定視窗（功能選單 → 顯示設定）：字體大小、夜間模式、活動卡片精簡 / 詳細
 * 設定本身在 js/prefs.js（最早載入）
 * ========================================================= */
window.Settings = (() => {
  const { h, modal } = UI;
  I18N.extend({
    zh: { hub_display: '顯示設定', ds_title: '🎨 顯示設定', ds_fs: '字體大小', ds_fs_xl: '特大', ds_fs_l: '大', ds_fs_m: '中', ds_fs_s: '小', ds_sample: '舞島 Dance Island 字體預覽',
      ds_night: '夜間模式', ds_on: '開', ds_off: '關', ds_cards: '活動卡片', ds_full: '詳細', ds_compact: '精簡', ds_note: '設定只會存在這台裝置上。', ev_view: '卡片：', share_fee_from: '{p} 起（{n} 種票價）' },
    en: { hub_display: 'Display', ds_title: '🎨 Display settings', ds_fs: 'Text size', ds_fs_xl: 'Extra large', ds_fs_l: 'Large', ds_fs_m: 'Medium', ds_fs_s: 'Small', ds_sample: 'Dance Island text preview',
      ds_night: 'Dark mode', ds_on: 'On', ds_off: 'Off', ds_cards: 'Event cards', ds_full: 'Detailed', ds_compact: 'Compact', ds_note: 'Settings are saved on this device only.', ev_view: 'Cards: ', share_fee_from: 'From {p} ({n} ticket prices)' },
    ja: { hub_display: '表示設定', ds_title: '🎨 表示設定', ds_fs: '文字の大きさ', ds_fs_xl: '特大', ds_fs_l: '大', ds_fs_m: '中', ds_fs_s: '小', ds_sample: 'ダンスアイランド 文字プレビュー',
      ds_night: 'ダークモード', ds_on: 'オン', ds_off: 'オフ', ds_cards: 'イベントカード', ds_full: '詳細', ds_compact: 'コンパクト', ds_note: '設定はこの端末だけに保存されます。', ev_view: 'カード：', share_fee_from: '{p}〜（{n} 種類の料金）' },
    ko: { hub_display: '화면 설정', ds_title: '🎨 화면 설정', ds_fs: '글자 크기', ds_fs_xl: '아주 크게', ds_fs_l: '크게', ds_fs_m: '보통', ds_fs_s: '작게', ds_sample: '댄스 아일랜드 글자 미리보기',
      ds_night: '다크 모드', ds_on: '켜기', ds_off: '끄기', ds_cards: '이벤트 카드', ds_full: '자세히', ds_compact: '간단히', ds_note: '설정은 이 기기에만 저장돼요.', ev_view: '카드: ', share_fee_from: '{p}부터 ({n}가지 요금)' }
  });
  const seg = (k, opts) => `<div class="seg ds-seg" data-k="${k}">${opts.map(([v, label]) => `<button type="button" data-v="${v}" class="${String(Prefs.get(k)) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
  function open() {
    const body = h(`<div class="ds">
      <div class="ds-row"><b>${t('ds_fs')}</b>${seg('fs', [['xl', t('ds_fs_xl')], ['l', t('ds_fs_l')], ['m', t('ds_fs_m')], ['s', t('ds_fs_s')]])}</div>
      <p class="ds-sample">${t('ds_sample')}</p>
      <div class="ds-row"><b>${t('ds_night')}</b>${seg('night', [[true, '🌙 ' + t('ds_on')], [false, '☀️ ' + t('ds_off')]])}</div>
      <div class="ds-row"><b>${t('ds_cards')}</b>${seg('compact', [[false, t('ds_full')], [true, t('ds_compact')]])}</div>
      <p class="note">${t('ds_note')}</p></div>`);
    modal({ title: t('ds_title'), color: 'blue', body });
    body.onclick = ev => {
      const b = ev.target.closest('[data-v]'); if (!b) return;
      const k = b.closest('[data-k]').dataset.k, raw = b.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : raw;
      Prefs.set(k, v); SFX.play('select');
      b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    };
  }
  return { open };
})();

/* 離線提示：沒網路時告訴玩家「現在看到的是存在手機裡的資料」 */
(() => {
  I18N.extend({ zh: { offline_bar: '📴 目前離線，顯示的是上次存在手機裡的資料' }, en: { offline_bar: '📴 Offline — showing data saved on this device' },
    ja: { offline_bar: '📴 オフライン中：端末に保存したデータを表示しています' }, ko: { offline_bar: '📴 오프라인: 기기에 저장된 데이터를 보여주고 있어요' } });
  let bar = null;
  const paint = () => {
    if (navigator.onLine) { bar && bar.remove(); bar = null; return; }
    if (!bar) { bar = document.createElement('div'); bar.className = 'offline-bar'; document.body.appendChild(bar); }
    bar.textContent = t('offline_bar');
  };
  addEventListener('online', paint); addEventListener('offline', paint); paint();
})();
