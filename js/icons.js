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
  return { has, src, img };
})();
