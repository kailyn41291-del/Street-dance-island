/* =========================================================
 * 活動資料存取
 * - data/events.js：寫在 GitHub 上、所有人都看得到的活動（永久）
 * - localStorage：在這台瀏覽器新增 / 修改 / 刪除的活動（暫存）
 * 「匯出 events.js」會把兩者合併，拿去取代 data/events.js 即可永久保存
 * ========================================================= */
window.Store = (() => {
  const KEY = 'danceIsland.events.v1';
  const STYLES = ['All Style', 'Breaking', 'Popping', 'Locking', 'Hip Hop', 'House', 'Waacking', 'Krump', 'Vogue', 'Choreography', 'Kids', 'Other'];
  const STYLE_COLOR = {
    'All Style': '#eac45a', 'Breaking': '#e35d5d', 'Popping': '#7895df', 'Locking': '#ef8a3a',
    'Hip Hop': '#5bb5a6', 'House': '#7fcf73', 'Waacking': '#f07ca3', 'Krump': '#a8473f',
    'Vogue': '#b48ae0', 'Choreography': '#4fa3c7', 'Kids': '#f4a7c0', 'Other': '#9a8f85'
  };

  let state = { added: {}, removed: [] };
  const load = () => {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.added) state = s; } catch (e) {}
  };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  };
  load();

  const seed = () => (window.DANCE_EVENTS || []);
  const sortKey = e => `${e.date || '9999'} ${e.startTime || '99:99'}`;

  const all = () => {
    const out = [];
    seed().forEach(e => {
      if (state.removed.includes(e.id) || state.added[e.id]) return;
      out.push({ ...e, _src: 'seed' });
    });
    Object.values(state.added).forEach(e => out.push({ ...e, _src: 'local' }));
    return out.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  };

  const uid = () => 'ev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  return {
    STYLES, STYLE_COLOR,
    all,
    get: id => all().find(e => e.id === id),
    byCity: (country, city) => all().filter(e => e.country === country && e.city === city),
    byCountry: country => all().filter(e => e.country === country),
    upsert(ev) {
      const e = { ...ev }; delete e._src;
      if (!e.id) e.id = uid();
      state.added[e.id] = e;
      if (!save()) { delete state.added[e.id]; throw new Error('瀏覽器儲存空間不足（海報圖片可能太大），請改用圖片網址。'); }
      return e;
    },
    remove(id) {
      delete state.added[id];
      if (seed().some(e => e.id === id) && !state.removed.includes(id)) state.removed.push(id);
      save();
    },
    stats: () => ({ seed: seed().length, local: Object.keys(state.added).length, removed: state.removed.length, total: all().length }),
    resetLocal() { state = { added: {}, removed: [] }; save(); },
    exportJS() {
      const list = all().map(({ _src, ...e }) => e);
      return `/* 舞島活動資料庫 — 匯出於 ${new Date().toLocaleString('zh-TW')} */\nwindow.DANCE_EVENTS = ${JSON.stringify(list, null, 2)};\n`;
    },
    exportJSON: () => JSON.stringify(all().map(({ _src, ...e }) => e), null, 2),
    importJSON(text) {
      const list = JSON.parse(text);
      if (!Array.isArray(list)) throw new Error('格式錯誤：需要活動陣列');
      list.forEach(e => { if (e && e.name && e.country && e.city) state.added[e.id || uid()] = { ...e, id: e.id || uid() }; });
      save();
      return list.length;
    }
  };
})();
