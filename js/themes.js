/* =========================================================
 * 國家主題：點進國家後，畫面換成當地文化風格
 * - vars：配色（覆蓋 css 的 :root 變數）
 * - bg：背景花紋
 * - isle：島嶼的草地 / 樹 / 花顏色
 * - fx：飄落 / 漂浮的特效（sakura 櫻花、snow 雪、leaves 落葉、petals 花瓣、confetti 彩帶、lantern 燈籠、bubbles 泡泡、rain 雨、spark 星光）
 * - icon：標題旁的小圖示
 * 想幫某個國家換主題：在 BY_CODE 裡加一行；想新增主題：在 T 裡加一組
 * ========================================================= */
window.Themes = (() => {
  const T = {
    tw: { icon: '🧋', fx: 'spark', vars: {}, bg: null, isle: null },
    jp: {
      icon: '⛩️', fx: 'sakura',
      vars: { '--sky': '#f4ecdc', '--grid': '#eadfca', '--cream': '#fbf6ea', '--cream-2': '#efe3c8', '--paper': '#fffaf0',
              '--teal': '#c8372d', '--pink': '#eba7bb', '--yellow': '#d4a84a', '--blue': '#3a4f8a', '--orange': '#e07b39', '--ink': '#2a2230', '--title-ink': '#fff8ec' },
      bg: `radial-gradient(circle at 50% 100%, transparent 14px, rgba(58,79,138,.12) 15px, rgba(58,79,138,.12) 17px, transparent 18px, transparent 22px, rgba(58,79,138,.08) 23px, rgba(58,79,138,.08) 25px, transparent 26px) 0 0 / 52px 26px, #f4ecdc`,
      isle: { grass: '#9fcf86', grass2: '#8bbd74', grassHi: '#c3e3a6', tree: '#f4a6c0', treeHi: '#fbd3e0', flower: ['#ffffff', '#f4a6c0', '#c8372d'] },
      npc: 'jp'
    },
    kr: {
      icon: '🏯', fx: 'petals',
      vars: { '--sky': '#f6f1e6', '--grid': '#ece3d0', '--cream': '#fbf7ee', '--cream-2': '#eee2c8', '--paper': '#fffdf6',
              '--teal': '#2f6db5', '--pink': '#d94c5c', '--yellow': '#f2c230', '--blue': '#2f6db5', '--orange': '#3f9b6b', '--title-ink': '#fffdf6' },
      bg: `repeating-linear-gradient(45deg, rgba(63,155,107,.10) 0 10px, transparent 10px 20px, rgba(217,76,92,.08) 20px 30px, transparent 30px 40px), #f6f1e6`,
      isle: { tree: '#3f9b6b', treeHi: '#6cc08f', flower: ['#d94c5c', '#f2c230', '#2f6db5'] },
      npc: 'kr'
    },
    cn: {
      icon: '🏮', fx: 'lantern',
      vars: { '--sky': '#fbeee0', '--grid': '#f3dcc6', '--cream': '#fff5e8', '--cream-2': '#f3dcb8', '--paper': '#fffaf2',
              '--teal': '#c0392b', '--pink': '#e8735a', '--yellow': '#e8b83a', '--blue': '#a8323e', '--title-ink': '#fff3d6' },
      bg: `radial-gradient(circle at 25% 30%, rgba(192,57,43,.08) 0 10px, transparent 11px) 0 0 / 60px 60px, radial-gradient(circle at 75% 80%, rgba(232,184,58,.12) 0 8px, transparent 9px) 0 0 / 60px 60px, #fbeee0`,
      isle: { tree: '#c0392b', treeHi: '#e8735a', flower: ['#e8b83a', '#ffffff', '#c0392b'] },
      npc: 'cn'
    },
    hk: {
      icon: '🌃', fx: 'spark',
      vars: { '--sky': '#e9e2f6', '--grid': '#ddd2f0', '--teal': '#ff3d8b', '--pink': '#ff3d8b', '--yellow': '#ffd23f', '--blue': '#3a2a7a', '--orange': '#00c2d1', '--title-ink': '#fff' },
      bg: `linear-gradient(rgba(255,61,139,.12) 2px, transparent 2px) 0 0 / 40px 40px, linear-gradient(90deg, rgba(0,194,209,.12) 2px, transparent 2px) 0 0 / 40px 40px, #e9e2f6`,
      isle: { tree: '#7a6ad0', treeHi: '#ff7fb5' }, npc: 'neon'
    },
    sea: {
      icon: '🌴', fx: 'bubbles',
      vars: { '--sky': '#d8f2ee', '--grid': '#c6eae4', '--teal': '#2a9d8f', '--pink': '#f28482', '--yellow': '#f4a261', '--orange': '#e76f51', '--title-ink': '#fffaf0' },
      bg: `radial-gradient(circle at 50% 0, rgba(42,157,143,.12) 0 18px, transparent 19px) 0 0 / 46px 30px, #d8f2ee`,
      isle: { grass: '#7fcf73', tree: '#2f8f4e', treeHi: '#5cc070', flower: ['#f28482', '#f4a261', '#ffffff'] }
    },
    th: {
      icon: '🐘', fx: 'petals',
      vars: { '--sky': '#f2e8f7', '--grid': '#e6d8f0', '--teal': '#7a3e9d', '--pink': '#e07aa8', '--yellow': '#e3b23c', '--orange': '#e3893c', '--title-ink': '#fff6e0' },
      bg: `linear-gradient(45deg, rgba(227,178,60,.14) 25%, transparent 25% 75%, rgba(227,178,60,.14) 75%) 0 0 / 34px 34px, #f2e8f7`,
      isle: { tree: '#2f8f4e', treeHi: '#e3b23c', flower: ['#e3b23c', '#e07aa8', '#ffffff'] }
    },
    in: {
      icon: '🪷', fx: 'petals',
      vars: { '--sky': '#fff1de', '--grid': '#f8e0c0', '--teal': '#e76f00', '--pink': '#d6336c', '--yellow': '#f8b400', '--orange': '#2a9d8f', '--title-ink': '#fff8ec' },
      bg: `radial-gradient(circle, rgba(214,51,108,.12) 0 4px, transparent 5px) 0 0 / 28px 28px, radial-gradient(circle, rgba(248,180,0,.16) 0 3px, transparent 4px) 14px 14px / 28px 28px, #fff1de`,
      isle: { flower: ['#f8b400', '#d6336c', '#e76f00'] }
    },
    mideast: {
      icon: '🕌', fx: 'spark',
      vars: { '--sky': '#f6ead2', '--grid': '#ecdcba', '--teal': '#1f7a8c', '--pink': '#c8553d', '--yellow': '#d9a441', '--title-ink': '#fff8ec' },
      bg: `linear-gradient(45deg, rgba(31,122,140,.10) 25%, transparent 25% 75%, rgba(31,122,140,.10) 75%) 0 0 / 30px 30px, linear-gradient(-45deg, rgba(217,164,65,.12) 25%, transparent 25% 75%, rgba(217,164,65,.12) 75%) 0 0 / 30px 30px, #f6ead2`,
      isle: { grass: '#e6c98a', grass2: '#d9b874', grassHi: '#f2dca8', tree: '#5a9e5a', treeHi: '#7fbf6a' }
    },
    us: {
      icon: '🗽', fx: 'confetti',
      vars: { '--sky': '#e7e1dc', '--grid': '#d8cec6', '--teal': '#3a86ff', '--pink': '#ff006e', '--yellow': '#ffbe0b', '--orange': '#fb5607', '--blue': '#3a86ff', '--title-ink': '#fff' },
      bg: `linear-gradient(#d8cec6 3px, transparent 3px) 0 0 / 60px 24px, linear-gradient(90deg, #d8cec6 3px, transparent 3px) 0 0 / 60px 48px, linear-gradient(90deg, #d8cec6 3px, transparent 3px) 30px 24px / 60px 48px, #ebe4de`,
      isle: { tree: '#3a7d44', treeHi: '#ffbe0b', flower: ['#ff006e', '#3a86ff', '#ffbe0b'] }, npc: 'street'
    },
    latam: {
      icon: '🎉', fx: 'confetti',
      vars: { '--sky': '#fff3d6', '--grid': '#ffe6ad', '--teal': '#06a77d', '--pink': '#e4405f', '--yellow': '#f9c80e', '--orange': '#f86624', '--title-ink': '#fff' },
      bg: `repeating-linear-gradient(90deg, rgba(228,64,95,.10) 0 14px, rgba(249,200,14,.12) 14px 28px, rgba(6,167,125,.10) 28px 42px, transparent 42px 56px), #fff3d6`,
      isle: { tree: '#06a77d', treeHi: '#f9c80e', flower: ['#e4405f', '#f86624', '#f9c80e'] }
    },
    fr: {
      icon: '🗼', fx: 'petals',
      vars: { '--sky': '#f3eef8', '--grid': '#e7def0', '--teal': '#3d5a99', '--pink': '#f4a6b8', '--yellow': '#f6d27a', '--orange': '#c95a6a', '--title-ink': '#fff' },
      bg: `repeating-linear-gradient(90deg, rgba(61,90,153,.07) 0 18px, transparent 18px 36px), #f3eef8`,
      isle: { tree: '#6a9e5a', treeHi: '#b9a3d9', flower: ['#b9a3d9', '#f4a6b8', '#ffffff'] }
    },
    gb: {
      icon: '💂', fx: 'rain',
      vars: { '--sky': '#e3e7ef', '--grid': '#d3d9e6', '--teal': '#1d3461', '--pink': '#c1272d', '--yellow': '#d4b44a', '--blue': '#1d3461', '--title-ink': '#fff' },
      bg: `linear-gradient(90deg, rgba(193,39,45,.10) 0 8px, transparent 8px 40px, rgba(29,52,97,.08) 40px 56px, transparent 56px) 0 0 / 80px 80px, linear-gradient(rgba(193,39,45,.10) 0 8px, transparent 8px 40px, rgba(29,52,97,.08) 40px 56px, transparent 56px) 0 0 / 80px 80px, #e3e7ef`,
      isle: { grass: '#7cbf6a', tree: '#3f7a3a', treeHi: '#5f9a4e' }
    },
    europe: {
      icon: '🏰', fx: 'leaves',
      vars: { '--sky': '#ecefe4', '--grid': '#dfe4d2', '--teal': '#5a7d4a', '--pink': '#c97b63', '--yellow': '#d8b25a', '--title-ink': '#fff' },
      bg: `linear-gradient(#dfe4d2 2px, transparent 2px) 0 0 / 36px 18px, linear-gradient(90deg, #dfe4d2 2px, transparent 2px) 0 0 / 36px 36px, #ecefe4`,
      isle: { tree: '#4e7f43', treeHi: '#e0a050', flower: ['#c97b63', '#d8b25a', '#ffffff'] }
    },
    snow: {
      icon: '❄️', fx: 'snow',
      vars: { '--sky': '#e6eef7', '--grid': '#d6e2f0', '--teal': '#4a78a8', '--pink': '#c94f6d', '--yellow': '#e8c46a', '--title-ink': '#fff' },
      bg: `radial-gradient(circle, rgba(255,255,255,.9) 0 2px, transparent 3px) 0 0 / 24px 24px, #e6eef7`,
      isle: { grass: '#e9f1f8', grass2: '#d5e3f0', grassHi: '#ffffff', tree: '#3f6f5a', treeHi: '#ffffff', flower: ['#ffffff', '#c9dcef', '#a9c4e0'] }
    },
    africa: {
      icon: '🌍', fx: 'spark',
      vars: { '--sky': '#f7e7cf', '--grid': '#efd5ad', '--teal': '#2d6a4f', '--pink': '#c1440e', '--yellow': '#f2a900', '--orange': '#c1440e', '--title-ink': '#fff' },
      bg: `repeating-linear-gradient(0deg, rgba(193,68,14,.10) 0 6px, transparent 6px 18px, rgba(242,169,0,.14) 18px 24px, transparent 24px 36px, rgba(45,106,79,.10) 36px 42px, transparent 42px 54px), #f7e7cf`,
      isle: { grass: '#c9cf6a', grass2: '#b4ba58', grassHi: '#e0e48e', tree: '#2d6a4f', treeHi: '#5a9e5a', flower: ['#c1440e', '#f2a900', '#ffffff'] }
    },
    oceania: {
      icon: '🐨', fx: 'bubbles',
      vars: { '--sky': '#d9f0f7', '--grid': '#c4e6f1', '--teal': '#0077b6', '--pink': '#ef476f', '--yellow': '#ffd166', '--orange': '#e76f51', '--title-ink': '#fff' },
      bg: `radial-gradient(ellipse at 50% 100%, rgba(0,119,182,.12) 0 12px, transparent 13px) 0 0 / 40px 20px, #d9f0f7`,
      isle: { grass: '#e3c178', grass2: '#d4ae62', grassHi: '#f0d898', tree: '#4f8f4a', treeHi: '#7fbf6a' }
    }
  };

  const BY_CODE = {
    TW: 'tw', JP: 'jp', KR: 'kr', KP: 'kr', CN: 'cn', MO: 'hk', HK: 'hk',
    TH: 'th', LA: 'th', KH: 'th', MM: 'th',
    VN: 'sea', PH: 'sea', ID: 'sea', MY: 'sea', SG: 'sea', BN: 'sea', TL: 'sea',
    IN: 'in', NP: 'in', BD: 'in', LK: 'in', PK: 'in', BT: 'in',
    SA: 'mideast', AE: 'mideast', QA: 'mideast', KW: 'mideast', OM: 'mideast', YE: 'mideast', IR: 'mideast', IQ: 'mideast', JO: 'mideast', SY: 'mideast', EG: 'mideast', TR: 'mideast', AF: 'mideast', BH: 'mideast', IL: 'mideast', PS: 'mideast', LB: 'mideast', MA: 'mideast', DZ: 'mideast', TN: 'mideast', LY: 'mideast',
    US: 'us', CA: 'snow', MX: 'latam', FR: 'fr', GB: 'gb', IE: 'gb',
    RU: 'snow', NO: 'snow', SE: 'snow', FI: 'snow', IS: 'snow', GL: 'snow', MN: 'snow', KZ: 'snow', AQ: 'snow',
    AU: 'oceania', NZ: 'oceania'
  };
  const BY_CONT = { '亞洲': 'tw', '歐洲': 'europe', '北美洲': 'latam', '南美洲': 'latam', '非洲': 'africa', '大洋洲': 'oceania' };

  const of = c => (c ? T[BY_CODE[c.code] || BY_CONT[c.cont] || 'tw'] : null);
  const keyOf = c => (c ? BY_CODE[c.code] || BY_CONT[c.cont] || 'tw' : '');

  /* ---------- 套用 / 取消主題 ---------- */
  let current = '';
  const BG_IMG = new Set(['tw', 'jp', 'kr', 'cn', 'hk', 'th', 'sea', 'in', 'mideast', 'europe', 'fr', 'gb', 'us', 'latam', 'africa', 'oceania', 'snow']);
  function apply(country) {
    const k = country ? keyOf(country) : '';
    if (k === current) return;
    current = k;
    const root = document.documentElement;
    // 先清掉上一個主題的變數
    Object.values(T).forEach(th => Object.keys(th.vars).forEach(v => root.style.removeProperty(v)));
    root.style.removeProperty('--theme-bg');
    document.body.dataset.theme = k;
    if (!k) return;
    const th = T[k];
    Object.entries(th.vars).forEach(([v, val]) => root.style.setProperty(v, val));
    // 背景花紋（V8 美術，可以無縫拼接的小圖）；沒有圖的主題用原本的 CSS 花紋
    if (BG_IMG.has(k)) root.style.setProperty('--theme-bg', `url('${new URL(`assets/theme/bg/${k}.webp?v=1`, location.href).href}') 0 0 / 128px 128px repeat, var(--sky)`);
    else if (th.bg) root.style.setProperty('--theme-bg', th.bg);
  }

  /* ---------- 飄落特效 ---------- */
  const FX = {
    sakura: { n: 30, cls: 'fx-fall', colors: ['#f7a8c0', '#fbc6d6', '#f08aa8'], w: 10, h: 8 },
    petals: { n: 20, cls: 'fx-fall', colors: ['#f2c230', '#e07aa8', '#ffffff', '#f4a261'], w: 7, h: 5 },
    leaves: { n: 18, cls: 'fx-fall', colors: ['#e0a050', '#c97b3a', '#d8b25a'], w: 8, h: 6 },
    snow: { n: 40, cls: 'fx-fall slow', colors: ['#ffffff', '#f0f6ff'], w: 6, h: 6 },
    confetti: { n: 34, cls: 'fx-fall', colors: ['#ff006e', '#3a86ff', '#ffbe0b', '#06a77d', '#fb5607'], w: 6, h: 10 },
    rain: { n: 50, cls: 'fx-fall fast', colors: ['#9fb4d6', '#b8c8e4'], w: 2, h: 14 },
    lantern: { n: 10, cls: 'fx-rise lantern', colors: ['#e74c3c', '#f39c12'], w: 14, h: 18 },
    bubbles: { n: 22, cls: 'fx-rise', colors: ['rgba(255,255,255,.75)', 'rgba(200,240,255,.8)'], w: 10, h: 10 },
    spark: { n: 24, cls: 'fx-twinkle', colors: ['#ffffff', '#eac45a', '#f07ca3'], w: 6, h: 6 },
    pumpkin: { n: 16, cls: 'fx-fall pumpkin', colors: ['#ef8a3a', '#e0702a', '#6b4ca0'], w: 14, h: 12 },
    heart: { n: 20, cls: 'fx-rise heart', colors: ['#f07ca3', '#e35d5d', '#ffb3c8'], w: 12, h: 12 }
  };
  // 飄落小圖（V8 美術）；沒有圖的就用上面的色塊
  const FX_FILE = { sakura: 'sakura', petals: 'petal', leaves: 'leaf', snow: 'snow', confetti: 'confetti', rain: 'rain', lantern: 'lantern', bubbles: 'bubble', spark: 'spark', pumpkin: 'pumpkin', heart: 'heart' };
  const FX_IMG = Object.fromEntries(Object.entries(FX_FILE).map(([k, v]) => [k, `assets/theme/fx/${v}.png?v=1`]));
  function fx(country) {
    const th = of(country); if (!th || !th.fx) return null;
    return fxLayer(th.fx);
  }
  function fxLayer(name) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const f = FX[name]; if (!f) return null;
    const layer = document.createElement('div');
    layer.className = 'fx-layer';
    const src = FX_IMG[name];
    const n = src ? Math.ceil(f.n * 0.6) : f.n;   // 圖比色塊大，數量少一點
    for (let i = 0; i < n; i++) {
      const p = document.createElement(src ? 'img' : 'i');
      p.className = f.cls + (src ? ' fx-img' : '');
      const r = PX.hash(i, 77);
      p.style.left = (PX.hash(i, 11) * 100).toFixed(1) + '%';
      if (src) {
        p.src = src; p.alt = ''; p.decoding = 'async';
        const sz = Math.round((name === 'rain' ? 14 : 18) + PX.hash(i, 19) * 12);
        p.style.width = p.style.height = sz + 'px';
      } else {
        p.style.width = f.w + 'px'; p.style.height = f.h + 'px';
        p.style.background = f.colors[i % f.colors.length];
      }
      p.style.animationDuration = (f.cls.includes('fast') ? 1.2 + r : f.cls.includes('slow') ? 9 + r * 8 : 6 + r * 6).toFixed(1) + 's';
      p.style.animationDelay = (-PX.hash(i, 13) * 12).toFixed(1) + 's';
      if (f.cls.includes('twinkle')) p.style.top = (PX.hash(i, 17) * 100).toFixed(1) + '%';
      layer.appendChild(p);
    }
    return layer;
  }

  return { T, of, keyOf, apply, fx, fxLayer };
})();
