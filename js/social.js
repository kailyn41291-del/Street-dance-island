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
  /* 台灣用語 / 街舞用語：先換成一般說法再翻譯，不然會被翻成拼音（例如「安安」→ an an） */
  // 整句就是這些話時，直接用各語言最自然的說法
  const PHRASE = {
    '安安': { en: 'Hiya!', ja: 'やっほー！', ko: '안뇽!' }, '安安你好': { en: 'Hi there!', ja: 'やっほー、こんにちは！', ko: '안뇽, 안녕하세요!' },
    '掰掰': { en: 'Bye bye!', ja: 'バイバイ！', ko: '빠이빠이!' }, '881': { en: 'Bye bye!', ja: 'バイバイ！', ko: '빠이빠이!' }, '3q': { en: 'Thank you!', ja: 'サンキュー！', ko: '땡큐!' },
    '母湯': { en: 'No way!', ja: 'ダメだよ！', ko: '안 돼!' }, '很頂': { en: "That's sick!", ja: 'ヤバすぎ！', ko: '미쳤다!' }, '傻眼': { en: "I'm speechless", ja: '唖然…', ko: '어이없어' },
    '啾咪': { en: 'Muah~ 😉', ja: 'チュッ😉', ko: '쪽~ 😉' }, '好der': { en: 'Okie dokie!', ja: 'りょ！', ko: '오키!' }, '醬': { en: 'Like this', ja: 'こんな感じ', ko: '이렇게' },
    'ㄏㄏ': { en: 'Heh heh', ja: 'ふふっ', ko: 'ㅎㅎ' }, '87': { en: 'Silly~', ja: 'おバカ〜', ko: '바보~' }, '揪': { en: "Let's go together!", ja: '一緒に行こう！', ko: '같이 가자!' }
  };
  // 句子裡的用語換成一般中文（長的先換）
  const SLANG = [
    ['安安你好', '你好'], ['安安', '嗨'], ['掰掰', '再見'], ['母湯', '不行'], ['很頂', '超厲害'], ['好頂', '好厲害'], ['超頂', '超厲害'], ['好der', '好的'], ['是在哈囉', '是在搞什麼'],
    ['北七', '笨蛋'], ['87分', '很不錯'], ['87', '笨蛋'], ['揪團', '約大家一起'], ['揪', '約'], ['醬子', '這樣子'], ['醬', '這樣'], ['ㄏㄏ', '呵呵'], ['啾咪', '親一下'],
    ['尬舞', 'battle'], ['尬意', '喜歡'], ['歐北', '亂'], ['很瞎', '很荒謬'], ['超瞎', '超荒謬'], ['魯蛇', '失敗者'], ['小確幸', '小小的幸福'], ['超派', '超兇'], ['很派', '很兇'],
    ['呷飽未', '吃飽了嗎'], ['真假', '真的嗎'], ['傻眼貓咪', '我傻眼了'], ['傻眼', '驚呆了'], ['3Q', '謝謝'], ['3q', '謝謝'], ['881', '再見'], ['484', '是不是'], ['DLLM', ''],
    ['機車', '很煩人'], ['很鬧', '很好笑'], ['超鬧', '超好笑'], ['好鬧', '好好笑'], ['嘴砲', '說大話'], ['抓包', '被發現'], ['爆肝', '熬夜'], ['很chill', '很放鬆'], ['很嗨', '很興奮'],
    ['吃土', '沒錢'], ['佛系', '隨緣'], ['很頹', '很沒精神'], ['蹭', '跟著'], ['踹共', '出來講清楚'], ['蝦米', '什麼'], ['甘安捏', '真的是這樣嗎'], ['哩賀', '你好'], ['多謝', '謝謝']
  ];
  const localize = s => { let o = s; for (const [k, v] of SLANG) o = o.split(k).join(v); return o; };
  async function translate(text, to = I18N.lang) {
    let plain = text.replace(/:[cd]\d{1,2}:/g, ' ').trim();
    const from = detect(plain);
    if (!plain || !from || from === to) return null;
    const ph = PHRASE[plain.replace(/[!！~～。.,，?？\s]+$/g, '').toLowerCase()] || PHRASE[plain.replace(/[!！~～。.,，?？\s]+$/g, '')];
    if (ph && ph[to]) return ph[to];
    if (from === 'zh') plain = localize(plain);
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
    Backend.subscribe(['messages', 'comments', 'announcements', 'votes'], p => emit(p.table, { type: p.eventType, row: p.new && p.new.id ? p.new : p.old }));
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
      // 一分鐘內重複要的話用同一份（活動頁往下滑會一直要）
      if (cloud()) { if (this._cc && Date.now() - this._cc.at < 60000) return this._cc.p; const p = Backend.commentCounts().catch(() => ({})); this._cc = { at: Date.now(), p }; return p; }
      const n = {}; db.comments.forEach(c => (n[c.event_id] = (n[c.event_id] || 0) + 1)); return n;
    },
    async comments(eventId) {
      if (cloud()) return Backend.listComments(eventId);
      return db.comments.filter(c => c.event_id === eventId);
    },
    async comment(eventId, text) {
      this._cc = null;
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
      this._cc = null;
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
