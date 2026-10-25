/* =========================================================
 * 雲端後端（Supabase）
 * - 活動表 events：所有人可讀，只有管理員可寫
 * - 角色表 players：每個玩家只能改自己的
 * - 玩家用「角色 ID + 密碼」登入（內部轉成 ID@players.dance-island.app）
 * - 管理員用 Email + 密碼登入（在 Supabase 後台建立）
 * 設定方式見 data/config.js 與 tools/supabase.sql
 * ========================================================= */
window.Backend = (() => {
  const cfg = window.DANCE_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const PLAYER_DOMAIN = '@players.dance-island.app';
  let sb = null, user = null, isAdmin = false, role = null, profile = null;
  const listeners = [];
  const emit = () => listeners.forEach(f => f({ user, isAdmin, profile }));

  const loadLib = () => new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement('script');
    s.src = LIB; s.onload = res; s.onerror = () => rej(new Error('supabase load failed'));
    document.head.appendChild(s);
  });

  async function refresh() {
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
    isAdmin = false; role = null; profile = null;
    if (user) {
      const a = await sb.from('admins').select('user_id,role').eq('user_id', user.id).maybeSingle();
      isAdmin = !!a.data; role = a.data ? a.data.role || 'admin' : null;
      const p = await sb.from('players').select('*').eq('user_id', user.id).maybeSingle();
      profile = p.data || null;
    }
  }

  const ready = !enabled ? Promise.resolve() : loadLib().then(async () => {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    await refresh();
  }).catch(e => { console.warn('[Backend]', e); });

  const must = r => { if (r.error) throw new Error(r.error.message); return r.data; };
  const toEmail = handle => handle.toLowerCase() + PLAYER_DOMAIN;

  return {
    enabled,
    ready,
    get user() { return user; },
    get isAdmin() { return isAdmin; },
    get role() { return role; },
    get profile() { return profile; },
    onChange: f => listeners.push(f),

    /* 管理員 */
    async signInAdmin(email, password) {
      must(await sb.auth.signInWithPassword({ email: email.trim(), password }));
      await refresh();
      if (!isAdmin) { await sb.auth.signOut(); await refresh(); emit(); throw new Error('not admin'); }
      emit();
    },

    /* 玩家 */
    async handleTaken(handle) {
      const r = await sb.from('players').select('handle').eq('handle', handle).maybeSingle();
      return !!r.data;
    },
    async signUpPlayer(handle, password, p) {
      const r = must(await sb.auth.signUp({ email: toEmail(handle), password }));
      if (!r.session) must(await sb.auth.signInWithPassword({ email: toEmail(handle), password }));
      must(await sb.from('players').insert({ handle, name: p.name, nat: p.nat, style: p.style, job: p.job, title: p.title, look: p.look }));
      await refresh(); emit();
      return profile;
    },
    async signInPlayer(handle, password) {
      must(await sb.auth.signInWithPassword({ email: toEmail(handle), password }));
      await refresh(); emit();
      return profile;
    },
    async saveProfile(patch) {
      const r = must(await sb.from('players').update(patch).eq('user_id', user.id).select().maybeSingle());
      profile = r || { ...profile, ...patch }; emit();
      return profile;
    },
    async signOut() { await sb.auth.signOut(); await refresh(); emit(); },

    /* 活動 */
    async listEvents() {
      const rows = must(await sb.from('events').select('id,data'));
      return rows.map(r => ({ ...r.data, id: r.id }));
    },
    async upsertEvent(e) {
      const { id, ...data } = e;
      must(await sb.from('events').upsert({ id, data, updated_at: new Date().toISOString() }));
    },
    async deleteEvent(id) { must(await sb.from('events').delete().eq('id', id)); },

    /* 聊天室 */
    async listMessages(channel, limit = 60) {
      const rows = must(await sb.from('messages').select('*').eq('channel', channel).order('created_at', { ascending: false }).limit(limit));
      return rows.reverse();
    },
    async sendMessage(channel, text) { return must(await sb.from('messages').insert({ channel, text }).select().single()); },
    async deleteMessage(id) { must(await sb.from('messages').delete().eq('id', id)); },

    /* 留言板 */
    async commentCounts() {
      const rows = must(await sb.from('comments').select('event_id'));
      const n = {}; rows.forEach(r => (n[r.event_id] = (n[r.event_id] || 0) + 1)); return n;
    },
    async listComments(eventId) { return must(await sb.from('comments').select('*').eq('event_id', eventId).order('created_at')); },
    async sendComment(eventId, text) { return must(await sb.from('comments').insert({ event_id: eventId, text }).select().single()); },
    async deleteComment(id) { must(await sb.from('comments').delete().eq('id', id)); },

    /* 官方快訊 */
    async listAnnouncements() { return must(await sb.from('announcements').select('*').order('created_at')); },
    async addAnnouncement(text) { return must(await sb.from('announcements').insert({ text }).select().single()); },
    async setAnnouncement(id, patch) { must(await sb.from('announcements').update(patch).eq('id', id)); },
    async deleteAnnouncement(id) { must(await sb.from('announcements').delete().eq('id', id)); },
    async getSetting(key) { const r = must(await sb.from('settings').select('value').eq('key', key).maybeSingle()); return r ? r.value : null; },
    async setSetting(key, value) { must(await sb.from('settings').upsert({ key, value })); },

    /* 實名認證 */
    async myVerification() {
      const r = must(await sb.from('verifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1));
      return r[0] || null;
    },
    async requestVerification(dancer_name, ig, code) { return must(await sb.from('verifications').insert({ dancer_name, ig, code }).select().single()); },
    async listVerifications() { return must(await sb.from('verifications').select('*').eq('status', 'pending').order('created_at')); },
    async reviewVerification(id, approve) { must(await sb.rpc('review_verification', { vid: id, approve })); },
    async verifiedNames() { return must(await sb.from('players').select('handle,name,verified_key,ig').eq('verified', true)); },
    async playerByUser(uid) { return must(await sb.from('players').select('handle,name,verified,banned').eq('user_id', uid).maybeSingle()); },

    /* 檢舉 / 管理 */
    async report(target_handle, reason) { must(await sb.from('reports').insert({ target_handle, reason })); },
    async listReports() { return must(await sb.from('reports').select('*').eq('status', 'open').order('created_at')); },
    async closeReport(id) { must(await sb.from('reports').update({ status: 'done' }).eq('id', id)); },
    async setPlayer(handle, patch) { must(await sb.from('players').update(patch).eq('handle', handle)); },
    async findPlayer(handle) { return must(await sb.from('players').select('handle,name,verified,banned,ig').eq('handle', handle).maybeSingle()); },

    /* 即時更新：table = 'messages' | 'comments' | 'announcements' */
    subscribe(table, cb) {
      const ch = sb.channel('rt-' + table + '-' + Math.random().toString(36).slice(2, 7))
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => cb(payload))
        .subscribe();
      return () => sb.removeChannel(ch);
    }
  };
})();
