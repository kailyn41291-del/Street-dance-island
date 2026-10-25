/* =========================================================
 * 街舞小遊戲
 * 1. 動作抽卡：抽今天要練的招式 + 挑戰條件
 * 2. 節拍道場：Tap 測 BPM、八拍計數節拍器、小人跟著跳
 * 3. Cypher 輪盤：隨機出場順序 / 1on1 對戰表
 * ========================================================= */
window.Games = (() => {
  const { h, esc, modal, toast, sparkle } = UI;

  const MOVES = {
    'Breaking': ['Toprock', '6-Step', '3-Step', 'CC', 'Windmill', 'Flare', 'Headspin', 'Air Flare', 'Baby Freeze', 'Chair Freeze', 'Air Chair', 'Swipe', 'Turtle', 'Kick-out', 'Coffee Grinder', 'Hollowback', 'Jackhammer', '1990', 'Halo', 'Elbow Freeze'],
    'Popping': ['Fresno', 'Dime Stop', 'Boogaloo Roll', 'Neck-o-flex', 'Twist-o-flex', 'Tutting', 'Waving', 'Robot', 'Animation', 'Strobing', 'Ticking', 'Gliding', 'Hitting', 'Old Man', 'Walk Out'],
    'Locking': ['Lock', 'Point', 'Wrist Roll', 'Scoobot', 'Stop and Go', 'Skeeter Rabbit', 'Which-a-way', 'Uncle Sam Point', 'Leo Walk', 'Funky Guitar', 'Knee Drop', 'Pacing', 'Scooby Doo'],
    'Hip Hop': ['Bounce', 'Rock', 'Running Man', 'Cabbage Patch', 'Kriss Kross', 'Harlem Shake', 'Wop', 'Roger Rabbit', 'Bart Simpson', 'Reebok', 'Smurf', 'Steve Martin', 'Biz Markie', 'Monastery', 'Happy Feet'],
    'House': ['Jacking', 'Loose Legs', 'Shuffle', 'Heel-Toe', 'Stomp', 'Skate', 'Pas de Bourrée', 'Farmer', 'Scissors', 'Train', 'Salsa Hop', 'Lofting', 'Sweep'],
    'Waacking': ['Arm Roll', 'Pose', 'Pass-by', 'Strike', 'Wrist Twirl', 'Walk', 'Drama Face', 'Hand Spin', 'Promenade', 'Double Arm Roll']
  };
  const CHALLENGES = ['只能用上半身', '8 拍內完成', '用 Freeze 收尾', '全程低 Level', '跟著 snare 打點', '反方向做一次', '加一個停格', '慢動作一個八拍', '連做三次不停', '對著鏡子以外的方向', '加入一個轉圈', '配合歌詞做 Concept'];
  const RARITY = [['N', '★', 55], ['R', '★★', 30], ['SR', '★★★', 12], ['SSR', '★★★★', 3]];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const roll = () => { let r = Math.random() * 100; for (const x of RARITY) { if ((r -= x[2]) < 0) return x; } return RARITY[0]; };

  function gacha(pane) {
    pane.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span>舞風：</span>
        <select class="input" style="width:auto">${Object.keys(MOVES).map(s => `<option>${s}</option>`).join('')}<option value="*">隨機混合</option></select>
        <button class="btn pink draw">抽 3 張卡！</button>
      </div>
      <div class="gacha-stage"></div>
      <p style="font-size:12px;color:var(--ink-soft);margin:0;text-align:center">點卡片翻面 ✦ 抽到 SSR 會發光（3% 機率）</p>`;
    const stageEl = pane.querySelector('.gacha-stage');
    const deal = () => {
      const style = pane.querySelector('select').value;
      stageEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const st = style === '*' ? pick(Object.keys(MOVES)) : style;
        const [r, stars] = roll();
        const c = h(`<button class="gcard ${r === 'SSR' ? 'ssr' : ''}" style="background:none;border:0;padding:0">
          <div class="back">?</div>
          <div class="front"><span class="rar">${stars} ${r}</span><span class="ty" style="background:${Store.STYLE_COLOR[st]}">${st}</span>
            <span class="mv">${esc(pick(MOVES[st]))}</span><span style="font-size:12px">＋ ${esc(r === 'N' ? '自由發揮' : pick(CHALLENGES))}</span></div></button>`);
        c.onclick = e => {
          if (c.classList.contains('flip')) return;
          c.classList.add('flip'); SFX.play(r === 'SSR' ? 'fanfare' : 'card');
          if (r === 'SSR' || r === 'SR') sparkle(e.clientX, e.clientY, r === 'SSR' ? 20 : 10);
        };
        stageEl.appendChild(c);
      }
      SFX.play('card');
    };
    pane.querySelector('.draw').onclick = deal;
    deal();
  }

  function bpm(pane, cleanup) {
    pane.innerHTML = `
      <div class="bpm-wrap">
        <button class="tap-pad">TAP！<br><small style="font-size:12px">跟著音樂節奏點我</small></button>
        <div style="display:grid;gap:10px">
          <div class="bpm-num">--</div>
          <div style="text-align:center;font-size:12px">BPM</div>
          <input type="range" class="range" min="60" max="180" value="100" aria-label="BPM">
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
            ${[['Hip Hop', 92], ['Popping', 100], ['Breaking', 112], ['Locking', 108], ['House', 124]].map(([n, v]) => `<button class="btn sm preset" data-v="${v}">${n} ${v}</button>`).join('')}
          </div>
          <button class="btn teal play">▶ 開始節拍器</button>
        </div>
      </div>
      <div class="count8">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<i>${n}</i>`).join('')}</div>
      <div class="dance-floor"></div>`;
    const num = pane.querySelector('.bpm-num'), range = pane.querySelector('.range'), playBtn = pane.querySelector('.play');
    const floor = pane.querySelector('.dance-floor');
    const dancers = [PX.dancer(5), PX.dancer(6, { ...{ c: '#5bb5a6', s: '#f6c9a0', k: '#3b2b2b', w: '#fbe9d0', b: '#3b2b2b', y: '#fbe9d0', t: '#f07ca3', p: '#f07ca3' } }), PX.dancer(5, { c: '#eac45a', s: '#d9a27a', k: '#3b2b2b', w: '#fbe9d0', b: '#ef8a3a', y: '#7895df', t: '#7fcf73', p: '#f07ca3' })];
    dancers.forEach(d => floor.appendChild(d.el));
    const cells = [...pane.querySelectorAll('.count8 i')];
    let val = 100, timer = null, beat = 0, taps = [];
    const setBpm = v => { val = Math.round(Math.min(180, Math.max(60, v))); range.value = val; num.textContent = val; if (timer) { stop(); start(); } };
    const tick = () => {
      cells.forEach((c, i) => c.classList.toggle('on', i === beat % 8));
      beat % 4 === 0 ? SFX.play('kick') : beat % 2 === 0 ? SFX.play('snare') : SFX.play('hat');
      dancers.forEach((d, i) => { d.beat(); d.el.classList.toggle('boom', (beat + i) % 2 === 0); });
      beat++;
    };
    const start = () => { SFX.init(); beat = 0; tick(); timer = setInterval(tick, 60000 / val); playBtn.textContent = '■ 停止'; };
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = '▶ 開始節拍器'; cells.forEach(c => c.classList.remove('on')); };
    playBtn.onclick = () => (timer ? stop() : start());
    range.oninput = () => setBpm(+range.value);
    pane.querySelectorAll('.preset').forEach(b => b.onclick = () => { SFX.play('select'); setBpm(+b.dataset.v); });
    pane.querySelector('.tap-pad').onpointerdown = () => {
      SFX.play('hat');
      const t = performance.now();
      if (taps.length && t - taps[taps.length - 1] > 2000) taps = [];
      taps.push(t); taps = taps.slice(-8);
      dancers.forEach(d => d.beat());
      if (taps.length >= 2) {
        const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
        setBpm(60000 / avg);
      }
    };
    num.textContent = val;
    cleanup.push(stop);
  }

  function cypher(pane) {
    pane.innerHTML = `
      <label class="field"><span>輸入舞者名字（用換行或逗號分隔）</span>
        <textarea class="input names" rows="4" placeholder="例：小明, Bboy A, Popper B, Mina">小明, 阿凱, Bgirl Yu, Popper Leo, Mina, Kiki</textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn pink order-btn">🎲 排出場順序</button>
        <button class="btn orange vs-btn">⚔ 1 on 1 對戰表</button>
      </div>
      <div class="slot">READY?</div>
      <ol class="order"></ol>`;
    const slot = pane.querySelector('.slot'), out = pane.querySelector('.order');
    const names = () => pane.querySelector('.names').value.split(/[\n,，、]+/).map(s => s.trim()).filter(Boolean);
    const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const spin = (list, done) => {
      if (list.length < 2) { SFX.play('error'); toast('至少要兩個名字喔', '!'); return; }
      out.innerHTML = '';
      let n = 0;
      const t = setInterval(() => {
        slot.textContent = pick(list); SFX.play('blip');
        if (++n > 18) { clearInterval(t); SFX.play('fanfare'); done(shuffle(list)); }
      }, 60 + n * 4);
    };
    pane.querySelector('.order-btn').onclick = () => spin(names(), list => {
      slot.textContent = `第一位：${list[0]}！`;
      out.innerHTML = list.map((n, i) => `<li style="--i:${i}"><b>${pad(i + 1)}</b>${esc(n)}</li>`).join('');
    });
    pane.querySelector('.vs-btn').onclick = () => spin(names(), list => {
      const pairs = [];
      for (let i = 0; i < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
      slot.textContent = 'BATTLE START!';
      out.innerHTML = pairs.map(([a, b], i) => `<li style="--i:${i}"><b>R${i + 1}</b>${esc(a)} <span class="vs">VS</span> ${b ? esc(b) : '<i>（輪空晉級）</i>'}</li>`).join('');
    });
  }
  const pad = n => String(n).padStart(2, '0');

  const TABS = [['gacha', '🃏 動作抽卡', gacha], ['bpm', '🥁 節拍道場', bpm], ['cypher', '🎲 Cypher 輪盤', cypher]];

  function open(which = 'gacha') {
    const cleanup = [];
    const body = h(`<div><div class="tabs">${TABS.map(([k, n]) => `<button class="btn sm" data-k="${k}">${n}</button>`).join('')}</div><div class="game-pane"></div></div>`);
    const pane = body.querySelector('.game-pane');
    const show = k => {
      cleanup.splice(0).forEach(f => f());
      body.querySelectorAll('.tabs .btn').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      TABS.find(t => t[0] === k)[2](pane, cleanup);
    };
    body.querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { SFX.play('select'); show(b.dataset.k); } };
    modal({ title: '🎮 街舞小遊戲 MINI GAMES', color: 'blue', body, wide: true, onClose: () => cleanup.forEach(f => f()) });
    show(which);
  }

  return { open };
})();
