/* =========================================================
 * 活動資料存取（兩種模式）
 * 雲端模式（data/config.js 有填 Supabase）：
 *   活動存在雲端；只有管理員能新增 / 編輯 / 刪除，存完所有人立刻看到
 * 本機模式（沒填）：
 *   data/events.js 是大家看到的活動；網站上新增的先存在這台瀏覽器，
 *   用「💾 存檔 → 匯出 events.js」再上傳 GitHub
 * ========================================================= */
window.Store = (() => {
  const KEY = 'danceIsland.events.v1';
  const STYLES = ['All Style', 'Breaking', 'Popping', 'Locking', 'Hip Hop', 'House', 'Waacking', 'Krump', 'Vogue', 'Choreography', 'Kids', 'Other'];
  const STYLE_COLOR = {
    'All Style': '#eac45a', 'Breaking': '#e35d5d', 'Popping': '#7895df', 'Locking': '#ef8a3a',
    'Hip Hop': '#5bb5a6', 'House': '#7fcf73', 'Waacking': '#f07ca3', 'Krump': '#a8473f',
    'Vogue': '#b48ae0', 'Choreography': '#4fa3c7', 'Kids': '#f4a7c0', 'Other': '#9a8f85'
  };
  const cloud = () => Backend.enabled;
  const sortKey = e => `${e.date || '9999'} ${e.startTime || '99:99'}`;
  const uid = () => 'ev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---- 本機模式 ---- */
  let state = { added: {}, removed: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.added) state = s; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } };
  const seed = () => (window.DANCE_EVENTS || []);
  const localAll = () => {
    const out = [];
    seed().forEach(e => { if (!state.removed.includes(e.id) && !state.added[e.id]) out.push({ ...e, _src: 'seed' }); });
    Object.values(state.added).forEach(e => out.push({ ...e, _src: 'local' }));
    return out;
  };

  /* ---- 雲端模式 ---- */
  let remote = [];
  let loaded = false;

  // 雲端模式：雲端活動 + 寫在網站裡的活動（雲端有同 ID 的就以雲端為準；_deleted 代表管理員刪掉了）
  const cloudAll = () => {
    const ids = new Set(remote.map(e => e.id));
    return remote.filter(e => !e._deleted).map(e => ({ ...e, _src: 'cloud' }))
      .concat(seed().filter(e => !ids.has(e.id)).map(e => ({ ...e, _src: 'seed' })));
  };
  const all = () => (cloud() ? cloudAll() : localAll()).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  return {
    STYLES, STYLE_COLOR,
    get cloud() { return cloud(); },
    get loaded() { return loaded; },
    /** 能不能新增 / 編輯：雲端模式只有管理員；本機模式大家都行（只影響自己的瀏覽器） */
    canEdit: () => (cloud() ? Backend.isAdmin : true),
    async load() {
      if (cloud()) { try { remote = await Backend.listEvents(); } catch (e) { console.warn('[Store] load failed', e); } }
      loaded = true;
    },
    all,
    get: id => all().find(e => e.id === id),
    byCity: (country, city) => all().filter(e => e.country === country && e.city === city),
    byCountry: country => all().filter(e => e.country === country),
    async upsert(ev) {
      const e = { ...ev }; delete e._src;
      if (!e.id) e.id = uid();
      if (cloud()) {
        await Backend.upsertEvent(e);
        remote = remote.filter(x => x.id !== e.id).concat(e);
        return e;
      }
      state.added[e.id] = e;
      if (!save()) { delete state.added[e.id]; throw new Error(t('storage_full')); }
      return e;
    },
    async remove(id) {
      if (cloud()) {
        if (seed().some(e => e.id === id)) {                 // 網站內建的活動：在雲端留一筆「已刪除」標記
          const mark = { id, _deleted: true };
          await Backend.upsertEvent(mark); remote = remote.filter(x => x.id !== id).concat(mark);
        } else { await Backend.deleteEvent(id); remote = remote.filter(x => x.id !== id); }
        return;
      }
      delete state.added[id];
      if (seed().some(e => e.id === id) && !state.removed.includes(id)) state.removed.push(id);
      save();
    },
    /** 雲端模式：把 data/events.js 的活動一次上傳（管理員用） */
    async uploadSeed() {
      let n = 0;
      for (const e of seed()) { if (!remote.some(x => x.id === e.id)) { await this.upsert(e); n++; } }
      return n;
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
      if (!Array.isArray(list)) throw new Error('format');
      list.forEach(e => { if (e && e.name && e.country && e.city) state.added[e.id || uid()] = { ...e, id: e.id || uid() }; });
      save();
      return list.length;
    }
  };
})();
