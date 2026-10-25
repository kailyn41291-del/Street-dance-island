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

    /* 活動瀏覽次數 */
    async viewCounts() { const n = {}; must(await sb.from('event_views').select('event_id,n')).forEach(r => (n[r.event_id] = r.n)); return n; },
    async bumpView(eid) { must(await sb.rpc('bump_view', { eid })); },
    async bumpClick(eid, k) { must(await sb.rpc('bump_click', { eid, k })); },
    async clickStats() { return must(await sb.from('event_clicks').select('event_id,kind,day,n')); },

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

    /* 收藏 / 追蹤 */
    async listFavorites() { return must(await sb.from('favorites').select('event_id,created_at').eq('user_id', user.id)).map(r => r.event_id); },
    async addFavorite(event_id) { must(await sb.from('favorites').insert({ event_id })); },
    async removeFavorite(event_id) { must(await sb.from('favorites').delete().eq('user_id', user.id).eq('event_id', event_id)); },
    async listFollows() { return must(await sb.from('follows').select('org').eq('user_id', user.id)).map(r => r.org); },
    async follow(org) { must(await sb.from('follows').insert({ org })); },
    async unfollow(org) { must(await sb.from('follows').delete().eq('user_id', user.id).eq('org', org)); },

    /* 投稿 */
    async submitEvent(data) { return must(await sb.from('submissions').insert({ data }).select().single()); },
    async mySubmissions() { return must(await sb.from('submissions').select('id,data,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)); },
    async listSubmissions() { return must(await sb.from('submissions').select('*').eq('status', 'pending').order('created_at')); },
    async reviewSubmission(id, status) { must(await sb.from('submissions').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)); },

    /* 打卡 / 簽到 / 等級 */
    async myCheckins() { return must(await sb.from('checkins').select('event_id,country,city,created_at').eq('user_id', user.id)); },
    async checkin(e) { must(await sb.from('checkins').insert({ event_id: e.id, country: e.country, city: e.city })); },
    async uncheckin(event_id) { must(await sb.from('checkins').delete().eq('user_id', user.id).eq('event_id', event_id)); },
    async dailySpin() { return must(await sb.rpc('daily_spin')); },
    async myDaily() { return must(await sb.from('daily').select('day,reward').eq('user_id', user.id).order('day', { ascending: false }).limit(60)); },
    async myUnlocks() { return must(await sb.from('unlocks').select('item').eq('user_id', user.id)).map(r => r.item); },
    async stats(uid) { return must(await sb.rpc('player_stats', { uid: uid || user.id })); },

    /* 人氣 Battle */
    async listBattles() { return must(await sb.from('battles').select('*').order('ends_at', { ascending: false }).limit(20)); },
    async addBattle(b) { return must(await sb.from('battles').insert(b).select().single()); },
    async deleteBattle(id) { must(await sb.from('battles').delete().eq('id', id)); },
    async listVotes(battleIds) { return battleIds.length ? must(await sb.from('votes').select('battle_id,user_id,choice').in('battle_id', battleIds)) : []; },
    async vote(battle_id, choice) { must(await sb.from('votes').insert({ battle_id, choice })); },

    /* 節奏遊戲 / NPC */
    async postScore(score) { return must(await sb.from('scores').insert({ score, game: 'rhythm' }).select().single()); },
    async topScores(limit = 10) {
      const rows = must(await sb.from('scores').select('user_id,score,author,created_at').eq('game', 'rhythm').order('score', { ascending: false }).limit(200));
      const best = new Map(); rows.forEach(r => { if (!best.has(r.user_id)) best.set(r.user_id, r); });   // 每人只算最高分
      return [...best.values()].slice(0, limit);
    },
    async npcWin() { return must(await sb.rpc('npc_win')); },

    /* 玩家資料 / 名片 */
    async playerByHandle(handle) { return must(await sb.from('players').select('user_id,handle,name,title,look,nat,style,job,verified,ig,card,banned').eq('handle', handle).maybeSingle()); },
    async playersByIds(ids) { return ids.length ? must(await sb.from('players').select('user_id,handle,name,title,look,nat,style,job,verified,ig,card').in('user_id', ids)) : []; },

    /* 好友 */
    async friendRequests() { return must(await sb.from('friend_requests').select('*').or(`from_user.eq.${user.id},to_user.eq.${user.id}`)); },
    async sendFriend(to_user) { must(await sb.from('friend_requests').insert({ to_user })); },
    async respondFriend(id, status) { must(await sb.from('friend_requests').update({ status, responded_at: new Date().toISOString() }).eq('id', id)); },
    async removeFriend(id) { must(await sb.from('friend_requests').delete().eq('id', id)); },
    async listBlocks() { return must(await sb.from('blocks').select('blocked').eq('user_id', user.id)).map(r => r.blocked); },
    async block(uid) { must(await sb.from('blocks').insert({ blocked: uid })); },
    async unblock(uid) { must(await sb.from('blocks').delete().eq('user_id', user.id).eq('blocked', uid)); },

    /* 私訊 */
    async listDMs(other, limit = 80) {
      const rows = must(await sb.from('dms').select('*').or(`and(from_user.eq.${user.id},to_user.eq.${other}),and(from_user.eq.${other},to_user.eq.${user.id})`).order('created_at', { ascending: false }).limit(limit));
      return rows.reverse();
    },
    async unreadDMs() { return must(await sb.from('dms').select('id,from_user').eq('to_user', user.id).is('read_at', null)); },
    async sendDM(to_user, text) { return must(await sb.from('dms').insert({ to_user, text }).select().single()); },
    async markRead(from_user) { must(await sb.from('dms').update({ read_at: new Date().toISOString() }).eq('to_user', user.id).eq('from_user', from_user).is('read_at', null)); },
    subscribeTable(table, filter, cb) {
      const ch = sb.channel('rt-' + table + '-' + Math.random().toString(36).slice(2, 7))
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, p => cb(p)).subscribe();
      return () => sb.removeChannel(ch);
    },

    /* 論壇 */
    async forumPosts() { return must(await sb.from('forum_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(200)); },
    async forumPost(id) { return must(await sb.from('forum_posts').select('*').eq('id', id).maybeSingle()); },
    async addPost(p) { return must(await sb.from('forum_posts').insert(p).select().single()); },
    async pendingPosts() { return must(await sb.from('forum_posts').select('*').eq('status', 'pending').order('created_at')); },
    async reviewPost(id, status) { must(await sb.from('forum_posts').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)); },
    async pinPost(id, pinned) { must(await sb.from('forum_posts').update({ pinned }).eq('id', id)); },
    async deletePost(id) { must(await sb.from('forum_posts').delete().eq('id', id)); },
    async replyCounts(threads) { if (!threads.length) return {}; const n = {}; must(await sb.from('replies').select('thread').in('thread', threads)).forEach(r => (n[r.thread] = (n[r.thread] || 0) + 1)); return n; },
    async listReplies(thread) { return must(await sb.from('replies').select('*').eq('thread', thread).order('created_at').limit(500)); },
    async addReply(thread, text, parent_id) { return must(await sb.from('replies').insert({ thread, text, parent_id: parent_id || null }).select().single()); },
    async deleteReply(id) { must(await sb.from('replies').delete().eq('id', id)); },
    async likesFor(targets) { return targets.length ? must(await sb.from('likes').select('target,user_id').in('target', targets)) : []; },
    async like(target) { must(await sb.from('likes').insert({ target })); },
    async unlike(target) { must(await sb.from('likes').delete().eq('target', target).eq('user_id', user.id)); },

    /* Battle：置頂問題、MP4 上傳 */
    async setPinnedQ(id, pinned_q) { must(await sb.from('battles').update({ pinned_q: pinned_q || null }).eq('id', id)); },
    async uploadVideo(file, onProgress) {
      const name = `battle/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
      must(await sb.storage.from('videos').upload(name, file, { contentType: 'video/mp4', upsert: false }));
      return sb.storage.from('videos').getPublicUrl(name).data.publicUrl;
    },

    /* 即時頻道（線上 Cypher 舞池） */
    channel(name, key) { return sb.channel(name, { config: { presence: { key }, broadcast: { self: true } } }); },
    removeChannel(ch) { sb.removeChannel(ch); },
    get uid() { return user ? user.id : null; },

    /* 即時更新：table = 'messages' | 'comments' | 'announcements' */
    subscribe(table, cb) {
      const ch = sb.channel('rt-' + table + '-' + Math.random().toString(36).slice(2, 7))
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => cb(payload))
        .subscribe();
      return () => sb.removeChannel(ch);
    }
  };
})();
