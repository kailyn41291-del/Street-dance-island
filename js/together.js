/* =========================================================
 * 第三批・互動：
 * - 活動「我會去」，看得到哪些好友也會去
 * - 玩家名片：Like、可靠隊友次數、生日 / 星座 / 血型
 * - 好友生日、入島週年提醒（通知中心）
 * - 活動現場合照牆（有打卡才能上傳）
 * 隊友互評在 party.js、知識+ 在 features5.js、成就在 xp.js
 * ========================================================= */
window.Together = (() => {
  const { h, esc, modal, toast, sparkle } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;

  I18N.extend({
    zh: {
      go_btn: '我會去', go_on: '會去 ✔', go_friends: '{n} 也會去', go_more: '{n} 等 {c} 位好友也會去', go_login: '登入角色後就能標記「我會去」',
      ph_btn: '合照牆', ph_title: '📸 現場合照牆', ph_none: '還沒有人上傳合照，打卡後就能上傳第一張！', ph_up: '上傳合照', ph_cap: '說點什麼（選填，60 字內）', ph_need: '要先在這個活動打卡，才能上傳合照喔',
      ph_big: '照片太大了（最多 5MB）', ph_many: '每個活動最多上傳 6 張', ph_hide: '隱藏', ph_del: '刪除', ph_by: '{n} 上傳',
      lk_btn: 'Like', lk_done: '今天已經 Like 過', lk_many: '今天的 Like 已經送完了（每天 10 個）', lk_got: '送出 Like！', lk_n: '👍 {n}', rel_n: '🤝 可靠隊友 ×{n}',
      bd_label: '生日', bd_zodiac: '星座', bd_blood: '血型', bd_age: '{n} 歲',
      bd_title: '🎂 生日・星座・血型', bd_month: '月', bd_day: '日', bd_year: '出生年份（選填）', bd_pub: '在名片上公開（只顯示月 / 日、星座、血型；年份只有你看得到）', bd_none: '不填',
      bd_today: '🎂 今天是 {n} 的生日！去跟他說聲生日快樂吧', bd_mine: '🎂 生日快樂！舞島祝你今年跳得更開心 🎉', anni_mine: '🏝 入島 {y} 週年快樂！謝謝你一直在舞島', anni_friend: '🏝 今天是 {n} 入島 {y} 週年'
    },
    en: {
      go_btn: "I'm going", go_on: 'Going ✔', go_friends: '{n} is going too', go_more: '{n} and {c} friends are going', go_login: 'Create a character to mark “I’m going”',
      ph_btn: 'Photo wall', ph_title: '📸 Event photo wall', ph_none: 'No photos yet — check in and upload the first one!', ph_up: 'Upload photo', ph_cap: 'Caption (optional, 60 chars)', ph_need: 'Check in at this event first to upload photos',
      ph_big: 'Photo too large (max 5MB)', ph_many: 'Max 6 photos per event', ph_hide: 'Hide', ph_del: 'Delete', ph_by: 'by {n}',
      lk_btn: 'Like', lk_done: 'Already liked today', lk_many: 'Out of likes for today (10 per day)', lk_got: 'Like sent!', lk_n: '👍 {n}', rel_n: '🤝 Reliable teammate ×{n}',
      bd_label: 'Birthday', bd_zodiac: 'Zodiac', bd_blood: 'Blood type', bd_age: '{n} y/o',
      bd_title: '🎂 Birthday · zodiac · blood type', bd_month: 'Month', bd_day: 'Day', bd_year: 'Birth year (optional)', bd_pub: 'Show on my card (month/day, zodiac, blood type only — year stays private)', bd_none: '—',
      bd_today: '🎂 It’s {n}’s birthday today! Go say happy birthday', bd_mine: '🎂 Happy birthday! Dance Island wishes you a year full of dancing 🎉', anni_mine: '🏝 Happy {y}-year island anniversary! Thanks for being here', anni_friend: '🏝 Today is {n}’s {y}-year island anniversary'
    },
    ja: {
      go_btn: '行く！', go_on: '行く ✔', go_friends: '{n} も行きます', go_more: '{n} ほか {c} 人のフレンドが行きます', go_login: 'キャラを作ると「行く」を付けられます',
      ph_btn: '写真ウォール', ph_title: '📸 会場フォトウォール', ph_none: 'まだ写真がありません。チェックインして最初の 1 枚を！', ph_up: '写真をアップ', ph_cap: 'ひとこと（任意・60 字）', ph_need: 'このイベントでチェックインすると写真をアップできます',
      ph_big: '写真が大きすぎます（5MB まで）', ph_many: '1 イベント 6 枚までです', ph_hide: '非表示', ph_del: '削除', ph_by: '{n} が投稿',
      lk_btn: 'いいね', lk_done: '今日はもういいねしました', lk_many: '今日のいいねは使い切りました（1 日 10 個）', lk_got: 'いいねを送りました！', lk_n: '👍 {n}', rel_n: '🤝 頼れる仲間 ×{n}',
      bd_label: '誕生日', bd_zodiac: '星座', bd_blood: '血液型', bd_age: '{n} 歳',
      bd_title: '🎂 誕生日・星座・血液型', bd_month: '月', bd_day: '日', bd_year: '生まれ年（任意）', bd_pub: '名刺に表示する（月日・星座・血液型のみ。年は自分だけ）', bd_none: '未設定',
      bd_today: '🎂 今日は {n} の誕生日！おめでとうを言いに行こう', bd_mine: '🎂 誕生日おめでとう！今年もたくさん踊ろう 🎉', anni_mine: '🏝 入島 {y} 周年おめでとう！いつもありがとう', anni_friend: '🏝 今日は {n} の入島 {y} 周年'
    },
    ko: {
      go_btn: '갈게요', go_on: '갈게요 ✔', go_friends: '{n} 님도 가요', go_more: '{n} 님 외 친구 {c}명이 가요', go_login: '캐릭터를 만들면 「갈게요」를 표시할 수 있어요',
      ph_btn: '사진 월', ph_title: '📸 현장 사진 월', ph_none: '아직 사진이 없어요. 체크인하고 첫 사진을 올려 보세요!', ph_up: '사진 올리기', ph_cap: '한마디 (선택, 60자)', ph_need: '이 이벤트에 체크인해야 사진을 올릴 수 있어요',
      ph_big: '사진이 너무 커요 (최대 5MB)', ph_many: '이벤트당 최대 6장이에요', ph_hide: '숨기기', ph_del: '삭제', ph_by: '{n} 님이 올림',
      lk_btn: '좋아요', lk_done: '오늘 이미 좋아요를 보냈어요', lk_many: '오늘 좋아요를 다 썼어요 (하루 10개)', lk_got: '좋아요를 보냈어요!', lk_n: '👍 {n}', rel_n: '🤝 믿음직한 팀원 ×{n}',
      bd_label: '생일', bd_zodiac: '별자리', bd_blood: '혈액형', bd_age: '{n}세',
      bd_title: '🎂 생일・별자리・혈액형', bd_month: '월', bd_day: '일', bd_year: '출생 연도 (선택)', bd_pub: '명함에 공개 (월/일, 별자리, 혈액형만. 연도는 나만 보여요)', bd_none: '선택 안 함',
      bd_today: '🎂 오늘은 {n} 님의 생일이에요! 축하해 주세요', bd_mine: '🎂 생일 축하해요! 올해도 신나게 춤춰요 🎉', anni_mine: '🏝 입도 {y}주년 축하해요! 늘 고마워요', anni_friend: '🏝 오늘은 {n} 님의 입도 {y}주년이에요'
    }
  });

  /* ---------- 星座 ---------- */
  const ZOD = [[1, 20, 'cap'], [2, 19, 'aqu'], [3, 21, 'pis'], [4, 20, 'ari'], [5, 21, 'tau'], [6, 22, 'gem'], [7, 23, 'can'], [8, 23, 'leo'], [9, 23, 'vir'], [10, 24, 'lib'], [11, 23, 'sco'], [12, 22, 'sag'], [13, 0, 'cap']];
  const ZN = {
    cap: ['摩羯座', 'Capricorn', 'やぎ座', '염소자리', '♑'], aqu: ['水瓶座', 'Aquarius', 'みずがめ座', '물병자리', '♒'], pis: ['雙魚座', 'Pisces', 'うお座', '물고기자리', '♓'],
    ari: ['牡羊座', 'Aries', 'おひつじ座', '양자리', '♈'], tau: ['金牛座', 'Taurus', 'おうし座', '황소자리', '♉'], gem: ['雙子座', 'Gemini', 'ふたご座', '쌍둥이자리', '♊'],
    can: ['巨蟹座', 'Cancer', 'かに座', '게자리', '♋'], leo: ['獅子座', 'Leo', 'しし座', '사자자리', '♌'], vir: ['處女座', 'Virgo', 'おとめ座', '처녀자리', '♍'],
    lib: ['天秤座', 'Libra', 'てんびん座', '천칭자리', '♎'], sco: ['天蠍座', 'Scorpio', 'さそり座', '전갈자리', '♏'], sag: ['射手座', 'Sagittarius', 'いて座', '사수자리', '♐']
  };
  const zodiacOf = bday => {
    const m = /^(\d{2})-(\d{2})$/.exec(bday || ''); if (!m) return '';
    const mo = +m[1], d = +m[2];
    const z = d < ZOD[mo - 1][1] ? ZOD[mo - 1][2] : ZOD[mo][2];
    const n = ZN[z]; return `${n[4]} ${n[{ zh: 0, en: 1, ja: 2, ko: 3 }[I18N.lang] || 0]}`;
  };
  // 星座圖示：assets/icons/zodiac/<ari…>.png（沒有圖就用原本的符號）
  const zodiacHTML = bday => {
    const m = /^(\d{2})-(\d{2})$/.exec(bday || ''); if (!m) return '';
    const mo = +m[1], d = +m[2], z = d < ZOD[mo - 1][1] ? ZOD[mo - 1][2] : ZOD[mo][2], n = ZN[z];
    return `${PXI.img('zodiac/' + z, esc(n[4]))} ${esc(n[{ zh: 0, en: 1, ja: 2, ko: 3 }[I18N.lang] || 0])}`;
  };
  const mmdd = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  /* =========================================================
   * 我會去
   * ========================================================= */
  let mine = new Set(), counts = {}, friendsGo = {}, loaded = false;
  async function loadGoing() {
    if (!Backend.enabled) return;
    try {
      const [c, my, fr] = await Promise.all([Backend.goingCounts().catch(() => []), logged() ? Backend.myGoing().catch(() => []) : [], logged() ? Backend.friendsGoing().catch(() => []) : []]);
      counts = {}; (c || []).forEach(r => (counts[r.event_id] = +r.n));
      mine = new Set(my || []);
      friendsGo = {}; (fr || []).forEach(r => (friendsGo[r.event_id] = friendsGo[r.event_id] || []).push(r.user_id));
      loaded = true;
      paintGoing(document);
    } catch (e) {}
  }
  const friendName = uid => { try { const p = (Friends.friends() || []).find(x => x.user_id === uid); return p ? p.name : ''; } catch (e) { return ''; } };
  const goTag = id => {
    const ids = friendsGo[id] || []; if (!ids.length) return '';
    const names = ids.map(friendName).filter(Boolean); if (!names.length) return '';
    return `<span class="tag go-fr">👥 ${esc(names.length === 1 ? t('go_friends', { n: names[0] }) : t('go_more', { n: names[0], c: names.length }))}</span>`;
  };
  const goBtn = e => `<button class="btn sm ${mine.has(e.id) ? 'green' : ''}" data-act="going" data-ev="${esc(e.id)}">🙋 ${mine.has(e.id) ? t('go_on') : t('go_btn')}${counts[e.id] ? ` <b class="go-n">${counts[e.id]}</b>` : ''}</button>`;
  const phBtn = e => `<button class="btn sm" data-act="photos" data-ev="${esc(e.id)}">📸 ${t('ph_btn')}${photoN[e.id] ? ` <b>${photoN[e.id]}</b>` : ''}</button>`;
  const paintGoing = root => root.querySelectorAll && root.querySelectorAll('[data-act="going"]').forEach(b => { const e = Store.get(b.dataset.ev); if (e) b.outerHTML = goBtn(e); });

  // 活動卡片：加「我會去」（還沒結束的活動）和「合照牆」（已經開始的活動）
  const prevExtras2 = A.cardExtras2;
  A.cardExtras2 = (e, past) => {
    const today = A.todayStr();
    return (prevExtras2 ? prevExtras2(e, past) : '') + (!past ? goBtn(e) : '') + (e.date <= today ? phBtn(e) : '');
  };
  const prevTag = A.viewTag;
  A.viewTag = e => goTag(e.id) + (prevTag ? prevTag(e) : '');
  const prevAct = A.onCardAct;
  A.onCardAct = (a, ev, tg, redraw) => {
    if (a === 'going' && ev) { toggleGoing(ev, tg); return true; }
    if (a === 'photos' && ev) { openPhotos(ev); return true; }
    return prevAct ? prevAct(a, ev, tg, redraw) : false;
  };
  async function toggleGoing(e, tg) {
    if (!logged()) { toast(t('go_login'), '🙋'); return Player.prompt(); }
    const on = !mine.has(e.id);
    try {
      await Backend.setGoing(e.id, on);
      if (on) { mine.add(e.id); counts[e.id] = (counts[e.id] || 0) + 1; SFX.play('coin'); const r = tg.getBoundingClientRect(); sparkle(r.x + r.width / 2, r.y, 10); }
      else { mine.delete(e.id); counts[e.id] = Math.max(0, (counts[e.id] || 1) - 1); SFX.play('cancel'); }
      document.querySelectorAll(`[data-act="going"][data-ev="${CSS.escape(e.id)}"]`).forEach(b => (b.outerHTML = goBtn(e)));
    } catch (x) { toast(x.message, '✕'); }
  }

  /* =========================================================
   * 合照牆
   * ========================================================= */
  let photoN = {};
  const loadPhotoCounts = async () => { if (!Backend.enabled) return; try { photoN = {}; (await Backend.photoCounts()).forEach(r => (photoN[r.event_id] = +r.n)); } catch (e) {} };
  async function openPhotos(e) {
    SFX.play('open');
    const body = h(`<div class="ph"><div class="ph-top"></div><div class="ph-grid"><p class="note">…</p></div></div>`);
    const m = modal({ title: t('ph_title') + '・' + esc(e.name), color: 'orange', body, wide: true });
    const S = A.socialState || {}, checked = S.checks && S.checks.has && S.checks.has(e.id);
    const top = body.querySelector('.ph-top');
    if (logged() && checked) {
      top.innerHTML = `<form class="chat-input ph-form"><label class="btn sm pink">📷 ${t('ph_up')}<input type="file" accept="image/png,image/jpeg,image/webp" hidden></label><input class="input sm" maxlength="60" placeholder="${esc(t('ph_cap'))}"></form>`;
      top.querySelector('input[type=file]').onchange = async ev => {
        const f = ev.target.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) return toast(t('ph_big'), '✕');
        try {
          const url = await Backend.uploadForumFile(f, (f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'));
          await Backend.addEventPhoto(e.id, url, top.querySelector('.input').value.trim());
          SFX.play('fanfare'); photoN[e.id] = (photoN[e.id] || 0) + 1; top.querySelector('.input').value = ''; draw();
        } catch (x) { toast(/too many/.test(x.message) ? t('ph_many') : /need checkin/.test(x.message) ? t('ph_need') : x.message, '✕'); }
      };
    } else top.innerHTML = `<p class="note">${t('ph_need')}</p>`;
    const grid = body.querySelector('.ph-grid');
    const draw = async () => {
      let rows = []; try { rows = await Backend.eventPhotos(e.id); } catch (x) {}
      grid.innerHTML = rows.length ? rows.map(p => `<figure class="ph-it" data-id="${p.id}"><img src="${esc(p.url)}" alt="" loading="lazy">
        <figcaption>${p.caption ? `<span data-utr>${esc(p.caption)}</span>` : ''}<small>${esc(t('ph_by', { n: (p.author || {}).name || '?' }))}</small>
        ${p.user_id === Backend.uid || Backend.isAdmin ? `<button class="btn sm ph-del">${t('ph_del')}</button>` : ''}${Backend.isAdmin && p.user_id !== Backend.uid ? `<button class="btn sm ph-hide">${t('ph_hide')}</button>` : ''}</figcaption></figure>`).join('') : `<p class="note">${t('ph_none')}</p>`;
    };
    grid.onclick = async ev => {
      const it = ev.target.closest('[data-id]'); if (!it) return;
      const id = +it.dataset.id;
      if (ev.target.closest('.ph-del')) { try { await Backend.deleteEventPhoto(id); it.remove(); photoN[e.id] = Math.max(0, (photoN[e.id] || 1) - 1); } catch (x) { toast(x.message, '✕'); } return; }
      if (ev.target.closest('.ph-hide')) { try { await Backend.hideEventPhoto(id); it.remove(); } catch (x) { toast(x.message, '✕'); } return; }
      if (ev.target.tagName === 'IMG') modal({ title: '📸', color: 'orange', wide: true, body: `<div class="lightbox"><img src="${esc(ev.target.src)}" alt=""></div>` });
    };
    draw();
  }

  /* =========================================================
   * 玩家名片：Like、可靠隊友、生日 / 星座 / 血型
   * ========================================================= */
  let likedSet = null;
  window.CardExtras = async (body, p, isMine) => {
    const c = p.card || {};
    const dl = body.querySelector('.pc-dl');
    if (dl && c.bday && (c.bpub || isMine)) {
      const [mo, d] = c.bday.split('-');
      let age = '';
      if (isMine && c.byear) { const now = new Date(); let a = now.getFullYear() - +c.byear; if (mmdd() < c.bday) a--; age = `（${t('bd_age', { n: a })}）`; }
      dl.insertAdjacentHTML('beforeend', `<dt>${t('bd_label')}</dt><dd>${PXI.emo('🎂')} ${+mo}/${+d}${age}</dd><dt>${t('bd_zodiac')}</dt><dd>${zodiacHTML(c.bday)}</dd>${c.blood ? `<dt>${t('bd_blood')}</dt><dd>${esc(c.blood)}</dd>` : ''}`);
    }
    if (!Backend.enabled || !p.user_id) return;
    const slot = h(`<div class="pc-social"><span class="tag pc-likes">${t('lk_n', { n: '…' })}</span><span class="tag pc-rel" hidden></span>${!isMine && logged() ? `<button class="btn sm pink pc-like">👍 ${t('lk_btn')}</button>` : ''}</div>`);
    const acts = body.querySelector('.pc-acts'); acts ? acts.before(slot) : body.appendChild(slot);
    try {
      const [n, rel] = await Promise.all([Backend.playerLikeCount(p.user_id), Backend.reliableCount(p.user_id).catch(() => 0)]);
      slot.querySelector('.pc-likes').textContent = t('lk_n', { n });
      if (+rel > 0) { const r = slot.querySelector('.pc-rel'); r.textContent = t('rel_n', { n: rel }); r.hidden = false; }
      const b = slot.querySelector('.pc-like');
      if (b) {
        if (!likedSet) likedSet = new Set(await Backend.likedToday().catch(() => []));
        if (likedSet.has(p.user_id)) { b.disabled = true; b.textContent = '👍 ' + t('lk_done'); }
        b.onclick = async () => {
          try { await Backend.likePlayer(p.user_id); likedSet.add(p.user_id); SFX.play('coin'); const r = b.getBoundingClientRect(); sparkle(r.x + r.width / 2, r.y, 12); toast(t('lk_got'), '👍');
            b.disabled = true; b.textContent = '👍 ' + t('lk_done'); slot.querySelector('.pc-likes').textContent = t('lk_n', { n: +n + 1 }); }
          catch (x) { toast(/too many/.test(x.message) ? t('lk_many') : /duplicate|unique/.test(x.message) ? t('lk_done') : x.message, '✕'); }
        };
      }
    } catch (e) { slot.remove(); }
  };
  // 名片編輯：生日 / 出生年 / 血型 / 公開
  window.CardBirthdayHTML = c => {
    const [mo, d] = (c.bday || '-').split('-');
    const opts = (n, sel) => `<option value="">${t('bd_none')}</option>` + Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, '0')).map(v => `<option value="${v}" ${v === sel ? 'selected' : ''}>${+v}</option>`).join('');
    return `<fieldset class="full cd-bday"><legend>${t('bd_title')}</legend>
      <div class="row3"><label class="field"><span>${t('bd_month')}</span><select class="input sm" name="bmo">${opts(12, mo)}</select></label>
        <label class="field"><span>${t('bd_day')}</span><select class="input sm" name="bdd">${opts(31, d)}</select></label>
        <label class="field"><span>${t('bd_blood')}</span><select class="input sm" name="blood"><option value="">${t('bd_none')}</option>${['A', 'B', 'O', 'AB'].map(b => `<option ${b === c.blood ? 'selected' : ''}>${b}</option>`).join('')}</select></label></div>
      <label class="field"><span>${t('bd_year')}</span><input class="input sm" name="byear" inputmode="numeric" maxlength="4" value="${esc(c.byear || '')}" placeholder="1998"></label>
      <label class="chk"><input type="checkbox" name="bpub" ${c.bpub ? 'checked' : ''}> ${t('bd_pub')}</label></fieldset>`;
  };
  window.CardBirthdayRead = (E, o) => {
    const mo = E.bmo.value, d = E.bdd.value;
    if (mo && d) o.bday = `${mo}-${d}`; else delete o.bday;
    if (/^(19[3-9]\d|20[0-2]\d)$/.test(E.byear.value.trim())) o.byear = E.byear.value.trim(); else delete o.byear;
    if (E.blood.value) o.blood = E.blood.value; else delete o.blood;
    o.bpub = E.bpub.checked;
    return o;
  };

  /* ---------- 好友生日、入島週年（放進通知中心） ---------- */
  function celebrations() {
    if (!logged() || !window.Notify) return;
    const today = mmdd(), y = new Date().getFullYear();
    const me = Backend.profile || {};
    const myCard = me.card || {};
    if (myCard.bday === today) Notify.add({ key: 'bd:me:' + y, ic: '🎂', text: t('bd_mine') });
    const yrs = iso => { const d = new Date(iso); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === today ? y - d.getFullYear() : 0; };
    if (me.created_at && yrs(me.created_at) > 0) Notify.add({ key: 'anni:me:' + y, ic: '🏝', text: t('anni_mine', { y: yrs(me.created_at) }) });
    let fr = []; try { fr = Friends.friends() || []; } catch (e) {}
    fr.forEach(p => {
      const c = p.card || {};
      if (c.bpub && c.bday === today) Notify.add({ key: 'bd:' + p.user_id + ':' + y, ic: '🎂', text: t('bd_today', { n: p.name }), act: 'dm', handle: p.handle });
      if (p.created_at && yrs(p.created_at) > 0) Notify.add({ key: 'anni:' + p.user_id + ':' + y, ic: '🏝', text: t('anni_friend', { n: p.name, y: yrs(p.created_at) }) });
    });
  }

  /* ---------- 啟動 ---------- */
  const boot = async () => { await Promise.all([loadGoing(), loadPhotoCounts()]); if (A.current && /^(events|city|e)$/.test(A.current.view || '')) A.render(true); setTimeout(celebrations, 4000); };
  if (Backend.enabled) Backend.ready.then(() => setTimeout(boot, 1200));
  Player.onChange(() => setTimeout(boot, 1500));

  return { zodiacOf, reloadGoing: loadGoing };
})();
