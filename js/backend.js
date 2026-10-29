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
  let sb = null, user = null, isAdmin = false, role = null, profile = null, skins = null, gatePass = false;
  const listeners = [];
  const emit = () => listeners.forEach(f => f({ user, isAdmin, profile }));

  const loadLib = () => new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement('script');
    // 先用網站自己的那份，失敗再用 CDN（某些國家連不到 CDN）
    s.src = 'js/vendor/supabase.min.js?v=2.45.4'; s.onload = res;
    s.onerror = () => { const c = document.createElement('script'); c.src = LIB; c.onload = res; c.onerror = () => rej(new Error('supabase load failed')); document.head.appendChild(c); };
    document.head.appendChild(s);
  });

  async function refresh() {
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
    isAdmin = false; role = null; profile = null; skins = null; gatePass = false;
    if (user) {
      const a = await sb.from('admins').select('user_id,role').eq('user_id', user.id).maybeSingle();
      isAdmin = !!a.data; role = a.data ? a.data.role || 'admin' : null;
      const p = await sb.from('players').select('*').eq('user_id', user.id).maybeSingle();
      profile = p.data || null;
      // 本人造型：綁帳號（user_id），改 ID 也不會掉
      const s = await sb.from('skin_owners').select('skin').eq('user_id', user.id);
      skins = s.error ? null : (s.data || []).map(r => r.skin);
      // 網站還沒公開：通行名單上的帳號（測試帳號、之後的封測玩家）也能進來
      if (!isAdmin) { const g = await sb.from('gate_pass').select('user_id').eq('user_id', user.id).maybeSingle(); gatePass = !!g.data; }
    }
  }

  const ready = !enabled ? Promise.resolve() : loadLib().then(async () => {
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    await refresh();
  }).catch(e => { console.warn('[Backend]', e); });

  /* 省即時連線：分頁切到背景超過 1 分鐘就先斷線，回來再自動接上（免費版同時最多 200 條連線）
   * 斷線時把每個頻道標成「出錯」並停掉重試；回來時重新連線、重新加入每個頻道，
   * 加入成功後各頻道原本的 SUBSCRIBED 回呼會再跑一次（例如重新登記在線） */
  const resumeFns = [];
  let paused = false, pauseTm = null;
  function rtPause() {
    if (!sb || paused) return;
    const rt = sb.realtime; if (!rt.isConnected()) return;
    paused = true;
    rt.disconnect();
    rt.getChannels().forEach(ch => { try { ch._trigger('phx_error'); ch.rejoinTimer.reset(); } catch (e) {} });
  }
  function rtResume() {
    if (!sb || !paused) return;
    paused = false;
    const rt = sb.realtime;
    rt.connect();
    rt.getChannels().forEach(ch => { try { if (ch.state === 'errored') ch._rejoin(); } catch (e) {} });
    resumeFns.forEach(f => { try { f(); } catch (e) {} });
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(pauseTm);
    if (document.visibilityState === 'hidden') pauseTm = setTimeout(rtPause, 60000);
    else rtResume();
  });

  const must = r => { if (r.error) throw new Error(r.error.message); return r.data; };
  // 縮圖片（webp）；不是一般照片或讀不到就回傳 null
  const shrinkImage = (blob, max, q) => new Promise(res => {
    const u = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k)); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); cv.toBlob(b => res(b), 'image/webp', q); };
    img.onerror = () => { URL.revokeObjectURL(u); res(null); };
    img.src = u;
  });
  // 資料庫算好的數字（第二十八批 SQL）；還沒跑 SQL 時退回舊的做法
  const tally = async (fn, args, fallback) => {
    const r = await sb.rpc(fn, args || {});
    if (r.error) { if (/PGRST202|Could not find the function/i.test(r.error.code + ' ' + r.error.message)) return fallback(); throw new Error(r.error.message); }
    return r.data;
  };
  // 把 [{…, n, mine}] 還原成一筆一筆的樣子（畫面的程式不用改）
  const expand = (rows, key) => { const out = []; (rows || []).forEach(r => { for (let i = 0; i < r.n; i++) { const o = { user_id: i === 0 && r.mine ? (user && user.id) : null }; key.forEach(k => (o[k] = r[k])); out.push(o); } }); return out; };
  // 一次最多 1000 筆，超過就分批抓
  const allRows = async make => { const out = []; for (let from = 0; ; from += 1000) { const rows = must(await make().range(from, from + 999)); out.push(...rows); if (rows.length < 1000) return out; } };
  const toEmail = handle => handle.toLowerCase() + PLAYER_DOMAIN;

  return {
    enabled,
    ready,
    get user() { return user; },
    get isAdmin() { return isAdmin; },
    get role() { return role; },
    get profile() { return profile; },
    onChange: f => listeners.push(f),
    onResume: f => resumeFns.push(f),   // 從背景回來、即時連線接回後要做的事（例如補抓漏掉的訊息）
    get rtPaused() { return paused; },
    _rtPause: rtPause, _rtResume: rtResume,

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
    /* 改密碼（封測帳號第一次登入會被提醒改） */
    get mustChangePw() { return !!(user && user.user_metadata && user.user_metadata.must_change_pw); },
    async changePassword(password) {
      must(await sb.auth.updateUser({ password, data: { must_change_pw: false } }));
      await refresh(); emit();
    },

    /* 活動 */
    /** since：只抓這天之後（或還沒結束）的活動；before：只抓這天之前就結束的舊活動 */
    async listEvents(o = {}) {
      const rows = await allRows(() => {
        let q = sb.from('events').select('id,data').order('id');
        if (o.since) q = q.or(`data->>date.gte.${o.since},data->>endDate.gte.${o.since},data->>date.is.null`);
        if (o.before) q = q.lt('data->>date', o.before).or(`data->>endDate.is.null,data->>endDate.lt.${o.before}`);
        return q;
      });
      return rows.map(r => ({ ...r.data, id: r.id }));
    },
    async getEvent(id) { const r = must(await sb.from('events').select('id,data').eq('id', id).maybeSingle()); return r ? { ...r.data, id: r.id } : null; },
    /** 海報：存成檔案（media/poster/），活動資料裡只放連結 */
    async uploadPoster(dataUrl) {
      const blob = await (await fetch(dataUrl)).blob();
      const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
      const name = `poster/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      must(await sb.storage.from('media').upload(name, blob, { contentType: blob.type || 'image/jpeg', upsert: false }));
      return sb.storage.from('media').getPublicUrl(name).data.publicUrl;
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
    async viewCounts() { return tally('view_counts', null, async () => { const n = {}; (await allRows(() => sb.from('event_views').select('event_id,n'))).forEach(r => (n[r.event_id] = r.n)); return n; }); },
    async bumpView(eid) { must(await sb.rpc('bump_view', { eid })); },
    async bumpClick(eid, k) { must(await sb.rpc('bump_click', { eid, k })); },
    async clickStats() { return tally('click_stats', null, () => allRows(() => sb.from('event_clicks').select('event_id,kind,day,n'))); },

    /* 留言板 */
    async commentCounts() {
      return tally('comment_counts', null, async () => { const n = {}; (await allRows(() => sb.from('comments').select('event_id'))).forEach(r => (n[r.event_id] = (n[r.event_id] || 0) + 1)); return n; });
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
    async listVotes(battleIds) { return battleIds.length ? tally('battle_tally', { ids: battleIds }, () => sb.from('votes').select('battle_id,user_id,choice').in('battle_id', battleIds).then(must)).then(r => (r[0] && 'n' in r[0] ? expand(r, ['battle_id', 'choice']) : r)) : []; },
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
    async playerByHandle(handle) { return must(await sb.from('players').select('user_id,handle,name,title,look,nat,style,job,verified,ig,card,banned,created_at,last_seen').eq('handle', handle).maybeSingle()); },
    async playersByIds(ids) { return ids.length ? must(await sb.from('players').select('user_id,handle,name,title,look,nat,style,job,verified,ig,card,created_at,last_seen').in('user_id', ids)) : []; },

    /* 找玩家：ID（開頭相符，對方沒關閉「可被搜尋」）、地區（對方有在名片公開地區） */
    async searchPlayers(q) {
      const k = q.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (k.length < 2) return [];
      return must(await sb.from('players').select('user_id,handle,name,title,look,nat,style,job,verified,card')
        .ilike('handle', k + '%').eq('banned', false).or('card->>find.is.null,card->>find.neq.false').order('handle').limit(20));
    },
    async regionPlayers(cc, city) {
      let q = sb.from('players').select('user_id,handle,name,title,look,nat,style,job,verified,card').eq('banned', false).eq('card->>rpub', 'true').eq('card->>rc', cc);
      if (city) q = q.eq('card->>rcity', city);
      return must(await q.limit(60));
    },

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
    /* 照片上傳：一律縮到最長 1280px（省空間、省流量），另外存一張小縮圖（_t.webp）給列表用 */
    async uploadForumFile(blob, ext) {
      const base = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      let thumb = null;
      if (/^image\/(png|jpeg|webp)$/.test(blob.type || '')) {
        const big = await shrinkImage(blob, 1280, 0.82); if (big && big.size < blob.size) { blob = big; ext = 'webp'; }
        thumb = await shrinkImage(blob, 420, 0.72);
      }
      const name = `${base}.${ext}`;
      must(await sb.storage.from('forum').upload(name, blob, { contentType: blob.type, upsert: false }));
      if (thumb) await sb.storage.from('forum').upload(`${base}_t.webp`, thumb, { contentType: 'image/webp', upsert: false }).catch(() => {});
      return sb.storage.from('forum').getPublicUrl(name).data.publicUrl;
    },
    /** 列表用的小縮圖：有縮圖就用縮圖，舊照片沒有縮圖就自動改用原圖 */
    thumbImg(url, cls = '') {
      const e = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const th = /\/storage\/v1\/object\/public\/forum\/.+\.(webp|jpe?g|png)$/i.test(url || '') ? url.replace(/\.(webp|jpe?g|png)$/i, '_t.webp') : url;
      return `<img class="${e(cls)}" src="${e(th)}" data-full="${e(url)}" alt="" loading="lazy"${th !== url ? ` onerror="this.onerror=null;this.src=this.dataset.full"` : ''}>`;
    },
    async pollVotes(postId) { return tally('poll_tally', { pid: postId }, () => sb.from('poll_votes').select('user_id,choice').eq('post_id', postId).then(must)).then(r => (r[0] && 'n' in r[0] ? expand(r, ['choice']) : r)); },
    async pollVote(postId, choice) { must(await sb.from('poll_votes').insert({ post_id: postId, choice })); },
    async replyCounts(threads) { if (!threads.length) return {}; return tally('reply_counts', { threads }, async () => { const n = {}; (await allRows(() => sb.from('replies').select('thread').in('thread', threads))).forEach(r => (n[r.thread] = (n[r.thread] || 0) + 1)); return n; }); },
    async listReplies(thread) { return must(await sb.from('replies').select('*').eq('thread', thread).order('created_at').limit(500)); },
    async addReply(thread, text, parent_id) { return must(await sb.from('replies').insert({ thread, text, parent_id: parent_id || null }).select().single()); },
    async deleteReply(id) { must(await sb.from('replies').delete().eq('id', id)); },
    async likesFor(targets) { return targets.length ? tally('like_tally', { targets }, () => sb.from('likes').select('target,user_id').in('target', targets).then(must)).then(r => (r[0] && 'n' in r[0] ? expand(r, ['target']) : r)) : []; },
    async like(target) { must(await sb.from('likes').insert({ target })); },
    async unlike(target) { must(await sb.from('likes').delete().eq('target', target).eq('user_id', user.id)); },

    /* Battle：置頂問題、MP4 上傳 */
    async setPinnedQ(id, pinned_q) { must(await sb.from('battles').update({ pinned_q: pinned_q || null }).eq('id', id)); },
    async uploadVideo(file, onProgress) {
      const name = `battle/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
      must(await sb.storage.from('videos').upload(name, file, { contentType: 'video/mp4', upsert: false }));
      return sb.storage.from('videos').getPublicUrl(name).data.publicUrl;
    },

    /* 上線時間 */
    async touchSeen() { must(await sb.rpc('touch_seen')); },

    /* 私訊圖片（私人空間，用暫時網址顯示） */
    async uploadDMImage(to, blob) {
      const name = `${user.id}/${to}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
      must(await sb.storage.from('dm-images').upload(name, blob, { contentType: blob.type || 'image/webp', upsert: false }));
      return name;
    },
    async dmImageUrl(path) { const r = must(await sb.storage.from('dm-images').createSignedUrl(path, 3600)); return r.signedUrl; },

    /* 贊助商廣告 */
    async sponsors() { return must(await sb.from('sponsors').select('*').order('created_at', { ascending: false })); },
    async saveSponsor(row) { return row.id ? must(await sb.from('sponsors').update(row).eq('id', row.id).select().single()) : must(await sb.from('sponsors').insert(row).select().single()); },
    async deleteSponsor(id) { must(await sb.from('sponsors').delete().eq('id', id)); },
    async bumpSponsor(sid, k) { must(await sb.rpc('bump_sponsor', { sid, k })); },
    async sponsorStats() { return must(await sb.from('sponsor_stats').select('*')); },
    async uploadSponsorImage(file) {
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      must(await sb.storage.from('sponsors').upload(name, file, { contentType: file.type, upsert: false }));
      return sb.storage.from('sponsors').getPublicUrl(name).data.publicUrl;
    },

    /* 公告欄 */
    async notices() { return must(await sb.from('notices').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50)); },
    async saveNotice(row) { return row.id ? must(await sb.from('notices').update(row).eq('id', row.id).select().single()) : must(await sb.from('notices').insert(row).select().single()); },
    async deleteNotice(id) { must(await sb.from('notices').delete().eq('id', id)); },
    async uploadMedia(folder, file) {
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const name = `${folder === 'crew' ? 'crew/' + user.id : 'notice'}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      must(await sb.storage.from('media').upload(name, file, { contentType: file.type, upsert: false }));
      return sb.storage.from('media').getPublicUrl(name).data.publicUrl;
    },

    /* 舞團 */
    /* 街舞教室 */
    async studios() { return must(await sb.from('studios').select('*').order('created_at')); },
    async studio(id) { return must(await sb.from('studios').select('*').eq('id', id).maybeSingle()); },
    async saveStudio(row) { const { id, ...d } = row; return id ? must(await sb.from('studios').update(d).eq('id', id).select().single()) : must(await sb.from('studios').insert(d).select().single()); },
    async deleteStudio(id) { must(await sb.from('studios').delete().eq('id', id)); },
    async studioPosts(id) { return must(await sb.from('studio_posts').select('*').eq('studio_id', id).order('created_at', { ascending: false }).limit(200)); },
    async upcomingCourses() { return must(await sb.from('studio_posts').select('*').in('kind', ['course', 'special']).gte('date', new Date(Date.now() - 864e5).toISOString().slice(0, 10)).order('date').limit(200)); },
    async saveStudioPost(row) { const { id, ...d } = row; return id ? must(await sb.from('studio_posts').update(d).eq('id', id).select().single()) : must(await sb.from('studio_posts').insert(d).select().single()); },
    async deleteStudioPost(id) { must(await sb.from('studio_posts').delete().eq('id', id)); },
    /* 揪練舞組隊 */
    async parties() { return must(await sb.from('parties').select('*').gte('meet_at', new Date(Date.now() - 3 * 3600e3).toISOString()).order('meet_at').limit(300)); },
    async party(id) { return must(await sb.from('parties').select('*').eq('id', id).maybeSingle()); },
    async partyMembers(ids) { return ids.length ? must(await sb.from('party_members').select('*').in('party_id', ids)) : []; },
    async myPartyIds() { return user ? must(await sb.from('party_members').select('party_id').eq('user_id', user.id)).map(r => r.party_id) : []; },
    async saveParty(row) { const { id, ...d } = row; return id ? must(await sb.from('parties').update(d).eq('id', id).select().single()) : must(await sb.from('parties').insert(d).select().single()); },
    async deleteParty(id) { must(await sb.from('parties').delete().eq('id', id)); },
    /* 每日一推 */
    async dailyPick(day) { return must(await sb.from('daily_picks').select('*').eq('day', day).maybeSingle()); },
    async dailyPicks() { return must(await sb.from('daily_picks').select('*').order('day', { ascending: false }).limit(60)); },
    async saveDailyPick(row) { must(await sb.from('daily_picks').upsert(row)); },
    async deleteDailyPick(day) { must(await sb.from('daily_picks').delete().eq('day', day)); },

    async crews() { return must(await sb.from('crews').select('*').order('created_at')); },
    async crew(id) { return must(await sb.from('crews').select('*').eq('id', id).maybeSingle()); },
    async crewMembers(id) { return must(await sb.from('crew_members').select('*').eq('crew_id', id)); },
    async crewCounts() { return tally('crew_counts', null, async () => { const n = {}; (await allRows(() => sb.from('crew_members').select('crew_id'))).forEach(r => (n[r.crew_id] = (n[r.crew_id] || 0) + 1)); return n; }); },
    async crewLabels(id) { return must(await sb.from('crew_labels').select('*').eq('crew_id', id).order('id')); },
    async crewOf(uid) { return must(await sb.from('crew_members').select('*').eq('user_id', uid).maybeSingle()); },
    async crewRequests(id) { return must(await sb.from('crew_requests').select('*').eq('crew_id', id).eq('status', 'pending').order('created_at')); },
    async myCrewRequests() { return must(await sb.from('crew_requests').select('*').eq('user_id', user.id)); },
    async pendingCrews() { return must(await sb.from('crews').select('*').eq('status', 'pending').order('created_at')); },
    async crewRpc(fn, args) { return must(await sb.rpc(fn, args || {})); },
    async crewInvites() { return must(await sb.from('crew_invites').select('*').eq('to_user', user.id).eq('status', 'pending')); },
    async crewCodes(id) { return must(await sb.from('crew_codes').select('*').eq('crew_id', id).order('created_at', { ascending: false })); },

    /* 經驗值系統（全部在伺服器端計算） */
    async rpc(fn, args) { return must(await sb.rpc(fn, args || {})); },
    async logAct(k, r) { must(await sb.rpc('log_act', { k, r: String(r) })); },
    /* 副本島 */
    async dungeons() { return must(await sb.from('dungeons').select('*')); },
    async saveDungeon(row) { must(await sb.from('dungeons').upsert(row)); },
    async dungeonLinks() { return must(await sb.from('dungeon_links').select('*')); },
    async saveDungeonLink(row) { must(await sb.from('dungeon_links').upsert(row)); },
    async deleteDungeonLink(did, athlete) { must(await sb.from('dungeon_links').delete().eq('dungeon_id', did).eq('athlete', athlete)); },
    async myDungeonCheers(did, year) { return must(await sb.from('dungeon_cheers').select('division,athlete').eq('dungeon_id', did).eq('year', year).eq('user_id', user.id)); },
    async dungeonCheer(did, year, division, athlete) { must(await sb.from('dungeon_cheers').upsert({ dungeon_id: did, year, division, athlete, user_id: user.id }, { onConflict: 'dungeon_id,year,division,user_id' })); },
    /* 稱號收集：球鞋、身分申請 */
    async mySneakers() { return must(await sb.from('sneakers').select('sid,n').eq('user_id', user.id)); },
    async myRoleApps() { return must(await sb.from('role_apps').select('role,status,created_at').eq('user_id', user.id)); },
    async roleApply(role, note) { must(await sb.from('role_apps').insert({ role, note })); },
    /* 節慶活動 */
    async myPractice(year) { return must(await sb.from('fest_practice').select('day').eq('user_id', user.id).gte('day', year + '-01-01').lte('day', year + '-12-31')); },
    async logPractice() { must(await sb.from('fest_practice').insert({})); },
    async dancedayPins(year) { return must(await sb.from('danceday_pins').select('user_id,author,country,city,lat,lon').eq('year', year).limit(5000)); },
    async dancedayPin(row) { must(await sb.from('danceday_pins').insert(row)); },
    async myDungeonPredictions(did, year) { return must(await sb.from('dungeon_predictions').select('division,athlete').eq('dungeon_id', did).eq('year', year).eq('user_id', user.id)); },
    async dungeonPredict(did, year, division, athlete) { must(await sb.from('dungeon_predictions').upsert({ dungeon_id: did, year, division, athlete, user_id: user.id }, { onConflict: 'dungeon_id,year,division,user_id' })); },

    /* 每週動作接力 */
    async moveChallenge(week) { return must(await sb.from('move_challenges').select('*').eq('week', week).maybeSingle()); },
    async setMoveChallenge(row) { must(await sb.from('move_challenges').upsert(row)); },
    async moveEntries(week) { return must(await sb.from('move_entries').select('*').eq('week', week).order('created_at')); },
    async moveVotes(week) { return tally('move_tally', { pweek: week }, () => sb.from('move_votes').select('entry_id,user_id').eq('week', week).then(must)).then(r => (r[0] && 'n' in r[0] ? expand(r, ['entry_id']) : r)); },
    async moveLast() { return must(await sb.from('move_results').select('*').order('week', { ascending: false }).limit(1).maybeSingle()); },
    async addMoveEntry(row) { return must(await sb.from('move_entries').insert(row).select().single()); },
    async moveVote(entry_id) { must(await sb.from('move_votes').insert({ entry_id })); },
    async deleteMoveEntry(id) { must(await sb.from('move_entries').delete().eq('id', id)); },
    async hideMoveEntry(id) { must(await sb.from('move_entries').update({ hidden: true }).eq('id', id)); },

    /* 第五批：師徒、舞團 PK */
    async myMentorships() { return user ? must(await sb.from('mentorships').select('*').or(`mentor.eq.${user.id},apprentice.eq.${user.id}`).order('created_at', { ascending: false })) : []; },
    async mentorProfile(uid) { return must(await sb.from('mentor_profiles').select('*').eq('user_id', uid).maybeSingle()); },
    async crewPK(cid) { return must(await sb.from('crew_pk').select('*').or(`crew_a.eq.${cid},crew_b.eq.${cid}`).order('week', { ascending: false }).limit(4)); },

    /* 第四批・便民 */
    async spots() { return must(await sb.from('practice_spots').select('*').order('created_at', { ascending: false }).limit(500)); },
    async saveSpot(row) { const { id, ...d } = row; return id ? must(await sb.from('practice_spots').update(d).eq('id', id).select().single()) : must(await sb.from('practice_spots').insert(d).select().single()); },
    async deleteSpot(id) { must(await sb.from('practice_spots').delete().eq('id', id)); },
    async reviewSpot(id, status) { must(await sb.from('practice_spots').update({ status }).eq('id', id)); },
    async spotReports(ids) { return ids.length ? must(await sb.from('spot_reports').select('*').in('spot_id', ids).gte('created_at', new Date(Date.now() - 60 * 864e5).toISOString()).order('created_at', { ascending: false }).limit(1000)) : []; },
    async reportSpot(spot_id, ok, note) { must(await sb.from('spot_reports').insert({ spot_id, ok, note: note || null })); },
    async marketItems() { return must(await sb.from('market_items').select('*').order('created_at', { ascending: false }).limit(300)); },
    async saveMarket(row) { const { id, ...d } = row; return id ? must(await sb.from('market_items').update(d).eq('id', id).select().single()) : must(await sb.from('market_items').insert(d).select().single()); },
    async deleteMarket(id) { must(await sb.from('market_items').delete().eq('id', id)); },

    /* 第三批・互動 */
    async goingCounts() { return must(await sb.rpc('going_counts')); },
    async friendsGoing() { return must(await sb.rpc('my_friends_going')); },
    async myGoing() { return must(await sb.from('going').select('event_id').eq('user_id', user.id)).map(r => r.event_id); },
    async setGoing(event_id, on) { if (on) must(await sb.from('going').insert({ event_id })); else must(await sb.from('going').delete().eq('user_id', user.id).eq('event_id', event_id)); },
    async likePlayer(to_user) { must(await sb.from('player_likes').insert({ to_user })); },
    async likedToday() { return must(await sb.from('player_likes').select('to_user').eq('from_user', user.id).eq('day', new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10))).map(r => r.to_user); },
    async playerLikeCount(uid) { return must(await sb.rpc('player_like_count', { uid })); },
    async reliableCount(uid) { return must(await sb.rpc('reliable_count', { uid })); },
    async rateTeammate(party_id, to_user) { must(await sb.from('party_ratings').insert({ party_id, to_user })); },
    async myRatings(party_id) { return must(await sb.from('party_ratings').select('to_user').eq('party_id', party_id).eq('from_user', user.id)).map(r => r.to_user); },
    async photoCounts() { return must(await sb.rpc('photo_counts')); },
    async eventPhotos(event_id) { return must(await sb.from('event_photos').select('*').eq('event_id', event_id).order('created_at', { ascending: false }).limit(200)); },
    async addEventPhoto(event_id, url, caption) { return must(await sb.from('event_photos').insert({ event_id, url, caption: caption || null }).select().single()); },
    async deleteEventPhoto(id) { must(await sb.from('event_photos').delete().eq('id', id)); },
    async hideEventPhoto(id) { must(await sb.from('event_photos').update({ hidden: true }).eq('id', id)); },
    async qaAccept(pid, rid) { return must(await sb.rpc('qa_accept', { pid, rid })); },

    async newbieStatus() { return must(await sb.rpc('newbie_status')); },
    async newbieClaim(s) { return must(await sb.rpc('newbie_claim', { s })); },
    async myQuests() { return must(await sb.rpc('my_quests')); },
    async claimQuest(q) { return must(await sb.rpc('claim_quest', { q })); },
    async myWeekly() { return must(await sb.rpc('my_weekly')); },
    async claimWeekly() { return must(await sb.rpc('claim_weekly')); },
    async checkAch() { return must(await sb.rpc('check_achievements')); },
    async achievementsOf(uid) { return must(await sb.from('achievements').select('id,created_at').eq('user_id', uid)); },
    async xpLog(limit = 30) { return must(await sb.from('xp_log').select('kind,ref,amount,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit)); },
    async pvpReport(room, opp, winner) { return must(await sb.rpc('pvp_report', { p_room: room, opp, winner })); },
    async season() { return must(await sb.rpc('season_now')); },
    async pvpTop(season, n = 20) { return must(await sb.from('pvp_season').select('*').eq('season', season).order('points', { ascending: false }).limit(n)); },
    async pvpMine(season) { return must(await sb.from('pvp_season').select('*').eq('season', season).eq('user_id', user.id).maybeSingle()); },
    async crewXp(cid) { return must(await sb.rpc('crew_xp', { cid })); },
    async crewWeekRank() { return must(await sb.rpc('crew_week_rank')); },
    async crewWeekSettle() { must(await sb.rpc('crew_week_settle')); },
    async checkinOnsite(eid, lat, lon) { return must(await sb.rpc('checkin_onsite', { eid, p_lat: lat, p_lon: lon })); },
    async reportEvent(event_id, text) { must(await sb.from('event_reports').insert({ event_id, text })); },
    async eventReports() { return must(await sb.from('event_reports').select('*').eq('status', 'pending').order('created_at')); },
    async reviewEventReport(rid, ok) { must(await sb.rpc('review_event_report', { rid, ok })); },
    async saveEventGeo(row) { must(await sb.from('event_geo').upsert(row)); },

    /* 即時頻道（線上 Cypher 舞池） */
    channel(name, key) { return sb.channel(name, { config: { presence: { key }, broadcast: { self: true } } }); },
    removeChannel(ch) { sb.removeChannel(ch); },
    get uid() { return user ? user.id : null; },
    get skins() { return skins; },
    get canEnter() { return isAdmin || gatePass; },

    /* 即時更新：table = 'messages' | 'comments' | 'announcements' */
    subscribe(table, cb) {
      const tables = [].concat(table);   // 可以一次訂好幾張表，共用一個頻道
      let ch = sb.channel('rt-' + tables.join('-') + '-' + Math.random().toString(36).slice(2, 7));
      tables.forEach(tb => { ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, payload => cb(payload)); });
      ch.subscribe();
      return () => sb.removeChannel(ch);
    }
  };
})();
