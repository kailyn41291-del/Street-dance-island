/* =========================================================
 * 封測名人的隆重歡迎（只在第一次登入時出現一次）
 * 1. 全螢幕紅毯＋聚光燈＋閃光燈：「哇！是超級名人「名字」耶！」
 * 2. 凱琳和 Choco 導覽名人專屬的東西：封測名人稱號、本人造型、隱私保護
 * 哪些人會看到：資料庫在帳號上標記 vip_welcome（第 34 批 SQL），看完就關掉
 * ========================================================= */
window.VIP = (() => {
  const { h, esc, npc, toast } = UI;
  I18N.extend({
    zh: {
      vip_wow: '哇！', vip_is: '是超級名人', vip_ye: '耶！', vip_crowd: '全島都在尖叫！', vip_go: '▶ 走上紅毯',
      vip_t: [
        '{n}！！我、我可以跟你拍照嗎！(☆▽☆) 歡迎來到舞島！',
        '你是第一批受邀來舞島的名人喔，現在網站還沒對外公開，你看到的都是搶先版！',
        '為了歡迎你，我們準備了只有封測名人才有的稱號「封測名人」，已經放進你的稱號裡了！',
        '名人最怕被陌生人打擾對吧？到「我的名片 → 搜尋與隱私」，可以決定誰能加你好友、隱藏上線狀態、只讓好友回覆你的貼文。',
        '發現怪怪的地方或有什麼想法，直接告訴我們，你的意見會讓舞島變得更好！'
      ],
      vip_skin: '還有還有！我們照你本人畫了一套專屬造型，到「編輯角色 → 特別」就能換上，全島只有你有喔！',
      vip_q: '要先做什麼呢？', vip_wear: '戴上「封測名人」稱號', vip_skin_go: '換上本人造型', vip_priv: '看看隱私設定', vip_later: '先逛逛',
      vip_worn: '戴上「封測名人」了！'
    },
    en: {
      vip_wow: 'WOW!', vip_is: 'It’s superstar', vip_ye: '!!', vip_crowd: 'The whole island is screaming!', vip_go: '▶ Walk the red carpet',
      vip_t: [
        '{n}!! C-can I get a photo with you?! (☆▽☆) Welcome to Booto!',
        'You’re one of the first stars invited to Booto. The site isn’t public yet — everything you see is a sneak peek!',
        'To welcome you, we made a title only beta stars have: “Beta Star”. It’s already in your titles!',
        'Stars don’t want strangers bugging them, right? In “My card → Search & privacy” you can choose who can add you, hide your online status, and let only friends reply to your posts.',
        'If anything looks off or you have ideas, just tell us — your feedback makes Booto better!'
      ],
      vip_skin: 'And there’s more! We drew a special look based on the real you. Find it in “Edit character → Special” — only you have it!',
      vip_q: 'What first?', vip_wear: 'Wear the “Beta Star” title', vip_skin_go: 'Wear my real-me look', vip_priv: 'Check privacy settings', vip_later: 'Look around first',
      vip_worn: 'You’re wearing “Beta Star” now!'
    },
    ja: {
      vip_wow: 'わぁ！', vip_is: '超有名人の', vip_ye: 'だ！', vip_crowd: '島じゅうが大興奮！', vip_go: '▶ レッドカーペットへ',
      vip_t: [
        '{n}さん！！い、一緒に写真いいですか！(☆▽☆) 舞島へようこそ！',
        'あなたは舞島に最初に招待されたスターのひとり。まだ一般公開前なので、見ているのは全部先行版です！',
        '歓迎のしるしに、βテストのスターだけの称号「βテストのスター」を用意しました。もう称号に入っています！',
        '知らない人に邪魔されたくないですよね？「マイ名刺 → 検索とプライバシー」で、フレンド申請できる人、オンライン表示、投稿への返信をフレンドだけにする設定ができます。',
        '気になるところやアイデアがあったら、ぜひ教えてください。あなたの声で舞島はもっとよくなります！'
      ],
      vip_skin: 'さらに！あなた本人をモデルにした特別な見た目を描きました。「キャラ編集 → スペシャル」で着替えられます。島であなただけ！',
      vip_q: 'まず何をする？', vip_wear: '「βテストのスター」をつける', vip_skin_go: '本人の見た目に着替える', vip_priv: 'プライバシー設定を見る', vip_later: 'まずは見て回る',
      vip_worn: '「βテストのスター」をつけました！'
    },
    ko: {
      vip_wow: '와!', vip_is: '슈퍼스타', vip_ye: '다!', vip_crowd: '섬 전체가 난리 났어요!', vip_go: '▶ 레드카펫 걷기',
      vip_t: [
        '{n}!! 저, 저랑 사진 한 장만요! (☆▽☆) 무도에 온 걸 환영해요!',
        '당신은 무도에 처음 초대된 스타 중 한 명이에요. 아직 공개 전이라 지금 보는 건 전부 미리보기예요!',
        '환영 선물로 베타 스타만 가질 수 있는 칭호 「베타 스타」를 준비했어요. 벌써 칭호에 들어 있어요!',
        '모르는 사람이 귀찮게 하면 싫잖아요? 「내 카드 → 검색과 개인정보」에서 친구 요청 받을 사람, 접속 상태 숨기기, 친구만 댓글 달기를 설정할 수 있어요.',
        '이상한 점이나 아이디어가 있으면 바로 알려 주세요. 당신의 의견이 무도를 더 좋게 만들어요!'
      ],
      vip_skin: '그리고 또 있어요! 실제 당신을 모델로 특별한 모습을 그렸어요. 「캐릭터 편집 → 스페셜」에서 바꿀 수 있어요. 섬에서 당신만 가지고 있어요!',
      vip_q: '먼저 뭘 할까요?', vip_wear: '「베타 스타」 칭호 달기', vip_skin_go: '본인 모습으로 바꾸기', vip_priv: '개인정보 설정 보기', vip_later: '먼저 둘러보기',
      vip_worn: '「베타 스타」를 달았어요!'
    }
  });

  let running = false;
  const busy = () => document.querySelector('#boot, .modal-back, .tut, #npc:not(.hidden)');
  const mySkin = () => { const me = Player.me; try { return Avatar.skinsFor(Backend.role, me && me.id)[0] || null; } catch (e) { return null; } };

  /* 第 1 幕：紅毯 */
  function stage(name) {
    return new Promise(res => {
      const ov = h(`<div class="vip-ov" role="dialog" aria-label="VIP">
        <div class="vip-beams"><i></i><i></i><i></i></div>
        <div class="vip-flash"></div>
        <div class="vip-confetti"></div>
        <div class="vip-in">
          <div class="vip-wow">${esc(t('vip_wow'))}</div>
          <div class="vip-line">${esc(t('vip_is'))}<b class="vip-name">「${esc(name)}」</b>${esc(t('vip_ye'))}</div>
          <div class="vip-stage"><div class="vip-av"></div><div class="vip-carpet"></div></div>
          <div class="vip-crowd">${esc(t('vip_crowd'))}</div>
          <button class="btn pink vip-go">${esc(t('vip_go'))}</button>
        </div></div>`);
      // 主角
      try { const d = Avatar.dancer(4, (Player.me && Player.me.look) || Avatar.DEFAULT); ov.querySelector('.vip-av').appendChild(d.el); const tm = setInterval(() => (ov.isConnected ? d.beat() : clearInterval(tm)), 380); } catch (e) {}
      // 彩帶
      const cf = ov.querySelector('.vip-confetti'), cols = ['#ff7ac8', '#ffd65c', '#7fd8ff', '#9ef0a0', '#ffffff', '#c59bff'];
      for (let i = 0; i < 70; i++) {
        const p = document.createElement('i');
        p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${(Math.random() * 3).toFixed(2)}s;animation-duration:${(2.6 + Math.random() * 2.4).toFixed(2)}s;transform:rotate(${Math.floor(Math.random() * 360)}deg)`;
        cf.appendChild(p);
      }
      document.body.appendChild(ov);
      // 閃光燈＋歡呼
      SFX.play('fanfare');
      let n = 0; const fl = ov.querySelector('.vip-flash');
      const flashes = setInterval(() => {
        if (!ov.isConnected || ++n > 14) return clearInterval(flashes);
        fl.style.left = Math.random() * 90 + '%'; fl.style.top = Math.random() * 70 + '%';
        fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
        if (n % 3 === 0) SFX.play('coin');
      }, 260);
      setTimeout(() => { try { UI.sparkle(innerWidth / 2, innerHeight / 2.6, 30); } catch (e) {} }, 500);
      ov.querySelector('.vip-go').onclick = () => {
        SFX.play('confirm'); clearInterval(flashes);
        ov.classList.add('out'); setTimeout(() => { ov.remove(); res(); }, 450);
      };
    });
  }

  /* 第 2 幕：導覽 */
  async function tour(name) {
    const L = t('vip_t'), skin = mySkin();
    const lines = [
      { who: 'kailyn', mood: 'surprised', text: L[0].replace('{n}', name) },
      { who: 'choco', mood: 'cool', text: L[1] },
      { who: 'kailyn', mood: 'celebrate', text: L[2] }
    ];
    if (skin) lines.push({ who: 'choco', mood: 'thumbs', text: t('vip_skin') });
    lines.push({ who: 'kailyn', mood: 'ok', text: L[3] }, { who: 'choco', mood: 'love', text: L[4] }, { who: 'kailyn', mood: 'cheer', text: t('vip_q') });
    const opts = [{ label: t('vip_wear'), value: 'wear' }];
    if (skin) opts.push({ label: t('vip_skin_go'), value: 'skin' });
    opts.push({ label: t('vip_priv'), value: 'priv' }, { label: t('vip_later'), value: 'later' });
    const v = await npc.ask(lines, opts);
    if (v === 'wear') {
      try { await Backend.saveProfile({ title: 'r_vip' }); if (Player.me) Player.me.title = 'r_vip'; SFX.play('fanfare'); toast(t('vip_worn'), '★'); } catch (e) { toast(e.message, '✕'); }
    } else if (v === 'skin') Player.openMenu('special');
    else if (v === 'priv') Friends.openCardEditor();
  }

  async function run(force) {
    if (running) return;
    if (!force && !(Backend.enabled && Player.me && Backend.vipWelcome)) return;
    if (busy()) return setTimeout(() => run(force), 3000);
    running = true;
    const name = (Player.me && Player.me.name) || '';
    try {
      await stage(name);
      if (!force) Backend.vipWelcomeDone().catch(() => {});   // 看過就不再出現
      await tour(name);
    } finally { running = false; }
  }

  if (Backend.enabled) Backend.ready.then(() => Player.ready || null).then(() => { setTimeout(run, 1200); Player.onChange(() => setTimeout(run, 600)); });
  return { run, get running() { return running; } };
})();
