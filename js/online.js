/* =========================================================
 * 即時在線人數＋在線玩家列表（含國籍）
 * 用 Supabase 即時頻道「lobby」：每個打開網站的人都會加入
 *  - 登入的玩家：帶上 名字 / ID / 國籍 / 角色外觀（同一個帳號開好幾個分頁只算一次）
 *  - 沒登入的訪客：只算人數，不會出現在列表裡
 * 不用資料庫，不用跑 SQL
 * ========================================================= */
window.Online = (() => {
  const { h, esc, modal } = UI;
  const A = window.App;

  I18N.extend({
    zh: { on_hide_me: '在「現在在線」名單裡隱藏我（還是會算在人數裡）', on_hidden: '另外 {n} 位玩家隱藏了在線狀態', on_btn: '在線 {n}', on_title: '🟢 現在在線', on_sum: '{p} 位玩家・{g} 位訪客', on_none: '目前沒有其他玩家在線，邀朋友一起來吧！', on_me: '（你）', on_guest_note: '訪客沒有登入，所以只算人數', on_by: '依國家', on_unknown: '未設定國家', on_bulk: '現在人很多！名單每分鐘更新一次' },
    en: { on_hide_me: 'Hide me from the “Online now” list (still counted)', on_hidden: '{n} more players are hidden', on_btn: '{n} online', on_title: '🟢 Online now', on_sum: '{p} players · {g} visitors', on_none: 'No other players online — invite your friends!', on_me: '(you)', on_guest_note: 'Visitors aren’t logged in, so they’re only counted', on_by: 'By country', on_unknown: 'No country set', on_bulk: 'Lots of people here! The list updates every minute' },
    ja: { on_hide_me: '「オンライン中」リストに表示しない（人数には含まれます）', on_hidden: 'ほかに {n} 人が非表示', on_btn: 'オンライン {n}', on_title: '🟢 オンライン中', on_sum: 'プレイヤー {p} 人・ゲスト {g} 人', on_none: '他のプレイヤーはいません。友達を誘おう！', on_me: '（あなた）', on_guest_note: 'ゲストはログインしていないので人数だけ表示されます', on_by: '国別', on_unknown: '国未設定', on_bulk: '大人数のため、リストは1分ごとに更新されます' },
    ko: { on_hide_me: '「지금 접속 중」 목록에서 숨기기 (인원수에는 포함)', on_hidden: '숨김 상태인 플레이어 {n}명', on_btn: '접속 {n}', on_title: '🟢 지금 접속 중', on_sum: '플레이어 {p}명 · 방문자 {g}명', on_none: '다른 플레이어가 없어요. 친구를 초대해 봐요!', on_me: '(나)', on_guest_note: '방문자는 로그인하지 않아서 숫자만 보여요', on_by: '나라별', on_unknown: '나라 미설정', on_bulk: '사람이 많아서 목록은 1분마다 업데이트돼요' }
  });

  let ch = null, players = [], guests = 0, panel = null; const subs = [];
  const flag = cc => (/^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : '🏳');
  const country = cc => { const c = cc && A.byCode && A.byCode[cc]; return c ? nm(c) : t('on_unknown'); };
  const myKey = () => {
    if (Player.me) return 'p:' + Player.me.id;
    let g = ''; try { g = sessionStorage.getItem('danceIsland.guestKey') || ''; } catch (e) {}
    if (!g) { g = 'g:' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('danceIsland.guestKey', g); } catch (e) {} }
    return g;
  };
  const hiddenMe = () => !!(Backend.profile && Backend.profile.card && Backend.profile.card.hideOn);
  const meta = () => { const p = Player.me; if (!p) return { g: 1 }; const u = Backend.uid || ''; return hiddenMe() ? { h: p.id, u, x: 1 } : { h: p.id, u, n: p.name, c: p.nat || '', v: !!p.verified, t: p.title || '', l: p.look || null }; };

  /* ---------- 人多模式：每 1～2 分鐘打卡，從資料庫算人數 ----------
   * 平常用即時頻道（馬上更新）；同時在線超過 100 人，或 Supabase 說即時訊息太多，就改用打卡（免費版也撐得住上千人） */
  let BULK_ON = 100, BULK_OFF = 80;
  let bulk = false, db = null, pingTm = null, listAt = 0, forcedUntil = 0;   // forcedUntil：被 Supabase 擋過後，至少維持人多模式 10 分鐘
  const visible = () => document.visibilityState === 'visible';
  async function ping() {
    clearTimeout(pingTm); pingTm = setTimeout(ping, bulk ? 60000 : 120000);
    if (!Backend.enabled || !visible() || !Backend.rpc) return;
    const watch = window.Friends && Friends.friends ? Friends.friends().map(p => p.user_id).filter(Boolean) : [];
    try { db = await Backend.rpc('online_ping', { pk: myKey().replace(/^[a-z]:/, ''), pwatch: watch }); } catch (e) { return; }
    const n = (db.p || 0) + (db.g || 0);
    if (!bulk && n > BULK_ON) setBulk(true); else if (bulk && n < BULK_OFF && Date.now() > forcedUntil) setBulk(false);
    if (bulk) { guests = db.g || 0; emitOn(db.on || []); update(); }
  }
  function emitOn(uids) { const ps = uids.map(u => ({ u })); subs.forEach(f => { try { f(ps); } catch (e) {} }); }
  function setBulk(on) {
    if (bulk === on) return;
    bulk = on;
    if (on) { if (ch) { try { Backend.removeChannel(ch); } catch (e) {} ch = null; } players = []; }
    else connect();
    clearTimeout(pingTm); pingTm = setTimeout(ping, on ? 60000 : 120000);
    update();
  }
  async function loadList() {
    if (Date.now() - listAt < 30000) return;
    listAt = Date.now();
    try { players = (await Backend.rpc('online_list', { lim: 200 })) || []; } catch (e) {}
  }

  function connect() {
    if (!Backend.enabled || !Backend.channel || bulk) return;
    if (ch) { try { Backend.removeChannel(ch); } catch (e) {} ch = null; }
    // 在自己電腦上測試時用另一個頻道，不會混進正式網站的在線名單
    const c = Backend.channel(/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'lobby-dev' : 'lobby', myKey());
    ch = c;
    c.on('presence', { event: 'sync' }, () => {
      if (ch !== c) return;
      const st = c.presenceState(); const ps = []; let gs = 0;
      Object.values(st).forEach(arr => { const m = arr && arr[arr.length - 1]; if (!m) return; if (m.g) gs++; else if (m.h) ps.push(m); });
      players = ps; guests = gs; update(); subs.forEach(f => { try { f(ps); } catch (e) {} });
    }).on('system', {}, p => {   // Supabase：即時訊息太多 → 改用打卡
      if (p && p.status === 'error' && /presence|too many/i.test(p.message || '') && db) { forcedUntil = Date.now() + 600000; setBulk(true); }   // db：打卡功能要先能用
    }).subscribe(async s => { if (s === 'SUBSCRIBED' && ch === c) { try { await c.track(meta()); } catch (e) {} } });
  }

  /* ---------- 上方列的「在線 N」按鈕 ---------- */
  let btn = null;
  function ensureBtn() {
    if (btn && btn.isConnected) return btn;
    const row = document.querySelector('#hud .hud-btns'); if (!row) return null;
    btn = h(`<button class="btn hud-online" aria-label="online"><i class="on-dot"></i><span class="label"></span></button>`);
    const before = row.querySelector('.hud-search') || row.querySelector('.hud-player');
    row.insertBefore(btn, before);
    btn.onclick = () => { SFX.play('select'); open(); };
    return btn;
  }
  const total = () => (bulk && db ? (db.p || 0) + (db.g || 0) : players.length + guests);
  function update() {
    const b = ensureBtn(); if (b) b.querySelector('.label').textContent = t('on_btn', { n: total() });
    if (panel && panel.isConnected) drawPanel();
  }

  /* ---------- 在線列表 ---------- */
  function drawPanel() {
    const meH = Player.me && Player.me.id;
    const shown = players.filter(p => !p.x), hid = players.length - shown.length;
    const byC = {}; shown.forEach(p => { const k = p.c || ''; (byC[k] = byC[k] || []).push(p); });
    const order = Object.keys(byC).sort((a, b) => (b === 'TW') - (a === 'TW') || byC[b].length - byC[a].length || country(a).localeCompare(country(b)));
    const rows = order.flatMap(k => byC[k].sort((a, b) => (b.h === meH) - (a.h === meH) || String(a.n).localeCompare(String(b.n))));
    const pN = bulk && db ? db.p || 0 : players.length;
    panel.innerHTML = `<p class="on-sum"><b>${esc(t('on_sum', { p: pN, g: guests }))}</b></p>${bulk ? `<p class="note">${t('on_bulk')}</p>` : ''}
      ${order.length ? `<div class="on-cc">${order.map(k => `<span class="tag">${flag(k)} ${esc(country(k))} <b>${byC[k].length}</b></span>`).join('')}</div>` : ''}
      ${window.Guest && Guest.is() ? Guest.lockBox('gu_why_online') : rows.length ? `<ul class="on-list">${rows.map(p => `<li class="on-row" data-h="${esc(p.h)}"><span class="on-ic"></span>
          <span class="on-nm"><b>${Player.nameHTML({ name: p.n, handle: p.h, verified: p.v })}</b>${p.h === meH ? ` <small>${t('on_me')}</small>` : ''}<small>@${esc(p.h)}</small></span>
          <span class="on-c">${flag(p.c)} ${esc(country(p.c))}</span></li>`).join('')}</ul>` : `<p class="note">${t('on_none')}</p>`}
      ${hid || pN > players.length ? `<p class="note">${t('on_hidden', { n: hid + Math.max(0, pN - players.length) })}</p>` : ''}${guests ? `<p class="note">${t('on_guest_note')}</p>` : ''}`;
    if (window.Guest) Guest.bindLock(panel);
    panel.querySelectorAll('.on-row').forEach(li => {
      const p = players.find(x => x.h === li.dataset.h);
      if (p && window.Chat && Chat.headIcon) li.querySelector('.on-ic').appendChild(Chat.headIcon(p.l));
    });
  }
  function open() {
    panel = h(`<div class="on-panel"></div>`);
    const m = modal({ title: t('on_title'), color: 'green', body: panel });
    drawPanel();
    if (bulk) loadList().then(() => panel.isConnected && drawPanel());
    panel.addEventListener('click', e => { const li = e.target.closest('.on-row'); if (!li) return; m.close(); setTimeout(() => Friends.openCard(li.dataset.h), 220); });
  }

  if (I18N.onChange) I18N.onChange(update);
  const boot = () => { connect(); update(); setTimeout(ping, 3000); };
  document.addEventListener('visibilitychange', () => { if (visible()) ping(); });
  (Backend.enabled ? Backend.ready.then(() => Player.ready) : Promise.resolve()).then(boot, boot);
  let last = null;
  if (Player.onChange) Player.onChange(() => { const k = Player.me ? Player.me.id : null; if (k !== last) { last = k; connect(); setTimeout(ping, 1500); } else if (ch) { try { ch.track(meta()); } catch (e) {} } });
  return { open, reconnect: connect, retrack: () => { if (ch) { try { ch.track(meta()); } catch (e) {} } }, count: total, list: () => players.slice(), onSync: f => { subs.push(f); f(players); }, get bulk() { return bulk; }, _bulk: setBulk, _ping: ping, _th: (a, b) => { BULK_ON = a; BULK_OFF = b; } };
})();
