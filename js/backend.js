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
  let sb = null, user = null, isAdmin = false, profile = null;
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
    isAdmin = false; profile = null;
    if (user) {
      const a = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      isAdmin = !!a.data;
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
      must(await sb.from('players').insert({ handle, name: p.name, nat: p.nat, style: p.style, look: p.look }));
      await refresh(); emit();
      return profile;
    },
    async signInPlayer(handle, password) {
      must(await sb.auth.signInWithPassword({ email: toEmail(handle), password }));
      await refresh(); emit();
      return profile;
    },
    async saveLook(look) {
      must(await sb.from('players').update({ look }).eq('user_id', user.id));
      profile = { ...profile, look }; emit();
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
    async deleteEvent(id) { must(await sb.from('events').delete().eq('id', id)); }
  };
})();
