/* =========================================================
 * 共用 UI：視窗、對話框（NPC）、提示、轉場、火花
 * ========================================================= */
window.UI = (() => {
  const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = PX.ICONS;

  /* 視窗 */
  const winHTML = (title, color = '', ctrls = true) => `
    <div class="win-title ${color}"><span class="t">${title}</span>
      ${ctrls ? `<div class="win-ctrls"><span>_</span><span>□</span><button class="x" aria-label="${t('close')}">×</button></div>` : ''}
    </div>`;

  /* 彈出視窗 */
  function modal({ title, color = 'orange', body, wide = false, onClose }) {
    SFX.play('open');
    const back = h(`<div class="modal-back"><div class="win modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      ${winHTML(title, color)}<div class="win-body"></div></div></div>`);
    const win = back.querySelector('.modal');
    const bodyEl = back.querySelector('.win-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      SFX.play('cancel');
      win.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { back.remove(); onClose && onClose(); }, 200);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
    back.querySelector('.x').onclick = close;
    document.body.appendChild(back);
    const f = bodyEl.querySelector('input, select, textarea, button');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 300);
    return { el: bodyEl, close };
  }

  /* NPC 嚮導對話框：逐字打字效果 */
  const npc = (() => {
    let box, txt, timer, queue = [], typing = false, full = '', done;
    const face = PX.dancer(4);
    setInterval(() => { if (box && !box.classList.contains('hidden')) face.beat(); }, 380);
    const ensure = () => {
      if (box) return;
      box = h(`<div id="npc" class="hidden" role="status"><div class="face"></div>
        <div><div class="who">${t('guide')}</div><div class="txt"></div></div><div class="next">▼</div></div>`);
      box.querySelector('.face').appendChild(face.el);
      txt = box.querySelector('.txt');
      box.onclick = advance;
      document.body.appendChild(box);
    };
    const type = line => {
      full = line; let i = 0; typing = true; txt.textContent = '';
      clearInterval(timer);
      timer = setInterval(() => {
        txt.textContent = full.slice(0, ++i);
        if (i % 2) SFX.play('blip');
        if (i >= full.length) { clearInterval(timer); typing = false; }
      }, 32);
    };
    function advance() {
      if (box.classList.contains('hidden')) return;
      if (typing) { clearInterval(timer); txt.textContent = full; typing = false; return; }
      if (queue.length) type(queue.shift());
      else { box.classList.add('hidden'); const cb = done; done = null; cb && cb(); }
    }
    return {
      say(lines, cb) {
        ensure();
        box.querySelector('.who').textContent = t('guide');
        queue = [].concat(lines); done = cb;
        box.classList.remove('hidden');
        box.style.animation = 'none'; box.offsetHeight; box.style.animation = '';
        type(queue.shift());
      },
      hide() { if (box) box.classList.add('hidden'); clearInterval(timer); }
    };
  })();

  /* 道具獲得提示 */
  function toast(msg, ic = '★') {
    let wrap = document.getElementById('toasts');
    if (!wrap) { wrap = h('<div id="toasts"></div>'); document.body.appendChild(wrap); }
    const t = h(`<div class="toast"><span class="ic">${ic}</span><span>${esc(msg)}</span></div>`);
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  /* 火花 */
  function sparkle(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'sparkle';
      const a = (Math.PI * 2 * i) / n, r = 30 + Math.random() * 30;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--x', Math.cos(a) * r + 'px');
      s.style.setProperty('--y', Math.sin(a) * r + 'px');
      s.style.background = ['#eac45a', '#f07ca3', '#5bb5a6', '#fff'][i % 4];
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 650);
    }
  }

  /* 像素方塊轉場 */
  function wipe(mid) {
    const el = document.getElementById('wipe');
    const size = 56;
    const cols = Math.ceil(innerWidth / size), rows = Math.ceil(innerHeight / size);
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    el.innerHTML = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = document.createElement('i'); i.style.setProperty('--d', (x + y) * 14 + 'ms'); el.appendChild(i);
    }
    const total = (cols + rows) * 14 + 240;
    el.className = 'in';
    SFX.play('warp');
    setTimeout(() => {
      mid();
      el.className = 'out';
      setTimeout(() => { el.className = ''; el.innerHTML = ''; }, total);
    }, total);
  }

  /* 下載檔案 */
  function download(name, text, type = 'text/javascript') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return { h, esc, I, winHTML, modal, npc, toast, sparkle, wipe, download };
})();
