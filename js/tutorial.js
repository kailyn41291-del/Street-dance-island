/* =========================================================
 * 新手教學：聚光燈 + 嚮導對話，一步一步介紹畫面
 * ========================================================= */
window.Tutorial = (() => {
  const { h } = UI;
  const KEY = 'danceIsland.seen.tutorial';
  // 每一步要亮起來的元素（null = 不指定，置中說明）
  const TARGETS = [null, null, '.isle.home', '.world-vp', '.world-menu', '.map-ctrls', '.hud-add', '.hud-game', '.hud-lang', '.hud-player'];
  // 每一步是誰在說話、用哪個表情（Kailyn / Choco 輪流，像 RPG 解任務）
  const CAST = [['kailyn', 'happy'], ['choco', 'hello'], ['kailyn', 'thumbs'], ['choco', 'cool'], ['kailyn', 'confused'],
    ['choco', 'ok'], ['kailyn', 'cheer'], ['choco', 'sunglasses'], ['kailyn', 'laugh'], ['choco', 'peace']];

  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } };
  const markSeen = () => { try { localStorage.setItem(KEY, 1); } catch (e) {} };

  function run(done) {
    const lines = t('tut').map(UI.kao);
    let i = 0, timer = null, typing = false;
    const ov = h(`<div class="tut"><div class="tut-spot"></div>
      <div class="tut-box"><div class="face"></div><div class="tut-main"><div class="who"></div><div class="txt"></div>
        <div class="tut-foot"><span class="dots"></span><span class="grow"></span><button class="btn sm skip">${t('tut_skip')}</button><button class="btn sm pink next"></button></div></div></div></div>`);
    const spot = ov.querySelector('.tut-spot'), txt = ov.querySelector('.txt'), next = ov.querySelector('.next'), dots = ov.querySelector('.dots');
    const faceBox = ov.querySelector('.face'); faceBox.classList.add('k-face');
    faceBox.innerHTML = `<img alt="Kailyn" src="${UI.Kailyn.url('happy')}">`;
    const faceImg = faceBox.querySelector('img');
    const beat = 0;
    document.body.appendChild(ov);

    const place = () => {
      const sel = TARGETS[i];
      const el = sel && [...document.querySelectorAll(sel)].find(e => e.offsetParent !== null || e.getClientRects().length);
      if (!el || sel === '.world-vp') { spot.classList.toggle('full', sel === '.world-vp'); spot.classList.toggle('none', !el); spot.style.cssText = ''; return; }
      spot.classList.remove('none', 'full');
      const r = el.getBoundingClientRect(), p = 8;
      Object.assign(spot.style, { left: r.left - p + 'px', top: r.top - p + 'px', width: r.width + p * 2 + 'px', height: r.height + p * 2 + 'px' });
    };
    const show = () => {
      place();
      const [who, mood] = CAST[i] || CAST[i % 2];
      faceImg.src = (who === 'choco' ? UI.Choco : UI.Kailyn).url(mood);
      ov.querySelector('.tut-box').classList.toggle('choco', who === 'choco');
      ov.querySelector('.who').textContent = `${UI.whoName(who)}　·　${t('tut_quest')} ${i + 1}/${lines.length}`;
      faceBox.classList.remove('pop'); void faceBox.offsetWidth; faceBox.classList.add('pop');
      dots.textContent = lines.map((_, k) => (k === i ? '●' : '○')).join('');
      next.textContent = i === lines.length - 1 ? t('tut_done') : t('tut_next');
      const full = lines[i]; let n = 0; typing = true;
      clearInterval(timer);
      timer = setInterval(() => {
        txt.textContent = full.slice(0, ++n);
        if (n % 2) SFX.play('blip');
        if (n >= full.length) { clearInterval(timer); typing = false; }
      }, 26);
      // 對話框避開聚光燈
      const r = spot.getBoundingClientRect();
      ov.classList.toggle('top', !spot.classList.contains('none') && !spot.classList.contains('full') && r.top > innerHeight * 0.5);
    };
    const end = () => {
      clearInterval(timer); clearInterval(beat);
      window.removeEventListener('resize', place);
      ov.classList.add('closing'); markSeen();
      setTimeout(() => { ov.remove(); done && done(); }, 220);
    };
    next.onclick = () => {
      if (typing) { clearInterval(timer); txt.textContent = lines[i]; typing = false; return; }
      SFX.play('select');
      if (++i >= lines.length) return end();
      show();
    };
    ov.querySelector('.skip').onclick = () => { SFX.play('cancel'); end(); };
    window.addEventListener('resize', place);
    show();
  }

  return { run, seen };
})();
