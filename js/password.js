/* =========================================================
 * 改密碼
 * - 「我的」角色視窗裡有「改密碼」按鈕
 * - 封測帳號（密碼是預設的）登入後，凱琳會提醒、直接打開改密碼視窗，改好才不會再提醒
 * ========================================================= */
window.Password = (() => {
  const { h, esc, modal, toast, npc } = UI;
  I18N.extend({
    zh: { pw_btn: '改密碼', pw_title: '改密碼', pw_new: '新密碼（至少 6 個字）', pw_again: '再輸入一次新密碼', pw_go: '確定修改', pw_short: '密碼至少要 6 個字', pw_diff: '兩次輸入的密碼不一樣', pw_ok: '密碼改好了！下次請用新密碼登入', pw_first: '這是封測帳號的預設密碼，別人可能猜得到。請先換一個只有你知道的新密碼！', pw_hi: '{n}，歡迎來到舞島！為了保護你的帳號，先來改一下密碼吧～' },
    en: { pw_btn: 'Change password', pw_title: 'Change password', pw_new: 'New password (6+ characters)', pw_again: 'Type it again', pw_go: 'Change', pw_short: 'At least 6 characters', pw_diff: 'The two passwords don’t match', pw_ok: 'Password changed! Use the new one next time.', pw_first: 'This is the default beta password and others could guess it. Please set a new one only you know!', pw_hi: 'Welcome to Booto, {n}! To keep your account safe, let’s change your password first.' },
    ja: { pw_btn: 'パスワード変更', pw_title: 'パスワード変更', pw_new: '新しいパスワード（6 文字以上）', pw_again: 'もう一度入力', pw_go: '変更する', pw_short: '6 文字以上にしてね', pw_diff: '2 つのパスワードが違います', pw_ok: 'パスワードを変更しました！次から新しいパスワードでログインしてね', pw_first: 'これはベータ版の初期パスワードで、他の人に推測されるかも。自分だけが知っている新しいパスワードにしてね！', pw_hi: '{n}、舞島へようこそ！アカウントを守るため、まずパスワードを変えよう～' },
    ko: { pw_btn: '비밀번호 변경', pw_title: '비밀번호 변경', pw_new: '새 비밀번호 (6자 이상)', pw_again: '한 번 더 입력', pw_go: '변경하기', pw_short: '6자 이상이어야 해요', pw_diff: '두 비밀번호가 달라요', pw_ok: '비밀번호를 바꿨어요! 다음부터 새 비밀번호로 로그인하세요', pw_first: '베타 계정의 기본 비밀번호라 다른 사람이 알 수도 있어요. 나만 아는 새 비밀번호로 바꿔 주세요!', pw_hi: '{n}, Booto에 온 걸 환영해! 계정을 지키기 위해 먼저 비밀번호를 바꾸자~' }
  });

  let opened = null;
  function open() {
    if (!Backend.enabled || !Player.me || opened) return;
    const forced = Backend.mustChangePw, id = Player.me.id;
    const body = h(`<form class="form" novalidate>
      ${forced ? `<p class="full note pw-first">⚠ ${esc(t('pw_first'))}</p>` : ''}
      <label class="field full"><span>${esc(t('pw_new'))}</span><input class="input" name="a" type="password" autocomplete="new-password"></label>
      <label class="field full"><span>${esc(t('pw_again'))}</span><input class="input" name="b" type="password" autocomplete="new-password"></label>
      <input type="text" name="username" value="${esc(id)}" autocomplete="username" hidden>
      <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn pink">🔑 ${esc(t('pw_go'))}</button></div></div></form>`);
    const m = modal({ title: t('pw_title'), color: 'yellow', body, onClose: () => { opened = null; } });
    opened = m;
    const err = body.querySelector('.err'), btn = body.querySelector('button');
    setTimeout(() => body.elements.a.focus(), 80);
    body.onsubmit = async ev => {
      ev.preventDefault();
      const a = body.elements.a.value, b = body.elements.b.value;
      if (a.length < 6) { err.textContent = '✕ ' + t('pw_short'); return; }
      if (a !== b) { err.textContent = '✕ ' + t('pw_diff'); return; }
      btn.disabled = true;
      try { await Backend.changePassword(a); }
      catch (x) { btn.disabled = false; SFX.play('error'); err.textContent = '✕ ' + x.message; return; }
      opened = null; m.close(); SFX.play('coin'); toast(t('pw_ok'), '🔑');
    };
  }

  // 封測帳號：登入後提醒改密碼（每次登入都會提醒，直到改好）
  let nagged = null;
  function check() {
    if (!Backend.enabled || !Player.me || !Backend.mustChangePw || nagged === Player.me.id) return;
    nagged = Player.me.id;
    setTimeout(() => {
      if (document.querySelector('.modal-back, .vip-ov') || (window.VIP && (VIP.running || Backend.vipWelcome))) { nagged = null; return setTimeout(check, 4000); }
      npc.say([{ text: t('pw_hi', { n: Player.me.name }), mood: 'celebrate' }], open);
    }, 1500);
  }
  if (Backend.enabled) Backend.ready.then(() => Player.ready || null).then(() => { check(); Player.onChange(() => setTimeout(check, 300)); });
  return { open, check };
})();
