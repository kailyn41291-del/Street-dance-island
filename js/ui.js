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

  /* 嚮導 Kailyn：一般用全身形象，對話框裡依照說的話換表情 */
  const Kailyn = (() => {
    const MOODS = ['happy', 'smug', 'angry', 'sad', 'surprised', 'shy', 'laugh', 'cry', 'helpless', 'confused', 'cool', 'thumbs', 'love', 'cheer', 'celebrate', 'sleepy', 'daze', 'tsundere', 'please', 'ok'];
    const url = m => `assets/kailyn/${MOODS.includes(m) ? m : 'happy'}.webp?v=2`;
    const FULL = 'assets/kailyn/full.webp?v=2';
    // 預先載入，換表情時不會閃
    const preload = () => [...MOODS.map(url), FULL].forEach(u => { const i = new Image(); i.src = u; });
    // 沒有指定表情時，依照句子內容猜
    const RULES = [
      [/恭喜|成功|升級|完成|太棒|獲得|congrat|level up|success|unlock|おめでとう|成功|축하|성공/i, 'celebrate'],
      [/歡迎|嗨|你好|welcome|hi[!！]|hello|ようこそ|やあ|환영|안녕/i, 'happy'],
      [/截止|提醒|注意|別忘|記得|小心|remember|don't forget|closes|careful|締切|注意|忘れ|마감|주의|잊지/i, 'surprised'],
      [/[?？]/, 'confused'],
      [/輸了|失敗|錯誤|可惜|沒辦法|lost|failed|sorry|残念|負け|졌|실패/i, 'cry'],
      [/加油|挑戰|一起|go!|let's|頑張|がんば|화이팅|가자/i, 'cheer'],
      [/謝謝|愛|thank|love|ありがとう|고마워|사랑/i, 'love'],
      [/新增|登錄|按|點|tap|click|press|押して|タップ|눌러/i, 'thumbs']
    ];
    const guess = text => { for (const [re, m] of RULES) if (re.test(text)) return m; return ['happy', 'smug', 'ok', 'cool'][text.length % 4]; };
    return { MOODS, url, FULL, preload, guess };
  })();

  /* 自動翻譯：任何標了 data-utr 的玩家發言，語言跟目前介面不同就在下面附上翻譯 */
  const autoTrOn = () => { try { return localStorage.getItem('danceIsland.autoTr') !== 'off'; } catch (e) { return true; } };
  function trScan(root) {
    if (!autoTrOn() || !window.Social || !root.querySelectorAll) return;
    const els = [...(root.matches && root.matches('[data-utr],[data-utr-src]') ? [root] : []), ...root.querySelectorAll('[data-utr],[data-utr-src]')];
    els.forEach(el => {
      if (el._tr === I18N.lang) return; el._tr = I18N.lang;
      const src = el.dataset.utrSrc != null ? el.dataset.utrSrc : el.textContent;
      if (!src || !src.trim()) return;
      Social.translate(src).then(tr => {
        if (!tr || !el.isConnected) return;
        const old = el.dataset.utrSrc != null ? el.querySelector('.tr') : (el.nextElementSibling && el.nextElementSibling.classList.contains('tr') ? el.nextElementSibling : null);
        if (old) old.remove();
        const d = document.createElement('div'); d.className = 'tr'; d.textContent = '🌐 ' + tr;
        if (el.dataset.utrSrc != null) el.appendChild(d); else el.after(d);
      });
    });
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) trScan(n); }))).observe(document.documentElement, { childList: true, subtree: true });
  window.trScan = trScan;

  /* 玩家做了某件事（每日任務用來算進度）：diAct('view') 之類 */
  window.diAct = (k, n = 1, ref = null) => { try { window.dispatchEvent(new CustomEvent('di:act', { detail: { k, n, ref } })); } catch (e) {} };

  /* 夥伴 Choco：對話框貼圖（24 種表情） */
  const Choco = (() => {
    const MOODS = ['cool', 'thumbs', 'think', 'laugh', 'love', 'angry', 'speechless', 'sleepy', 'confused', 'work', 'music', 'drink',
      'phone', 'peace', 'shh', 'tired', 'cheer', 'ok', 'hello', 'awkward', 'eat', 'sunglasses', 'surprised', 'lying'];
    // Kailyn 的表情名稱對應到 Choco 的
    const MAP = { happy: 'thumbs', smug: 'cool', sad: 'tired', shy: 'awkward', cry: 'tired', helpless: 'speechless', cool: 'sunglasses',
      celebrate: 'peace', daze: 'speechless', tsundere: 'cool', please: 'shh' };
    const pick = m => MOODS.includes(m) ? m : (MAP[m] || 'thumbs');
    const url = m => `assets/choco/${pick(m)}.webp`;
    const preload = () => MOODS.map(url).forEach(u => { const i = new Image(); i.src = u; });
    const guess = text => pick(Kailyn.guess(text));
    return { MOODS, url, preload, guess };
  })();
  const CAST = { kailyn: Kailyn, choco: Choco };
  const whoName = w => (w === 'choco' ? t('guide_choco') : t('guide'));
  // 一句台詞：文字，或 { text, mood, who }；who 是 'kailyn'（預設）或 'choco'
  const lineOf = (item, who) => {
    const o = typeof item === 'string' ? { text: item } : item;
    const w = o.who || who || 'kailyn', C = CAST[w];
    return { text: o.text, who: w, img: C.url(o.mood || C.guess(o.text)) };
  };

  /* NPC 嚮導對話框：逐字打字效果；lines 可以是文字，或 { text, mood, who }
     opt.duo = true：沒指定 who 的句子 Kailyn / Choco 輪流說 */

  const npc = (() => {
    let box, txt, timer, queue = [], typing = false, full = '', done, faceImg, choices = null, chEl;
    const ensure = () => {
      if (box) return;
      box = h(`<div id="npc" class="hidden" role="status"><div class="face k-face"><img alt="Kailyn" src="${Kailyn.url('happy')}"></div>
        <div class="npc-main"><div class="who">${t('guide')}</div><div class="txt"></div><div class="npc-choices" hidden></div></div><div class="next">▼</div></div>`);
      faceImg = box.querySelector('.face img');
      txt = box.querySelector('.txt'); chEl = box.querySelector('.npc-choices');
      box.onclick = e => {
        const c = e.target.closest('[data-ch]');
        if (c) { e.stopPropagation(); const v = choices[+c.dataset.ch].value; choices = null; chEl.hidden = true; box.classList.remove('asking'); box.classList.add('hidden'); SFX.play('confirm'); const cb = done; done = null; cb && cb(v); return; }
        advance();
      };
      document.body.appendChild(box);
    };
    const type = item => {
      const L = lineOf(item), line = L.text;
      faceImg.src = L.img; faceImg.alt = L.who === 'choco' ? 'Choco' : 'Kailyn';
      box.classList.toggle('choco', L.who === 'choco');
      box.querySelector('.who').textContent = whoName(L.who);
      faceImg.parentNode.classList.remove('pop'); void faceImg.offsetWidth; faceImg.parentNode.classList.add('pop');
      full = line; let i = 0; typing = true; txt.textContent = '';
      clearInterval(timer);
      timer = setInterval(() => {
        txt.textContent = full.slice(0, ++i);
        if (i % 2) SFX.play('blip');
        if (i >= full.length) { clearInterval(timer); typing = false; showChoices(); }
      }, 32);
    };
    // 最後一句講完 → 顯示選項（RPG 的「是 / 否」）
    const showChoices = () => {
      if (!choices || queue.length || typing) return;
      chEl.innerHTML = choices.map((c, i) => `<button class="npc-ch" data-ch="${i}">▶ ${esc(c.label)}</button>`).join('');
      chEl.hidden = false; box.classList.add('asking');
    };
    function advance() {
      if (box.classList.contains('hidden')) return;
      if (typing) { clearInterval(timer); txt.textContent = full; typing = false; showChoices(); return; }
      if (choices && !queue.length) return;   // 等玩家選
      if (queue.length) type(queue.shift());
      else { box.classList.add('hidden'); const cb = done; done = null; cb && cb(); }
    }
    return {
      say(lines, cb, opt = {}) {
        ensure();
        const first = opt.first || (opt.duo && Math.random() < 0.5 ? 'choco' : 'kailyn');
        queue = [].concat(lines).map((x, i) => {
          const o = typeof x === 'string' ? { text: x } : { ...x };
          if (!o.who) o.who = opt.duo ? (i % 2 ? (first === 'choco' ? 'kailyn' : 'choco') : first) : (opt.who || 'kailyn');
          return o;
        });
        done = cb; choices = opt.choices || null; chEl.hidden = true; chEl.innerHTML = ''; box.classList.remove('asking');
        box.classList.remove('hidden');
        box.style.animation = 'none'; box.offsetHeight; box.style.animation = '';
        type(queue.shift());
      },
      hide() { if (box) box.classList.add('hidden'); clearInterval(timer); choices = null; },
      /** 問玩家問題：ask(lines, [{ label, value }]) → Promise(value) */
      ask(lines, opts, opt = {}) { return new Promise(res => this.say(lines, res, { ...opt, choices: opts })); }
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
    const size = 64;
    const cols = Math.ceil(innerWidth / size), rows = Math.ceil(innerHeight / size);
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    el.innerHTML = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = document.createElement('i'); i.style.setProperty('--d', Math.round(((x + y) / (cols + rows)) * 260) + 'ms'); el.appendChild(i);
    }
    // 蓋上、打開各約 0.45 秒
    const total = 260 + 190;
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

  Kailyn.preload(); Choco.preload();
  return { h, esc, I, winHTML, modal, npc, toast, sparkle, wipe, download, Kailyn, Choco, lineOf, whoName };
})();
