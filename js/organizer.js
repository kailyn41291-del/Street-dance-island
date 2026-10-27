/* =========================================================
 * 第五批・主辦方工具：
 * - 對戰表產生器（#/bracket）：上傳 Excel / CSV / Google 表單匯出的名單 → 排對戰表 → 自選底圖 → 下載 PNG / PDF
 *   也可以輸出整理好的報名名單（PDF / CSV）
 * - 第一次打開「新增活動」時的導覽
 * - 比賽當天流程（選填）：活動卡片上可以看，當天會標出「進行中」
 * - 管理後台每個分頁都可以匯出 PDF
 * ========================================================= */
window.Organizer = (() => {
  const { h, esc, modal, toast, sparkle } = UI;
  const A = window.App;

  I18N.extend({
    zh: {
      hub_bracket: '對戰表產生器', bk_title: '🏆 對戰表產生器', bk_intro: '上傳報名名單（Excel、CSV，或 Google 表單匯出的檔案），網站會幫你排好淘汰賽對戰表，可以換底圖，下載成圖片或 PDF。名單只在你的瀏覽器裡處理，不會上傳。',
      bk_step1: '① 名單', bk_file: '選擇檔案（.xlsx / .csv）', bk_or: '或直接貼上名字（一行一個）', bk_col: '用哪一欄當名字？', bk_n: '共 {n} 位', bk_clean: '已自動去掉空白和重複的名字',
      bk_step2: '② 設定', bk_name: '比賽名稱', bk_sub: '副標（組別、日期…）', bk_seed: '排序方式', bk_rand: '隨機抽籤', bk_order: '照名單順序（種子）', bk_reshuffle: '🎲 重新抽籤',
      bk_step3: '③ 底圖', bk_bg_up: '上傳底圖', bk_bg_none: '不用底圖', bk_theme: '配色', bk_dim: '底圖變暗（讓字更清楚）',
      bk_step4: '④ 下載', bk_png: '⬇ 下載圖片 PNG', bk_pdf: '⬇ 下載 PDF', bk_list_pdf: '⬇ 報名名單 PDF', bk_list_csv: '⬇ 報名名單 CSV', bk_need: '至少要 2 個名字才能排對戰表', bk_bye: '輪空', bk_final: '決賽', bk_champ: '冠軍', bk_round: '第 {n} 輪', bk_semi: '四強', bk_qf: '八強', bk_top16: '16 強', bk_list: '報名名單',
      bk_loading: '載入中…', bk_lib_fail: '工具載入失敗，請檢查網路後重試',
      ft_title: '📖 第一次建立活動？', ft_start: '看導覽', ft_skip: '不用了', ft_next: '下一步', ft_done: '完成',
      ft_1: '先填活動名稱。名稱會出現在活動卡片、分享圖片和地圖上。', ft_2: '選國家和城市，活動會出現在那個城市的島上。地址會用來開 Google Map。', ft_3: '選賽事分類（舞風），玩家會依照自己的舞風收到推薦。',
      ft_4: '活動日期一定要填；多日活動再填結束日期。', ft_5: '報名方式：公開報名、邀請制、海選已結束、免報名。不是公開報名時，報名日期會自動藏起來。', ft_6: '陣容（選填）：參賽隊伍、Judge、Showcase，一行一個。',
      ft_7: '比賽當天流程（選填）：一行一個，例如「16:30 入場」。活動當天，卡片上會標出現在進行到哪裡。', ft_8: '最後放上海報和官網連結，就完成了！',
      fl_title: '📋 當天流程（選填）', fl_ph: '一行一個時間和內容，例如：\n16:30 入場\n17:00 開幕\n17:30 Top 16\n20:00 頒獎', fl_btn: '當天流程', fl_now: '進行中', fl_next: '下一個',
      pdf_btn: '📄 匯出 PDF', pdf_making: '正在產生 PDF…'
    },
    en: {
      hub_bracket: 'Bracket maker', bk_title: '🏆 Bracket Maker', bk_intro: 'Upload your sign-up list (Excel, CSV or a Google Forms export) and get a knockout bracket — pick a background and download it as an image or PDF. The list is processed in your browser only.',
      bk_step1: '① Entrants', bk_file: 'Choose file (.xlsx / .csv)', bk_or: 'or paste names (one per line)', bk_col: 'Which column has the names?', bk_n: '{n} entrants', bk_clean: 'Blank and duplicate names removed',
      bk_step2: '② Settings', bk_name: 'Battle name', bk_sub: 'Subtitle (division, date…)', bk_seed: 'Seeding', bk_rand: 'Random draw', bk_order: 'Keep list order (seeded)', bk_reshuffle: '🎲 Redraw',
      bk_step3: '③ Background', bk_bg_up: 'Upload background', bk_bg_none: 'No background', bk_theme: 'Colors', bk_dim: 'Darken background (easier to read)',
      bk_step4: '④ Download', bk_png: '⬇ Download PNG', bk_pdf: '⬇ Download PDF', bk_list_pdf: '⬇ Entrant list PDF', bk_list_csv: '⬇ Entrant list CSV', bk_need: 'Need at least 2 names', bk_bye: 'BYE', bk_final: 'Final', bk_champ: 'Champion', bk_round: 'Round {n}', bk_semi: 'Semis', bk_qf: 'Quarters', bk_top16: 'Top 16', bk_list: 'Entrants',
      bk_loading: 'Loading…', bk_lib_fail: 'Could not load the tool — check your connection and retry',
      ft_title: '📖 First time adding an event?', ft_start: 'Show me', ft_skip: 'No thanks', ft_next: 'Next', ft_done: 'Done',
      ft_1: 'Start with the event name — it shows on cards, share images and the map.', ft_2: 'Pick the country and city so the event appears on that island. The address opens Google Maps.', ft_3: 'Choose the styles — players get recommendations based on their style.',
      ft_4: 'The date is required; add an end date for multi-day events.', ft_5: 'Entry type: open, invite only, prelims finished or no sign-up. Sign-up dates hide automatically when not open.', ft_6: 'Line-up (optional): teams, judges, showcase — one per line.',
      ft_7: 'Event-day schedule (optional): one line each, e.g. “16:30 Doors open”. On the day, the card shows what’s happening now.', ft_8: 'Finally add the poster and website link — done!',
      fl_title: '📋 Event-day schedule (optional)', fl_ph: 'One time + item per line, e.g.\n16:30 Doors open\n17:00 Opening\n17:30 Top 16\n20:00 Awards', fl_btn: 'Schedule', fl_now: 'Now', fl_next: 'Next',
      pdf_btn: '📄 Export PDF', pdf_making: 'Making PDF…'
    },
    ja: {
      hub_bracket: 'トーナメント表作成', bk_title: '🏆 トーナメント表メーカー', bk_intro: 'エントリー名簿（Excel・CSV・Google フォームの書き出し）をアップすると、トーナメント表を自動で作ります。背景を選んで画像や PDF でダウンロード。名簿はブラウザ内だけで処理されます。',
      bk_step1: '① 名簿', bk_file: 'ファイルを選ぶ（.xlsx / .csv）', bk_or: 'または名前を貼り付け（1 行 1 人）', bk_col: '名前はどの列？', bk_n: '{n} 人', bk_clean: '空欄と重複を自動で取り除きました',
      bk_step2: '② 設定', bk_name: '大会名', bk_sub: 'サブタイトル（部門・日付など）', bk_seed: '組み合わせ', bk_rand: 'ランダム抽選', bk_order: '名簿の順番（シード）', bk_reshuffle: '🎲 再抽選',
      bk_step3: '③ 背景', bk_bg_up: '背景をアップ', bk_bg_none: '背景なし', bk_theme: '配色', bk_dim: '背景を暗くする（文字を読みやすく）',
      bk_step4: '④ ダウンロード', bk_png: '⬇ 画像 PNG', bk_pdf: '⬇ PDF', bk_list_pdf: '⬇ 名簿 PDF', bk_list_csv: '⬇ 名簿 CSV', bk_need: '2 人以上必要です', bk_bye: '不戦勝', bk_final: '決勝', bk_champ: '優勝', bk_round: '{n} 回戦', bk_semi: '準決勝', bk_qf: '準々決勝', bk_top16: 'ベスト 16', bk_list: 'エントリー名簿',
      bk_loading: '読み込み中…', bk_lib_fail: 'ツールを読み込めませんでした。通信を確認してください',
      ft_title: '📖 はじめてイベントを登録しますか？', ft_start: 'ガイドを見る', ft_skip: 'いいえ', ft_next: '次へ', ft_done: '完了',
      ft_1: 'まずイベント名。カード、シェア画像、地図に表示されます。', ft_2: '国と都市を選ぶと、その島に表示されます。住所は Google マップ用です。', ft_3: 'ジャンルを選ぶと、そのジャンルのプレイヤーにおすすめされます。',
      ft_4: '開催日は必須。複数日なら終了日も。', ft_5: 'エントリー形式：一般・招待制・予選終了・エントリー不要。一般以外ならエントリー期間は自動で隠れます。', ft_6: '出演者（任意）：出場チーム・ジャッジ・ショーケース、1 行に 1 つ。',
      ft_7: '当日の流れ（任意）：「16:30 開場」のように 1 行ずつ。当日はカードに「進行中」が表示されます。', ft_8: '最後にポスターと公式リンクを入れて完成！',
      fl_title: '📋 当日の流れ（任意）', fl_ph: '1 行に時間と内容：\n16:30 開場\n17:00 オープニング\n17:30 ベスト 16\n20:00 表彰', fl_btn: 'タイムテーブル', fl_now: '進行中', fl_next: '次',
      pdf_btn: '📄 PDF 書き出し', pdf_making: 'PDF を作成中…'
    },
    ko: {
      hub_bracket: '대진표 만들기', bk_title: '🏆 대진표 메이커', bk_intro: '참가자 명단(엑셀, CSV, 구글 폼 내보내기)을 올리면 토너먼트 대진표를 만들어 줘요. 배경을 고르고 이미지나 PDF로 받으세요. 명단은 브라우저 안에서만 처리돼요.',
      bk_step1: '① 명단', bk_file: '파일 선택 (.xlsx / .csv)', bk_or: '또는 이름 붙여넣기 (한 줄에 한 명)', bk_col: '이름이 있는 열은?', bk_n: '{n}명', bk_clean: '빈칸과 중복 이름을 자동으로 뺐어요',
      bk_step2: '② 설정', bk_name: '대회 이름', bk_sub: '부제 (부문, 날짜…)', bk_seed: '대진 방식', bk_rand: '무작위 추첨', bk_order: '명단 순서대로 (시드)', bk_reshuffle: '🎲 다시 추첨',
      bk_step3: '③ 배경', bk_bg_up: '배경 올리기', bk_bg_none: '배경 없음', bk_theme: '색상', bk_dim: '배경 어둡게 (글자가 더 잘 보여요)',
      bk_step4: '④ 다운로드', bk_png: '⬇ PNG 이미지', bk_pdf: '⬇ PDF', bk_list_pdf: '⬇ 명단 PDF', bk_list_csv: '⬇ 명단 CSV', bk_need: '2명 이상 있어야 해요', bk_bye: '부전승', bk_final: '결승', bk_champ: '우승', bk_round: '{n}라운드', bk_semi: '4강', bk_qf: '8강', bk_top16: '16강', bk_list: '참가자 명단',
      bk_loading: '불러오는 중…', bk_lib_fail: '도구를 불러오지 못했어요. 인터넷을 확인해 주세요',
      ft_title: '📖 처음 이벤트를 등록하나요?', ft_start: '안내 보기', ft_skip: '괜찮아요', ft_next: '다음', ft_done: '완료',
      ft_1: '먼저 이벤트 이름. 카드, 공유 이미지, 지도에 표시돼요.', ft_2: '나라와 도시를 고르면 그 섬에 표시돼요. 주소는 구글 지도용이에요.', ft_3: '장르를 고르면 그 장르 플레이어에게 추천돼요.',
      ft_4: '날짜는 꼭 입력하고, 여러 날이면 종료일도요.', ft_5: '참가 방식: 공개 신청・초청제・예선 종료・신청 불필요. 공개가 아니면 신청 기간은 자동으로 숨겨져요.', ft_6: '라인업(선택): 참가 팀・저지・쇼케이스, 한 줄에 하나씩.',
      ft_7: '당일 진행표(선택): 「16:30 입장」처럼 한 줄씩. 당일에는 카드에 「진행 중」이 표시돼요.', ft_8: '마지막으로 포스터와 홈페이지 링크를 넣으면 끝!',
      fl_title: '📋 당일 진행표 (선택)', fl_ph: '한 줄에 시간과 내용:\n16:30 입장\n17:00 오프닝\n17:30 16강\n20:00 시상', fl_btn: '진행표', fl_now: '진행 중', fl_next: '다음',
      pdf_btn: '📄 PDF 내보내기', pdf_making: 'PDF 만드는 중…'
    }
  });

  /* ---------- 外部工具（用到才載入） ---------- */
  const libs = {};
  const load = (key, url, test) => libs[key] || (libs[key] = new Promise((res, rej) => {
    if (test()) return res(test());
    const s = document.createElement('script'); s.src = url;
    s.onload = () => (test() ? res(test()) : rej(new Error('lib'))); s.onerror = () => { delete libs[key]; rej(new Error('lib')); };
    document.head.appendChild(s);
  }));
  const jsPDF = () => load('pdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf && window.jspdf.jsPDF);
  const XLSX = () => load('xlsx', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', () => window.XLSX);
  const h2c = () => load('h2c', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => window.html2canvas);
  const saveBlob = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
  const safeName = s => String(s || 'booto').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'booto';
  // 把一張（或好幾張）canvas 放進 A4 PDF
  async function canvasToPDF(canvases, name, landscape) {
    const J = await jsPDF();
    const doc = new J({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    canvases.forEach((cv, i) => {
      if (i) doc.addPage();
      const k = Math.min(pw / cv.width, ph / cv.height), w = cv.width * k, hh = cv.height * k;
      doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', (pw - w) / 2, (ph - hh) / 2, w, hh);
    });
    doc.save(safeName(name) + '.pdf');
  }

  /* =========================================================
   * 對戰表產生器
   * ========================================================= */
  const THEMES = { night: ['#1b1530', '#f3e6d4', '#f07ca3', '#eac45a'], paper: ['#fff6e8', '#3b2b2b', '#e35d5d', '#5bb5a6'], red: ['#7a1414', '#fff1e6', '#f5c542', '#ffffff'], ocean: ['#0e3a5a', '#e8f4ff', '#5bb5a6', '#eac45a'] };
  const st = { names: [], order: [], title: '', sub: '', seed: 'rand', bg: null, theme: 'night', dim: true, rows: null, col: 0 };
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const clean = list => { const seen = new Set(); return list.map(x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim()).filter(x => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())); };
  // 標準種子排法：1 對最後一名、2 對倒數第二…，輪空給前段種子
  function seedSlots(names) {
    let size = 2; while (size < names.length) size *= 2;
    let order = [1, 2];
    while (order.length < size) { const n = order.length * 2 + 1; order = order.flatMap(x => [x, n - x]); }
    return order.map(s => names[s - 1] || null);
  }
  const roundName = (left, total) => left === 2 ? t('bk_final') : left === 4 ? t('bk_semi') : left === 8 ? t('bk_qf') : left === 16 ? t('bk_top16') : t('bk_round', { n: total });
  function drawBracket(cv) {
    const slots = seedSlots(st.order), size = slots.length, rounds = Math.log2(size);
    const W = 2400, H = Math.max(1500, size * 62 + 420);
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), [bgc, ink, acc, gold] = THEMES[st.theme];
    g.fillStyle = bgc; g.fillRect(0, 0, W, H);
    if (st.bg) {
      const k = Math.max(W / st.bg.width, H / st.bg.height), w = st.bg.width * k, hh = st.bg.height * k;
      g.drawImage(st.bg, (W - w) / 2, (H - hh) / 2, w, hh);
      if (st.dim) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H); }
    }
    const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px Cubic11, "PingFang TC", "Microsoft JhengHei", sans-serif`;
    const fg = st.bg && st.dim ? '#ffffff' : ink;
    g.textAlign = 'center'; g.fillStyle = fg; g.font = font(78, true); g.fillText(st.title || 'BATTLE', W / 2, 120);
    if (st.sub) { g.font = font(40); g.fillStyle = gold; g.fillText(st.sub, W / 2, 180); }
    g.font = font(26); g.fillStyle = fg; g.globalAlpha = 0.7; g.fillText('BOOTO 舞島', W / 2, H - 40); g.globalAlpha = 1;
    // 左右兩邊往中間打：左半邊、右半邊各一半，決賽在中間
    // 輪空的直接晉級到第二輪
    const adv = []; for (let i = 0; i < size; i += 2) adv.push(slots[i] && !slots[i + 1] ? slots[i] : !slots[i] && slots[i + 1] ? slots[i + 1] : '');
    const top = 250, bottom = H - 110, half = size / 2, colW = (W / 2 - 240) / Math.max(1, rounds - 1 || 1);
    const boxW = Math.min(300, colW - 30), boxH = Math.min(46, (bottom - top) / half - 10);
    const yOf = (i, n) => top + (bottom - top) * (i + 0.5) / n;
    const box = (x, y, text, hi, bye) => {
      g.fillStyle = hi ? acc : 'rgba(255,255,255,.92)'; g.strokeStyle = '#2a1f2e'; g.lineWidth = 4;
      g.fillRect(x, y - boxH / 2, boxW, boxH); g.strokeRect(x, y - boxH / 2, boxW, boxH);
      g.fillStyle = text ? '#2a1f2e' : '#9a8f9a'; g.font = font(Math.min(26, boxH * 0.55)); g.textAlign = 'left';
      let s = text || (bye ? t('bk_bye') : ''); while (g.measureText(s).width > boxW - 20 && s.length > 2) s = s.slice(0, -2) + '…';
      g.fillText(s, x + 10, y + boxH * 0.18);
    };
    const line = (x1, y1, x2, y2) => { g.strokeStyle = fg; g.lineWidth = 4; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    for (const side of [0, 1]) {
      const dir = side ? -1 : 1, x0 = side ? W - 60 - boxW : 60;
      let n = half;
      for (let r = 0; r < rounds; r++) {
        const x = x0 + dir * r * colW, last = r === rounds - 1;
        if (last) break;
        g.textAlign = 'center'; g.fillStyle = gold; g.font = font(30, true);
        g.fillText(roundName(n * 2, r + 1), x + boxW / 2, top - 30);
        for (let i = 0; i < n; i++) {
          const y = yOf(i, n);
          box(x, y, r === 0 ? slots[side * half + i] : r === 1 ? adv[side * half / 2 + i] : '', false, r === 0);
          // 連到下一輪
          const xe = side ? x : x + boxW, xn = xe + dir * (colW - boxW) / 2;
          line(xe, y, xn, y);
          if (i % 2 === 0) { const y2 = yOf(i + 1, n); line(xn, y, xn, y2); line(xn, (y + y2) / 2, xn + dir * (colW - boxW) / 2, (y + y2) / 2); }
        }
        n /= 2;
      }
    }
    // 決賽 & 冠軍
    const cy = (top + bottom) / 2, fx = W / 2 - boxW / 2;
    g.textAlign = 'center'; g.fillStyle = gold; g.font = font(36, true); g.fillText('🏆 ' + t('bk_champ'), W / 2, cy - 120);
    // 只有 2 人：直接是決賽；4 人以內有輪空：晉級的人直接進決賽
    const fin = rounds === 1 ? [slots[0], slots[1]] : rounds === 2 ? [adv[0], adv[1]] : ['', ''];
    box(fx, cy - 50, fin[0] || '', true); box(fx, cy + 50, fin[1] || '', false);
    g.fillStyle = fg; g.font = font(30, true); g.textAlign = 'center'; g.fillText(t('bk_final'), W / 2, cy + 50 + boxH / 2 + 40);
  }
  function drawList(cv) {
    const W = 1240, per = 40, pages = [];
    for (let p = 0; p * per < st.names.length || p === 0; p++) {
      const c = p === 0 ? cv : document.createElement('canvas'); c.width = W; c.height = 1754;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, 1754);
      g.fillStyle = '#2a1f2e'; g.font = 'bold 48px Cubic11, sans-serif'; g.fillText(`${st.title || ''} ${t('bk_list')}`.trim(), 80, 120);
      g.font = '28px Cubic11, sans-serif'; g.fillStyle = '#6b5552'; g.fillText(`${st.sub || ''}  ${t('bk_n', { n: st.names.length })}`.trim(), 80, 170);
      g.fillStyle = '#2a1f2e'; g.font = '30px Cubic11, sans-serif';
      st.names.slice(p * per, (p + 1) * per).forEach((n, i) => { const k = p * per + i; const col = i < per / 2 ? 0 : 1, row = i % (per / 2); g.fillText(`${String(k + 1).padStart(3, ' ')}.  ${n}`, 80 + col * 560, 260 + row * 66); });
      pages.push(c);
    }
    return pages;
  }
  A.crumbs.bracket = () => '🏆 ' + t('hub_bracket');
  A.views.bracket = (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    inner.innerHTML = `<div class="win">${UI.winHTML(t('bk_title'), 'yellow', false)}<div class="win-body"><p>${t('bk_intro')}</p>
      <div class="bk-grid">
        <fieldset class="fieldset"><legend>${t('bk_step1')}</legend><label class="btn sm teal">📄 ${t('bk_file')}<input type="file" class="bk-file" accept=".xlsx,.xls,.csv,text/csv" hidden></label>
          <div class="bk-colw" hidden><span>${t('bk_col')}</span><select class="input sm bk-col"></select></div>
          <p class="note">${t('bk_or')}</p><textarea class="input bk-paste" rows="7" placeholder="IP LOCKERS&#10;FREEDOM SOUL&#10;FRESUKI"></textarea><p class="note bk-count"></p></fieldset>
        <fieldset class="fieldset"><legend>${t('bk_step2')}</legend><label class="field"><span>${t('bk_name')}</span><input class="input bk-title" maxlength="40"></label>
          <label class="field"><span>${t('bk_sub')}</span><input class="input bk-sub" maxlength="50"></label>
          <div class="field"><span>${t('bk_seed')}</span><div class="seg bk-seed"><button type="button" data-s="rand" class="on">${t('bk_rand')}</button><button type="button" data-s="order">${t('bk_order')}</button></div></div>
          <button type="button" class="btn sm bk-shuf">${t('bk_reshuffle')}</button></fieldset>
        <fieldset class="fieldset"><legend>${t('bk_step3')}</legend><label class="btn sm pink">🖼 ${t('bk_bg_up')}<input type="file" class="bk-bg" accept="image/*" hidden></label><button type="button" class="btn sm bk-nobg">${t('bk_bg_none')}</button>
          <div class="field"><span>${t('bk_theme')}</span><div class="bk-themes">${Object.entries(THEMES).map(([k, c]) => `<button type="button" data-th="${k}" class="${k === st.theme ? 'on' : ''}" style="--a:${c[0]};--b:${c[2]}"></button>`).join('')}</div></div>
          <label class="chk"><input type="checkbox" class="bk-dim" checked> ${t('bk_dim')}</label></fieldset>
        <fieldset class="fieldset"><legend>${t('bk_step4')}</legend><div class="btn-row"><button class="btn yellow bk-png">${t('bk_png')}</button><button class="btn pink bk-pdf">${t('bk_pdf')}</button></div>
          <div class="btn-row"><button class="btn sm bk-lpdf">${t('bk_list_pdf')}</button><button class="btn sm bk-lcsv">${t('bk_list_csv')}</button></div></fieldset>
      </div><canvas class="bk-cv"></canvas></div></div>`;
    const $ = s => inner.querySelector(s), cv = $('.bk-cv');
    const setNames = list => {
      st.names = clean(list); st.order = st.seed === 'rand' ? shuffle(st.names) : st.names.slice();
      $('.bk-count').textContent = st.names.length ? `${t('bk_n', { n: st.names.length })}・${t('bk_clean')}` : '';
      redraw();
    };
    const redraw = () => { if (st.names.length >= 2) drawBracket(cv); else { cv.width = 1; cv.height = 1; } };
    const fromRows = () => { if (!st.rows) return; setNames(st.rows.slice(1).map(r => r[st.col])); $('.bk-paste').value = st.names.join('\n'); };
    $('.bk-file').onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        let rows;
        if (/\.csv$/i.test(f.name)) rows = (await f.text()).split(/\r?\n/).map(l => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')));
        else { const X = await XLSX(); const wb = X.read(await f.arrayBuffer()); rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }); }
        st.rows = rows.filter(r => r.some(c => String(c).trim()));
        const head = st.rows[0] || [];
        // 自動猜名字那一欄（欄名有「名」「隊」「name」「team」）
        st.col = Math.max(0, head.findIndex(x => /名|隊|團|name|team|crew|dancer/i.test(String(x))));
        $('.bk-col').innerHTML = head.map((x, i) => `<option value="${i}" ${i === st.col ? 'selected' : ''}>${esc(String(x || '#' + (i + 1)))}</option>`).join('');
        $('.bk-colw').hidden = false; fromRows(); SFX.play('coin');
      } catch (e) { toast(t('bk_lib_fail'), '✕'); }
    };
    $('.bk-col').onchange = ev => { st.col = +ev.target.value; fromRows(); };
    let tm; $('.bk-paste').oninput = ev => { clearTimeout(tm); tm = setTimeout(() => setNames(ev.target.value.split('\n')), 300); };
    $('.bk-title').oninput = ev => { st.title = ev.target.value; redraw(); };
    $('.bk-sub').oninput = ev => { st.sub = ev.target.value; redraw(); };
    $('.bk-seed').onclick = ev => { const b = ev.target.closest('[data-s]'); if (!b) return; st.seed = b.dataset.s; $('.bk-seed').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); setNames(st.names); };
    $('.bk-shuf').onclick = () => { st.seed = 'rand'; $('.bk-seed').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.s === 'rand')); st.order = shuffle(st.names); SFX.play('select'); redraw(); };
    $('.bk-bg').onchange = ev => { const f = ev.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => { st.bg = img; redraw(); }; img.src = URL.createObjectURL(f); };
    $('.bk-nobg').onclick = () => { st.bg = null; redraw(); };
    $('.bk-themes').onclick = ev => { const b = ev.target.closest('[data-th]'); if (!b) return; st.theme = b.dataset.th; $('.bk-themes').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); redraw(); };
    $('.bk-dim').onchange = ev => { st.dim = ev.target.checked; redraw(); };
    const need = () => { if (st.names.length < 2) { toast(t('bk_need'), '✕'); return false; } return true; };
    $('.bk-png').onclick = () => { if (!need()) return; cv.toBlob(b => saveBlob(b, safeName(st.title || 'bracket') + '.png')); SFX.play('coin'); };
    $('.bk-pdf').onclick = async () => { if (!need()) return; toast(t('pdf_making'), '📄'); try { await canvasToPDF([cv], st.title || 'bracket', cv.width > cv.height); } catch (e) { toast(t('bk_lib_fail'), '✕'); } };
    $('.bk-lpdf').onclick = async () => { if (!st.names.length) return toast(t('bk_need'), '✕'); try { await canvasToPDF(drawList(document.createElement('canvas')), (st.title || 'entrants') + '-list', false); } catch (e) { toast(t('bk_lib_fail'), '✕'); } };
    $('.bk-lcsv').onclick = () => { if (!st.names.length) return toast(t('bk_need'), '✕'); saveBlob(new Blob(['﻿#,name\n' + st.names.map((n, i) => `${i + 1},"${n.replace(/"/g, '""')}"`).join('\n')], { type: 'text/csv' }), safeName(st.title || 'entrants') + '-list.csv'); };
    if (st.names.length) { $('.bk-paste').value = st.names.join('\n'); $('.bk-title').value = st.title; $('.bk-sub').value = st.sub; setNames(st.names); }
  };

  /* =========================================================
   * 新增活動：第一次打開時的導覽、比賽當天流程欄位
   * ========================================================= */
  const FT_KEY = 'danceIsland.formTour';
  const FT = [['[name=name]', 'ft_1'], ['[name=country]', 'ft_2'], ['.chips', 'ft_3'], ['[name=date]', 'ft_4'], ['.rt-seg', 'ft_5'], ['[name=teams]', 'ft_6'], ['[name=flow]', 'ft_7'], ['[name=link]', 'ft_8']];
  function formTour(form) {
    let seen = false; try { seen = !!localStorage.getItem(FT_KEY); } catch (e) {}
    if (seen) return;
    const box = h(`<div class="ft full"><b>${t('ft_title')}</b><p class="ft-t"></p><div class="btn-row"><button type="button" class="btn sm pink ft-go">${t('ft_start')}</button><button type="button" class="btn sm ft-skip">${t('ft_skip')}</button></div></div>`);
    form.prepend(box);
    let i = -1;
    const end = () => { try { localStorage.setItem(FT_KEY, '1'); } catch (e) {} form.querySelectorAll('.ft-hi').forEach(x => x.classList.remove('ft-hi')); box.remove(); };
    const step = () => {
      form.querySelectorAll('.ft-hi').forEach(x => x.classList.remove('ft-hi'));
      i++; if (i >= FT.length) return end();
      const [sel, key] = FT[i], el = form.querySelector(sel);
      box.querySelector('.ft-t').textContent = `${i + 1}/${FT.length}　${t(key)}`;
      box.querySelector('.ft-go').textContent = i === FT.length - 1 ? t('ft_done') : t('ft_next');
      const tgt = el && (el.closest('.field, fieldset') || el);
      if (tgt) { tgt.classList.add('ft-hi'); tgt.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      SFX.play('select');
    };
    box.querySelector('.ft-go').onclick = step;
    box.querySelector('.ft-skip').onclick = end;
  }
  // 「新增 / 編輯活動」表單第一次打開時給導覽
  const parseFlow = s => String(s || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 40).map(l => { const m = /^(\d{1,2}[:：]\d{2})\s*[-–~～]?\s*(.*)$/.exec(l); return m ? { t: m[1].replace('：', ':').padStart(5, '0'), x: m[2].slice(0, 80) } : { t: '', x: l.slice(0, 80) }; });
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    const form = n.matches && n.matches('form.form') ? n : n.querySelector && n.querySelector('form.form');
    if (!form || !form.querySelector('[name=regType]') || form.querySelector('.ft')) return;
    formTour(form);
  }))).observe(document.body, { childList: true, subtree: true });

  // 活動卡片：有當天流程就多一顆按鈕；活動當天標出「進行中」
  const prevExtras3 = A.cardExtras3;
  A.cardExtras3 = e => (prevExtras3 ? prevExtras3(e) : '') + ((e.flow || []).length ? `<button class="btn sm" data-act="flow" data-ev="${esc(e.id)}">📋 ${t('fl_btn')}</button>` : '');
  const prevAct = A.onCardAct;
  A.onCardAct = (a, ev, tg, redraw) => { if (a === 'flow' && ev) { openFlow(ev); return true; } return prevAct ? prevAct(a, ev, tg, redraw) : false; };
  function openFlow(e) {
    const today = A.todayStr(), d = new Date(), now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const live = e.date <= today && (e.endDate || e.date) >= today;
    const list = e.flow || [];
    let cur = -1; if (live) list.forEach((x, i) => { if (x.t && x.t <= now) cur = i; });
    modal({ title: '📋 ' + esc(e.name), color: 'yellow', body: `<ol class="fl-list">${list.map((x, i) => `<li class="${i === cur ? 'now' : i < cur ? 'done' : i === cur + 1 && live ? 'next' : ''}"><span class="tm">${esc(x.t)}</span><span>${esc(x.x)}</span>${i === cur ? `<b class="tag">${t('fl_now')}</b>` : i === cur + 1 && live ? `<b class="tag">${t('fl_next')}</b>` : ''}</li>`).join('')}</ol>` });
  }

  /* =========================================================
   * 管理後台：每個分頁都可以匯出 PDF
   * ========================================================= */
  async function paneToPDF(pane, title) {
    toast(t('pdf_making'), '📄');
    try {
      const H2C = await h2c();
      pane.classList.add('pdf-snap');
      const cv = await H2C(pane, { backgroundColor: '#fff6e8', scale: 2, useCORS: true });
      pane.classList.remove('pdf-snap');
      // 太長就切成好幾頁
      const pageH = Math.round(cv.width * 1.414), pages = [];
      for (let y = 0; y < cv.height; y += pageH) { const c = document.createElement('canvas'); c.width = cv.width; c.height = Math.min(pageH, cv.height - y); c.getContext('2d').drawImage(cv, 0, y, cv.width, c.height, 0, 0, cv.width, c.height); pages.push(c); }
      await canvasToPDF(pages, `booto-${title}-${A.todayStr()}`, false);
    } catch (e) { pane.classList.remove('pdf-snap'); toast(t('bk_lib_fail'), '✕'); }
  }
  setTimeout(() => (A.adminTabs || []).forEach(tb => {
    if (tb._pdf) return; tb._pdf = 1;
    const d = tb.draw;
    tb.draw = async (pane, fail) => {
      const r = await d(pane, fail);
      if (!pane.querySelector(':scope > .pdf-bar')) {
        const bar = h(`<div class="pdf-bar"><button class="btn sm yellow">${t('pdf_btn')}</button></div>`);
        bar.querySelector('button').onclick = () => paneToPDF(pane, tb.key);
        pane.prepend(bar);
      }
      return r;
    };
  }), 0);

  return { canvasToPDF, parseFlow };
})();
