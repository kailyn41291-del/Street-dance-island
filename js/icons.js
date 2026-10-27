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
    '🎮': 'game/gamepad', '😵': 'game/lose', '💤': 'game/sleep', '🧊': 'game/freeze', '🌀': 'game/power', '👟': 'game/footwork', '🥇': 'game/trophy',
    '👍': 'social/like', '🙋': 'social/going', '📸': 'social/photo', '🤝': 'social/rate', '🧭': 'event/nav', '🚇': 'event/mrt', '🥚': 'xp/egg', '🌱': 'xp/newbie',
    '🍀': 'menu/luck', '📰': 'menu/daily', '🎨': 'menu/display', '🔍': 'menu/search', '🔔': 'menu/bell', '🏫': 'menu/studio', '🚩': 'menu/party', '🗺': 'menu/spots',
    '🛍': 'menu/market', '🥋': 'menu/mentor', '🎬': 'menu/relay', '📊': 'menu/bracket',
    // 先借用現有的圖示
    '📅': 'event/calendar', '🎉': 'fest/party', '🪪': 'menu/card', '🏝': 'xp/island', '👥': 'menu/friends', '📋': 'menu/events', '📜': 'menu/quests', '🕺': 'menu/cypher',
    '🔊': 'menu/sound_on', '🔇': 'menu/sound_off', '⭐': 'event/fav_on', '🏅': 'xp/medal', '👑': 'xp/rank_king', '🥈': 'xp/rank_silver', '🥉': 'xp/rank_bronze', '⬆': 'xp/level_up',
    '🗓': 'xp/weekly', '🎫': 'event/register', '🎟': 'event/register', '🧑': 'menu/me', '👤': 'menu/me', '🔐': 'social/lock', '🚶': 'menu/walk', '🌍': 'menu/world', '🛠': 'menu/admin',
    '🗳': 'ach/vote10', '🎌': 'ach/crew', '👫': 'ach/duo1', '💞': 'ach/duo5', '🗣': 'ach/talk50', '🏟': 'ach/comp10', '✈': 'ach/country3', '👹': 'ach/npc30', '🥊': 'ach/npc5',
    '📷': 'social/photo', '📹': 'social/photo', '🧠': 'ach/qa10', '🎓': 'ach/graduate', '🎵': 'menu/rhythm', '🎶': 'menu/rhythm',
    // 第三批要畫的圖示（tools/icon_brief_v3.md）：有圖就用新的，還沒有就用後面那個舊的
    '🎪': ['menu/fest', 'fest/party'], '🎖': ['menu/titles', 'xp/medal'], '📦': ['menu/shoes', 'game/footwork'], '✨': 'ui/sparkle', '🎂': 'social/birthday', '🔮': 'game/predict',
    '📯': ['social/recruit', 'menu/party'], '🎤': 'event/lineup', '⚖': 'event/judge', '📄': 'event/pdf', '🪞': 'event/mirror', '☔': 'event/roof', '💡': ['event/light', 'ach/qa1'],
    '📺': 'event/live', '📴': 'ui/offline', '🌙': 'ui/night', '☀': 'ui/day', '📚': 'event/course', '🧑‍🏫': 'event/teacher', '🎃': ['fest/halloween'], '🎄': ['fest/xmas'],
    '🎆': ['fest/newyear'], '💘': ['fest/valentine'], '🧧': ['fest/lunar'], '🌕': 'fest/moon', '📈': 'xp/stats',
    // 第四批（tools/icon_brief_v4.md）：還沒畫的先借現有的
    '🗨': ['ui/comments', 'menu/chat'], '📘': ['ui/passport_book', 'xp/passport'], '📖': ['ui/guide', 'event/course'], '🔎': 'menu/search', '🔧': ['ui/tool', 'menu/admin'],
    '✎': 'ui/edit', '🟢': 'ui/online', '🏳': 'ui/flag', '📎': 'ui/attach', '⏸': 'ui/pause', '🔈': ['ui/volume', 'menu/sound_on'], '⌛': ['ui/hourglass', 'game/timer'],
    '☎': 'ui/phone', '📱': 'ui/mobile', '❤': 'ui/heart', '♥': 'ui/heart', '💪': 'ui/flex', '💥': 'ui/boom', '🌊': 'ui/wave', '☁': 'ui/cloud', '🌈': 'ui/rainbow',
    '🦶': 'ui/foot', '🍣': 'ui/sushi', '🍎': 'ui/apple', '🧢': 'ui/cap', '🧋': 'ui/bubbletea', '♂': 'ui/male', '♀': 'ui/female', '✅': 'ui/check', '❌': 'ui/cross'
  };
  // 一個 emoji 可以對應好幾個圖示（第一個有檔案的就用它）
  const pick = k => [].concat(EMO[k] || []).find(has);
  const emo = ic => (pick(ic) ? img(pick(ic)) : ic);
  /** '🕒 日期時間' → 像素圖示 + '日期時間'（開頭的 emoji 有對應圖示才換；回傳 HTML，文字要先 escape） */
  const lead = html => { const m = /^(\S+?)\uFE0F?\s/.exec(html); return m && pick(m[1]) ? img(pick(m[1])) + html.slice(m[0].length) : html; };

  /* ---- 自動替換：整個網頁介面文字裡的 emoji，有對應圖示就換成像素圖示 ----
   * 不碰玩家自己寫的內容（聊天、論壇、名片自介、私訊……）和輸入框 */
  const SKIP = '.mt, .fo-body, .thr-t, .pc-bio, .dp-body, .sd-intro, input, textarea, select, option, script, style, title, [contenteditable], svg, .pt-msg, .dm-msg, .msn-log, .no-pxi';
  const keys = Object.keys(EMO).filter(k => pick(k)).sort((a, b) => b.length - a.length);
  const RE = new RegExp('(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\uFE0F?', 'g');
  function swapIn(root) {
    if (!keys.length || !root) return;
    if (root.nodeType === 3) root = root.parentElement;
    if (!root || root.nodeType !== 1 || (root.closest && root.closest(SKIP))) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (RE.lastIndex = 0, RE.test(n.nodeValue) && !n.parentElement.closest(SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const list = []; while (tw.nextNode()) list.push(tw.currentNode);
    list.forEach(n => {
      const frag = document.createDocumentFragment(), v = n.nodeValue; let last = 0, m;
      RE.lastIndex = 0;
      while ((m = RE.exec(v))) {
        if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
        const i = document.createElement('img'); i.className = 'pxi'; i.src = src(pick(m[1])); i.alt = ''; i.draggable = false;
        frag.appendChild(i); last = m.index + m[0].length;
      }
      if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
      n.replaceWith(frag);
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
  // 國家主題的代表圖案（進入各國頁面時顯示）
  if (window.Themes && Themes.T) Object.entries(Themes.T).forEach(([k, v]) => { if (has('theme/' + k)) v.icon = img('theme/' + k, v.icon); });
  return { has, src, img, emo, lead, swapIn };
})();
