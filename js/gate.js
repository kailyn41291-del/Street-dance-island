/* =========================================================
 * 網站暫時不公開：只有管理員帳號（網站架設者、bboychoco）能進來
 * 其他人只會看到「準備中」畫面和登入框
 * 要重新公開：把 PRIVATE 改成 false
 * ========================================================= */
window.Gate = (() => {
  const PRIVATE = true;
  I18N.extend({
    zh: { gt_title: '舞島準備中', gt_text: '冒險者你好！舞島正在準備中，目前只開放給管理員。冒險就快開始了，敬請期待！', gt_id: '玩家 ID 或 Email', gt_pass: '密碼', gt_go: '管理員登入', gt_no: '這個帳號沒有開啟權限', gt_bad: '帳號或密碼不對', gt_wait: '登入中…' },
    en: { gt_title: 'Booto is coming soon', gt_text: 'Booto is still getting ready and is only open to admins for now. Stay tuned!', gt_id: 'Player ID or email', gt_pass: 'Password', gt_go: 'Admin sign in', gt_no: 'This account does not have access', gt_bad: 'Wrong ID or password', gt_wait: 'Signing in…' },
    ja: { gt_title: '舞島 準備中', gt_text: '舞島はただいま準備中で、管理者のみ利用できます。お楽しみに！', gt_id: 'プレイヤー ID またはメール', gt_pass: 'パスワード', gt_go: '管理者ログイン', gt_no: 'このアカウントには権限がありません', gt_bad: 'ID かパスワードが違います', gt_wait: 'ログイン中…' },
    ko: { gt_title: 'Booto 준비 중', gt_text: 'Booto는 아직 준비 중이라 지금은 관리자만 들어올 수 있어요. 기대해 주세요!', gt_id: '플레이어 ID 또는 이메일', gt_pass: '비밀번호', gt_go: '관리자 로그인', gt_no: '이 계정은 권한이 없어요', gt_bad: 'ID 또는 비밀번호가 틀렸어요', gt_wait: '로그인 중…' }
  });
  // 本機測試用：只有在自己電腦（localhost）網址加 ?gate=off 才會跳過，正式網站沒有作用
  const devOpen = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]gate=off\b/.test(location.search);
  if (!PRIVATE || !Backend.enabled || devOpen) return { open: true };

  let el = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function show() {
    if (el) return;
    // 等整個網頁的程式都載入完（節日判斷要用到）再畫
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', show, { once: true }); return; }
    document.documentElement.classList.add('gated');
    el = document.createElement('div');
    el.id = 'gate';
    // 有節日美術就用節日主題（橫幅當背景、凱琳巧可穿節日裝、飄落小東西）
    let f0 = null; try { f0 = window.Festivals && Festivals.look ? Festivals.look() : null; } catch (e) {}
    const art = n => (f0 ? Festivals.art(f0, n) : '');
    const ACC = { xmas: '#d9534f', newyear: '#eac45a', lunar: '#d9534f', halloween: '#f08c3a', valentine: '#f07ca3', moon: '#eac45a', hiphop: '#7895df', danceday: '#f07ca3' };
    // 全螢幕底圖：電腦用寬圖、手機用直圖；沒有節日就用平常版
    const bgKey = f0 || 'default';
    el.classList.add('gate-bg');
    el.style.setProperty('--gbw', `url('${new URL(`assets/login_bg/${bgKey}_wide.webp?v=1`, location.href).href}')`);
    el.style.setProperty('--gbt', `url('${new URL(`assets/login_bg/${bgKey}_tall.webp?v=1`, location.href).href}')`);
    if (f0) { el.classList.add('gate-fest'); el.style.setProperty('--fs-c', ACC[f0] || '#f07ca3'); }
    const face = f0 ? art('kailyn_face.webp') : 'assets/kailyn/cheer.webp?v=2';
    el.innerHTML = `<div class="gate-shade"></div>
      <div class="gate-main">
        <img class="gate-logo" src="assets/logo.webp?v=2" alt="舞島 Booto">
        <h1 class="gate-big" aria-label="Coming soon"><span>COMING</span><span>SOON</span></h1>
        <div class="gate-sub">NOW LOADING<span class="gate-dots">...</span></div>
        <div class="gate-bar" aria-hidden="true">${'<i></i>'.repeat(20)}</div>
        <div class="gate-pct">STAGE 1 &nbsp;·&nbsp; <b>87</b>%</div>
      </div>
      ${f0 ? `<img class="gate-k" src="${art('kailyn.webp')}" alt=""><img class="gate-c" src="${art('choco.webp')}" alt="">` : ''}
      <div class="gate-dlg">
        <div class="gate-face"><img src="${face}" alt="Kailyn"></div>
        <div class="gate-say"><div class="who">${esc(t('guide'))}</div><div class="txt"></div></div>
        <div class="next">▼</div>
      </div>
      <button class="gate-admin" type="button">▶ ADMIN</button>
      <div class="gate-login win" hidden><div class="win-title yellow"><span class="t">${esc(t('gt_go'))}</span></div><div class="win-body">
        <form class="gate-form" novalidate>
          <input class="input" name="id" placeholder="${esc(t('gt_id'))}" autocapitalize="off" spellcheck="false" autocomplete="username">
          <input class="input" name="pass" type="password" placeholder="${esc(t('gt_pass'))}" autocomplete="current-password">
          <div class="err"></div>
          <button class="btn pink" type="submit">${esc(t('gt_go'))}</button>
        </form></div></div>`;
    document.body.appendChild(el);
    // 對話框逐字打出來
    const txt = el.querySelector('.gate-say .txt'), line = t('gt_text'); let i = 0;
    const tick = () => { txt.textContent = line.slice(0, ++i); if (i < line.length) setTimeout(tick, 55); };
    setTimeout(tick, 500);
    // 進度條：卡在快完成的地方慢慢跳（準備中的感覺）
    const bars = el.querySelectorAll('.gate-bar i'), pct = el.querySelector('.gate-pct b');
    let p = 80; const step = () => { p = p >= 99 ? 80 : p + 1 + Math.floor(Math.random() * 3); pct.textContent = Math.min(p, 99); bars.forEach((b, k) => b.classList.toggle('on', k < Math.round(Math.min(p, 99) / 5))); };
    step(); setInterval(step, 900);
    // 飄落小東西
    if (f0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const fx = document.createElement('div'); fx.className = 'fs-fx';
      for (let k = 0; k < (innerWidth < 760 ? 10 : 18); k++) {
        const im = document.createElement('img'); im.alt = ''; im.src = art(`fx_${(k % 3) + 1}.png`);
        const dur = 10 + Math.random() * 9, sz = 22 + Math.round(Math.random() * 12);
        im.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${sz}px;height:${sz}px;animation-duration:${dur.toFixed(1)}s,${(2.5 + Math.random() * 2).toFixed(1)}s;animation-delay:${(-Math.random() * dur).toFixed(1)}s,0s`;
        fx.appendChild(im);
      }
      el.insertBefore(fx, el.querySelector('.gate-main'));
    }
    // 管理員登入：點右下角才打開
    const login = el.querySelector('.gate-login');
    el.querySelector('.gate-admin').onclick = () => { login.hidden = !login.hidden; if (!login.hidden) login.querySelector('input').focus(); };
    const f = el.querySelector('form'), err = el.querySelector('.err'), btn = f.querySelector('button');
    f.onsubmit = async ev => {
      ev.preventDefault();
      const id = f.elements.namedItem('id').value.trim(), pass = f.elements.namedItem('pass').value;
      if (!id || !pass) return;
      err.textContent = ''; btn.disabled = true; btn.textContent = t('gt_wait');
      try {
        if (id.includes('@')) await Backend.signInAdmin(id, pass);
        else await Backend.signInPlayer(id.toLowerCase(), pass);
        if (!Backend.isAdmin) { await Backend.signOut(); throw new Error('no access'); }
        location.reload();
      } catch (x) {
        err.textContent = /no access|not admin/.test(String(x && x.message)) ? t('gt_no') : t('gt_bad');
        btn.disabled = false; btn.textContent = t('gt_go');
      }
    };
  }
  // 不是管理員：蓋上準備中畫面
  const check = () => {
    if (Backend.isAdmin) return;
    show();
  };
  const real = Backend.ready;
  real.then(check, show);
  // 網站其他部分都等 Backend.ready 才開始（抓資料、在線人數、聊天…）
  // 不是管理員就永遠不放行，所以完全不會連線、也不會被算進在線人數
  Backend.ready = real.then(() => (Backend.isAdmin ? undefined : new Promise(() => {})));
  // 管理員登出後也關起來
  Backend.onChange(() => { if (!Backend.isAdmin && Backend.uid === null) setTimeout(check, 0); });
  return { get open() { return !el; } };
})();
