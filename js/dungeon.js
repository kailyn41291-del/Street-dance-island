/* =========================================================
 * 副本島（期間限定的特別群島）
 * - 世界地圖上有一座副本島入口；管理員開放的期間才能進去，沒開放時點了會跳出提示
 * - 進去是另一個群島介面：每個區域賽的地區一座島（島上站著那一區的冠軍），正中央是決賽島（世界冠軍）
 * - 可以切換年份、看直播、應援選手、預測冠軍；點選手會跳出 RPG 對話，有些地方藏了彩蛋
 * - 選手如果有註冊舞島，管理員可以連到他的帳號，點選手會跳出他的名片
 * 資料：data/dungeons.js（每年的名單）＋ Supabase（開放期間、直播、帳號連結、應援、預測）
 * ========================================================= */
window.Dungeon = (() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const D = window.DUNGEONS || {};
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;

  I18N.extend({
    zh: {
      dg_cheer_n: '應援 {n}', dg_soon: '即將開放', dg_closed: '此地區暫未開放 先去探索其他地區吧！', dg_preview: '🔒 管理員預覽：一般玩家目前還進不來', dg_islands: '群島', dg_year: '年份', dg_live: '📺 看直播', dg_predict: '🔮 冠軍預測', dg_back: '◀ 回世界地圖',
      dg_final: '世界決賽', dg_world_champ: 'World Champion', dg_cheers: '📣 {n}', dg_cheer: '📣 幫 {n} 應援！', dg_cheered: '已經在應援 {n} 了！', dg_card: '🪪 看名片', dg_bye: '👋 下次再聊',
      dg_cheer_ok: '應援成功！你現在是 {n} 的應援團 📣', dg_cheer_login: '登入角色後就能幫選手應援', dg_egg: '🥚 發現彩蛋！+{n} XP', dg_trophy: '🎂 8/11 是 Hip Hop 的生日！你發現了冠軍獎盃的秘密',
      dg_p_title: '🔮 {y} 年冠軍預測', dg_p_note: '猜猜今年 B-Boy 和 B-Girl 的世界冠軍是誰！結果出來後，猜中的人 +100 XP。截止前都可以改。', dg_p_until: '預測截止：{d}', dg_p_save: '送出預測', dg_p_saved: '預測已送出！等結果揭曉吧 🔮', dg_p_closed: '這一年的預測已經截止了',
      dg_bboy: 'B-Boy', dg_bgirl: 'B-Girl', dg_who: '{n} 人選擇',
      dg_l_reg1: '這位是 {title}——{name}！', dg_l_reg2: '{region}的代表就站在這座島上，等著下一個挑戰者。', dg_l_fin1: '哇！站在群島正中央的就是——{name}！', dg_l_fin2: '{title}！要不要幫冠軍應援一下？',
      dg_l_enter1: '歡迎來到 {name} 群島！每座小島上站著各地區的冠軍。', dg_l_enter2: '正中央的決賽島上，就是世界冠軍。點選手可以跟他們打招呼喔！',
      dg_admin: '副本島', dg_a_enabled: '現在開放', dg_a_from: '開放時間', dg_a_until: '關閉時間', dg_a_live: '直播連結', dg_a_live_note: '直播說明（選填）', dg_a_pyear: '開放預測的年份（空白 = 不開放）', dg_a_puntil: '預測截止',
      dg_a_save: '儲存設定', dg_a_links: '選手 ↔ 玩家帳號', dg_a_links_note: '選手有註冊舞島的話，填他的玩家 ID，點島上的選手就會跳出他的名片。', dg_a_settle: '預測結算', dg_a_settle_btn: '結算（猜中的人 +100 XP）', dg_a_settled: '已結算，{n} 人猜中！', dg_a_open_now: '目前狀態：{s}', dg_a_on: '開放中', dg_a_off: '未開放'
    },
    en: {
      dg_cheer_n: '{n} cheers', dg_soon: 'Coming soon', dg_closed: 'This area isn’t open yet — go explore somewhere else first!', dg_preview: '🔒 Admin preview: players can’t enter yet', dg_islands: 'Islands', dg_year: 'Year', dg_live: '📺 Watch live', dg_predict: '🔮 Predict the champions', dg_back: '◀ Back to world map',
      dg_final: 'World Final', dg_world_champ: 'World Champion', dg_cheers: '📣 {n}', dg_cheer: '📣 Cheer for {n}!', dg_cheered: 'You’re already cheering for {n}!', dg_card: '🪪 View card', dg_bye: '👋 Talk later',
      dg_cheer_ok: 'You’re now on {n}’s cheer squad 📣', dg_cheer_login: 'Create a character to cheer for dancers', dg_egg: '🥚 Easter egg found! +{n} XP', dg_trophy: '🎂 Aug 11 is Hip Hop’s birthday! You found the trophy’s secret',
      dg_p_title: '🔮 {y} champion predictions', dg_p_note: 'Who will be this year’s B-Boy and B-Girl world champions? Correct guesses get +100 XP once results are in. You can change your pick until the deadline.', dg_p_until: 'Predictions close: {d}', dg_p_save: 'Submit', dg_p_saved: 'Prediction submitted! 🔮', dg_p_closed: 'Predictions for this year are closed',
      dg_bboy: 'B-Boy', dg_bgirl: 'B-Girl', dg_who: '{n} picks',
      dg_l_reg1: 'This is {name} — {title}!', dg_l_reg2: 'The champion of {region} stands on this island, waiting for the next challenger.', dg_l_fin1: 'Whoa! Standing in the middle of the islands is {name}!', dg_l_fin2: '{title}! Want to cheer for the champion?',
      dg_l_enter1: 'Welcome to the {name} islands! Each island has a regional champion.', dg_l_enter2: 'The world champions stand on the final island in the middle. Tap a dancer to say hi!',
      dg_admin: 'Event islands', dg_a_enabled: 'Open now', dg_a_from: 'Opens at', dg_a_until: 'Closes at', dg_a_live: 'Live stream link', dg_a_live_note: 'Live note (optional)', dg_a_pyear: 'Prediction year (blank = closed)', dg_a_puntil: 'Predictions close',
      dg_a_save: 'Save', dg_a_links: 'Dancers ↔ player accounts', dg_a_links_note: 'If a dancer has a Booto account, enter their player ID — tapping them on the island opens their card.', dg_a_settle: 'Settle predictions', dg_a_settle_btn: 'Settle (+100 XP for correct picks)', dg_a_settled: 'Settled — {n} correct!', dg_a_open_now: 'Status: {s}', dg_a_on: 'Open', dg_a_off: 'Closed'
    },
    ja: {
      dg_cheer_n: '応援 {n}', dg_soon: '近日開放', dg_closed: 'このエリアはまだ開放されていません。先に他の場所を探検しよう！', dg_preview: '🔒 管理者プレビュー：プレイヤーはまだ入れません', dg_islands: '群島', dg_year: '年', dg_live: '📺 生配信', dg_predict: '🔮 優勝予想', dg_back: '◀ 世界地図へ',
      dg_final: '世界決勝', dg_world_champ: 'World Champion', dg_cheers: '📣 {n}', dg_cheer: '📣 {n} を応援する！', dg_cheered: 'もう {n} を応援しています！', dg_card: '🪪 名刺を見る', dg_bye: '👋 またね',
      dg_cheer_ok: '{n} の応援団になりました 📣', dg_cheer_login: 'キャラを作ると応援できます', dg_egg: '🥚 隠し要素発見！+{n} XP', dg_trophy: '🎂 8 月 11 日はヒップホップの誕生日！トロフィーの秘密を見つけた',
      dg_p_title: '🔮 {y} 年 優勝予想', dg_p_note: '今年の B-Boy と B-Girl の世界王者は誰？当たったら +100 XP。締切まで変更できます。', dg_p_until: '予想締切：{d}', dg_p_save: '予想を送信', dg_p_saved: '予想を送信しました！🔮', dg_p_closed: 'この年の予想は締め切りました',
      dg_bboy: 'B-Boy', dg_bgirl: 'B-Girl', dg_who: '{n} 人が予想',
      dg_l_reg1: 'この人は {title}——{name}！', dg_l_reg2: '{region}の代表がこの島で次の挑戦者を待っています。', dg_l_fin1: 'わあ！群島の真ん中に立っているのは——{name}！', dg_l_fin2: '{title}！チャンピオンを応援しよう？',
      dg_l_enter1: '{name} 群島へようこそ！それぞれの島に各地域の王者がいます。', dg_l_enter2: '真ん中の決勝の島には世界王者が。ダンサーをタップして話しかけてみて！',
      dg_admin: '特別島', dg_a_enabled: '今すぐ開放', dg_a_from: '開放開始', dg_a_until: '開放終了', dg_a_live: '配信リンク', dg_a_live_note: '配信メモ（任意）', dg_a_pyear: '予想を開く年（空欄 = 閉じる）', dg_a_puntil: '予想締切',
      dg_a_save: '保存', dg_a_links: 'ダンサー ↔ プレイヤー', dg_a_links_note: 'ダンサーがBootoに登録していれば ID を入力。島のダンサーをタップすると名刺が開きます。', dg_a_settle: '予想の集計', dg_a_settle_btn: '集計（的中 +100 XP）', dg_a_settled: '集計完了：{n} 人的中！', dg_a_open_now: '状態：{s}', dg_a_on: '開放中', dg_a_off: '未開放'
    },
    ko: {
      dg_cheer_n: '응원 {n}', dg_soon: '오픈 예정', dg_closed: '이 지역은 아직 열리지 않았어요. 먼저 다른 곳을 탐험해 보세요!', dg_preview: '🔒 관리자 미리보기: 플레이어는 아직 들어올 수 없어요', dg_islands: '군도', dg_year: '연도', dg_live: '📺 생중계', dg_predict: '🔮 우승 예측', dg_back: '◀ 세계 지도로',
      dg_final: '월드 파이널', dg_world_champ: 'World Champion', dg_cheers: '📣 {n}', dg_cheer: '📣 {n} 응원하기!', dg_cheered: '이미 {n} 님을 응원하고 있어요!', dg_card: '🪪 명함 보기', dg_bye: '👋 다음에 얘기해요',
      dg_cheer_ok: '이제 {n} 님의 응원단이에요 📣', dg_cheer_login: '캐릭터를 만들면 응원할 수 있어요', dg_egg: '🥚 이스터에그 발견! +{n} XP', dg_trophy: '🎂 8월 11일은 힙합의 생일! 트로피의 비밀을 찾았어요',
      dg_p_title: '🔮 {y}년 우승 예측', dg_p_note: '올해 B-Boy와 B-Girl 월드 챔피언은 누구일까요? 맞히면 +100 XP. 마감 전까지 바꿀 수 있어요.', dg_p_until: '예측 마감: {d}', dg_p_save: '예측 제출', dg_p_saved: '예측을 보냈어요! 🔮', dg_p_closed: '이 연도의 예측은 마감됐어요',
      dg_bboy: 'B-Boy', dg_bgirl: 'B-Girl', dg_who: '{n}명 선택',
      dg_l_reg1: '이분이 바로 {title}——{name}!', dg_l_reg2: '{region} 대표가 이 섬에서 다음 도전자를 기다리고 있어요.', dg_l_fin1: '와! 군도 한가운데 서 있는 건——{name}!', dg_l_fin2: '{title}! 챔피언을 응원해 볼까요?',
      dg_l_enter1: '{name} 군도에 온 걸 환영해요! 섬마다 각 지역 챔피언이 있어요.', dg_l_enter2: '한가운데 결승 섬에는 월드 챔피언이 있어요. 댄서를 눌러 인사해 보세요!',
      dg_admin: '특별 섬', dg_a_enabled: '지금 열기', dg_a_from: '여는 시간', dg_a_until: '닫는 시간', dg_a_live: '생중계 링크', dg_a_live_note: '생중계 메모 (선택)', dg_a_pyear: '예측을 여는 연도 (빈칸 = 닫힘)', dg_a_puntil: '예측 마감',
      dg_a_save: '저장', dg_a_links: '댄서 ↔ 플레이어 계정', dg_a_links_note: '댄서가 Booto에 가입했다면 플레이어 ID를 입력하세요. 섬에서 댄서를 누르면 명함이 열려요.', dg_a_settle: '예측 결산', dg_a_settle_btn: '결산 (맞힌 사람 +100 XP)', dg_a_settled: '결산 완료: {n}명 적중!', dg_a_open_now: '상태: {s}', dg_a_on: '열림', dg_a_off: '닫힘'
    }
  });

  /* ---------- 設定（開放期間、直播、帳號連結） ---------- */
  let cfg = {}, links = {}, loaded = null;
  const load = (force) => {
    if (loaded && !force) return loaded;
    loaded = (async () => {
      if (!Backend.enabled) return;
      await Backend.ready;
      try { (await Backend.dungeons()).forEach(d => (cfg[d.id] = d)); } catch (e) {}
      try { links = {}; (await Backend.dungeonLinks()).forEach(l => ((links[l.dungeon_id] = links[l.dungeon_id] || {})[l.athlete.toLowerCase()] = l.handle)); } catch (e) {}
    })();
    return loaded;
  };
  const isOpen = id => { const c = cfg[id]; if (!c) return false; const now = Date.now(); return !!c.enabled || (!!c.open_from && now >= Date.parse(c.open_from) && (!c.open_until || now < Date.parse(c.open_until))); };
  const canEnter = id => isOpen(id) || Backend.isAdmin;
  const img = (id, year, slug) => `assets/dungeons/${id}/${year}/${slug}.webp?v=3`;
  const regionName = r => (I18N.lang === 'zh' ? r.zh : r.en);
  const egg = async (id, k) => {
    if (!logged()) return;
    const key = `danceIsland.egg.${Backend.uid}.${id}.${k}`;
    try { if (localStorage.getItem(key)) return; } catch (e) {}
    try { const n = await Backend.rpc('dungeon_egg', { did: id, k }); try { localStorage.setItem(key, '1'); } catch (e) {} if (n > 0) { SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 26); toast(t('dg_egg', { n }), '🥚'); window.XP && XP.changed && XP.changed(); } } catch (e) {}
  };

  /* ---------- 世界地圖上的入口 ---------- */
  A.dungeonWorld = (world, L) => {
    Object.entries(D).forEach(([id, d]) => {
      const [x, y] = L.toWorld(d.lon, d.lat);
      const yrs = Object.keys(d.editions).sort(), ed = d.editions[yrs[yrs.length - 1]], yr = yrs[yrs.length - 1];
      const el = h(`<div class="dg-portal ${isOpen(id) ? 'open' : 'locked'}" data-dungeon="${esc(id)}" style="left:${x}px;top:${y}px;--dc:${d.color};--dg:${d.gold}">
        <div class="dg-p-stage"><img class="dg-p-art" src="assets/dungeons/${esc(id)}/portal.webp" alt="${esc(d.name)}" draggable="false"><div class="dg-p-fog"></div></div>
        <div class="dg-p-lock">🔒 ${esc(t('dg_soon'))}</div></div>`);
      world.appendChild(el);
    });
    load().then(() => world.querySelectorAll('.dg-portal').forEach(el => { const o = isOpen(el.dataset.dungeon); el.classList.toggle('open', o); el.classList.toggle('locked', !o); }));
  };
  async function openDungeon(id) {
    await load();
    if (!canEnter(id)) { SFX.play('cancel'); npc.say([{ who: 'choco', mood: 'sleepy', text: t('dg_closed') }]); return; }
    SFX.play('confirm'); A.nav('#/d/' + id);
  }

  /* ---------- 群島介面  #/d/<id>/<year> ---------- */
  A.crumbs.d = r => '🏝 ' + esc((D[r.arg[0]] || {}).name || '');
  A.views.d = async (r, stage) => {
    const id = r.arg[0], d = D[id];
    const view = h(`<div class="view city-view dg-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!d) { inner.innerHTML = `<p class="note empty-li">${UI.emptyArt("error")}404</p>`; return; }
    await load();
    if (!canEnter(id)) { inner.innerHTML = `<div class="win"><div class="win-body"><p>${t('dg_closed')}</p><a class="btn" href="#/">${t('dg_back')}</a></div></div>`; return; }
    const years = Object.keys(d.editions).sort().reverse();
    const year = years.includes(r.arg[1]) ? r.arg[1] : years[0];
    const ed = d.editions[year], c = cfg[id] || {};
    view.style.setProperty('--dc', d.color); view.style.setProperty('--dg', d.gold);
    const [counts, mine] = await Promise.all([
      Backend.rpc('dungeon_cheer_counts', { did: id, y: +year }).catch(() => []),
      logged() ? Backend.myDungeonCheers(id, +year).catch(() => []) : []
    ]);
    const cn = {}; (counts || []).forEach(x => (cn[x.athlete.toLowerCase()] = +x.n));
    const myCheer = {}; (mine || []).forEach(x => (myCheer[x.division] = x.athlete));
    const predictOpen = c.predict_year === +year && (!c.predict_until || Date.now() < Date.parse(c.predict_until));
    // 字卡：名字 → 「2025 RED BULL BC ONE」→ 頭銜重點（WORLD CHAMPION / TAIWAN CYPHER CHAMPION）
    const splitTitle = s => { const m = /^(\d{4}\s+.*?BC One)\s+(.+)$/i.exec(s || ''); return m ? [m[1], m[2]] : ['', s || '']; };
    const capCard = (a, champ) => { const [ev, role] = splitTitle(a.title);
      return `<div class="dg-cap ${champ ? 'champ' : 'reg'}">${champ ? '<span class="dg-crown">👑</span>' : ''}<b class="dg-nm">${esc(a.name)}</b>
        <span class="dg-rule"></span>${ev ? `<small class="dg-ev">${esc(ev)}</small>` : ''}<strong class="dg-role">${esc(role)}</strong>
        <em class="dg-cn" title="📣">${t('dg_cheer_n', { n: cn[a.name.toLowerCase()] || 0 })}</em></div>`; };
    const athlete = (a, div, region, champ) => `<button class="dg-ath ${champ ? 'champ' : ''}" data-n="${esc(a.name)}" data-div="${div}" data-region="${esc(region || '')}"><span class="dg-frame"><img src="${img(id, year, a.img + '-bust')}" alt="${esc(a.name)}" loading="lazy" draggable="false"></span>${capCard(a, champ)}</button>`;
    const isle = (r2, cls) => `<section class="dg-isle ${cls || ''}" data-region="${esc(r2.id)}"><div class="dg-isle-name">${esc(regionName(r2))}</div>
        <div class="dg-stand">${athlete(r2.bboy, 'bboy', r2.id)}${athlete(r2.bgirl, 'bgirl', r2.id)}</div><img class="dg-ground" src="assets/dungeons/${id}/island.webp" alt="" draggable="false"></section>`;
    inner.innerHTML = `${!isOpen(id) ? `<p class="dg-preview">${t('dg_preview')}</p>` : ''}
      <div class="win dg-head">${UI.winHTML('🏝 ' + esc(d.name) + ' ' + t('dg_islands'), 'red', false)}<div class="win-body">
        <div class="btn-row"><label class="dg-ysel">${t('dg_year')} <select class="input sm">${years.map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
          ${/^https?:\/\//.test(c.live_url || '') ? `<a class="btn pink" href="${esc(c.live_url)}" target="_blank" rel="noopener">${t('dg_live')}</a>` : ''}
          ${predictOpen ? `<button class="btn yellow dg-pred">${t('dg_predict')}</button>` : ''}
          <span class="grow"></span><a class="btn sm" href="#/">${t('dg_back')}</a></div>
        ${c.live_note ? `<p class="note">${esc(c.live_note)}</p>` : ''}</div></div>
      <div class="dg-sea">
        <section class="dg-isle final"><div class="dg-isle-name">🏆 ${t('dg_final')} ${esc(year)}</div>
          <div class="dg-stand">${athlete(ed.final.bboy, 'bboy', 'final', true)}<button class="dg-trophy" aria-label="trophy">🏆</button>${athlete(ed.final.bgirl, 'bgirl', 'final', true)}</div><img class="dg-ground" src="assets/dungeons/${id}/island.webp" alt="" draggable="false"></section>
        ${ed.regions.map(r2 => isle(r2)).join('')}
      </div>`;
    // 每座島的像素地面
    inner.querySelector('.dg-ysel select').onchange = ev => A.nav(`#/d/${id}/${ev.target.value}`);
    const pb = inner.querySelector('.dg-pred'); if (pb) pb.onclick = () => openPredict(id, +year, ed, c);
    // 第一次進來：嚮導介紹
    const seenKey = 'danceIsland.dgIntro.' + id;
    let seen = false; try { seen = !!localStorage.getItem(seenKey); } catch (e) {}
    if (!seen) { try { localStorage.setItem(seenKey, '1'); } catch (e) {} setTimeout(() => npc.say([{ who: 'kailyn', mood: 'celebrate', text: t('dg_l_enter1', { name: d.name }) }, { who: 'choco', mood: 'cool', text: t('dg_l_enter2') }]), 700); }
    // 點選手：RPG 對話
    const visited = new Set(), talkedChamps = new Set();
    inner.querySelector('.dg-sea').onclick = async ev => {
      const tr = ev.target.closest('.dg-trophy');
      if (tr) { tr._n = (tr._n || 0) + 1; tr.classList.remove('bump'); void tr.offsetWidth; tr.classList.add('bump'); SFX.play('blip'); if (tr._n === 5) { toast(t('dg_trophy'), '🎂'); egg(id, 'trophy'); } return; }
      const b = ev.target.closest('.dg-ath'); if (!b) return;
      SFX.play('select');
      const name = b.dataset.n, div = b.dataset.div, region = b.dataset.region, champ = region === 'final';
      const a = champ ? ed.final[div] : ed.regions.find(x => x.id === region)[div];
      if (!champ) { visited.add(region); if (visited.size === ed.regions.length) egg(id, 'all_regions'); }
      else { talkedChamps.add(div); if (talkedChamps.size === 2) egg(id, 'champs'); }
      const handle = (links[id] || {})[name.toLowerCase()];
      const lines = champ
        ? [{ who: 'kailyn', mood: 'surprised', text: t('dg_l_fin1', { name }) }, { who: 'choco', mood: 'thumbs', text: t('dg_l_fin2', { title: a.title }) }]
        : [{ who: 'kailyn', mood: 'cheer', text: t('dg_l_reg1', { name, title: a.title }) }, { who: 'choco', mood: 'cool', text: t('dg_l_reg2', { region: regionName(ed.regions.find(x => x.id === region)) }) }];
      const opts = [{ label: myCheer[div] === name ? t('dg_cheered', { n: name }) : t('dg_cheer', { n: name }), value: 'cheer' }];
      if (handle) opts.push({ label: t('dg_card'), value: 'card' });
      opts.push({ label: t('dg_bye'), value: 'bye' });
      const v = await npc.ask(lines, opts);
      if (v === 'card') Friends.openCard(handle);
      else if (v === 'cheer') {
        if (!logged()) { toast(t('dg_cheer_login'), '📣'); return Player.prompt(); }
        if (myCheer[div] === name) return;
        try {
          await Backend.dungeonCheer(id, +year, div, name);
          if (myCheer[div]) cn[myCheer[div].toLowerCase()] = Math.max(0, (cn[myCheer[div].toLowerCase()] || 1) - 1);
          myCheer[div] = name; cn[name.toLowerCase()] = (cn[name.toLowerCase()] || 0) + 1;
          inner.querySelectorAll('.dg-ath').forEach(x => { const em = x.querySelector('.dg-cn'); if (em) em.textContent = t('dg_cheer_n', { n: cn[x.dataset.n.toLowerCase()] || 0 }); });
          SFX.play('fanfare'); const rr = b.getBoundingClientRect(); sparkle(rr.x + rr.width / 2, rr.y + 40, 18); toast(t('dg_cheer_ok', { n: name }), '📣');
          egg(id, 'first_cheer');
        } catch (x) { toast(x.message, '✕'); }
      }
    };
  };
  // 島的地面（像素島）
  function drawGround(cv, seed, big) {
    const w = big ? 46 : 30, hh = big ? 12 : 9, cells = new Uint8Array(w * hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2 + 0.5) / (w / 2), dy = (y - hh / 2 + 0.5) / (hh / 2);
      const n = PX.hash ? PX.hash(x + seed * 31, y + seed * 17) * 0.18 : 0;
      if (dx * dx + dy * dy < 0.92 - n) cells[y * w + x] = 1;
    }
    try {
      const art = PX.drawIsland({ w, h: hh, cells }, 8, { depth: 3, seed: seed + 7 });
      cv.width = art.island.width; cv.height = art.island.height; cv.getContext('2d').drawImage(art.island, 0, 0);
    } catch (e) { cv.remove(); }
  }

  /* ---------- 冠軍預測 ---------- */
  async function openPredict(id, year, ed, c) {
    if (!logged()) return Player.prompt();
    const [mine, counts] = await Promise.all([Backend.myDungeonPredictions(id, year).catch(() => []), Backend.rpc('dungeon_predict_counts', { did: id, y: year }).catch(() => [])]);
    const my = {}; mine.forEach(p => (my[p.division] = p.athlete));
    const cnt = {}; (counts || []).forEach(x => (cnt[x.division + '|' + x.athlete] = +x.n));
    const pool = div => [...new Map([...ed.regions.map(r => r[div]), ed.final && ed.final[div]].filter(Boolean).map(a => [a.name, a])).values()];
    const sel = div => `<div class="field"><span>${t('dg_' + div)}</span><select class="input" name="${div}"><option value="">—</option>${pool(div).map(a => `<option value="${esc(a.name)}" ${my[div] === a.name ? 'selected' : ''}>${esc(a.name)}（${t('dg_who', { n: cnt[div + '|' + a.name] || 0 })}）</option>`).join('')}</select></div>`;
    const body = h(`<form class="form"><p class="full note">${t('dg_p_note')}</p>${c.predict_until ? `<p class="full note">${t('dg_p_until', { d: new Date(c.predict_until).toLocaleString() })}</p>` : ''}
      ${sel('bboy')}${sel('bgirl')}<div class="full form-foot"><button class="btn pink">${t('dg_p_save')}</button></div></form>`);
    const m = modal({ title: t('dg_p_title', { y: year }), color: 'yellow', body });
    body.onsubmit = async ev => {
      ev.preventDefault();
      try {
        for (const div of ['bboy', 'bgirl']) { const v = body.elements[div].value; if (v && v !== my[div]) await Backend.dungeonPredict(id, year, div, v); }
        m.close(); SFX.play('fanfare'); toast(t('dg_p_saved'), '🔮');
      } catch (x) { toast(/closed/.test(x.message) ? t('dg_p_closed') : x.message, '✕'); }
    };
  }

  /* ---------- 後台 ---------- */
  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'dungeon', label: () => '🏝 ' + t('dg_admin'),
    draw: async (pane, fail) => {
      try { await load(true); } catch (x) { return fail(x); }
      const dt = v => (v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '');
      pane.innerHTML = Object.entries(D).map(([id, d]) => {
        const c = cfg[id] || {}, names = [...new Set(Object.values(d.editions).flatMap(ed => [...ed.regions.flatMap(r => [r.bboy.name, r.bgirl.name]), ed.final.bboy.name, ed.final.bgirl.name]))];
        const years = Object.keys(d.editions).sort().reverse();
        return `<form class="form dg-af" data-id="${esc(id)}"><h4 class="full">🏝 ${esc(d.name)}　<small>${t('dg_a_open_now', { s: isOpen(id) ? t('dg_a_on') : t('dg_a_off') })}</small></h4>
          <label class="chk full"><input type="checkbox" name="enabled" ${c.enabled ? 'checked' : ''}> ${t('dg_a_enabled')}</label>
          <label class="field"><span>${t('dg_a_from')}</span><input class="input" type="datetime-local" name="open_from" value="${dt(c.open_from)}"></label>
          <label class="field"><span>${t('dg_a_until')}</span><input class="input" type="datetime-local" name="open_until" value="${dt(c.open_until)}"></label>
          <label class="field"><span>${t('dg_a_live')}</span><input class="input" type="url" name="live_url" value="${esc(c.live_url || '')}"></label>
          <label class="field"><span>${t('dg_a_live_note')}</span><input class="input" name="live_note" maxlength="200" value="${esc(c.live_note || '')}"></label>
          <label class="field"><span>${t('dg_a_pyear')}</span><input class="input" type="number" name="predict_year" value="${c.predict_year || ''}"></label>
          <label class="field"><span>${t('dg_a_puntil')}</span><input class="input" type="datetime-local" name="predict_until" value="${dt(c.predict_until)}"></label>
          <div class="full form-foot"><button class="btn pink">${t('dg_a_save')}</button></div>
          <h4 class="full">${t('dg_a_links')}</h4><p class="full note">${t('dg_a_links_note')}</p>
          <div class="full dg-links">${names.map(n => `<label class="dg-link"><span>${esc(n)}</span><input class="input sm" data-athlete="${esc(n)}" placeholder="player_id" value="${esc((links[id] || {})[n.toLowerCase()] || '')}"></label>`).join('')}</div>
          <h4 class="full">${t('dg_a_settle')}</h4>
          <div class="full btn-row"><select class="input sm st-y">${years.map(y => `<option>${y}</option>`).join('')}</select><select class="input sm st-div"><option value="bboy">B-Boy</option><option value="bgirl">B-Girl</option></select>
            <select class="input sm st-w">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select><button type="button" class="btn sm yellow st-go">${t('dg_a_settle_btn')}</button></div></form>`;
      }).join('');
      pane.querySelectorAll('.dg-af').forEach(f => {
        const id = f.dataset.id;
        f.onsubmit = async ev => {
          ev.preventDefault(); const E = f.elements, iso = v => (v ? new Date(v).toISOString() : null);
          try {
            await Backend.saveDungeon({ id, enabled: E.enabled.checked, open_from: iso(E.open_from.value), open_until: iso(E.open_until.value), live_url: E.live_url.value.trim() || null, live_note: E.live_note.value.trim() || null,
              predict_year: E.predict_year.value ? +E.predict_year.value : null, predict_until: iso(E.predict_until.value), updated_at: new Date().toISOString() });
            for (const inp of f.querySelectorAll('[data-athlete]')) {
              const v = inp.value.trim().replace(/^@/, '').toLowerCase(), old = (links[id] || {})[inp.dataset.athlete.toLowerCase()] || '';
              if (v === old) continue;
              if (v) await Backend.saveDungeonLink({ dungeon_id: id, athlete: inp.dataset.athlete, handle: v }); else await Backend.deleteDungeonLink(id, inp.dataset.athlete);
            }
            await load(true); toast(t('adm_done'), '✔');
          } catch (x) { fail(x); }
        };
        f.querySelector('.st-go').onclick = async () => {
          try { const n = await Backend.rpc('dungeon_predict_settle', { did: id, y: +f.querySelector('.st-y').value, div: f.querySelector('.st-div').value, winner: f.querySelector('.st-w').value }); toast(t('dg_a_settled', { n }), '🔮'); } catch (x) { fail(x); }
        };
      });
    }
  });

  if (Backend.enabled) Backend.ready.then(() => load());
  return { open: openDungeon, isOpen, load };
})();
