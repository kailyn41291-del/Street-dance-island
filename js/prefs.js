/* =========================================================
 * 顯示設定：字體大小（特大 / 大 / 中 / 小）、夜間模式、活動卡片精簡 / 詳細
 * 另外：手機 / 平板避免不小心把整個畫面放大
 * 這個檔案要最早載入（在其他畫面畫出來之前就套用設定，不會閃）
 * ========================================================= */
window.Prefs = (() => {
  const KEY = 'danceIsland.prefs';
  const DEF = { fs: 'm', night: false, compact: false };
  let p = { ...DEF };
  try { p = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) {}
  const ZOOM = { s: 0.9, m: 1, l: 1.15, xl: 1.3 };
  const root = document.documentElement;
  const apply = () => {
    root.dataset.fs = p.fs;
    root.style.zoom = ZOOM[p.fs] === 1 ? '' : String(ZOOM[p.fs]);
    root.dataset.theme = p.night ? 'night' : 'day';
    root.classList.toggle('cards-compact', !!p.compact);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = p.night ? '#141428' : '#f07ca3';
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} };
  const set = (k, v) => { p[k] = v; save(); apply(); listeners.forEach(f => { try { f(p); } catch (e) {} }); };
  const listeners = [];
  apply();

  /* ---- 手機 / 平板：避免不小心放大 ----
   * 1. 輸入框字太小時 iPhone 會自動放大 → CSS 把觸控裝置的輸入框字放大到 16px
   * 2. 連點兩下會放大 → CSS touch-action: manipulation
   * 3. 兩指縮放（iPhone Safari 不管 viewport 設定）→ 擋掉 gesture 事件；需要大字可以用「字體大小」設定 */
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch) {
    ['gesturestart', 'gesturechange'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  }

  return { get: k => p[k], set, onChange: f => listeners.push(f), ZOOM };
})();
