/* =========================================================
 * 聊天室：畫面下方可展開，分「世界頻道 / 台灣頻道」
 * - 世界頻道自動翻譯成你的語言
 * - 管理員設定的官方快訊會定時出現（黃色）
 * ========================================================= */
window.Chat = (() => {
  const { h, esc, toast } = UI;
  const CHANNELS = [['world', '🌏'], ['tw', '🇹🇼']];
  let el, list, form, input, cur = 'world', open = false, autoTr = true, ann = [], annIdx = 0, annTimer = null;
  const cache = { world: [], tw: [] };
  const unread = { world: 0, tw: 0 };
  try { autoTr = localStorage.getItem('danceIsland.autoTr') !== 'off'; } catch (e) {}

  const timeStr = iso => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  // 聊天室裡的小頭像（裁出角色的頭）
  function headIcon(look) {
    if (look && Avatar.SKINS[look.special]) {           // 本人造型：用專屬頭像
      const img = new Image(); img.className = 'head-ico k-ico'; img.alt = look.special; img.src = Avatar.SKINS[look.special].head; return img;
    }
    const src = Avatar.render(look || Avatar.DEFAULT, 0, 1);
    const c = document.createElement('canvas');
    c.width = 34; c.height = 24; c.className = 'head-ico';
    c.getContext('2d').drawImage(src, 0, 0, 34, 24, 0, 0, 34, 24);
    return c;
  }

  function msgEl(m) {
    if (m.official) {
      const row = h(`<div class="msg official"><span class="ann-ico">📢</span><div class="mb"><div class="mh"><b>${t('official')}</b><span class="tm">${timeStr(m.created_at)}</span></div>
        <div class="mt">${Emoji.toHTML(m.text)}</div></div></div>`);
      if (autoTr) Social.translate(m.text).then(tr => { if (tr && row.isConnected) row.querySelector('.mb').insertAdjacentHTML('beforeend', `<div class="tr">🌐 ${esc(tr)}</div>`); });
      return row;
    }
    const a = m.author || {};
    const mv = window.Emotes && Emotes.parse(m.text);
    if (mv) { const r = h(`<div class="msg emote" data-id="${m.id}"><div class="mb">${Emotes.rowHTML(a, mv)}</div></div>`); r.prepend(headIcon(a.look)); return r; }
    const role = a.role ? `<span class="role role-${a.role}">${a.role === 'owner' ? '★' : '✦'}</span>` : '';
    const me = Player.me && Player.me.id, hitMe = me && a.handle !== me && mentions(m.text).includes(me);
    const row = h(`<div class="msg ${a.role ? 'staff' : ''} ${hitMe ? 'mentioned' : ''}" data-id="${m.id}"><div class="mb">
      <div class="mh">${role}<b class="nm">${Player.nameHTML(a)}</b>${a.title ? Titles.html(a.title) : ''}<span class="tm">${timeStr(m.created_at)}</span>
        ${Social.cloud && Player.me && a.handle && a.handle !== Player.me.id ? `<button class="rp" aria-label="${t('rp_title')}" title="${t('rp_title')}">⚑</button>` : ''}
        ${Social.canDelete(m) ? `<button class="del" aria-label="${t('b_del')}">×</button>` : ''}</div>
      <div class="mt">${tagHTML(Emoji.toHTML(m.text))}</div></div></div>`);
    row.prepend(headIcon(a.look));
    if (autoTr) {
      Social.translate(m.text).then(tr => { if (tr && row.isConnected) row.querySelector('.mb').insertAdjacentHTML('beforeend', `<div class="tr">🌐 ${esc(tr)}</div>`); });
    }
    const del = row.querySelector('.del');
    if (del) del.onclick = async () => { try { await Social.removeMessage(m.id); } catch (e) { toast(e.message, '✕'); } };
    const rp = row.querySelector('.rp');
    if (rp) rp.onclick = () => Player.openReport(a.handle, a.name);
    return row;
  }

  function renderList() {
    if (!list) return;
    list.innerHTML = '';
    if (!Social.cloud) list.appendChild(h(`<div class="chat-note">${t('chat_local')}</div>`));
    cache[cur].forEach(m => list.appendChild(msgEl(m)));
    list.scrollTop = list.scrollHeight;
  }

  function push(channel, m) {
    cache[channel].push(m);
    const me = Player.me && Player.me.id, a = m.author || {};
    if (me && !m.official && a.handle && a.handle !== me && mentions(m.text).includes(me)) { SFX.play('coin'); toast(t('mention_got', { n: a.name || a.handle, c: t(channel === 'tw' ? 'ch_tw' : 'ch_world') }), '📣'); }
    const mv = !m.official && window.Emotes && Emotes.parse(m.text);
    if (mv && channel === cur && open) Emotes.play(m.author, mv);
    if (cache[channel].length > 120) cache[channel].shift();
    if (channel === cur && open) {
      const near = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
      list.appendChild(msgEl(m));
      if (near) list.scrollTop = list.scrollHeight;
    } else { unread[channel]++; }
    updateBar(m);
  }

  function updateBar(last) {
    if (!el) return;
    const n = unread.world + unread.tw;
    el.querySelector('.chat-bar .badge').textContent = n > 99 ? '99+' : n;
    el.querySelector('.chat-bar .badge').classList.toggle('hidden', !n || open);
    if (last) {
      const who = last.official ? '📢' : (last.author && last.author.name ? last.author.name + '：' : '');
      const mv = window.Emotes && Emotes.parse(last.text);
      el.querySelector('.ticker').innerHTML = esc(who) + ' ' + (mv ? Emotes.MOVES[mv].icon + ' ' + Emotes.MOVES[mv].name : Emoji.toHTML(last.text));
      if (!open && last.official) { el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping'); }
    }
    el.querySelectorAll('.ch-tabs button').forEach(b => {
      const k = b.dataset.ch; b.classList.toggle('on', k === cur);
      b.querySelector('.badge').textContent = unread[k]; b.querySelector('.badge').classList.toggle('hidden', !unread[k] || k === cur);
    });
  }

  async function load(channel) {
    try { cache[channel] = (await Social.messages(channel)) || []; } catch (e) { cache[channel] = []; }
  }

  function setChannel(ch) {
    cur = ch; unread[ch] = 0;
    el.querySelector('.tr-toggle').classList.remove('hidden');
    renderList(); updateBar();
  }

  function drawForm() {
    form.innerHTML = '';
    if (!Player.me) {
      form.appendChild(h(`<button type="button" class="btn sm pink login">${t('chat_login')}</button>`));
      form.querySelector('.login').onclick = () => Player.prompt();
      return;
    }
    form.appendChild(h(`<div class="chat-input"><button type="button" class="btn sm emo-btn" aria-label="emoji">😺</button><button type="button" class="btn sm mv-btn" aria-label="emote">🕺</button>
      <input class="input sm" maxlength="200" placeholder="${esc(t('chat_ph'))}"><button class="btn sm pink">${t('chat_send')}</button></div>`));
    input = form.querySelector('input');
    input.addEventListener('input', () => mentionPick(input));
    input.addEventListener('keydown', e => { const p = document.querySelector('.mention-pick'); if (p && e.key === 'Escape') p.remove(); if (p && (e.key === 'Enter' || e.key === 'Tab') && p.querySelector('.on')) { e.preventDefault(); p.querySelector('.on').click(); } if (p && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const bs = [...p.querySelectorAll('button')], i = bs.findIndex(b => b.classList.contains('on')); bs.forEach(b => b.classList.remove('on')); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].classList.add('on'); } });
    form.querySelector('.emo-btn').onclick = e => togglePicker(e.currentTarget, input);
    form.querySelector('.mv-btn').onclick = e => Emotes.picker(e.currentTarget, async txt => {
      try { await Social.send(cur, txt); SFX.play('blip'); } catch (x) { SFX.play('error'); toast(t('err_' + x.message) !== 'err_' + x.message ? t('err_' + x.message) : x.message, '✕'); }
    });
  }

  /* ---------- @標記玩家 ---------- */
  const mentions = text => [...String(text || '').matchAll(/(?:^|[^\w@])@([a-z0-9_]{3,16})/gi)].map(x => x[1].toLowerCase());
  const tagHTML = html => html.replace(/(^|[^\w@&])@([a-z0-9_]{3,16})/gi, (s, pre, hd) => `${pre}<span class="pname mention" data-h="${hd.toLowerCase()}">@${hd}</span>`);
  function mentionPick(inp) {
    document.querySelector('.mention-pick')?.remove();
    const pos = inp.selectionStart ?? inp.value.length, m = /(?:^|\s)@([a-z0-9_]{0,16})$/i.exec(inp.value.slice(0, pos));
    if (!m) return;
    const q = m[1].toLowerCase(), seen = new Map();
    const add = p => { if (p && p.handle && p.handle !== (Player.me && Player.me.id) && !seen.has(p.handle)) seen.set(p.handle, p.name || p.handle); };
    [...cache.world, ...cache.tw].slice().reverse().forEach(x => !x.official && add(x.author));
    if (window.Friends && Friends.friends) Friends.friends().forEach(add);
    const list = [...seen].filter(([hd, nm]) => hd.startsWith(q) || String(nm).toLowerCase().includes(q)).slice(0, 6);
    if (!list.length) return;
    const p = h(`<div class="mention-pick">${list.map(([hd, nm], i) => `<button type="button" class="${i ? '' : 'on'}" data-h="${esc(hd)}"><b>${esc(nm)}</b> <small>@${esc(hd)}</small></button>`).join('')}</div>`);
    p.onmousedown = e => e.preventDefault();
    p.onclick = e => {
      const b = e.target.closest('[data-h]'); if (!b) return;
      const before = inp.value.slice(0, pos).replace(/@([a-z0-9_]{0,16})$/i, '@' + b.dataset.h + ' ');
      inp.value = before + inp.value.slice(pos); inp.focus(); inp.setSelectionRange(before.length, before.length); p.remove();
    };
    document.body.appendChild(p);
    const r = inp.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(innerWidth - 240, r.left)) + 'px';
    p.style.top = Math.max(8, r.top - p.offsetHeight - 6) + 'px';
  }

  // 表情選單（聊天室和留言板共用）
  function togglePicker(btn, target) {
    const old = document.querySelector('.emo-pick');
    if (old) { old.remove(); if (old._btn === btn) return; }
    const p = Emoji.picker(code => { const s = target.selectionStart ?? target.value.length; target.value = target.value.slice(0, s) + code + target.value.slice(target.selectionEnd ?? s); target.focus(); });
    p._btn = btn;
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(innerWidth - 268, r.left)) + 'px';
    p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + 'px';
    const close = ev => { if (!p.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) { p.remove(); document.removeEventListener('pointerdown', close); } };
    setTimeout(() => document.addEventListener('pointerdown', close), 0);
  }

  async function send(e) {
    e.preventDefault();
    if (!input) return;
    const text = input.value;
    try { await Social.send(cur, text); input.value = ''; SFX.play('blip'); document.querySelector('.emo-pick')?.remove(); document.querySelector('.mention-pick')?.remove(); }
    catch (x) { SFX.play('error'); toast(t('err_' + x.message) !== 'err_' + x.message ? t('err_' + x.message) : x.message, '✕'); }
  }

  /* ---------- 官方快訊輪播 ---------- */
  let annGen = 0;
  async function startAnnouncements() {
    const my = ++annGen;
    const rows = (await Social.announcements()).filter(a => a.active);
    const every = await Social.announceEvery();
    if (my !== annGen) return;                 // 有更新的設定在跑，這次作廢
    clearInterval(annTimer);
    ann = rows;
    if (!ann.length) return;
    annTimer = setInterval(() => {
      if (!ann.length) return;
      const a = ann[annIdx++ % ann.length];
      const m = { official: true, text: a.text, created_at: new Date().toISOString() };
      CHANNELS.forEach(([ch]) => push(ch, m));
    }, Math.max(15, every) * 1000);
  }

  function build() {
    el = h(`<div id="chat" class="chat">
      <button class="chat-bar"><span class="ico">💬</span><b>${t('chat')}</b><span class="ticker"></span><span class="badge hidden">0</span><span class="arr">▲</span></button>
      <div class="chat-panel win">
        <div class="win-title blue"><div class="ch-tabs">${CHANNELS.map(([k, ic]) => `<button data-ch="${k}">${ic} ${t('ch_' + k)} <span class="badge hidden"></span></button>`).join('')}</div>
          <span class="grow"></span><button class="tr-toggle ${autoTr ? 'on' : ''}" title="${esc(t('auto_tr'))}">🌐 ${t('auto_tr')}</button>
          <div class="win-ctrls"><button class="mini" aria-label="minimize">_</button></div></div>
        <div class="chat-list"></div>
        <form class="chat-form"></form>
      </div></div>`);
    list = el.querySelector('.chat-list'); form = el.querySelector('.chat-form');
    el.querySelector('.chat-bar').onclick = () => toggle(true);
    el.querySelector('.mini').onclick = () => toggle(false);
    el.querySelector('.ch-tabs').onclick = e => { const b = e.target.closest('[data-ch]'); if (b) { SFX.play('select'); setChannel(b.dataset.ch); } };
    el.querySelector('.tr-toggle').onclick = e => {
      autoTr = !autoTr; e.currentTarget.classList.toggle('on', autoTr); SFX.play('select');
      try { localStorage.setItem('danceIsland.autoTr', autoTr ? 'on' : 'off'); } catch (x) {}
      renderList();
    };
    form.onsubmit = send;
    document.body.appendChild(el);
    drawForm(); setChannel(cur);
  }

  function toggle(v) {
    open = v; el.classList.toggle('open', v); SFX.play(v ? 'open' : 'cancel');
    if (v) { unread[cur] = 0; renderList(); setTimeout(() => input && input.focus({ preventScroll: true }), 50); }
    updateBar();
  }

  async function init() {
    build();
    await Promise.all(CHANNELS.map(([c]) => load(c)));
    renderList();
    const last = [...cache.world, ...cache.tw].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).pop();
    updateBar(last);
    Social.on('messages', ({ type, row }) => {
      if (type === 'INSERT' && row.channel) push(row.channel, row);
      if (type === 'DELETE') { CHANNELS.forEach(([c]) => (cache[c] = cache[c].filter(m => m.id !== row.id))); list.querySelector(`[data-id="${row.id}"]`)?.remove(); }
    });
    Social.on('announcements', () => startAnnouncements());
    Player.onChange(() => { drawForm(); renderList(); });
    I18N.onChange(() => { const o = open; el.remove(); build(); if (o) toggle(true); renderList(); });
    startAnnouncements();
  }

  return { init, togglePicker, restartAnnouncements: startAnnouncements, headIcon, toggle };
})();
