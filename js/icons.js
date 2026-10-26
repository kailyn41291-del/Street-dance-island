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
  /** 常用 emoji → 像素圖示（有圖就換，沒圖維持原樣） */
  const EMO = {
    '🔗': 'event/link', '📍': 'event/pin', '⚠': 'event/report', '🛂': 'event/checkin', '📤': 'event/share', '🏠': 'event/organizer', '💰': 'event/fee', '📝': 'event/register',
    '🕒': 'event/time', '👁': 'event/views', '⏰': 'event/time', '🗑': 'event/delete', '⬇': 'event/download', '🔥': 'event/hot', '🏆': 'event/results', '🖼': 'social/image',
    '💾': 'menu/save', '🌏': 'menu/world', '📮': 'menu/add', '📢': 'menu/notice', '🌐': 'menu/lang', '💬': 'menu/chat', '❓': 'menu/tut', '👯': 'menu/crew', '🗂': 'menu/forum',
    '💌': 'social/dm_new', '✉': 'social/dm', '🤝': 'social/friend_add', '🚫': 'social/block', '⚑': 'social/report_flag', '📌': 'social/pin_post', '🔒': 'social/lock',
    '🔑': 'social/login', '👋': 'social/logout', '📣': 'social/sponsor',
    '🆚': 'game/vs', '⏳': 'game/timer', '🎲': 'game/dice', '🎁': 'game/gift', '💎': 'game/gem', '🎰': 'game/slot', '🥁': 'game/drum', '🎧': 'game/headphones',
    '🎮': 'game/gamepad', '😵': 'game/lose', '💤': 'game/sleep', '🧊': 'game/freeze', '🌀': 'game/power', '👟': 'game/footwork', '🥇': 'game/trophy'
  };
  const emo = ic => (EMO[ic] && has(EMO[ic]) ? img(EMO[ic]) : ic);
  /** '🕒 日期時間' → 像素圖示 + '日期時間'（開頭的 emoji 有對應圖示才換；回傳 HTML，文字要先 escape） */
  const lead = html => { const m = /^(\S+?)\uFE0F?\s/.exec(html); return m && EMO[m[1]] && has(EMO[m[1]]) ? img(EMO[m[1]]) + html.slice(m[0].length) : html; };

  /* ---- 自動替換：按鈕、標籤、視窗標題、通知……開頭的 emoji 換成像素圖示 ----
   * 只處理介面文字（不碰玩家寫的聊天、論壇內容），有圖示的 emoji 才換 */
  const SEL = '.btn, button, .tag, .win-title, legend, .toast .ic, .nt-list .ic, .crumbs, h4, .chip, .sr-row b, .ph-app, .qb-head, .lk-sec h4';
  const SKIP = '.mt, .fo-body, .thr-t, .pc-bio, .dp-body, .sd-intro, input, textarea, [contenteditable], .pt-msg, .dm-msg, .msn-log';
  const keys = Object.keys(EMO).filter(k => has(EMO[k]));
  const RE = new RegExp('^(\\s*)(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\uFE0F?\\s?');
  function swapIn(root) {
    if (!keys.length || !root || root.nodeType !== 1) return;
    const els = root.matches && root.matches(SEL) ? [root, ...root.querySelectorAll(SEL)] : root.querySelectorAll(SEL);
    els.forEach(el => {
      if (el.closest(SKIP)) return;
      for (const n of [...el.childNodes]) {
        if (n.nodeType !== 3) continue;
        const m = RE.exec(n.nodeValue); if (!m) continue;
        const i = document.createElement('img'); i.className = 'pxi'; i.src = src(EMO[m[2]]); i.alt = ''; i.draggable = false;
        n.nodeValue = n.nodeValue.slice(m[0].length);
        n.before(i); if (n.nodeValue) n.before(document.createTextNode(' '));
        if (!n.nodeValue) n.remove();
        break;                           // 每個元素只換開頭那一個
      }
    });
  }
  let pending = new Set(), tm = null;
  const flush = () => { tm = null; const list = [...pending]; pending = new Set(); list.forEach(n => n.isConnected && swapIn(n)); };
  const watch = () => {
    new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) pending.add(n); else if (n.nodeType === 3 && n.parentElement) pending.add(n.parentElement); })); if (!tm) tm = setTimeout(flush, 30); })
      .observe(document.body, { childList: true, subtree: true });
    swapIn(document.body);
  };
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
  return { has, src, img, emo, lead, swapIn };
})();
