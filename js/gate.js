/* =========================================================
 * 網站暫時不公開：只有管理員帳號（網站架設者、bboychoco）能進來
 * 其他人只會看到「準備中」畫面和登入框
 * 要重新公開：把 PRIVATE 改成 false
 * ========================================================= */
window.Gate = (() => {
  const PRIVATE = true;
  I18N.extend({
    zh: { gt_title: '舞島準備中', gt_text: '舞島還在準備中，目前只開放給管理員。敬請期待！', gt_id: '玩家 ID 或 Email', gt_pass: '密碼', gt_go: '管理員登入', gt_no: '這個帳號沒有開啟權限', gt_bad: '帳號或密碼不對', gt_wait: '登入中…' },
    en: { gt_title: 'Dance Island is coming soon', gt_text: 'Dance Island is still getting ready and is only open to admins for now. Stay tuned!', gt_id: 'Player ID or email', gt_pass: 'Password', gt_go: 'Admin sign in', gt_no: 'This account does not have access', gt_bad: 'Wrong ID or password', gt_wait: 'Signing in…' },
    ja: { gt_title: '舞島 準備中', gt_text: '舞島はただいま準備中で、管理者のみ利用できます。お楽しみに！', gt_id: 'プレイヤー ID またはメール', gt_pass: 'パスワード', gt_go: '管理者ログイン', gt_no: 'このアカウントには権限がありません', gt_bad: 'ID かパスワードが違います', gt_wait: 'ログイン中…' },
    ko: { gt_title: '무도 준비 중', gt_text: '무도는 아직 준비 중이라 지금은 관리자만 들어올 수 있어요. 기대해 주세요!', gt_id: '플레이어 ID 또는 이메일', gt_pass: '비밀번호', gt_go: '관리자 로그인', gt_no: '이 계정은 권한이 없어요', gt_bad: 'ID 또는 비밀번호가 틀렸어요', gt_wait: '로그인 중…' }
  });
  if (!PRIVATE || !Backend.enabled) return { open: true };

  let el = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function show() {
    if (el) return;
    document.documentElement.classList.add('gated');
    el = document.createElement('div');
    el.id = 'gate';
    el.innerHTML = `<div class="win"><div class="win-title yellow"><span class="t">dance_island.exe</span><div class="win-ctrls"><span>_</span><span>□</span><span>×</span></div></div>
      <div class="win-body">
        <img class="gate-logo" src="assets/logo.webp?v=1" alt="舞島 Dance Island">
        <h2>${esc(t('gt_title'))}</h2><p>${esc(t('gt_text'))}</p>
        <form class="gate-form" novalidate>
          <input class="input" name="id" placeholder="${esc(t('gt_id'))}" autocapitalize="off" spellcheck="false" autocomplete="username">
          <input class="input" name="pass" type="password" placeholder="${esc(t('gt_pass'))}" autocomplete="current-password">
          <div class="err"></div>
          <button class="btn pink" type="submit">${esc(t('gt_go'))}</button>
        </form>
      </div></div>`;
    document.body.appendChild(el);
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
