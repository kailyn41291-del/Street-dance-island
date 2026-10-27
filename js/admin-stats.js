/* =========================================================
 * 後台統計（只有管理員看得到）：
 * 台灣各縣市活動數、舞風分布、活動瀏覽量、連結點擊量、年度趨勢
 * ========================================================= */
(() => {
  const { h, esc } = UI;
  const A = window.App;

  I18N.extend({
    zh: {
      st_tab: '📊 數據統計', st_all: '全部年份', st_total: '活動總數', st_tw: '台灣活動', st_views: '總瀏覽', st_link: '官網／報名連結點擊', st_map: '地圖點擊', st_ctr: '連結點擊率',
      st_city: '台灣各縣市活動數', st_style: '舞風分布', st_style_n: '一個活動可以有多個舞風，所以加總會大於活動數',
      st_trend_y: '年度賽事趨勢（每年活動數）', st_trend_m: '{y} 年每月活動數', st_rank: '活動排行（依瀏覽量）',
      st_name: '活動', st_date: '日期', st_v: '瀏覽', st_l: '連結點擊', st_m: '地圖點擊', st_r: '點擊率',
      st_note: '瀏覽：卡片出現在畫面上 1 秒算一次，同一台裝置同一活動一天只算一次。點擊：同一台裝置同一活動一天只算一次。瀏覽量和點擊量是累計數字，不受年份篩選影響。',
      st_noclick: '點擊統計還沒啟用（需要先在 Supabase 跑 supabase_clicks.sql）', st_none: '沒有資料', st_ev: '{n} 場', st_more: '只顯示前 {n} 名'
    },
    en: {
      st_tab: '📊 Stats', st_all: 'All years', st_total: 'Total events', st_tw: 'Taiwan events', st_views: 'Total views', st_link: 'Website / sign-up clicks', st_map: 'Map clicks', st_ctr: 'Link click rate',
      st_city: 'Events by Taiwan city / county', st_style: 'Dance styles', st_style_n: 'An event can list several styles, so the total is larger than the number of events',
      st_trend_y: 'Yearly trend (events per year)', st_trend_m: 'Events per month in {y}', st_rank: 'Top events (by views)',
      st_name: 'Event', st_date: 'Date', st_v: 'Views', st_l: 'Link clicks', st_m: 'Map clicks', st_r: 'Click rate',
      st_note: 'Views: a card counts once after 1 second on screen, once per device per event per day. Clicks: once per device per event per day. Views and clicks are all-time totals and ignore the year filter.',
      st_noclick: 'Click stats are not enabled yet (run supabase_clicks.sql in Supabase first)', st_none: 'No data', st_ev: '{n} events', st_more: 'Top {n} only'
    },
    ja: {
      st_tab: '📊 統計', st_all: 'すべての年', st_total: 'イベント総数', st_tw: '台湾のイベント', st_views: '総閲覧数', st_link: '公式・エントリーリンクのクリック', st_map: '地図のクリック', st_ctr: 'リンククリック率',
      st_city: '台湾の県市別イベント数', st_style: 'ジャンル分布', st_style_n: '1 つのイベントに複数ジャンルがあるため、合計はイベント数より多くなります',
      st_trend_y: '年度別トレンド（年間イベント数）', st_trend_m: '{y} 年の月別イベント数', st_rank: 'イベントランキング（閲覧数順）',
      st_name: 'イベント', st_date: '日付', st_v: '閲覧', st_l: 'リンク', st_m: '地図', st_r: 'クリック率',
      st_note: '閲覧：カードが 1 秒表示されると 1 回、同じ端末・同じイベントは 1 日 1 回まで。クリック：同じ端末・同じイベントは 1 日 1 回まで。閲覧数とクリック数は累計で、年の絞り込みには影響されません。',
      st_noclick: 'クリック統計はまだ有効ではありません（先に Supabase で supabase_clicks.sql を実行）', st_none: 'データなし', st_ev: '{n} 件', st_more: '上位 {n} 件のみ'
    },
    ko: {
      st_tab: '📊 통계', st_all: '전체 연도', st_total: '전체 이벤트', st_tw: '대만 이벤트', st_views: '총 조회수', st_link: '공식·신청 링크 클릭', st_map: '지도 클릭', st_ctr: '링크 클릭률',
      st_city: '대만 지역별 이벤트 수', st_style: '장르 분포', st_style_n: '이벤트 하나에 여러 장르가 있을 수 있어 합계가 이벤트 수보다 많아요',
      st_trend_y: '연도별 추세(연간 이벤트 수)', st_trend_m: '{y}년 월별 이벤트 수', st_rank: '이벤트 순위(조회수 순)',
      st_name: '이벤트', st_date: '날짜', st_v: '조회', st_l: '링크 클릭', st_m: '지도 클릭', st_r: '클릭률',
      st_note: '조회: 카드가 화면에 1초 보이면 1회, 같은 기기·같은 이벤트는 하루 1회까지. 클릭: 같은 기기·같은 이벤트는 하루 1회까지. 조회수와 클릭 수는 누적이며 연도 필터와 상관없어요.',
      st_noclick: '클릭 통계가 아직 켜지지 않았어요(먼저 Supabase에서 supabase_clicks.sql 실행)', st_none: '데이터 없음', st_ev: '{n}건', st_more: '상위 {n}개만'
    }
  });

  /* ---------- 點擊紀錄：官網／報名連結、地圖 ---------- */
  const CKEY = 'danceIsland.clicked.v1';
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-act="link"], a[data-act="map"]');
    const card = a && a.closest('article.card[data-id]');
    if (!card || !Store.cloud) return;
    const id = card.dataset.id, k = a.dataset.act, key = id + '|' + k, day = A.todayStr();
    let o; try { o = JSON.parse(localStorage.getItem(CKEY) || '{}'); } catch (x) { o = {}; }
    if (o.day !== day) o = { day, ids: [] };
    if (o.ids.includes(key)) return;
    o.ids.push(key); try { localStorage.setItem(CKEY, JSON.stringify(o)); } catch (x) {}
    Backend.bumpClick(id, k).catch(() => {});
  }, true);

  /* ---------- 小工具：長條圖（HTML，滑過顯示數字） ---------- */
  const fmt = n => Number(n || 0).toLocaleString();
  const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '–');
  // 橫條：rows = [{ label, n, tip }]
  const hbars = (rows, unit) => {
    const max = Math.max(1, ...rows.map(r => r.n));
    return `<div class="st-hb">${rows.map(r => `<div class="st-hr ${r.n ? '' : 'zero'}" data-tip="${esc(r.tip || `${r.label}：${unit(r.n)}`)}">
      <span class="st-hl">${esc(r.label)}</span><span class="st-ht"><i style="width:${(r.n / max) * 100}%"></i></span><span class="st-hv">${fmt(r.n)}</span></div>`).join('')}</div>`;
  };
  // 直條：rows = [{ label, n }]
  const vbars = (rows, unit) => {
    const max = Math.max(1, ...rows.map(r => r.n));
    const ticks = [0, 0.5, 1].map(f => Math.round(max * f));
    return `<div class="st-vb"><div class="st-axis">${ticks.slice().reverse().map(v => `<span>${fmt(v)}</span>`).join('')}</div>
      <div class="st-plot"><div class="st-grid"><i></i><i></i><i></i></div>${rows.map(r => `<div class="st-vc" data-tip="${esc(`${r.label}：${unit(r.n)}`)}">
        <span class="st-vt"><i style="height:${(r.n / max) * 100}%"></i></span><span class="st-vl">${esc(r.label)}</span></div>`).join('')}</div></div>`;
  };

  // 滑過長條顯示提示
  let tip;
  const showTip = (el, x, y) => {
    if (!tip) { tip = h('<div class="st-tip" role="tooltip"></div>'); document.body.appendChild(tip); }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const w = tip.offsetWidth;
    tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, x - w / 2)) + 'px';
    tip.style.top = Math.max(8, y - 44) + 'px';
  };
  const hideTip = () => { if (tip) tip.hidden = true; };

  async function draw(pane, fail) {
    pane.innerHTML = `<p class="note">…</p>`;
    let views = {}, clicks = null;
    try { views = await Backend.viewCounts(); } catch (x) {}
    try { clicks = await Backend.clickStats(); } catch (x) { clicks = null; }
    await Store.ensureAll(true);
    const all = Store.all().filter(e => e.date);
    const years = [...new Set(all.map(e => e.date.slice(0, 4)))].sort();
    let year = '';

    const clickBy = {};
    (clicks || []).forEach(r => { const o = (clickBy[r.event_id] = clickBy[r.event_id] || { link: 0, map: 0 }); o[r.kind] += r.n; });

    const render = () => {
      const evs = year ? all.filter(e => e.date.startsWith(year)) : all;
      const ids = new Set(evs.map(e => e.id));
      const tw = evs.filter(e => e.country === 'TW');
      const totalViews = evs.reduce((s, e) => s + (views[e.id] || 0), 0);
      const totalLink = evs.reduce((s, e) => s + ((clickBy[e.id] || {}).link || 0), 0);
      const totalMap = evs.reduce((s, e) => s + ((clickBy[e.id] || {}).map || 0), 0);
      const evUnit = n => t('st_ev', { n: fmt(n) });

      // 台灣各縣市（全部列出，沒活動的變淡）
      const cityRows = A.byCode.TW.cities.map(c => ({ label: nm(c), n: tw.filter(e => e.city === c.id).length }))
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
      // 舞風
      const sc = {}; evs.forEach(e => (e.styles || []).forEach(s => (sc[s] = (sc[s] || 0) + 1)));
      const styleRows = Object.entries(sc).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
      // 趨勢：全部年份 → 每年；選了年份 → 每月
      const trend = year
        ? Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), n: evs.filter(e => +e.date.slice(5, 7) === i + 1).length }))
        : years.map(y => ({ label: y, n: all.filter(e => e.date.startsWith(y)).length }));
      // 排行
      const TOP = 20;
      const rank = evs.map(e => ({ e, v: views[e.id] || 0, l: (clickBy[e.id] || {}).link || 0, m: (clickBy[e.id] || {}).map || 0 }))
        .sort((a, b) => b.v - a.v || b.l - a.l).slice(0, TOP);

      pane.innerHTML = `<div class="st">
        <div class="st-filters"><select class="input sm st-year"><option value="">${t('st_all')}</option>${years.map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="st-tiles">
          <div class="st-tile"><span>${t('st_total')}</span><b>${fmt(evs.length)}</b></div>
          <div class="st-tile"><span>${t('st_tw')}</span><b>${fmt(tw.length)}</b></div>
          <div class="st-tile"><span>${t('st_views')}</span><b>${fmt(totalViews)}</b></div>
          <div class="st-tile"><span>${t('st_link')}</span><b>${clicks ? fmt(totalLink) : '–'}</b></div>
          <div class="st-tile"><span>${t('st_map')}</span><b>${clicks ? fmt(totalMap) : '–'}</b></div>
          <div class="st-tile"><span>${t('st_ctr')}</span><b>${clicks ? pct(totalLink, totalViews) : '–'}</b></div>
        </div>
        ${clicks ? '' : `<p class="note warn">⚠ ${t('st_noclick')}</p>`}
        <div class="st-grid2">
          <section class="st-card"><h4>${t('st_city')}</h4>${hbars(cityRows, evUnit)}</section>
          <section class="st-card"><h4>${t('st_style')}</h4>${styleRows.length ? hbars(styleRows, evUnit) : `<p class="note">${t('st_none')}</p>`}<p class="note">${t('st_style_n')}</p></section>
        </div>
        <section class="st-card"><h4>${year ? t('st_trend_m', { y: year }) : t('st_trend_y')}</h4>${trend.length ? vbars(trend, evUnit) : `<p class="note">${t('st_none')}</p>`}</section>
        <section class="st-card"><h4>${t('st_rank')}</h4>
          <div class="st-tw"><table class="st-table"><thead><tr><th>${t('st_name')}</th><th>${t('st_date')}</th><th class="n">${t('st_v')}</th><th class="n">${t('st_l')}</th><th class="n">${t('st_m')}</th><th class="n">${t('st_r')}</th></tr></thead>
          <tbody>${rank.length ? rank.map(r => `<tr><td>${esc(r.e.name)}<small>${esc([nm(A.byCode[r.e.country]), nm(A.cityOf(r.e.country, r.e.city))].filter(Boolean).join('・'))}</small></td><td>${esc(r.e.date.replace(/-/g, '/'))}</td>
            <td class="n">${fmt(r.v)}</td><td class="n">${clicks ? fmt(r.l) : '–'}</td><td class="n">${clicks ? fmt(r.m) : '–'}</td><td class="n">${clicks ? pct(r.l, r.v) : '–'}</td></tr>`).join('') : `<tr><td colspan="6" class="note">${t('st_none')}</td></tr>`}</tbody></table></div>
          ${evs.length > TOP ? `<p class="note">${t('st_more', { n: TOP })}</p>` : ''}</section>
        <p class="note">${t('st_note')}</p>
      </div>`;
      pane.querySelector('.st-year').onchange = ev => { year = ev.target.value; SFX.play('select'); render(); };
      pane.querySelectorAll('[data-tip]').forEach(el => {
        el.onpointermove = ev => showTip(el, ev.clientX, ev.clientY);
        el.onpointerleave = hideTip;
      });
    };
    render();
  }

  A.adminTabs = A.adminTabs || [];
  A.adminTabs.unshift({ key: 'stats', label: () => t('st_tab'), draw: (pane, fail) => { hideTip(); return draw(pane, fail); } });
})();
