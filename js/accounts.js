/* =========================================================
 * 後台「👤 帳號」分頁：列出 / 搜尋所有註冊的角色（只有網站架設者看得到）
 * 資料來自伺服器的 owner_players()，伺服器也會再檢查一次是不是網站架設者
 * ========================================================= */
(() => {
  const { esc, toast } = UI;
  const A = window.App;

  I18N.extend({
    zh: {
      ac_tab: '帳號', ac_search: '搜尋角色 ID 或名字…', ac_sort_new: '最新註冊', ac_sort_seen: '最近上線', ac_sort_xp: '等級最高',
      ac_all: '全部 {n} 人', ac_today: '今天新註冊 {n}', ac_week: '7 天內 {n}', ac_online: '現在在線 {n}', ac_found: '找到 {n} 個', ac_none: '沒有符合的帳號',
      ac_joined: '註冊', ac_seen: '上線', ac_never: '還沒上線過', ac_card: '名片', ac_more: '載入更多', ac_owner: '架設者', ac_admin: '管理員', ac_verified: '認證', ac_now: '在線',
      ac_ago_m: '{n} 分鐘前', ac_ago_h: '{n} 小時前', ac_ago_d: '{n} 天前', ac_ban_q: '確定要停權 @{h} 嗎？停權後他就不能發言。'
    },
    en: {
      ac_tab: 'Accounts', ac_search: 'Search player ID or name…', ac_sort_new: 'Newest', ac_sort_seen: 'Last online', ac_sort_xp: 'Highest level',
      ac_all: '{n} total', ac_today: '{n} new today', ac_week: '{n} in 7 days', ac_online: '{n} online now', ac_found: '{n} found', ac_none: 'No matching accounts',
      ac_joined: 'Joined', ac_seen: 'Online', ac_never: 'Never online', ac_card: 'Card', ac_more: 'Load more', ac_owner: 'Owner', ac_admin: 'Admin', ac_verified: 'Verified', ac_now: 'Online',
      ac_ago_m: '{n} min ago', ac_ago_h: '{n} h ago', ac_ago_d: '{n} days ago', ac_ban_q: 'Ban @{h}? They won’t be able to post.'
    },
    ja: {
      ac_tab: 'アカウント', ac_search: 'キャラ ID か名前で検索…', ac_sort_new: '新しい順', ac_sort_seen: '最近ログイン', ac_sort_xp: 'レベル順',
      ac_all: '全 {n} 人', ac_today: '今日の新規 {n}', ac_week: '7 日以内 {n}', ac_online: 'オンライン {n}', ac_found: '{n} 件', ac_none: '該当なし',
      ac_joined: '登録', ac_seen: 'ログイン', ac_never: 'ログインなし', ac_card: '名刺', ac_more: 'もっと見る', ac_owner: '創設者', ac_admin: '管理者', ac_verified: '認証', ac_now: 'オンライン',
      ac_ago_m: '{n} 分前', ac_ago_h: '{n} 時間前', ac_ago_d: '{n} 日前', ac_ban_q: '@{h} を停止しますか？発言できなくなります。'
    },
    ko: {
      ac_tab: '계정', ac_search: '캐릭터 ID 또는 이름 검색…', ac_sort_new: '최신 가입', ac_sort_seen: '최근 접속', ac_sort_xp: '레벨 순',
      ac_all: '전체 {n}명', ac_today: '오늘 가입 {n}', ac_week: '7일 이내 {n}', ac_online: '지금 접속 {n}', ac_found: '{n}개 찾음', ac_none: '해당 계정 없음',
      ac_joined: '가입', ac_seen: '접속', ac_never: '접속 기록 없음', ac_card: '명함', ac_more: '더 보기', ac_owner: '창설자', ac_admin: '관리자', ac_verified: '인증', ac_now: '접속 중',
      ac_ago_m: '{n}분 전', ac_ago_h: '{n}시간 전', ac_ago_d: '{n}일 전', ac_ban_q: '@{h} 님을 정지할까요? 글을 쓸 수 없게 돼요.'
    }
  });

  const ago = v => {
    if (!v) return t('ac_never');
    const m = Math.max(0, Math.round((Date.now() - Date.parse(v)) / 6e4));
    if (m < 10) return t('ac_now');
    if (m < 60) return t('ac_ago_m', { n: m });
    if (m < 60 * 24) return t('ac_ago_h', { n: Math.round(m / 60) });
    return t('ac_ago_d', { n: Math.round(m / 1440) });
  };
  const day = v => (v ? A.ymd(new Date(v)) : '—');
  const lv = xp => (A.levelOf ? A.levelOf(xp) : Math.floor(Math.sqrt((xp || 0) / 30)) + 1);

  A.adminTabs.push({
    key: 'accounts', owner: true, label: () => '👤 ' + t('ac_tab'),
    draw: async (pane, fail) => {
      const S = { q: '', sort: 'new', off: 0, rows: [] };
      pane.innerHTML = `<div class="ac-apps"></div><div class="ac-stats note"></div>
        <div class="btn-row ac-bar"><input class="input sm ac-q" type="search" placeholder="${esc(t('ac_search'))}">
          <select class="input sm ac-sort"><option value="new">${t('ac_sort_new')}</option><option value="seen">${t('ac_sort_seen')}</option><option value="xp">${t('ac_sort_xp')}</option></select></div>
        <p class="note ac-found"></p><ul class="adm-list ac-list"></ul><div class="btn-row"><button class="btn sm ac-more" hidden>${t('ac_more')}</button></div>`;
      const list = pane.querySelector('.ac-list'), more = pane.querySelector('.ac-more');
      const row = p => {
        const nat = p.nat && A.byCode[p.nat];
        const tags = [p.role === 'owner' ? t('ac_owner') : p.role ? t('ac_admin') : '', p.verified ? '✔ ' + t('ac_verified') : '', p.banned ? t('adm_banned') : ''].filter(Boolean);
        return `<li data-h="${esc(p.handle)}"><div class="grow">
          <b>${esc(p.name)}</b> <span class="note">@${esc(p.handle)}</span> <span class="tag">Lv.${lv(p.xp)}</span>${tags.map(x => ` <span class="tag ${x === t('adm_banned') ? 'ac-ban' : ''}">${esc(x)}</span>`).join('')}<br>
          <span class="note">${esc(nat ? nm(nat) : p.nat || '—')} · ${esc(p.style || '—')}${p.ig ? ` · IG @${esc(p.ig)}` : ''}</span><br>
          <span class="note">${t('ac_joined')} ${day(p.created_at)} · ${t('ac_seen')} ${esc(ago(p.last_seen))}</span></div>
          <div class="ac-acts"><button class="btn sm ac-card">${t('ac_card')}</button><button class="btn sm yellow ac-ttl">${t('ag_btn')}</button>${p.role === 'owner' ? '' : `<button class="btn sm ac-rn">${t('adm_rename')}</button><button class="btn sm red ac-bn">${p.banned ? t('adm_unban') : t('adm_ban')}</button>`}</div></li>`;
      };
      const load = async (reset) => {
        if (reset) { S.off = 0; S.rows = []; }
        let r;
        try { r = await Backend.rpc('owner_players', { q: S.q, sort: S.sort, lim: 50, off: S.off }); } catch (x) { return fail(x); }
        pane.querySelector('.ac-stats').textContent = [t('ac_all', { n: r.all }), t('ac_today', { n: r.today }), t('ac_week', { n: r.week }), t('ac_online', { n: r.online })].join('　·　');
        S.rows = S.rows.concat(r.rows || []); S.off = S.rows.length;
        pane.querySelector('.ac-found').textContent = S.q ? t('ac_found', { n: r.total }) : '';
        list.innerHTML = S.rows.length ? S.rows.map(row).join('') : `<li class="note">${t('ac_none')}</li>`;
        more.style.display = S.rows.length >= r.total ? "none" : "";
      };
      let tm = null;
      pane.querySelector('.ac-q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { S.q = e.target.value.trim(); load(true); }, 350); };
      pane.querySelector('.ac-sort').onchange = e => { S.sort = e.target.value; load(true); };
      more.onclick = () => load(false);
      list.onclick = async e => {
        const li = e.target.closest('li[data-h]'); if (!li) return;
        const hd = li.dataset.h, p = S.rows.find(x => x.handle === hd); if (!p) return;
        if (e.target.closest('.ac-card')) return Friends.openCard(hd);
        if (e.target.closest('.ac-ttl')) return Collect.openGrant(hd, p.name);
        try {
          if (e.target.closest('.ac-rn')) { const n = prompt(t('adm_rename_ph'), p.name); if (!n) return; p.name = n.trim().slice(0, 20); await Backend.setPlayer(hd, { name: p.name }); }
          else if (e.target.closest('.ac-bn')) { if (!p.banned && !confirm(t('ac_ban_q', { h: hd }))) return; p.banned = !p.banned; await Backend.setPlayer(hd, { banned: p.banned }); }
          else return;
          toast(t('adm_done'), '✔'); li.outerHTML = row(p);
        } catch (x) { fail(x); }
      };
      load(true);
      if (window.Collect) Collect.drawRoleApps(pane.querySelector('.ac-apps'), fail);
    }
  });
})();
