/* =========================================================
 * 第五批：論壇（玩家發文 → 管理員審核）、討論串（可以回覆留言、按讚）、
 * Battle 討論區＋管理員置頂問題、依舞風推薦活動
 * ========================================================= */
(() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const cloud = () => Backend.enabled;
  const logged = () => cloud() && !!Backend.uid && !!Player.me;
  const ago = iso => {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return t('fo_now'); if (s < 3600) return t('fo_min', { n: Math.floor(s / 60) });
    if (s < 86400) return t('fo_hr', { n: Math.floor(s / 3600) }); if (s < 86400 * 30) return t('fo_day', { n: Math.floor(s / 86400) });
    return new Date(iso).toLocaleDateString();
  };
  const errMsg = x => {
    const m = String(x && x.message || x);
    if (/spam/.test(m)) return t('fr_spam'); if (/too fast/.test(m)) return t('fr_fast'); if (/too many/.test(m)) return t('fo_too_many');
    if (/need character/.test(m)) return t('cd_login'); return m;
  };
  const headIcon = look => { try { const c = Avatar.render(look || Avatar.DEFAULT, 0, 2); c.className = 'fr-head'; return c; } catch (x) { return document.createElement('span'); } };
  const byline = a => `<b class="nm">${Player.nameHTML(a || {})}</b>${a && a.title ? Titles.html(a.title) : ''}`;

  /* =========================================================
   * 討論串：回覆可以再被回覆（像社群留言），可以按讚
   * mount(el, 'p:12' 或 'b:3')
   * ========================================================= */
  function mountThread(el, thread) {
    el.innerHTML = `<div class="thr"><form class="thr-new"></form><ul class="thr-list"><li class="note">…</li></ul></div>`;
    const list = el.querySelector('.thr-list'), form = el.querySelector('.thr-new');
    let rows = [], likes = [];
    const composer = (f, parent, ph) => {
      if (!logged()) { f.innerHTML = `<button type="button" class="btn sm pink lg">${t('fo_login')}</button>`; f.querySelector('.lg').onclick = () => Player.prompt(); return; }
      f.innerHTML = `<div class="chat-input"><button type="button" class="btn sm emo-btn" aria-label="emoji">😺</button><input class="input sm" maxlength="1000" placeholder="${esc(ph || t('fo_reply_ph'))}"><button class="btn sm yellow">${t('fo_send')}</button></div>`;
      const input = f.querySelector('input');
      let pick = null;
      f.querySelector('.emo-btn').onclick = () => { if (pick) { pick.remove(); pick = null; return; } pick = Emoji.picker(c => { input.value += c; input.focus(); }); f.appendChild(pick); };
      f.onsubmit = async ev => {
        ev.preventDefault();
        const text = input.value.trim(); if (!text) return;
        input.disabled = true;
        try { await Backend.addReply(thread, text, parent); input.value = ''; SFX.play('blip'); if (pick) { pick.remove(); pick = null; } await load(); if (parent) f.remove(); }
        catch (x) { SFX.play('error'); toast(errMsg(x), '✕'); }
        input.disabled = false;
      };
    };
    composer(form, null, t('fo_reply_ph'));
    const rootOf = r => { let x = r; const seen = new Set(); while (x && x.parent_id && !seen.has(x.id)) { seen.add(x.id); x = rows.find(y => y.id === x.parent_id) || null; } return x || r; };
    const item = (r, child) => {
      const tgt = 'r:' + r.id, lk = likes.filter(l => l.target === tgt), mine = lk.some(l => l.user_id === Backend.uid);
      const par = child && r.parent_id && rows.find(y => y.id === r.parent_id);
      const canDel = logged() && (r.user_id === Backend.uid || Backend.isAdmin);
      return `<li class="thr-item ${child ? 'child' : ''}" data-id="${r.id}"><span class="thr-ic"></span><div class="thr-b">
        <div class="thr-h">${byline(r.author)}<span class="tm">${ago(r.created_at)}</span></div>
        <div class="thr-t">${par && par.parent_id ? `<span class="thr-at">@${esc((par.author || {}).name || '')}</span> ` : ''}${Emoji.toHTML(r.text)}</div><div class="utr-slot" data-utr-src="${esc(r.text)}"></div>
        <div class="thr-a"><button class="lk ${mine ? 'on' : ''}" data-t="${tgt}">❤ ${lk.length || ''}</button><button class="rp-b">↩ ${t('fo_reply')}</button>${canDel ? `<button class="dl">${t('b_del')}</button>` : ''}</div>
        <form class="thr-sub"></form></div></li>`;
    };
    const draw = () => {
      const roots = rows.filter(r => !r.parent_id);
      list.innerHTML = roots.length ? roots.map(r => {
        const kids = rows.filter(c => c.parent_id && rootOf(c).id === r.id);
        return item(r) + (kids.length ? `<li class="thr-kids"><ul>${kids.map(k => item(k, true)).join('')}</ul></li>` : '');
      }).join('') : `<li class="note">${t('fo_no_reply')}</li>`;
      list.querySelectorAll('.thr-item').forEach(li => { const r = rows.find(x => x.id === +li.dataset.id); if (r) li.querySelector('.thr-ic').appendChild(headIcon((r.author || {}).look)); });
    };
    const load = async () => {
      try { rows = await Backend.listReplies(thread); likes = await Backend.likesFor(rows.map(r => 'r:' + r.id)); } catch (x) { rows = []; }
      draw(); el.dispatchEvent(new CustomEvent('thr-count', { detail: rows.length }));
    };
    list.onclick = async e => {
      const li = e.target.closest('.thr-item'); if (!li) return;
      const id = +li.dataset.id;
      if (e.target.closest('.lk')) {
        if (!logged()) return Player.prompt();
        const b = e.target.closest('.lk'), on = b.classList.contains('on');
        try { on ? await Backend.unlike(b.dataset.t) : await Backend.like(b.dataset.t); if (!on) { SFX.play('coin'); sparkle(e.clientX, e.clientY, 6); } likes = await Backend.likesFor(rows.map(r => 'r:' + r.id)); draw(); } catch (x) { toast(errMsg(x), '✕'); }
      } else if (e.target.closest('.rp-b')) {
        list.querySelectorAll('.thr-sub').forEach(f => (f.innerHTML = ''));
        const f = li.querySelector('.thr-sub'); const r = rows.find(x => x.id === id);
        composer(f, id, t('fo_reply_to', { n: (r.author || {}).name || '' }));
        const inp = f.querySelector('input'); if (inp) inp.focus();
      } else if (e.target.closest('.dl')) {
        if (!confirm(t('del_title'))) return;
        try { await Backend.deleteReply(id); await load(); } catch (x) { toast(errMsg(x), '✕'); }
      }
    };
    load();
    // 即時更新
    let off = null;
    if (cloud()) off = Backend.subscribeTable('replies', `thread=eq.${thread}`, () => { if (!el.isConnected) { off && off(); return; } load(); });
    const obs = new MutationObserver(() => { if (!el.isConnected) { obs.disconnect(); off && off(); } });
    obs.observe(document.body, { childList: true, subtree: true });
    return { reload: load };
  }
  A.mountThread = mountThread;
  // 換頁動畫一開始就先抓下一頁要的資料
  const PF = {};
  A.prefetch = A.prefetch || {};
  A.prefetchKeep = (key, fn) => { PF[key] = { t: Date.now(), p: fn().catch(e => { throw e; }) }; PF[key].p.catch(() => {}); return PF[key].p; };
  A.prefetchTake = (key, fn) => { const x = PF[key]; delete PF[key]; return x && Date.now() - x.t < 5000 ? x.p : fn(); };
  const forumData = async () => { const posts = await Backend.forumPosts(); const th = posts.map(p => 'p:' + p.id); const [counts, likes] = await Promise.all([Backend.replyCounts(th), Backend.likesFor(th)]); return { posts, counts, likes }; };
  A.prefetch.forum = r => { if (!(r.arg && r.arg[0]) && Backend.enabled) A.prefetchKeep('forum', forumData); };

  /* =========================================================
   * 論壇（#/forum、#/forum/<id>）
   * ========================================================= */
  const CATS = ['chat', 'crew', 'skill', 'event', 'music', 'other'];
  const CAT_IC = { chat: '💬', crew: '👯', skill: '🧠', event: '📅', music: '🎧', other: '📦' };
  const catTag = c => `<span class="tag fo-cat cat-${esc(c)}">${CAT_IC[c] || ''} ${esc(t('fo_cat_' + c))}</span>`;
  const st = { cat: '', sort: 'new' };
  A.crumbs.forum = () => '🗂 ' + t('fo_title');
  A.views.forum = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner');
    stage.appendChild(view);
    if (!cloud()) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    await Backend.ready;
    if (r.arg && r.arg[0]) return postView(inner, +r.arg[0]);
    let posts = [], counts = {}, likes = [];
    try { ({ posts, counts, likes } = await A.prefetchTake('forum', forumData)); } catch (x) { inner.innerHTML = `<p class="note">${esc(x.message)}</p>`; return; }
    const draw = () => {
      const lc = id => likes.filter(l => l.target === 'p:' + id).length, rc = id => counts['p:' + id] || 0;
      const mine = posts.filter(p => p.status !== 'approved' && p.user_id === Backend.uid);
      let list = posts.filter(p => p.status === 'approved' && (!st.cat || p.category === st.cat));
      if (st.sort === 'hot') list = list.slice().sort((a, b) => (b.pinned - a.pinned) || (lc(b.id) * 2 + rc(b.id)) - (lc(a.id) * 2 + rc(a.id)));
      const row = p => `<a class="fo-row ${p.pinned ? 'pinned' : ''}" href="#/forum/${p.id}">
        <span class="fo-ic"></span>
        <span class="fo-main"><span class="fo-top">${p.pinned ? `<span class="tag pin">📌 ${t('fo_pinned')}</span>` : ''}${catTag(p.category)}${p.status === 'pending' ? `<span class="tag wait">⏳ ${t('fo_pending')}</span>` : p.status === 'rejected' ? `<span class="tag rej">${t('fo_rejected')}</span>` : ''}</span>
          <b class="fo-tt">${esc(p.title)}</b><span class="fo-flags">${(p.media || []).some(x => x.type === 'image') ? '🖼' : ''}${(p.media || []).some(x => x.type !== 'image') ? '🎬' : ''}${p.poll ? '📊' : ''}</span><small>${esc((p.author || {}).name || '')} · ${ago(p.created_at)}</small></span>
        <span class="fo-n"><span>💬 ${rc(p.id)}</span><span>❤ ${lc(p.id)}</span></span></a>`;
      inner.innerHTML = `<div class="win">${UI.winHTML('🗂 ' + t('fo_title'), 'teal', false)}<div class="win-body">
          <p>${t('fo_intro')}</p>
          <div class="fo-bar"><div class="chips">${['', ...CATS].map(c => `<button class="chip ${st.cat === c ? 'on' : ''}" data-cat="${c}">${c ? CAT_IC[c] + ' ' + t('fo_cat_' + c) : t('fo_all')}</button>`).join('')}</div>
            <span class="grow"></span><select class="input sm fo-sort"><option value="new">${t('fo_sort_new')}</option><option value="hot" ${st.sort === 'hot' ? 'selected' : ''}>${t('fo_sort_hot')}</option></select>
            <button class="btn pink new">✎ ${t('fo_new')}</button></div>
        </div></div>
        ${mine.length ? `<div class="list-head">${t('fo_mine')}</div><div class="fo-list">${mine.map(row).join('')}</div>` : ''}
        <div class="fo-list">${list.map(row).join('') || `<p class="note">${t('fo_empty')}</p>`}</div>`;
      inner.querySelectorAll('.fo-row').forEach(a => { const p = posts.find(x => '#/forum/' + x.id === a.getAttribute('href')); if (p) a.querySelector('.fo-ic').appendChild(headIcon((p.author || {}).look)); });
      inner.querySelector('.fo-sort').onchange = e => { st.sort = e.target.value; draw(); };
      inner.querySelector('.chips').onclick = e => { const b = e.target.closest('[data-cat]'); if (b) { st.cat = b.dataset.cat; SFX.play('select'); draw(); } };
      inner.querySelector('.new').onclick = () => openNewPost(async () => { posts = await Backend.forumPosts(); draw(); });
    };
    draw();
  };

  /* ---------- 附件（照片 / 影片 / YouTube）和投票 ---------- */
  const ytId = u => { const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(u || ''); return m ? m[1] : null; };
  const safeMedia = u => /^https:\/\//.test(u || '');
  function mediaHTML(media) {
    if (!Array.isArray(media) || !media.length) return '';
    const imgs = media.filter(x => x.type === 'image' && safeMedia(x.url)), vid = media.find(x => (x.type === 'video' || x.type === 'youtube') && safeMedia(x.url));
    return `<div class="fo-media">${vid ? (vid.type === 'youtube' && ytId(vid.url) ? `<div class="fo-video"><iframe src="https://www.youtube.com/embed/${esc(ytId(vid.url))}" title="YouTube" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>` : vid.type === 'video' ? `<div class="fo-video"><video src="${esc(vid.url)}" controls playsinline preload="metadata"></video></div>` : '') : ''}
      ${imgs.length ? `<div class="fo-imgs n${imgs.length}">${imgs.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}</div>`;
  }
  function pollHTML(post, votes) {
    const pl = post.poll; if (!pl || !Array.isArray(pl.options)) return '';
    const mine = votes.find(v => v.user_id === Backend.uid), total = votes.length, show = !!mine || post.status !== 'approved';
    return `<div class="fo-poll" data-post="${post.id}"><div class="fo-pq">📊 ${esc(pl.q)}</div>${pl.options.map((o, i) => {
      const n = votes.filter(v => v.choice === i).length, pc = total ? Math.round((n / total) * 100) : 0;
      return show ? `<div class="fo-po ${mine && mine.choice === i ? 'mine' : ''}"><span class="fo-pl">${esc(o)}</span><span class="fo-pb"><i style="width:${pc}%"></i></span><b>${pc}%</b></div>`
        : `<button class="fo-po vote" data-c="${i}"><span class="fo-pl">${esc(o)}</span></button>`;
    }).join('')}<small class="note">${t('fo_poll_n', { n: total })}${show && post.status === 'approved' && mine ? ' · ' + t('fo_poll_voted') : ''}</small></div>`;
  }
  // 照片縮成最長 1600px 的 webp（GIF 保留）
  const shrinkImg = file => new Promise((res, rej) => {
    if (file.type === 'image/gif') return file.size <= 5 * 1024 * 1024 ? res(file) : rej(new Error('big'));
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); cv.toBlob(b => (b && b.size <= 5 * 1024 * 1024 ? res(b) : rej(new Error('big'))), 'image/webp', 0.86); };
    img.onerror = () => rej(new Error('bad')); img.src = u;
  });

  function openNewPost(after) {
    if (!logged()) return Player.prompt();
    const body = h(`<form class="form" novalidate>
      <p class="full note">${t('fo_rule')}</p>
      <label class="field"><span>${t('fo_cat')}</span><select class="input" name="cat">${CATS.map(c => `<option value="${c}">${CAT_IC[c]} ${t('fo_cat_' + c)}</option>`).join('')}</select></label>
      <label class="field full"><span>${t('fo_t')} <b>*</b></span><input class="input" name="title" maxlength="80"></label>
      <label class="field full"><span>${t('fo_body')} <b>*</b></span><textarea class="input fo-ta" name="body" maxlength="2000" rows="7"></textarea></label>
      <div class="field full fo-att"><span>📎 ${t('fo_att')}</span>
        <div class="fo-att-btns"><label class="btn sm">🖼 ${t('fo_add_img')}<input type="file" name="imgs" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></label>
          <label class="btn sm">🎬 ${t('fo_add_vid')}<input type="file" name="vid" accept="video/mp4" hidden></label>
          <input class="input sm" name="yt" type="url" placeholder="${esc(t('fo_yt_ph'))}"></div>
        <div class="fo-att-prev"></div><small class="note">${t('fo_att_rule')}</small></div>
      <div class="field full fo-pollf"><label class="chk"><input type="checkbox" name="poll"> 📊 ${t('fo_poll_add')}</label>
        <div class="fo-poll-ed" hidden><input class="input" name="pq" maxlength="100" placeholder="${esc(t('fo_poll_q'))}"><div class="fo-opts"></div><button type="button" class="btn sm add-opt">＋ ${t('fo_poll_more')}</button></div></div>
      <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn pink sub">${t('fo_submit')}</button></div></div></form>`);
    const m = modal({ title: '✎ ' + t('fo_new'), color: 'teal', body, wide: true });
    const E = body.elements, err = body.querySelector('.err'), prev = body.querySelector('.fo-att-prev');
    let imgs = [], vid = null;
    const drawPrev = () => {
      prev.innerHTML = imgs.map((f, i) => `<span class="fo-th"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-ri="${i}">✕</button></span>`).join('') + (vid ? `<span class="fo-th vid">🎬 ${esc(vid.name.slice(0, 18))}<button type="button" data-rv>✕</button></span>` : '');
    };
    prev.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.ri != null) imgs.splice(+b.dataset.ri, 1); if (b.dataset.rv != null) vid = null; drawPrev(); };
    E.imgs.onchange = () => { const fs = [...E.imgs.files].filter(f => /^image\/(png|jpeg|webp|gif)$/.test(f.type)); E.imgs.value = ''; imgs = imgs.concat(fs).slice(0, 4); if (fs.length + imgs.length > 4) toast(t('fo_img_max'), '🖼'); drawPrev(); };
    E.vid.onchange = () => { const f = E.vid.files[0]; E.vid.value = ''; if (!f) return; if (f.type !== 'video/mp4' || f.size > 50 * 1024 * 1024) { toast(t('bt_mp4_bad'), '✕'); return; } vid = f; E.yt.value = ''; drawPrev(); };
    E.yt.oninput = () => { if (E.yt.value.trim()) { vid = null; drawPrev(); } };
    // 投票選項
    const opts = body.querySelector('.fo-opts');
    const addOpt = (v = '') => { if (opts.children.length >= 6) return; opts.appendChild(h(`<div class="fo-opt"><input class="input sm" maxlength="40" placeholder="${esc(t('fo_poll_opt', { n: opts.children.length + 1 }))}" value="${esc(v)}"><button type="button" class="btn sm rm">✕</button></div>`)); };
    addOpt(); addOpt();
    opts.onclick = e => { if (e.target.closest('.rm') && opts.children.length > 2) { e.target.closest('.fo-opt').remove(); [...opts.querySelectorAll('input')].forEach((x, i) => (x.placeholder = t('fo_poll_opt', { n: i + 1 }))); } };
    body.querySelector('.add-opt').onclick = () => addOpt();
    E.poll.onchange = () => { body.querySelector('.fo-poll-ed').hidden = !E.poll.checked; };
    body.onsubmit = async ev => {
      ev.preventDefault();
      const v = k => E[k].value.trim();
      if (v('title').length < 2 || !v('body')) { err.textContent = '✕ ' + t('fo_need'); return; }
      let poll = null;
      if (E.poll.checked) {
        const o = [...opts.querySelectorAll('input')].map(x => x.value.trim()).filter(Boolean);
        if (!v('pq') || o.length < 2) { err.textContent = '✕ ' + t('fo_poll_need'); return; }
        poll = { q: v('pq'), options: o };
      }
      const yt = v('yt'); if (yt && !ytId(yt)) { err.textContent = '✕ ' + t('fo_yt_bad'); return; }
      const btn = body.querySelector('.sub'); btn.disabled = true;
      try {
        const media = [];
        for (let i = 0; i < imgs.length; i++) { btn.textContent = t('fo_uploading', { n: i + 1, t: imgs.length + (vid ? 1 : 0) }); const b = await shrinkImg(imgs[i]); media.push({ type: 'image', url: await Backend.uploadForumFile(b, b.type === 'image/gif' ? 'gif' : 'webp') }); }
        if (vid) { btn.textContent = t('fo_uploading', { n: imgs.length + 1, t: imgs.length + 1 }); media.push({ type: 'video', url: await Backend.uploadForumFile(vid, 'mp4') }); }
        else if (yt) media.unshift({ type: 'youtube', url: yt });
        await Backend.addPost({ category: v('cat'), title: v('title'), body: v('body'), media: media.length ? media : null, poll });
      } catch (x) { SFX.play('error'); btn.disabled = false; btn.textContent = t('fo_submit'); err.textContent = '✕ ' + (/big/.test(x.message) ? t('dm_img_big') : /bad media|bad poll/.test(x.message) ? t('fo_att_bad') : errMsg(x)); return; }
      m.close(); SFX.play('coin');
      npc.say([{ who: 'kailyn', mood: 'thumbs', text: t('fo_sent_k') }, { who: 'choco', mood: 'ok', text: t('fo_sent_c') }]);
      after && after();
    };
  }

  async function postView(inner, id) {
    let p = null, likes = [], votes = [];
    try { [p, likes, votes] = await Promise.all([Backend.forumPost(id), Backend.likesFor(['p:' + id]), Backend.pollVotes(id).catch(() => [])]); } catch (x) {}
    if (!p) { inner.innerHTML = `<p class="note">${t('fo_gone')}</p><a class="btn" href="#/forum">◀ ${t('fo_back')}</a>`; return; }
    const draw = () => {
      const mine = likes.some(l => l.user_id === Backend.uid), own = p.user_id === Backend.uid, adm = Backend.isAdmin;
      inner.innerHTML = `<div class="win fo-post">${UI.winHTML(`${CAT_IC[p.category] || ''} ${esc(p.title)}`, p.pinned ? 'yellow' : 'teal', false)}<div class="win-body">
          <div class="fo-meta"><span class="fo-ic"></span>${byline(p.author)}<span class="tm">${ago(p.created_at)}</span>${catTag(p.category)}${p.pinned ? `<span class="tag pin">📌 ${t('fo_pinned')}</span>` : ''}${p.status !== 'approved' ? `<span class="tag wait">⏳ ${t(p.status === 'pending' ? 'fo_pending' : 'fo_rejected')}</span>` : ''}</div>
          <div class="fo-body" data-utr>${Emoji.toHTML(p.body)}</div>${mediaHTML(p.media)}${pollHTML(p, votes)}
          <div class="btn-row"><a class="btn sm" href="#/forum">◀ ${t('fo_back')}</a><button class="btn sm ${mine ? 'pink' : ''} lk">❤ ${likes.length}</button><span class="grow"></span>
            ${adm && p.status === 'approved' ? `<button class="btn sm yellow pin">📌 ${p.pinned ? t('fo_unpin') : t('fo_pin')}</button>` : ''}
            ${own || adm ? `<button class="btn sm red del">${t('b_del')}</button>` : ''}</div>
        </div></div>
        ${p.status === 'approved' ? `<div class="win">${UI.winHTML('💬 ' + t('fo_replies'), 'blue', false)}<div class="win-body thr-box"></div></div>` : `<p class="note">${t('fo_wait_note')}</p>`}`;
      inner.querySelector('.fo-ic').appendChild(headIcon((p.author || {}).look));
      const box = inner.querySelector('.thr-box'); if (box) mountThread(box, 'p:' + id);
      inner.querySelectorAll('.fo-poll .vote').forEach(b => b.onclick = async () => {
        if (!logged()) return Player.prompt();
        try { await Backend.pollVote(id, +b.dataset.c); SFX.play('coin'); votes = await Backend.pollVotes(id); draw(); } catch (x) { toast(errMsg(x), '✕'); }
      });
      inner.querySelector('.lk').onclick = async e => {
        if (!logged()) return Player.prompt();
        try { mine ? await Backend.unlike('p:' + id) : await Backend.like('p:' + id); if (!mine) { SFX.play('coin'); sparkle(e.clientX, e.clientY, 8); } likes = await Backend.likesFor(['p:' + id]); draw(); } catch (x) { toast(errMsg(x), '✕'); }
      };
      const pin = inner.querySelector('.pin'); if (pin) pin.onclick = async () => { try { await Backend.pinPost(id, !p.pinned); p.pinned = !p.pinned; draw(); } catch (x) { toast(errMsg(x), '✕'); } };
      const del = inner.querySelector('.del'); if (del) del.onclick = async () => { if (!confirm(t('del_title'))) return; try { await Backend.deletePost(id); A.nav('#/forum'); } catch (x) { toast(errMsg(x), '✕'); } };
    };
    draw();
  }

  /* 後台：論壇審核 */
  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'forum', label: () => '🗂 ' + t('fo_review'),
    draw: async (pane, fail) => {
      let rows = []; try { rows = await Backend.pendingPosts(); } catch (x) { return fail(x); }
      pane.innerHTML = rows.length ? '' : `<p class="note">${t('adm_none')}</p>`;
      rows.forEach(p => {
        const el = h(`<div class="fo-review"><div class="fo-meta">${catTag(p.category)}<b>${esc((p.author || {}).name || '')}</b> <span class="tag">@${esc((p.author || {}).handle || '')}</span><span class="tm">${ago(p.created_at)}</span></div>
          <h4>${esc(p.title)}</h4><div class="fo-body">${Emoji.toHTML(p.body)}</div>${mediaHTML(p.media)}${pollHTML(p, [])}
          <div class="btn-row"><button class="btn sm green ok">✓ ${t('adm_approve')}</button><button class="btn sm red no">✕ ${t('adm_reject')}</button></div></div>`);
        el.querySelector('.ok').onclick = async () => { try { await Backend.reviewPost(p.id, 'approved'); SFX.play('fanfare'); toast(t('adm_done'), '✔'); el.remove(); } catch (x) { fail(x); } };
        el.querySelector('.no').onclick = async () => { try { await Backend.reviewPost(p.id, 'rejected'); toast(t('adm_done'), '✕'); el.remove(); } catch (x) { fail(x); } };
        pane.appendChild(el);
      });
    }
  });

  /* =========================================================
   * Battle：置頂問題 + 討論區（features3 的 Battle 卡片會呼叫這兩個）
   * ========================================================= */
  A.battleExtras = b => `<div class="bt-talk" data-b="${b.id}">
      ${b.pinned_q ? `<div class="bt-q"><span class="tag pin">📌 ${t('bt_q')}</span><b>${esc(b.pinned_q)}</b></div>` : ''}
      <div class="btn-row"><button class="btn sm yellow bt-open">💬 ${t('bt_talk')} <span class="bt-n" data-th="b:${b.id}"></span></button>${Backend.isAdmin ? `<button class="btn sm bt-setq">📌 ${t('bt_setq')}</button>` : ''}</div>
      <div class="bt-thr" hidden></div></div>`;
  A.battleMount = (root, battles) => {
    Backend.replyCounts(battles.map(b => 'b:' + b.id)).then(n => root.querySelectorAll('[data-th]').forEach(x => (x.textContent = n[x.dataset.th] ? `(${n[x.dataset.th]})` : ''))).catch(() => {});
    root.querySelectorAll('.bt-talk').forEach(box => {
      const id = +box.dataset.b, b = battles.find(x => x.id === id);
      box.querySelector('.bt-open').onclick = () => {
        const thr = box.querySelector('.bt-thr'); thr.hidden = !thr.hidden; SFX.play('select');
        if (!thr.hidden && !thr.dataset.on) { thr.dataset.on = 1; mountThread(thr, 'b:' + id); thr.addEventListener('thr-count', e => { const n = box.querySelector('.bt-n'); if (n) n.textContent = e.detail ? `(${e.detail})` : ''; }); }
      };
      const sq = box.querySelector('.bt-setq');
      if (sq) sq.onclick = async () => {
        const q = window.prompt(t('bt_setq_p'), (b && b.pinned_q) || ''); if (q === null) return;
        try { await Backend.setPinnedQ(id, q.trim().slice(0, 200)); if (b) b.pinned_q = q.trim(); toast(t('adm_done'), '📌'); A.render(true); } catch (x) { toast(errMsg(x), '✕'); }
      };
    });
  };

  /* =========================================================
   * 依舞風推薦活動：我的舞風、收藏 / 打卡過的舞風、國籍、時間接近、報名中
   * ========================================================= */
  A.recommend = (n = 4) => {
    const me = Player.me; if (!me) return [];
    const today = A.todayStr(), favStyles = {};
    const S = A.socialState || {};
    try {
      const ids = new Set([...(S.favs || []), ...((S.checks && [...S.checks.keys()]) || [])]);
      Store.all().filter(e => ids.has(e.id)).forEach(e => (e.styles || []).forEach(s => (favStyles[s] = (favStyles[s] || 0) + 1)));
    } catch (x) {}
    const days = e => Math.round((new Date(e.date + 'T00:00') - new Date(today + 'T00:00')) / 864e5);
    return Store.all().filter(e => (e.endDate || e.date) >= today && !(S.favs && S.favs.has && S.favs.has(e.id))).map(e => {
      let score = 0; const why = [];
      if (me.style && (e.styles || []).includes(me.style)) { score += 4; why.push(t('rc_style', { s: me.style })); }
      else if ((e.styles || []).includes('All Style')) { score += 1; }
      const fs = (e.styles || []).reduce((s, x) => s + (favStyles[x] || 0), 0);
      if (fs) { score += Math.min(3, fs); if (!why.length) why.push(t('rc_like')); }
      if (me.nat && e.country === me.nat) { score += 2; why.push(t('rc_home')); }
      const d = days(e);
      if (d <= 14) { score += 2; why.push(t('rc_soon')); } else if (d <= 45) score += 1;
      if (e.regEnd && e.regEnd >= today && (!e.regStart || e.regStart <= today)) { score += 1; why.push(t('rc_reg')); }
      return { e, score, why };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.e.date.localeCompare(b.e.date)).slice(0, n);
  };
  A.recommendHTML = () => {
    const recs = A.recommend(4); if (!recs.length) return '';
    const today = A.todayStr();
    return `<div class="win">${UI.winHTML('✨ ' + t('rc_title'), 'yellow', false)}<div class="win-body">
      <p class="note">${t('rc_intro', { s: esc(Player.me.style || '') })}</p>
      <div class="cards">${recs.map((r, i) => `<div class="rc-item"><div class="rc-why">${r.why.map(w => `<span class="tag">${esc(w)}</span>`).join('')}</div>${A.cardHTML(r.e, i, today, Store.canEdit(), { place: true })}</div>`).join('')}</div></div></div>`;
  };

})();
