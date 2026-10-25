/* =========================================================
 * 像素圖示：assets/icons/<資料夾>/<名稱>.png
 * 有檔案就用像素圖，沒有就用原本的 emoji（不會出現破圖）
 * 清單由 tools/build_icon_manifest.py 自動產生（js/icon-manifest.js）
 * ========================================================= */
window.PXI = (() => {
  const F = window.ICON_FILES || {};
  const has = name => Object.prototype.hasOwnProperty.call(F, name);
  const src = name => `assets/icons/${name}.png?v=${F[name]}`;
  /** img('menu/forum', '🗂')：有圖示回傳 <img>，沒有回傳 fallback 文字 */
  const img = (name, fallback = '', cls = 'pxi') => (has(name) ? `<img class="${cls}" src="${src(name)}" alt="" draggable="false">` : fallback);
  // 先載入常用的，換頁時不會閃
  const preload = list => list.forEach(n => { if (has(n)) { const i = new Image(); i.src = src(n); } });
  preload(['menu/forum', 'menu/battle', 'menu/friends', 'menu/events', 'menu/chat', 'menu/me', 'menu/add', 'menu/games', 'menu/lang', 'menu/tut']);
  /** 常用 emoji → 像素圖示（有圖就換，沒圖維持原樣）；toast 等地方會自動用 */
  const EMO = { '🔗': 'event/link', '📍': 'event/pin', '⚠': 'event/report', '🛂': 'event/checkin', '📤': 'event/share', '🏠': 'event/organizer', '💰': 'event/fee', '📝': 'event/register', '🕒': 'event/time', '👁': 'event/views', '⏰': 'event/time', '💾': 'menu/save', '🌏': 'menu/world', '📮': 'menu/add', '📢': 'menu/notice', '🌐': 'menu/lang' };
  const emo = ic => (EMO[ic] && has(EMO[ic]) ? img(EMO[ic]) : ic);
  /** '🕒 日期時間' → 像素圖示 + '日期時間'（開頭的 emoji 有對應圖示才換；回傳 HTML，文字要先 escape） */
  const lead = html => { const m = /^(\S+?)\uFE0F?\s/.exec(html); return m && EMO[m[1]] && has(EMO[m[1]]) ? img(EMO[m[1]]) + html.slice(m[0].length) : html; };
  return { has, src, img, emo, lead };
})();
