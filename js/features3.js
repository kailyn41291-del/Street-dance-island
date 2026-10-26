/* =========================================================
 * 第三批：聊天室表情動作、路過的 NPC 舞者、人氣 Battle 投票、
 *         節奏遊戲、地圖散步模式、線上 Cypher 舞池、遊戲中心
 * ========================================================= */
window.Emotes = (() => {
  // 角色招式動畫（CSS class：mv-xxx）
  const MOVES = {
    toprock:  { icon: '🕺', name: 'Toprock' },
    windmill: { icon: '🌀', name: 'Windmill' },
    headspin: { icon: '🙃', name: 'Headspin' },
    freeze:   { icon: '🧊', name: 'Freeze' },
    flare:    { icon: '🔥', name: 'Flare' },
    wave:     { icon: '🌊', name: 'Wave' },
    lock:     { icon: '🔒', name: 'Lock' },
    pop:      { icon: '💥', name: 'Pop' },
    jump:     { icon: '⬆', name: 'Jump' }
  };
  const parse = text => { const m = /^\/([a-z]+)$/i.exec((text || '').trim()); return m && MOVES[m[1].toLowerCase()] ? m[1].toLowerCase() : null; };
  /** 讓角色做招式：dance(Avatar.dancer 物件或 canvas, 'windmill') */
  function dance(d, move, ms = 2400) {
    const el = d.el || d;
    el.classList.remove(...Object.keys(MOVES).map(k => 'mv-' + k));
    void el.offsetWidth;
    el.classList.add('mv-' + move);
    if (d.beat) { const tm = setInterval(() => d.beat(), move === 'pop' || move === 'toprock' ? 120 : 200); setTimeout(() => clearInterval(tm), ms); }
    setTimeout(() => el.classList.remove('mv-' + move), ms);
    SFX.play(move === 'freeze' ? 'card' : 'warp');
  }
  // 聊天室跳出的招式表演
  function play(author, move) {
    const a = author || {};
    const stage = UI.h(`<div class="emote-stage"><div class="em-floor"></div><div class="em-name">${UI.esc(a.name || '')} — ${MOVES[move].icon} ${MOVES[move].name}!</div></div>`);
    const d = Avatar.dancer(4, a.look);
    stage.prepend(d.el);
    document.body.appendChild(stage);
    dance(d, move, 2600);
    setTimeout(() => stage.classList.add('out'), 2600);
    setTimeout(() => stage.remove(), 3000);
  }
  const rowHTML = (a, move) => `<div class="mt emote-line">${MOVES[move].icon} <b>${UI.esc(a.name || '')}</b> ${t('em_did', { m: MOVES[move].name })}</div>`;
  function picker(btn, send) {
    document.querySelector('.emote-pick')?.remove();
    const p = UI.h(`<div class="emote-pick win">${Object.entries(MOVES).map(([k, m]) => `<button data-mv="${k}">${m.icon}<span>${m.name}</span></button>`).join('')}</div>`);
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(innerWidth - 300, r.left)) + 'px';
    p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + 'px';
    p.onclick = e => { const b = e.target.closest('[data-mv]'); if (b) { p.remove(); send('/' + b.dataset.mv); } };
    const close = ev => { if (!p.contains(ev.target) && ev.target !== btn) { p.remove(); document.removeEventListener('pointerdown', close); } };
    setTimeout(() => document.addEventListener('pointerdown', close), 0);
  }
  return { MOVES, parse, dance, play, rowHTML, picker };
})();

(() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const loggedCloud = () => Backend.enabled && Player.me;

  /* =========================================================
   * 遊戲中心（右上角「小遊戲」按鈕）
   * ========================================================= */
  A.openArcade = () => {
    const tiles = [
      ['🃏', 'arc_mini', () => Games.open()],
      ['🎵', 'arc_rhythm', () => Games.open('rhythm')],
      ['🕺', 'arc_cypher', () => A.nav('#/cypher')],
      ['🚶', 'arc_walk', () => { A.nav('#/'); setTimeout(() => A.startWalk && A.startWalk(), 900); }]
    ];
    const body = h(`<div class="arcade">${tiles.map(([ic, k], i) => `<button class="arc-tile" data-i="${i}"><span class="arc-ico">${ic}</span><b>${t(k)}</b><small>${t(k + '_d')}</small></button>`).join('')}</div>`);
    const m = modal({ title: '🎮 ' + t('arc_title'), color: 'blue', body, wide: true });
    body.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; SFX.play('confirm'); m.close(); setTimeout(tiles[+b.dataset.i][2], 230); };
  };

  /* =========================================================
   * 節奏挑戰（小遊戲裡的新分頁）
   * ========================================================= */
  const BPM = 120, BEAT = 60 / BPM, DUR = 30, MAXN = 64;
  function makeChart() {
    const notes = []; let tm = 2;
    while (notes.length < MAXN && tm < DUR - 0.5) {
      notes.push({ t: tm, lane: Math.floor(Math.random() * 4) });
      tm += Math.random() < 0.3 ? BEAT / 2 : BEAT;
    }
    return notes;
  }
  function rhythm(pane, cleanup) {
    pane.innerHTML = `<div class="rh-wrap"><canvas class="rh" width="320" height="420"></canvas>
      <div class="rh-side"><div class="rh-score">0</div><div class="rh-combo"></div><div class="rh-judge"></div>
        <button class="btn pink rh-start">▶ ${t('rh_start')}</button><p class="note">${t('rh_keys')}</p>
        <div class="rh-board"><b>🏆 ${t('rh_board')}</b><ol class="rh-top"><li class="note">…</li></ol></div></div></div>
      <div class="rh-pads">${['←', '↓', '↑', '→'].map((k, i) => `<button class="rh-pad" data-l="${i}">${k}</button>`).join('')}</div>`;
    const cv = pane.querySelector('.rh'), g = cv.getContext('2d');
    const scoreEl = pane.querySelector('.rh-score'), comboEl = pane.querySelector('.rh-combo'), judgeEl = pane.querySelector('.rh-judge');
    const LANES = 4, LW = 80, HIT = 360, SPEED = 260, COLORS = ['#f07ca3', '#5bb5a6', '#eac45a', '#7895df'];
    let notes = [], t0 = 0, running = false, raf = 0, score = 0, combo = 0, maxCombo = 0, perfect = 0, great = 0, miss = 0, flash = [0, 0, 0, 0], lastBeat = -1;
    const draw = now => {
      g.fillStyle = '#2a2440'; g.fillRect(0, 0, 320, 420);
      for (let i = 0; i < LANES; i++) {
        g.fillStyle = flash[i] > now ? 'rgba(255,255,255,.18)' : i % 2 ? '#322b4d' : '#2e2848';
        g.fillRect(i * LW, 0, LW, 420);
      }
      g.fillStyle = '#fbe9d0'; g.fillRect(0, HIT, 320, 4);
      for (let i = 0; i < LANES; i++) { g.strokeStyle = COLORS[i]; g.lineWidth = 3; g.strokeRect(i * LW + 10, HIT - 14, LW - 20, 30); }
      const el = (now - t0) / 1000;
      notes.forEach(n => {
        if (n.done) return;
        const y = HIT - (n.t - el) * SPEED;
        if (y < -30 || y > 440) return;
        g.fillStyle = '#2a1f2e'; g.fillRect(n.lane * LW + 8, y - 12, LW - 16, 26);
        g.fillStyle = COLORS[n.lane]; g.fillRect(n.lane * LW + 11, y - 9, LW - 22, 20);
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(n.lane * LW + 11, y - 9, LW - 22, 4);
      });
    };
    const judge = (txt, cls) => { judgeEl.textContent = txt; judgeEl.className = 'rh-judge ' + cls; };
    const hit = lane => {
      if (!running) return;
      const now = performance.now(), el = (now - t0) / 1000;
      flash[lane] = now + 90;
      let best = null, bd = 1;
      notes.forEach(n => { if (!n.done && n.lane === lane) { const d = Math.abs(n.t - el); if (d < bd) { bd = d; best = n; } } });
      if (best && bd < 0.15) {
        best.done = true;
        if (bd < 0.07) { score += 100; perfect++; judge('PERFECT', 'p'); } else { score += 50; great++; judge('GREAT', 'g'); }
        combo++; maxCombo = Math.max(maxCombo, combo);
        SFX.play('hat');
      } else { SFX.play('blip'); }
      scoreEl.textContent = score; comboEl.textContent = combo > 2 ? combo + ' COMBO' : '';
    };
    const loop = now => {
      const el = (now - t0) / 1000;
      const b = Math.floor(el / BEAT);
      if (b !== lastBeat && el >= 0) { lastBeat = b; b % 2 ? SFX.play('snare') : SFX.play('kick'); }
      notes.forEach(n => { if (!n.done && el - n.t > 0.15) { n.done = true; n.miss = true; miss++; combo = 0; judge('MISS', 'm'); comboEl.textContent = ''; } });
      draw(now);
      if (el > DUR) return finish();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      SFX.init(); notes = makeChart(); score = combo = maxCombo = perfect = great = miss = 0; lastBeat = -1;
      scoreEl.textContent = '0'; comboEl.textContent = ''; judge('READY', '');
      t0 = performance.now(); running = true; pane.querySelector('.rh-start').disabled = true;
      raf = requestAnimationFrame(loop);
    };
    const finish = async () => {
      running = false; cancelAnimationFrame(raf); diAct('rhythm');
      pane.querySelector('.rh-start').disabled = false;
      const rank = score >= 6000 ? 'S' : score >= 5000 ? 'A' : score >= 3800 ? 'B' : score >= 2500 ? 'C' : 'D';
      judge(`RANK ${rank}`, 'r'); SFX.play(rank <= 'B' ? 'fanfare' : 'coin');
      let msg = t('rh_result', { s: score, p: perfect, g: great, m: miss, c: maxCombo });
      if (loggedCloud()) { try { await Backend.postScore(score); msg += '\n' + t('rh_saved'); } catch (x) { msg += '\n' + (/too fast/.test(x.message) ? t('err_fast') : x.message); } }
      else if (Backend.enabled) msg += '\n' + t('rh_login');
      toast(msg.split('\n')[0], '🎵'); if (msg.includes('\n')) setTimeout(() => toast(msg.split('\n')[1], '🏆'), 900);
      loadBoard();
    };
    const loadBoard = async () => {
      const ol = pane.querySelector('.rh-top');
      if (!Backend.enabled) { ol.innerHTML = `<li class="note">${t('need_cloud')}</li>`; return; }
      try { const rows = await Backend.topScores(10); ol.innerHTML = rows.length ? rows.map(r => `<li><span>${Player.nameHTML(r.author || {})}</span><b>${r.score}</b></li>`).join('') : `<li class="note">${t('rh_none')}</li>`; } catch (x) { ol.innerHTML = ''; }
    };
    const keymap = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, d: 0, f: 1, j: 2, k: 3, D: 0, F: 1, J: 2, K: 3 };
    const onKey = e => { if (e.key in keymap && running) { e.preventDefault(); hit(keymap[e.key]); } };
    document.addEventListener('keydown', onKey);
    pane.querySelectorAll('.rh-pad').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); hit(+b.dataset.l); }));
    cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); hit(Math.min(3, Math.floor(((e.clientX - r.left) / r.width) * 4))); });
    pane.querySelector('.rh-start').onclick = start;
    draw(performance.now()); loadBoard();
    cleanup.push(() => { running = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); });
  }
  Games.addTab('rhythm', 'arc_rhythm', rhythm);

  /* =========================================================
   * 路過的 NPC 舞者：點他來一場猜拳式 Battle
   * Freeze 勝 Power、Power 勝 Footwork、Footwork 勝 Freeze
   * ========================================================= */
  const RPS = { freeze: { icon: '🧊', beats: 'power' }, power: { icon: '🌀', beats: 'foot' }, foot: { icon: '👟', beats: 'freeze' } };
  const NPC_MOVE = { freeze: 'freeze', power: 'windmill', foot: 'toprock' };
  function npcBattle(look, name) {
    let you = 0, them = 0, round = 0;
    const body = h(`<div class="npc-battle">
      <div class="nb-stage"><div class="nb-side me"></div><div class="nb-vs">VS</div><div class="nb-side npc"></div></div>
      <div class="nb-score"><span class="s-me">0</span> : <span class="s-npc">0</span></div>
      <p class="nb-msg">${t('npc_rule')}</p>
      <div class="nb-btns">${Object.entries(RPS).map(([k, v]) => `<button class="btn" data-m="${k}">${v.icon} ${t('rps_' + k)}</button>`).join('')}</div></div>`);
    const dMe = Avatar.dancer(3, Player.me ? Player.me.look : Avatar.DEFAULT), dNpc = Avatar.dancer(3, look);
    body.querySelector('.me').appendChild(dMe.el); body.querySelector('.npc').appendChild(dNpc.el);
    dNpc.el.style.transform = 'scaleX(-1)';
    const m = modal({ title: '🆚 ' + t('npc_title', { n: esc(name) }), color: 'orange', body });
    const msg = body.querySelector('.nb-msg');
    body.querySelector('.nb-btns').onclick = async e => {
      const b = e.target.closest('[data-m]'); if (!b || you >= 2 || them >= 2) return;
      const mine = b.dataset.m, theirs = pick(Object.keys(RPS));
      Emotes.dance(dMe, NPC_MOVE[mine], 1400); Emotes.dance(dNpc, NPC_MOVE[theirs], 1400);
      round++;
      if (mine === theirs) msg.textContent = t('npc_tie', { a: RPS[mine].icon, b: RPS[theirs].icon });
      else if (RPS[mine].beats === theirs) { you++; msg.textContent = t('npc_win_r', { a: RPS[mine].icon, b: RPS[theirs].icon }); }
      else { them++; msg.textContent = t('npc_lose_r', { a: RPS[mine].icon, b: RPS[theirs].icon }); }
      body.querySelector('.s-me').textContent = you; body.querySelector('.s-npc').textContent = them;
      if (you >= 2) {
        diAct('npc'); SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 2, 24);
        let extra = '';
        if (loggedCloud()) { try { const r = await Backend.npcWin(); extra = ' ' + t('npc_wins', { n: r.wins }); if (r.wins === 5 || r.wins === 30) extra += ' 🎁 ' + t('npc_title_get'); } catch (x) { extra = /too fast/.test(x.message) ? ' ' + t('npc_rest') : ''; } }
        msg.textContent = t('npc_victory') + extra;
      } else if (them >= 2) { SFX.play('error'); msg.textContent = t('npc_defeat'); }
    };
  }
  const NPC_NAMES = ['Bboy Pixel', 'Bgirl Mochi', 'Popper Neko', 'Locker Taro', 'Krump Kuma', 'House Hana', 'Waack Lulu', 'DJ Beans'];
  function spawnNpc(view) {
    if (!view.isConnected || document.querySelector('.npc-walker')) return;
    const look = Avatar.random(), name = pick(NPC_NAMES), fromLeft = Math.random() < 0.5;
    const rare = !!window.RPG && Math.random() < 0.18;   // 偶爾出現神秘路人（可以聊天拿小彩蛋）
    const el = h(`<button class="npc-walker ${fromLeft ? 'l' : 'r'} ${rare ? 'rare' : ''}" aria-label="${esc(name)}"><span class="npc-bubble">${esc(rare ? '？？？' : UI.kao(pick(t('npc_lines'))))}</span></button>`);
    const d = Avatar.dancer(3, look);
    if (!fromLeft) d.el.style.transform = 'scaleX(-1)';
    el.prepend(d.el);
    el.style.top = (30 + Math.random() * 40) + 'vh';
    view.appendChild(el);
    A.beatLoop(d, 260);
    el.onclick = e => { e.stopPropagation(); SFX.play('select'); el.classList.add('stop'); if (rare) RPG.walker(name, () => npcBattle(look, name)); else npcBattle(look, name); setTimeout(() => el.remove(), 400); };
    setTimeout(() => el.remove(), 16000);
  }

  /* =========================================================
   * 地圖散步：用方向鍵 / WASD（手機用十字鍵）讓角色走路，走到國家上按 Enter 進入
   * ========================================================= */
  A.startWalk = () => {
    const W = A.worldApi; if (!W || !W.world.isConnected) return;
    if (W.walking) return W.stopWalk();
    const d = Avatar.dancer(3, Player.me ? Player.me.look : Avatar.DEFAULT);
    const hero = h(`<div class="walker"><span class="walk-tip"></span></div>`);
    hero.prepend(d.el);
    W.world.appendChild(hero);
    const pad = h(`<div class="dpad"><button data-k="up">▲</button><button data-k="left">◀</button><button data-k="enter">OK</button><button data-k="right">▶</button><button data-k="down">▼</button><button data-k="exit" class="x">✕</button></div>`);
    document.body.appendChild(pad);
    let x = W.home[0], y = W.home[1] + 60;
    const keys = new Set(); let raf = 0, last = performance.now(), step = 0, over = -1, face = 1;
    const tip = hero.querySelector('.walk-tip');
    W.centerOn([x, y], Math.max(W.cam.s, 0.9));
    const tick = now => {
      const dt = Math.min(50, now - last) / 1000; last = now;
      let vx = 0, vy = 0;
      if (keys.has('left')) vx--; if (keys.has('right')) vx++; if (keys.has('up')) vy--; if (keys.has('down')) vy++;
      if (vx || vy) {
        const sp = 260 / Math.hypot(vx, vy) * dt;
        x = Math.max(0, Math.min(W.L.W, x + vx * sp)); y = Math.max(0, Math.min(W.L.H, y + vy * sp));
        if (vx) face = vx > 0 ? 1 : -1;
        if ((step += dt) > 0.15) { step = 0; d.beat(); }
        W.centerOn([x, y], W.cam.s);
      }
      hero.style.transform = `translate(${x}px, ${y}px)`;
      d.el.style.transform = `scaleX(${face})`;
      const id = W.idAtWorld(x, y + 4);
      if (id !== over) { over = id; tip.textContent = id >= 0 ? `${nm(GEO.countries[id])} — ${t('walk_enter')}` : ''; tip.classList.toggle('on', id >= 0); }
      raf = requestAnimationFrame(tick);
    };
    const enter = () => { if (over >= 0) { SFX.play('confirm'); const code = GEO.countries[over].code; W.stopWalk(); A.nav('#/c/' + code); } };
    const KM = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    const kd = e => { if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return; if (KM[e.key]) { keys.add(KM[e.key]); e.preventDefault(); } if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); } if (e.key === 'Escape') W.stopWalk(); };
    const ku = e => { if (KM[e.key]) keys.delete(KM[e.key]); };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    pad.addEventListener('pointerdown', e => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); const k = b.dataset.k; if (k === 'enter') enter(); else if (k === 'exit') W.stopWalk(); else keys.add(k); });
    pad.addEventListener('pointerup', e => { const b = e.target.closest('[data-k]'); if (b) keys.delete(b.dataset.k); });
    pad.addEventListener('pointerleave', () => keys.clear());
    tip.onclick = enter;
    W.walking = true;
    const menu = document.querySelector('.world-menu'), wasCollapsed = menu && menu.classList.contains('collapsed');
    if (menu) menu.classList.add('collapsed');
    W.stopWalk = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); hero.remove(); pad.remove(); W.walking = false; if (menu && !wasCollapsed) menu.classList.remove('collapsed'); };
    toast(t('walk_tip'), '🚶');
    raf = requestAnimationFrame(tick);
  };

  // 世界地圖：散步按鈕 + 定時出現 NPC
  (A.worldHooks = A.worldHooks || []).push(view => {
    const ctrls = view.querySelector('.map-ctrls');
    if (ctrls) { const b = h(`<button class="btn icon orange" aria-label="${esc(t('arc_walk'))}" title="${esc(t('arc_walk'))}">🚶</button>`); b.onclick = () => { SFX.play('select'); A.startWalk(); }; ctrls.prepend(b); }
    setTimeout(() => spawnNpc(view), 9000);
    const tm = setInterval(() => { if (!view.isConnected) return clearInterval(tm); if (Math.random() < 0.6) spawnNpc(view); }, 45000);
  });

  /* =========================================================
   * 人氣 Battle 投票（#/battle）
   * ========================================================= */
  const embedOf = url => {
    const y = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url || '');
    return y ? `https://www.youtube.com/embed/${y[1]}` : null;
  };
  const isMp4 = url => /\.mp4(\?|$)/i.test(url || '') && /^https:\/\//.test(url || '');
  A.crumbs.battle = () => '🆚 ' + t('arc_battle');
  const battleData = async () => { const battles = await Backend.listBattles(); return { battles, votes: await Backend.listVotes(battles.map(b => b.id)) }; };
  A.prefetch = A.prefetch || {};
  A.prefetch.battle = () => { if (Backend.enabled && A.prefetchKeep) A.prefetchKeep('battle', battleData); };
  A.views.battle = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner');
    stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    let battles = [], votes = [];
    const load = async (first) => { const d = first && A.prefetchTake ? await A.prefetchTake('battle', battleData) : await battleData(); battles = d.battles; votes = d.votes; };
    const draw = () => {
      const now = new Date().toISOString(), uid = Backend.uid;
      const live = battles.filter(b => b.ends_at > now), past = battles.filter(b => b.ends_at <= now);
      const card = b => {
        const vs = votes.filter(v => v.battle_id === b.id), a = vs.filter(v => v.choice === 'a').length, bb = vs.length - a;
        const mine = vs.find(v => v.user_id === uid), ended = b.ends_at <= now, show = ended || mine;
        const pa = vs.length ? Math.round((a / vs.length) * 100) : 50;
        const side = (k, name, url, n, p) => {
          const em = embedOf(url);
          return `<div class="bt-side ${mine && mine.choice === k ? 'chosen' : ''} ${ended && ((k === 'a' && a > bb) || (k === 'b' && bb > a)) ? 'winner' : ''}">
            <div class="bt-name">${esc(name)}</div>
            ${isMp4(url) ? `<div class="bt-video"><video src="${esc(url)}" controls playsinline preload="metadata"></video></div>` : em ? `<div class="bt-video"><iframe src="${esc(em)}" title="${esc(name)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>` : /^https?:\/\//.test(url || '') ? `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">▶ ${t('res_video')}</a>` : ''}
            ${!ended && !mine ? `<button class="btn pink vote" data-b="${b.id}" data-c="${k}">👍 ${t('bt_vote')}</button>` : ''}
            ${show ? `<div class="bt-pct">${p}% <small>(${n})</small></div>` : ''}</div>`;
        };
        const left = Math.max(0, Math.round((new Date(b.ends_at) - Date.now()) / 36e5));
        return `<div class="win battle">${UI.winHTML('🆚 ' + esc(b.title), ended ? 'yellow' : 'pink', false)}<div class="win-body">
          <div class="bt-row">${side('a', b.a_name, b.a_url, a, pa)}<div class="bt-vs">VS</div>${side('b', b.b_name, b.b_url, bb, 100 - pa)}</div>
          ${show ? `<div class="bt-bar"><i style="width:${pa}%"></i></div>` : ''}
          <p class="note">${ended ? t('bt_ended', { n: vs.length }) : t('bt_left', { h: left, n: vs.length })}${Backend.isAdmin ? ` <button class="btn sm red del-b" data-b="${b.id}">${t('b_del')}</button>` : ''}</p>
          ${A.battleExtras ? A.battleExtras(b) : ''}</div></div>`;
      };
      inner.innerHTML = `<div class="win">${UI.winHTML('🆚 ' + t('arc_battle'), 'blue', false)}<div class="win-body"><p>${t('bt_intro')}</p>
          ${Backend.isAdmin ? `<details class="bt-new"><summary>＋ ${t('bt_new')}</summary><form class="form" novalidate>
            <label class="field full"><span>${t('bt_t')}</span><input class="input" name="title" maxlength="80"></label>
            <label class="field"><span>A</span><input class="input" name="a_name" maxlength="40"></label><label class="field"><span>A ${t('res_video')}</span><input class="input" name="a_url" type="url" placeholder="https://youtu.be/..."><small class="note">${t('bt_or_mp4')}</small><input class="input" name="a_file" type="file" accept="video/mp4"></label>
            <label class="field"><span>B</span><input class="input" name="b_name" maxlength="40"></label><label class="field"><span>B ${t('res_video')}</span><input class="input" name="b_url" type="url" placeholder="https://youtu.be/..."><small class="note">${t('bt_or_mp4')}</small><input class="input" name="b_file" type="file" accept="video/mp4"></label>
            <label class="field full"><span>📌 ${t('bt_q')}</span><input class="input" name="pinned_q" maxlength="200" placeholder="${esc(t('bt_q_ph'))}"></label>
            <label class="field"><span>${t('bt_days')}</span><input class="input" name="days" type="number" min="1" max="30" value="7"></label>
            <div class="full form-foot"><button class="btn pink">${t('bt_create')}</button></div></form></details>` : ''}</div></div>
        ${live.map(card).join('') || `<p class="note">${t('bt_none')}</p>`}
        ${past.length ? `<div class="list-head">${t('ev_w_past')}</div>${past.map(card).join('')}` : ''}`;
      A.battleMount && A.battleMount(inner, battles);
      const f = inner.querySelector('.bt-new form');
      if (f) f.onsubmit = async e => {
        e.preventDefault();
        const v = k => f.elements[k].value.trim();
        if (!v('title') || !v('a_name') || !v('b_name')) return toast(t('e_name'), '✕');
        const files = ['a_file', 'b_file'].map(k => f.elements[k].files[0] || null);
        for (const fl of files) if (fl && (fl.type !== 'video/mp4' || fl.size > 50 * 1024 * 1024)) return toast(t('bt_mp4_bad'), '✕');
        const btn = f.querySelector('button'); btn.disabled = true;
        try {
          const urls = [];
          for (let i = 0; i < 2; i++) { if (files[i]) { btn.textContent = t('bt_uploading', { n: i + 1 }); urls[i] = await Backend.uploadVideo(files[i]); } }
          await Backend.addBattle({ title: v('title'), a_name: v('a_name'), a_url: urls[0] || v('a_url') || null, b_name: v('b_name'), b_url: urls[1] || v('b_url') || null, pinned_q: v('pinned_q') || null, ends_at: new Date(Date.now() + (+v('days') || 7) * 864e5).toISOString() });
          await load(); draw(); toast(t('adm_done'), '🆚');
        } catch (x) { toast(x.message, '✕'); btn.disabled = false; btn.textContent = t('bt_create'); }
      };
    };
    inner.addEventListener('click', async e => {
      const b = e.target.closest('.vote, .del-b'); if (!b) return;
      if (b.classList.contains('del-b')) { if (!confirm(t('del_title'))) return; try { await Backend.deleteBattle(+b.dataset.b); await load(); draw(); } catch (x) { toast(x.message, '✕'); } return; }
      if (!Player.me) return Player.prompt();
      try { await Backend.vote(+b.dataset.b, b.dataset.c); SFX.play('coin'); sparkle(e.clientX, e.clientY, 12); toast(t('bt_voted'), '👍'); await load(); draw(); } catch (x) { toast(x.message, '✕'); }
    });
    try { await load(true); } catch (x) { inner.innerHTML = `<p class="note">${esc(x.message)}</p>`; return; }
    draw();
    const off = Social.on('votes', async () => { if (!view.isConnected) return off(); try { await load(); draw(); } catch (x) {} });
  };

  /* =========================================================
   * 線上 Cypher 舞池（#/cypher）：看得到同時在線的玩家，按招式大家都看得到
   * ========================================================= */
  A.crumbs.cypher = () => '🕺 ' + t('arc_cypher');
  A.views.cypher = (r, stage) => {
    const view = h(`<div class="view cypher-view"><div class="cy-lights"></div>
      <div class="cy-head win">${UI.winHTML('🕺 ' + t('arc_cypher'), 'pink', false)}<div class="win-body"><span class="cy-count"></span><span class="grow"></span><button class="btn sm music">🔈 ${t('cy_music')}</button></div></div>
      <div class="cy-floor"><div class="cy-dancers"></div></div>
      <div class="cy-moves">${Object.entries(Emotes.MOVES).map(([k, m]) => `<button class="btn" data-mv="${k}">${m.icon}<span>${m.name}</span></button>`).join('')}</div></div>`);
    stage.appendChild(view);
    const dancers = view.querySelector('.cy-dancers'), countEl = view.querySelector('.cy-count');
    const me = Player.me, els = new Map();
    let ch = null, beat = null;
    const render = list => {
      const keys = new Set(list.map(p => p.handle));
      [...els.keys()].forEach(k => { if (!keys.has(k)) { els.get(k).wrap.remove(); els.delete(k); } });
      list.forEach(p => {
        if (els.has(p.handle)) return;
        const d = Avatar.dancer(3, p.look);
        const wrap = h(`<div class="cy-dancer ${me && p.handle === me.id ? 'me' : ''}"><div class="cy-name">${Player.nameHTML(p)}</div></div>`);
        wrap.prepend(d.el); dancers.appendChild(wrap); els.set(p.handle, { d, wrap });
        A.beatLoop(d, 380 + Math.random() * 120);
      });
      countEl.textContent = t('cy_online', { n: list.length });
    };
    const doMove = (handle, move) => { const x = els.get(handle); if (x) { Emotes.dance(x.d, move, 2200); x.wrap.classList.add('spot'); setTimeout(() => x.wrap.classList.remove('spot'), 2200); } };
    if (Backend.enabled) {
      ch = Backend.channel('cypher-floor', me ? me.id : 'guest-' + Math.random().toString(36).slice(2, 8));
      ch.on('presence', { event: 'sync' }, () => {
        const st = ch.presenceState(), list = [];
        Object.values(st).forEach(arr => { const p = arr[0]; if (p && p.handle) list.push(p); });
        render(list);
      }).on('broadcast', { event: 'move' }, ({ payload }) => doMove(payload.handle, payload.move))
        .subscribe(async status => { if (status === 'SUBSCRIBED' && me) await ch.track({ handle: me.id, name: me.name, look: me.look, verified: me.verified }); });
    } else if (me) render([{ handle: me.id, name: me.name, look: me.look }]);
    else render([]);
    if (!me) view.querySelector('.cy-moves').insertAdjacentHTML('afterbegin', `<button class="btn pink join">${t('cy_join')}</button>`);
    view.querySelector('.cy-moves').onclick = e => {
      if (e.target.closest('.join')) return Player.prompt();
      const b = e.target.closest('[data-mv]'); if (!b) return;
      if (me) diAct('cypher', 1, b.dataset.mv);
      if (!me) return Player.prompt();
      if (ch) ch.send({ type: 'broadcast', event: 'move', payload: { handle: me.id, move: b.dataset.mv } });
      else doMove(me.id, b.dataset.mv);
    };
    view.querySelector('.music').onclick = e => {
      SFX.init();
      if (beat) { clearInterval(beat); beat = null; e.currentTarget.textContent = '🔈 ' + t('cy_music'); return; }
      let i = 0; beat = setInterval(() => { i % 4 === 0 ? SFX.play('kick') : i % 2 === 0 ? SFX.play('snare') : SFX.play('hat'); i++; }, 300);
      e.currentTarget.textContent = '🔊 ' + t('cy_music');
    };
    const cleanup = setInterval(() => { if (!view.isConnected) { clearInterval(cleanup); if (beat) clearInterval(beat); if (ch) Backend.removeChannel(ch); } }, 1000);
  };
})();
