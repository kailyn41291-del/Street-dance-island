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
  // 舞風 / 類別標籤（存的是英文代號，畫面上用 label() 顯示當地語言）
  const STYLES = ['All Style', 'Breaking', 'Popping', 'Locking', 'Hip Hop', 'House', 'Waacking', 'Krump', 'Vogue', 'Dancehall', 'Heels', 'K-POP', 'Jazz Funk',
    'Choreography', 'Experimental', 'Kids', 'Showcase', 'Workshop', 'Other'];
  const STYLE_COLOR = {
    'All Style': '#eac45a', 'Breaking': '#e35d5d', 'Popping': '#7895df', 'Locking': '#ef8a3a',
    'Hip Hop': '#5bb5a6', 'House': '#7fcf73', 'Waacking': '#f07ca3', 'Krump': '#a8473f',
    'Vogue': '#b48ae0', 'Dancehall': '#3aa776', 'Heels': '#c95f93', 'K-POP': '#5fbfe6', 'Jazz Funk': '#d9a52b',
    'Choreography': '#4fa3c7', 'Experimental': '#7d6fd6', 'Kids': '#f4a7c0', 'Showcase': '#d99a6c', 'Workshop': '#8db8a6', 'Other': '#9a8f85'
  };
  const STYLE_NAME = {
    zh: { 'Choreography': '排舞', 'Experimental': '實驗', 'Kids': '兒童', 'Showcase': '展演', 'Workshop': '工作坊 / 營隊', 'Other': '其他' },
    ja: { 'Choreography': '振付', 'Experimental': '実験', 'Kids': 'キッズ', 'Showcase': 'ショーケース', 'Workshop': 'ワークショップ', 'Other': 'その他' },
    ko: { 'Choreography': '안무', 'Experimental': '실험', 'Kids': '키즈', 'Showcase': '쇼케이스', 'Workshop': '워크숍', 'Other': '기타' }
  };
  const label = s => ((STYLE_NAME[window.I18N && I18N.lang] || {})[s] || s);
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

  /* ---- 雲端模式 ----
   * 打開網站只先抓「最近 4 個月內＋之後」的活動（省流量、比較快）
   * 更舊的活動在需要的時候才抓（看過去活動、搜尋、主辦單位頁、我的收藏……），抓到後畫面自動更新 */
  const RECENT_DAYS = 120;
  let remote = [];
  let loaded = false, full = false, fullP = null;
  const cutoff = () => { const d = new Date(Date.now() + 8 * 3600e3 - RECENT_DAYS * 864e5); return d.toISOString().slice(0, 10); };
  const merge = rows => { const have = new Set(remote.map(e => e.id)); const add = rows.filter(e => !have.has(e.id)); remote = remote.concat(add); return add.length; };
  // 管理員：把以前塞在活動資料裡的海報搬成檔案（一次搬一個，背景慢慢做）
  async function movePosters() {
    if (!Backend.isAdmin || !Backend.uploadPoster) return;
    for (const e of remote.filter(x => typeof x.poster === 'string' && x.poster.startsWith('data:'))) {
      try { const url = await Backend.uploadPoster(e.poster); const { _src, ...row } = { ...e, poster: url }; await Backend.upsertEvent(row); e.poster = url; } catch (x) { console.warn('[Store] poster', e.id, x); return; }
    }
  }

  // 雲端模式：雲端活動 + 寫在網站裡的活動（雲端有同 ID 的就以雲端為準；_deleted 代表管理員刪掉了）
  const cloudAll = () => {
    const ids = new Set(remote.map(e => e.id));
    return remote.filter(e => !e._deleted).map(e => ({ ...e, _src: 'cloud' }))
      .concat(seed().filter(e => !ids.has(e.id)).map(e => ({ ...e, _src: 'seed' })));
  };
  // 草稿（draft: true，例如舞風還沒公告）只有能編輯的人看得到
  const all = () => (cloud() ? cloudAll() : localAll()).filter(e => !e.draft || (cloud() ? Backend.isAdmin : true)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  return {
    STYLES, STYLE_COLOR, label,
    get cloud() { return cloud(); },
    get loaded() { return loaded; },
    /** 能不能新增 / 編輯：雲端模式只有管理員；本機模式大家都行（只影響自己的瀏覽器） */
    canEdit: () => (cloud() ? Backend.isAdmin : true),
    async load() {
      if (cloud()) {
        try {
          remote = await Backend.listEvents({ since: cutoff() }); full = false; fullP = null;
          try { localStorage.setItem('danceIsland.eventsCache', JSON.stringify({ at: Date.now(), rows: remote })); } catch (x) {}
        } catch (e) {
          console.warn('[Store] load failed', e);
          // 沒網路：用上次存在手機裡的活動
          try { const c = JSON.parse(localStorage.getItem('danceIsland.eventsCache') || 'null'); if (c && c.rows) { remote = c.rows; this.offlineAt = c.at; } } catch (x) {}
        }
      }
      loaded = true;
      if (cloud()) Backend.ready.then(() => setTimeout(() => { if (Backend.isAdmin) this.ensureAll().then(movePosters); }, 4000));
    },
    get full() { return !cloud() || full; },
    /** 需要舊活動時呼叫：抓完會回傳新增了幾個，並讓畫面重畫一次 */
    ensureAll(quiet) {
      if (!cloud() || full) return Promise.resolve(0);
      if (fullP && !quiet) fullP.then(n => n && window.App && App.redraw && App.redraw());
      if (!fullP) fullP = Backend.listEvents({ before: cutoff() }).then(rows => {
        full = true; const n = merge(rows);
        if (n && !quiet && window.App && App.redraw) setTimeout(() => App.redraw(), 0);
        return n;
      }).catch(e => { fullP = null; console.warn('[Store] older', e); return 0; });
      return fullP;
    },
    all,
    get: id => all().find(e => e.id === id),
    byCity: (country, city) => all().filter(e => e.country === country && e.city === city),
    byCountry: country => all().filter(e => e.country === country),
    async upsert(ev) {
      const e = { ...ev }; delete e._src;
      if (!e.id) e.id = uid();
      if (cloud()) {
        if (typeof e.poster === 'string' && e.poster.startsWith('data:') && Backend.uploadPoster) e.poster = await Backend.uploadPoster(e.poster);   // 海報存成檔案
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
