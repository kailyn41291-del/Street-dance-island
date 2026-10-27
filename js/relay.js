/* =========================================================
 * 每週動作接力挑戰（#/relay）
 * 每週一個指定動作 → 上傳影片（MP4 或 YouTube）→ 點名一位玩家接力 → 每人每週 3 票 → 週末前三名拿經驗值
 * ========================================================= */
(() => {
  const { h, esc, modal, toast, sparkle } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;

  I18N.extend({
    zh: {
      hub_relay: '動作接力', rl_title: '🎬 每週動作接力挑戰', rl_rules: '每週一個指定動作！上傳你跳這個動作的影片（每人每週一支），可以點名一位朋友接力。每人每週有 3 票，週日結算：第 1 名 +150 XP 和「本週動作王」稱號，第 2 名 +80、第 3 名 +40。',
      rl_week_move: '本週動作', rl_ends: '還有 {d} 天 {h} 小時截止', rl_ends_h: '還有 {h} 小時截止', rl_demo: '▶ 示範影片', rl_join: '上傳我的挑戰影片', rl_file: '📹 選擇影片（MP4，50MB 內）', rl_yt: '或貼 YouTube 連結',
      rl_cap: '說點什麼（選填）', rl_nom: '點名接力（玩家 ID，選填）', rl_send: '送出挑戰', rl_sent: '挑戰影片上傳成功！記得叫你點名的朋友來接力 🎬', rl_uploading: '影片上傳中…',
      rl_done: '你這週已經上傳過了 ✔', rl_entries: '本週挑戰影片', rl_none: '這週還沒有人挑戰，當第一個吧！', rl_vote: '投一票', rl_voted: '已投 ✔', rl_left: '你還有 {n} 票',
      rl_votes: '{n} 票', rl_nominated: '👉 點名 @{h} 接力', rl_called: '🔥 {n} 點名你接力「{m}」！上傳你的影片吧', rl_last: '🏆 上週動作王', rl_del: '刪除', rl_hide: '隱藏',
      rl_e_video: '請選一支影片或貼 YouTube 連結', rl_e_big: '影片太大了（最多 50MB）', rl_e_many: '你這週的 3 票已經投完了', rl_e_self: '不能投自己', rl_e_closed: '這支影片已經不能投票了', rl_e_media: '影片格式不對（要 MP4 或 YouTube 連結）', rl_e_dup: '你這週已經上傳過了',
      rl_admin: '每週動作', rl_a_week: '週（填那週的星期一）', rl_a_move: '動作名稱', rl_a_style: '舞風', rl_a_tip: '小提示', rl_a_demo: '示範影片連結（選填）', rl_a_save: '儲存', rl_a_hint: '沒有指定的週，網站會從內建動作清單輪流挑一個。'
    },
    en: {
      hub_relay: 'Move relay', rl_title: '🎬 Weekly Move Relay', rl_rules: 'One move every week! Upload a video of you doing it (one per week) and tag a friend to keep the relay going. Everyone gets 3 votes a week. Sunday results: 1st +150 XP and the “Move of the Week King” title, 2nd +80, 3rd +40.',
      rl_week_move: 'This week’s move', rl_ends: '{d} days {h} hours left', rl_ends_h: '{h} hours left', rl_demo: '▶ Demo video', rl_join: 'Upload my challenge video', rl_file: '📹 Choose video (MP4, up to 50MB)', rl_yt: 'or paste a YouTube link',
      rl_cap: 'Caption (optional)', rl_nom: 'Tag a friend to continue (player ID, optional)', rl_send: 'Submit', rl_sent: 'Challenge uploaded! Tell the friend you tagged to keep the relay going 🎬', rl_uploading: 'Uploading video…',
      rl_done: 'You’ve already entered this week ✔', rl_entries: 'This week’s entries', rl_none: 'No entries yet — be the first!', rl_vote: 'Vote', rl_voted: 'Voted ✔', rl_left: '{n} votes left',
      rl_votes: '{n} votes', rl_nominated: '👉 Tagged @{h}', rl_called: '🔥 {n} tagged you for “{m}”! Upload your video', rl_last: '🏆 Last week’s winners', rl_del: 'Delete', rl_hide: 'Hide',
      rl_e_video: 'Choose a video or paste a YouTube link', rl_e_big: 'Video too large (max 50MB)', rl_e_many: 'You’ve used all 3 votes this week', rl_e_self: 'You can’t vote for yourself', rl_e_closed: 'Voting is closed for this video', rl_e_media: 'Video must be MP4 or a YouTube link', rl_e_dup: 'You’ve already entered this week',
      rl_admin: 'Weekly move', rl_a_week: 'Week (that week’s Monday)', rl_a_move: 'Move', rl_a_style: 'Style', rl_a_tip: 'Tip', rl_a_demo: 'Demo video link (optional)', rl_a_save: 'Save', rl_a_hint: 'Weeks without a set move rotate through the built-in list.'
    },
    ja: {
      hub_relay: 'ムーブリレー', rl_title: '🎬 週替わりムーブリレー', rl_rules: '毎週ひとつの課題ムーブ！その動きを踊った動画をアップ（1 人週 1 本）して、友達を指名してリレーをつなごう。投票は 1 人週 3 票。日曜集計：1 位 +150 XP と称号「今週のムーブ王」、2 位 +80、3 位 +40。',
      rl_week_move: '今週のムーブ', rl_ends: '締切まであと {d} 日 {h} 時間', rl_ends_h: '締切まであと {h} 時間', rl_demo: '▶ お手本動画', rl_join: '挑戦動画をアップ', rl_file: '📹 動画を選ぶ（MP4・50MB まで）', rl_yt: 'または YouTube リンク',
      rl_cap: 'ひとこと（任意）', rl_nom: 'リレー指名（プレイヤー ID・任意）', rl_send: '送信', rl_sent: 'アップ完了！指名した友達にリレーを伝えよう 🎬', rl_uploading: 'アップロード中…',
      rl_done: '今週はもう参加済み ✔', rl_entries: '今週の挑戦動画', rl_none: 'まだ誰も挑戦していません。一番乗りしよう！', rl_vote: '投票', rl_voted: '投票済み ✔', rl_left: '残り {n} 票',
      rl_votes: '{n} 票', rl_nominated: '👉 @{h} を指名', rl_called: '🔥 {n} があなたを「{m}」に指名！動画をアップしよう', rl_last: '🏆 先週のムーブ王', rl_del: '削除', rl_hide: '非表示',
      rl_e_video: '動画を選ぶか YouTube リンクを貼ってください', rl_e_big: '動画が大きすぎます（50MB まで）', rl_e_many: '今週の 3 票は使い切りました', rl_e_self: '自分には投票できません', rl_e_closed: 'この動画の投票は終了しました', rl_e_media: 'MP4 か YouTube リンクにしてください', rl_e_dup: '今週はもう参加済みです',
      rl_admin: '週替わりムーブ', rl_a_week: '週（その週の月曜日）', rl_a_move: 'ムーブ名', rl_a_style: 'ジャンル', rl_a_tip: 'コツ', rl_a_demo: 'お手本動画リンク（任意）', rl_a_save: '保存', rl_a_hint: '指定がない週は内蔵リストから順番に出題します。'
    },
    ko: {
      hub_relay: '무브 릴레이', rl_title: '🎬 주간 무브 릴레이', rl_rules: '매주 하나의 미션 무브! 그 동작을 춘 영상을 올리고(1인 주 1편) 친구를 지목해 릴레이를 이어가요. 투표는 1인 주 3표. 일요일 결산: 1위 +150 XP와 「이번 주 무브왕」 칭호, 2위 +80, 3위 +40.',
      rl_week_move: '이번 주 무브', rl_ends: '마감까지 {d}일 {h}시간', rl_ends_h: '마감까지 {h}시간', rl_demo: '▶ 시범 영상', rl_join: '내 도전 영상 올리기', rl_file: '📹 영상 선택 (MP4, 50MB 이하)', rl_yt: '또는 유튜브 링크',
      rl_cap: '한마디 (선택)', rl_nom: '릴레이 지목 (플레이어 ID, 선택)', rl_send: '도전 제출', rl_sent: '업로드 완료! 지목한 친구에게 릴레이를 알려 주세요 🎬', rl_uploading: '영상 올리는 중…',
      rl_done: '이번 주는 이미 참가했어요 ✔', rl_entries: '이번 주 도전 영상', rl_none: '아직 도전자가 없어요. 첫 번째가 되어 보세요!', rl_vote: '투표', rl_voted: '투표함 ✔', rl_left: '{n}표 남음',
      rl_votes: '{n}표', rl_nominated: '👉 @{h} 지목', rl_called: '🔥 {n} 님이 「{m}」 릴레이로 당신을 지목했어요! 영상을 올려 보세요', rl_last: '🏆 지난주 무브왕', rl_del: '삭제', rl_hide: '숨기기',
      rl_e_video: '영상을 고르거나 유튜브 링크를 붙여 주세요', rl_e_big: '영상이 너무 커요 (최대 50MB)', rl_e_many: '이번 주 3표를 다 썼어요', rl_e_self: '자기 자신에게는 투표할 수 없어요', rl_e_closed: '이 영상은 투표가 끝났어요', rl_e_media: 'MP4나 유튜브 링크만 돼요', rl_e_dup: '이번 주는 이미 참가했어요',
      rl_admin: '주간 무브', rl_a_week: '주 (그 주의 월요일)', rl_a_move: '무브 이름', rl_a_style: '장르', rl_a_tip: '팁', rl_a_demo: '시범 영상 링크 (선택)', rl_a_save: '저장', rl_a_hint: '지정하지 않은 주는 내장 목록에서 돌아가며 출제해요.'
    }
  });

  // 內建動作（管理員沒指定的週用這些）
  const MOVES = [
    ['Wrist Roll', 'Locking', '手腕在胸前畫圈，手肘盡量不要動'], ['Toprock', 'Breaking', '站著跳的步伐，跟著節拍左右交叉'], ['Wave', 'Popping', '讓力量像水波一樣，從一隻手傳到另一隻手'],
    ['Running Man', 'Hip Hop', '一腳往前、另一腳往後滑，像在原地跑步'], ['Jack', 'House', '身體跟著節拍前後起伏'], ['Arm Swing', 'Waacking', '手臂從肩膀甩出去，畫出漂亮的線條'],
    ['Stomp', 'Krump', '踩地要有力，把情緒放進去'], ['Vogue Hands', 'Vogue', '用手在臉旁邊比出框框和造型'], ['Six Step', 'Breaking', '手撐地，腳在地上繞一圈'],
    ['Scooby Doo', 'Locking', '經典的 Locking 步伐，手腳交替'], ['Boogaloo Roll', 'Popping', '用胯和膝蓋帶出滾動感'], ['Freeze', 'Breaking', '最後用一個帥氣的定格結尾']
  ];
  // 台灣時間的「這週星期一」（跟伺服器一樣）
  const twNow = () => new Date(Date.now() + 8 * 3600e3);
  const weekOf = (d = twNow()) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
  const builtIn = w => { const i = Math.floor(new Date(w + 'T00:00:00Z') / (7 * 864e5)); const m = MOVES[((i % MOVES.length) + MOVES.length) % MOVES.length]; return { move: m[0], style: m[1], tip: m[2] }; };
  const ytId = u => { const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(u || ''); return m ? m[1] : null; };
  const err = x => { const m = String(x && x.message || x);
    if (/too many/.test(m)) return t('rl_e_many'); if (/not allowed/.test(m)) return t('rl_e_self'); if (/closed/.test(m)) return t('rl_e_closed'); if (/bad media/.test(m)) return t('rl_e_media');
    if (/duplicate|unique/.test(m)) return t('rl_e_dup'); if (/need character/.test(m)) return t('cd_login'); if (/spam/.test(m)) return t('fr_spam'); return m; };

  A.crumbs.relay = () => '🎬 ' + t('hub_relay');
  A.views.relay = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    await Backend.ready;
    if (logged()) await Backend.rpc('move_settle').catch(() => {});
    draw(inner);
  };
  async function draw(inner) {
    const w = weekOf();
    let ch = null, entries = [], votes = [], last = null;
    try { [ch, entries, votes, last] = await Promise.all([Backend.moveChallenge(w), Backend.moveEntries(w), Backend.moveVotes(w), Backend.moveLast()]); }
    catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(err(x))}</p>`; return; }
    const mv = ch || builtIn(w);
    const n = {}; votes.forEach(v => (n[v.entry_id] = (n[v.entry_id] || 0) + 1));
    const myVotes = new Set(votes.filter(v => v.user_id === Backend.uid).map(v => v.entry_id)), left = 3 - myVotes.size;
    const mine = entries.find(e => e.user_id === Backend.uid);
    const called = logged() && !mine && entries.find(e => e.nominee && e.nominee === Player.me.id);
    if (called && window.Notify) Notify.add({ key: 'relay:' + w, ic: '🎬', text: t('rl_called', { n: (called.author || {}).name || '?', m: mv.move }), href: '#/relay' });
    // 截止倒數（台灣時間下週一 00:00）
    const end = new Date(w + 'T00:00:00+08:00').getTime() + 7 * 864e5, ms = Math.max(0, end - Date.now()), dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 3600e3);
    entries.sort((a, b) => (n[b.id] || 0) - (n[a.id] || 0) || a.created_at.localeCompare(b.created_at));
    const video = e => Vid.html(e.video, (e.author || {}).name);
    inner.innerHTML = `<div class="win">${UI.winHTML(t('rl_title'), 'pink', false)}<div class="win-body">
        <div class="rl-move"><small>${t('rl_week_move')}・${esc(w.slice(5).replace('-', '/'))}</small><b>${esc(mv.move)}</b>${mv.style ? `<span class="tag" style="--c:${Store.STYLE_COLOR[mv.style] || 'var(--cream)'}">${esc(mv.style)}</span>` : ''}
          ${mv.tip ? `<p data-utr>${esc(mv.tip)}</p>` : ''}${/^https?:\/\//.test(mv.demo || '') ? `<a class="btn sm" href="${esc(mv.demo)}" target="_blank" rel="noopener">${t('rl_demo')}</a>` : ''}
          <p class="note">⏳ ${dd ? t('rl_ends', { d: dd, h: hh }) : t('rl_ends_h', { h: hh })}</p></div>
        <p class="note">${t('rl_rules')}</p>
        ${called ? `<p class="rl-called">${esc(t('rl_called', { n: (called.author || {}).name || '?', m: mv.move }))}</p>` : ''}
        ${!logged() ? `<button class="btn pink rl-login">🔑 ${t('login')}</button>` : mine ? `<p class="rl-done">${t('rl_done')}</p>` : `<form class="form rl-form">
          <div class="field full"><span>${t('rl_join')}</span>
            <input class="input" name="yt" type="url" placeholder="${esc(t('vid_ph'))}"><small class="note">${t('vid_hint')}</small></div>
          <label class="field"><span>${t('rl_cap')}</span><input class="input" name="cap" maxlength="100"></label>
          <label class="field"><span>${t('rl_nom')}</span><input class="input" name="nom" maxlength="17" placeholder="@kailyn" autocapitalize="off" spellcheck="false"></label>
          <div class="full"><div class="err"></div><div class="form-foot"><button class="btn pink">🎬 ${t('rl_send')}</button></div></div></form>`}
      </div></div>
      ${last && (last.top || []).length ? `<div class="win">${UI.winHTML(t('rl_last'), 'yellow', false)}<div class="win-body rl-last">${last.top.map(x => `<span>${['🥇', '🥈', '🥉'][x.place - 1]} ${esc((x.author || {}).name || '?')}　${t('rl_votes', { n: x.votes })}</span>`).join('')}</div></div>` : ''}
      <div class="win">${UI.winHTML('🎬 ' + t('rl_entries') + `　<small>${logged() ? t('rl_left', { n: Math.max(0, left) }) : ''}</small>`, 'teal', false)}<div class="win-body">
        <div class="rl-grid">${entries.map(e => `<article class="rl-item" data-id="${e.id}">${video(e)}<div class="rl-b"><b>${esc((e.author || {}).name || '?')}</b>${e.caption ? `<span data-utr>${esc(e.caption)}</span>` : ''}
          ${e.nominee ? `<small>${esc(t('rl_nominated', { h: e.nominee }))}</small>` : ''}
          <div class="btn-row"><span class="tag">${t('rl_votes', { n: n[e.id] || 0 })}</span>
            ${logged() && e.user_id !== Backend.uid ? `<button class="btn sm ${myVotes.has(e.id) ? 'green' : 'pink'} rl-vote" ${myVotes.has(e.id) ? 'disabled' : ''}>${myVotes.has(e.id) ? t('rl_voted') : '👍 ' + t('rl_vote')}</button>` : ''}
            ${e.user_id === Backend.uid || Backend.isAdmin ? `<button class="btn sm rl-del">${t('rl_del')}</button>` : ''}${Backend.isAdmin && e.user_id !== Backend.uid ? `<button class="btn sm rl-hide">${t('rl_hide')}</button>` : ''}</div></div></article>`).join('') || `<p class="note">${t('rl_none')}</p>`}</div></div></div>`;
    const on = (s, fn) => { const b = inner.querySelector(s); if (b) b.onclick = fn; };
    on('.rl-login', () => Player.prompt());
    // 上傳
    const f = inner.querySelector('.rl-form');
    if (f) {
      f.onsubmit = async ev => {
        ev.preventDefault();
        const errEl = f.querySelector('.err'), yt = f.elements.yt.value.trim();
        if (!yt) { errEl.textContent = '✕ ' + t('rl_e_video'); return; }
        const vbad = Vid.check(yt); if (vbad) { errEl.textContent = '✕ ' + vbad; return; }
        const btn = f.querySelector('.form-foot .pink'); btn.disabled = true; errEl.textContent = '';
        try {
          const url = yt;   // 影片只存連結
          await Backend.addMoveEntry({ video: url, caption: f.elements.cap.value.trim() || null, nominee: f.elements.nom.value.trim().replace(/^@/, '').toLowerCase() || null });
          SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 24); toast(t('rl_sent'), '🎬'); draw(inner);
        } catch (x) { errEl.textContent = '✕ ' + err(x); btn.disabled = false; }
      };
    }
    inner.querySelector('.rl-grid').onclick = async ev => {
      const it = ev.target.closest('[data-id]'); if (!it) return; const id = +it.dataset.id;
      try {
        if (ev.target.closest('.rl-vote')) { await Backend.moveVote(id); SFX.play('coin'); const r = ev.target.getBoundingClientRect(); sparkle(r.x + r.width / 2, r.y, 10); draw(inner); }
        else if (ev.target.closest('.rl-del')) { if (!confirm(t('del_title'))) return; await Backend.deleteMoveEntry(id); draw(inner); }
        else if (ev.target.closest('.rl-hide')) { await Backend.hideMoveEntry(id); draw(inner); }
      } catch (x) { toast(err(x), '✕'); }
    };
  }

  // 後台：指定每週動作
  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'relay', label: () => '🎬 ' + t('rl_admin'),
    draw: async (pane, fail) => {
      const w = weekOf(), next = weekOf(new Date(twNow().getTime() + 7 * 864e5));
      pane.innerHTML = `<p class="note">${t('rl_a_hint')}</p><form class="form rl-af">
        <div class="row2 full"><label class="field"><span>${t('rl_a_week')}</span><select class="input" name="week"><option>${w}</option><option>${next}</option></select></label>
          <label class="field"><span>${t('rl_a_style')}</span><select class="input" name="style">${Store.STYLES.map(s => `<option>${esc(s)}</option>`).join('')}</select></label></div>
        <label class="field full"><span>${t('rl_a_move')}</span><input class="input" name="move" maxlength="60"></label>
        <label class="field full"><span>${t('rl_a_tip')}</span><input class="input" name="tip" maxlength="300"></label>
        <label class="field full"><span>${t('rl_a_demo')}</span><input class="input" name="demo" type="url"></label>
        <div class="full form-foot"><button class="btn pink">${t('rl_a_save')}</button></div></form>`;
      const f = pane.querySelector('.rl-af');
      f.onsubmit = async ev => { ev.preventDefault(); const g = k => f.elements[k].value.trim(); if (!g('move')) return;
        try { await Backend.setMoveChallenge({ week: g('week'), move: g('move'), style: g('style'), tip: g('tip') || null, demo: /^https?:\/\//.test(g('demo')) ? g('demo') : null }); toast(t('adm_done'), '✔'); } catch (x) { fail(x); } };
    }
  });
})();
