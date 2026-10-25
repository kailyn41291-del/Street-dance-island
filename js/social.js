/* =========================================================
 * 社群功能的資料層：聊天室、留言板、官方快訊、自動翻譯、廣告過濾
 * 雲端模式 → Supabase（所有人即時同步）
 * 本機模式 → 只存在這台瀏覽器（方便測試）
 * ========================================================= */
window.Social = (() => {
  const cloud = () => Backend.enabled;
  const KEY = 'danceIsland.social.v1';
  const listeners = { messages: [], comments: [], announcements: [], votes: [] };
  const emit = (table, payload) => listeners[table].forEach(f => f(payload));

  /* ---------- 本機假資料庫 ---------- */
  let db = { messages: [], comments: [], announcements: [], settings: { announce_every: 60 }, seq: 1 };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.messages) db = { ...db, ...s }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const author = () => { const m = Player.me; return m && { handle: m.id, name: m.name, title: m.title, job: m.job, nat: m.nat, look: m.look, role: m.role || null }; };

  /* ---------- 廣告 / 機器人過濾（雲端也會再檢查一次） ---------- */
  const SPAM = /(https?:\/\/|www\.|\.com|\.net|\.cc|\.xyz|t\.me|line\.me|bit\.ly|加賴|加line|加微信|wechat|whatsapp|telegram|代購|代儲|賺錢|兼職|日賺|月入|投資|博弈|娛樂城|貸款|色情|約炮|casino|crypto|bitcoin|forex|investment|earn money|onlyfans)/i;
  let lastPost = 0, lastText = '';
  function check(text, gap = 3000) {
    const t = text.trim();
    if (!t) return 'empty';
    if (t.length > 200) return 'long';
    if (!Player.me) return 'login';
    const admin = Player.me.role;
    if (!admin) {
      if (SPAM.test(t)) return 'spam';
      if (/(.)\1{11,}/.test(t)) return 'spam';
      if (Date.now() - lastPost < gap) return 'fast';
      if (t === lastText && Date.now() - lastPost < 60000) return 'dup';
    }
    return null;
  }
  const errKey = e => (/links|spam|duplicate/.test(e) ? 'spam' : /too fast/.test(e) ? 'fast' : /need character/.test(e) ? 'login' : /banned/.test(e) ? 'banned' : null);

  /* ---------- 自動翻譯 ---------- */
  const tCache = new Map();
  const detect = s => (/[가-힯]/.test(s) ? 'ko' : /[぀-ヿ]/.test(s) ? 'ja' : /[一-鿿]/.test(s) ? 'zh' : /[a-z]/i.test(s) ? 'en' : null);
  const CODE = { zh: 'zh-TW', en: 'en', ja: 'ja', ko: 'ko' };
  async function translate(text, to = I18N.lang) {
    const plain = text.replace(/:[cd]\d{1,2}:/g, ' ').trim();
    const from = detect(plain);
    if (!plain || !from || from === to) return null;
    const key = to + '|' + plain;
    if (tCache.has(key)) return tCache.get(key);
    const job = (async () => {
      try {
        const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${CODE[to]}&dt=t&q=${encodeURIComponent(plain)}`);
        const j = await r.json();
        const out = (j[0] || []).map(x => x[0]).join('');
        if (out && out.trim() !== plain) return out;
      } catch (e) {}
      try {
        const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(plain)}&langpair=${CODE[from]}|${CODE[to]}`);
        const j = await r.json();
        const out = j.responseData && j.responseData.translatedText;
        if (out && out.trim() !== plain && !/MYMEMORY WARNING/i.test(out)) return out;
      } catch (e) {}
      return null;
    })();
    tCache.set(key, job);
    return job;
  }

  /* ---------- 即時更新 ---------- */
  let subs = false;
  function ensureSubs() {
    if (subs || !cloud()) return;
    subs = true;
    ['messages', 'comments', 'announcements', 'votes'].forEach(tb => Backend.subscribe(tb, p => emit(tb, { type: p.eventType, row: p.new && p.new.id ? p.new : p.old })));
  }

  return {
    get cloud() { return cloud(); },
    check, errKey, translate, detect,
    on(table, f) { ensureSubs(); listeners[table].push(f); return () => { listeners[table] = listeners[table].filter(x => x !== f); }; },

    /* 聊天室 */
    async messages(channel) {
      if (cloud()) return Backend.listMessages(channel);
      return db.messages.filter(m => m.channel === channel).slice(-60);
    },
    async send(channel, text) {
      const bad = check(text); if (bad) throw new Error(bad);
      let row;
      if (cloud()) {
        try { row = await Backend.sendMessage(channel, text.trim()); } catch (e) { throw new Error(errKey(e.message) || e.message); }
      } else {
        row = { id: db.seq++, channel, text: text.trim(), author: author(), user_id: 'local', created_at: new Date().toISOString() };
        db.messages.push(row); db.messages = db.messages.slice(-300); save();
        emit('messages', { type: 'INSERT', row });
      }
      lastPost = Date.now(); lastText = text.trim();
      return row;
    },
    async removeMessage(id) {
      if (cloud()) return Backend.deleteMessage(id);
      db.messages = db.messages.filter(m => m.id !== id); save(); emit('messages', { type: 'DELETE', row: { id } });
    },

    /* 留言板 */
    async commentCounts() {
      if (cloud()) { try { return await Backend.commentCounts(); } catch (e) { return {}; } }
      const n = {}; db.comments.forEach(c => (n[c.event_id] = (n[c.event_id] || 0) + 1)); return n;
    },
    async comments(eventId) {
      if (cloud()) return Backend.listComments(eventId);
      return db.comments.filter(c => c.event_id === eventId);
    },
    async comment(eventId, text) {
      const bad = check(text, 10000); if (bad) throw new Error(bad);
      let row;
      if (cloud()) {
        try { row = await Backend.sendComment(eventId, text.trim()); } catch (e) { throw new Error(errKey(e.message) || e.message); }
      } else {
        row = { id: db.seq++, event_id: eventId, text: text.trim(), author: author(), user_id: 'local', created_at: new Date().toISOString() };
        db.comments.push(row); save(); emit('comments', { type: 'INSERT', row });
      }
      lastPost = Date.now(); lastText = text.trim();
      return row;
    },
    async removeComment(id) {
      if (cloud()) return Backend.deleteComment(id);
      db.comments = db.comments.filter(c => c.id !== id); save(); emit('comments', { type: 'DELETE', row: { id } });
    },

    /* 官方快訊 */
    async announcements() {
      if (cloud()) { try { return await Backend.listAnnouncements(); } catch (e) { return []; } }
      return db.announcements;
    },
    async addAnnouncement(text) {
      if (cloud()) return Backend.addAnnouncement(text);
      const row = { id: db.seq++, text, active: true, created_at: new Date().toISOString() };
      db.announcements.push(row); save(); emit('announcements', { type: 'INSERT', row }); return row;
    },
    async setAnnouncement(id, patch) {
      if (cloud()) return Backend.setAnnouncement(id, patch);
      db.announcements = db.announcements.map(a => (a.id === id ? { ...a, ...patch } : a)); save(); emit('announcements', { type: 'UPDATE', row: { id } });
    },
    async removeAnnouncement(id) {
      if (cloud()) return Backend.deleteAnnouncement(id);
      db.announcements = db.announcements.filter(a => a.id !== id); save(); emit('announcements', { type: 'DELETE', row: { id } });
    },
    async announceEvery() {
      if (cloud()) { try { const v = await Backend.getSetting('announce_every'); return +v || 60; } catch (e) { return 60; } }
      return +db.settings.announce_every || 60;
    },
    async setAnnounceEvery(sec) {
      if (cloud()) return Backend.setSetting('announce_every', sec);
      db.settings.announce_every = sec; save();
    },
    /** 能不能刪這則（自己的或管理員） */
    canDelete: row => !!Player.me && (Player.me.role || (row.author && row.author.handle === Player.me.id))
  };
})();
