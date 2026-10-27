/* =========================================================
 * 第七批：公告欄（可以放圖片）、舞團（公會）系統
 * ========================================================= */
(() => {
  const { h, esc, modal, toast, sparkle, npc } = UI;
  const A = window.App;
  const logged = () => Backend.enabled && !!Backend.uid && !!Player.me;
  const err = x => { const m = String(x && x.message || x);
    if (/already in crew/.test(m)) return t('cr_e_in'); if (/already applied/.test(m)) return t('cr_e_applied'); if (/transfer first/.test(m)) return t('cr_e_transfer');
    if (/duplicate|unique/.test(m)) return t('cr_e_dup'); if (/too many/.test(m)) return t('cr_e_many'); if (/spam/.test(m)) return t('fr_spam'); if (/not allowed/.test(m)) return t('cr_e_perm');
    if (/need character/.test(m)) return t('cd_login'); return m; };

  I18N.extend({
    zh: {
      cr_e_in2: '對方已經在其他舞團了', 
      cr_intro2: '看看島上的舞團！舞團採邀請制：團長或副團長邀請你、或用舞團給你的邀請碼 / QR code 加入。也可以成立自己的舞團。', cr_code_ph: '輸入邀請碼', cr_code_go: '加入', cr_inv_title: '你收到的舞團邀請', cr_inv_got: '邀請你加入！', cr_view: '看介紹', cr_joined_ok: '歡迎加入舞團！', cr_slow: '連線有點慢，請重新整理再試一次', cr_code_bad: '邀請碼無效或已過期', cr_join_code: '用邀請碼加入', cr_invite_only: '這個舞團採邀請制，需要團長邀請或邀請碼才能加入', cr_inv_send: '邀請團員', cr_inv_ph: '輸入對方的角色 ID', cr_inv_btn: '送出邀請', cr_codes: '邀請碼 / QR code', cr_code_left: '已使用 {u}/{m}・{d} 到期', cr_code_revoke: '停用', cr_codes_none: '還沒有邀請碼', cr_code_days: '有效天數', cr_code_max: '可用次數', cr_code_new: '產生邀請碼', cr_inv_sent: '已邀請 {n}！', cr_inv_text: '【👯 舞團邀請】\n「{n}」邀請你加入舞島的舞團！\n邀請碼：{code}\n▶ {url}', cr_qr_tip: '用手機相機掃描就能加入', cr_inv_note: '{c} 邀請你加入舞團！', cr_inv_card: '邀請加入舞團',
      hub_notice: '公告欄', hub_crew: '舞團', ch_crew: '舞團頻道', crew_rank_leader: '團長', crew_rank_vice: '副團長', crew_rank_member: '團員',
      nt_title: '📢 公告欄', nt_none: '目前沒有公告', nt_new: '新公告', nt_admin: '公告欄', nt_t: '標題', nt_body: '內容', nt_img: '圖片網址', nt_up: '或上傳圖片（3MB 內）', nt_pin: '置頂', nt_save: '發佈', nt_edit: '編輯',
      cr_title: '👯 舞團', cr_intro: '找一個舞團加入，或成立自己的舞團！舞團要經過管理員實名認證才會公開。', cr_apply: '申請成立舞團', cr_search: '搜尋舞團…', cr_none: '還沒有舞團，來成立第一個吧！',
      cr_members: '{n} 位團員', cr_mine: '我的舞團', cr_join: '申請加入', cr_joined: '已送出入團申請，等團長或副團長同意', cr_pending_join: '入團申請中', cr_leave: '離開舞團', cr_leave_q: '確定要離開「{n}」嗎？',
      cr_name: '舞團名稱', cr_ig: '舞團 IG 帳號', cr_logo: '舞團 LOGO', cr_logo_up: '上傳 LOGO（3MB 內）', cr_desc: '舞團介紹（300 字內）', cr_submit: '送出申請',
      cr_verify_t: '🔐 舞團實名認證', cr_verify_1: '把這組驗證碼貼到舞團 IG 帳號的自我介紹：', cr_verify_2: '管理員看到驗證碼後就會通過，通過後你就是團長！（通過後就可以把驗證碼刪掉）',
      cr_status_pending: '⏳ 審核中', cr_status_rejected: '未通過', cr_gone: '找不到這個舞團',
      cr_manage: '團長管理區', cr_reqs: '入團申請', cr_reqs_none: '沒有新的入團申請', cr_accept: '同意', cr_decline: '拒絕', cr_kick: '踢出', cr_kick_q: '確定要把 {n} 踢出舞團嗎？',
      cr_rank: '階級', cr_make_leader: '轉讓團長', cr_leader_q: '確定要把團長交給 {n} 嗎？你會變成副團長。', cr_label: '身分標籤', cr_label_none: '（不使用標籤）',
      cr_labels: '自訂身分標籤', cr_label_add: '新增標籤', cr_label_ph: '例：團寵、DJ、編舞擔當', cr_style: '舞團稱號樣式', cr_bg: '底色', cr_fg: '文字', cr_bd: '外框', cr_save: '儲存', cr_edit: '修改 LOGO / 介紹',
      cr_review: '舞團審核', cr_code: '驗證碼', cr_leader: '申請人',
      cr_e_in: '你已經在一個舞團裡了', cr_e_applied: '你已經有一個申請在審核中', cr_e_transfer: '團長要先把團長交給別人才能離團', cr_e_dup: '這個舞團名稱已經有人用了', cr_e_many: '太多了，請先處理現有的',
      cr_e_perm: '你沒有這個權限', cr_ok: '已更新！', cr_need: '請填舞團名稱（至少 2 字）和 IG 帳號'
    },
    en: {
      cr_e_in2: 'They are already in a crew', 
      cr_intro2: 'Check out the crews on the island! Crews are invite-only: join when a leader or vice invites you, or with a crew invite code / QR code. You can also start your own.', cr_code_ph: 'Invite code', cr_code_go: 'Join', cr_inv_title: 'Crew invitations', cr_inv_got: 'invited you!', cr_view: 'About', cr_joined_ok: 'Welcome to the crew!', cr_slow: 'The connection is slow — please refresh and try again', cr_code_bad: 'Invalid or expired invite code', cr_join_code: 'Join with invite code', cr_invite_only: 'This crew is invite-only — you need an invite or an invite code', cr_inv_send: 'Invite members', cr_inv_ph: 'Their character ID', cr_inv_btn: 'Send invite', cr_codes: 'Invite codes / QR', cr_code_left: 'Used {u}/{m} · expires {d}', cr_code_revoke: 'Disable', cr_codes_none: 'No invite codes yet', cr_code_days: 'Valid days', cr_code_max: 'Max uses', cr_code_new: 'Create invite code', cr_inv_sent: 'Invited {n}!', cr_inv_text: '[👯 CREW INVITE]\n“{n}” invites you to join their crew on Booto!\nCode: {code}\n▶ {url}', cr_qr_tip: 'Scan with your phone camera to join', cr_inv_note: '{c} invited you to their crew!', cr_inv_card: 'Invite to crew',
      hub_notice: 'News', hub_crew: 'Crews', ch_crew: 'Crew', crew_rank_leader: 'Leader', crew_rank_vice: 'Vice', crew_rank_member: 'Member',
      nt_title: '📢 News', nt_none: 'No announcements yet', nt_new: 'New announcement', nt_admin: 'News board', nt_t: 'Title', nt_body: 'Content', nt_img: 'Image URL', nt_up: 'or upload an image (max 3MB)', nt_pin: 'Pin', nt_save: 'Publish', nt_edit: 'Edit',
      cr_title: '👯 Crews', cr_intro: 'Join a crew or start your own! Crews go public after an admin verifies them.', cr_apply: 'Start a crew', cr_search: 'Search crews…', cr_none: 'No crews yet — start the first one!',
      cr_members: '{n} members', cr_mine: 'My crew', cr_join: 'Request to join', cr_joined: 'Request sent — waiting for the leader or vice', cr_pending_join: 'Request pending', cr_leave: 'Leave crew', cr_leave_q: 'Leave “{n}”?',
      cr_name: 'Crew name', cr_ig: 'Crew Instagram', cr_logo: 'Crew logo', cr_logo_up: 'Upload a logo (max 3MB)', cr_desc: 'About the crew (max 300)', cr_submit: 'Submit',
      cr_verify_t: '🔐 Crew verification', cr_verify_1: "Paste this code into your crew Instagram's bio:", cr_verify_2: "An admin approves once they see the code, and you'll become the leader! (You can remove the code afterwards.)",
      cr_status_pending: '⏳ Under review', cr_status_rejected: 'Not approved', cr_gone: 'Crew not found',
      cr_manage: 'Leader tools', cr_reqs: 'Join requests', cr_reqs_none: 'No new requests', cr_accept: 'Accept', cr_decline: 'Decline', cr_kick: 'Remove', cr_kick_q: 'Remove {n} from the crew?',
      cr_rank: 'Rank', cr_make_leader: 'Make leader', cr_leader_q: 'Hand leadership to {n}? You will become vice.', cr_label: 'Role tag', cr_label_none: '(no tag)',
      cr_labels: 'Custom role tags', cr_label_add: 'Add tag', cr_label_ph: 'e.g. Mascot, DJ, Choreographer', cr_style: 'Crew tag style', cr_bg: 'Fill', cr_fg: 'Text', cr_bd: 'Border', cr_save: 'Save', cr_edit: 'Edit logo / about',
      cr_review: 'Crew review', cr_code: 'Code', cr_leader: 'Applicant',
      cr_e_in: "You're already in a crew", cr_e_applied: 'You already have an application under review', cr_e_transfer: 'Hand leadership to someone before leaving', cr_e_dup: 'That crew name is taken', cr_e_many: 'Too many — handle the existing ones first',
      cr_e_perm: "You don't have permission", cr_ok: 'Updated!', cr_need: 'Add a crew name (2+ characters) and Instagram'
    },
    ja: {
      cr_e_in2: '相手はすでに別のクルーに入っています', 
      cr_intro2: '島のクルーを見てみよう！クルーは招待制：リーダーかサブリーダーに招待されるか、招待コード / QR コードで参加できます。自分のクルーも作れるよ。', cr_code_ph: '招待コード', cr_code_go: '参加', cr_inv_title: 'クルーからの招待', cr_inv_got: 'から招待が届きました！', cr_view: '紹介を見る', cr_joined_ok: 'クルーへようこそ！', cr_slow: '接続が遅いです。再読み込みしてね', cr_code_bad: '招待コードが無効か期限切れです', cr_join_code: '招待コードで参加', cr_invite_only: 'このクルーは招待制です。招待か招待コードが必要です', cr_inv_send: 'メンバーを招待', cr_inv_ph: '相手のキャラ ID', cr_inv_btn: '招待する', cr_codes: '招待コード / QR', cr_code_left: '使用 {u}/{m}・{d} まで', cr_code_revoke: '無効にする', cr_codes_none: 'まだ招待コードがありません', cr_code_days: '有効日数', cr_code_max: '使用回数', cr_code_new: '招待コードを作る', cr_inv_sent: '{n} を招待しました！', cr_inv_text: '【👯 クルー招待】\n「{n}」からBootoのクルーへの招待！\n招待コード：{code}\n▶ {url}', cr_qr_tip: 'スマホのカメラで読み取って参加', cr_inv_note: '{c} からクルーへの招待！', cr_inv_card: 'クルーに招待',
      hub_notice: 'お知らせ', hub_crew: 'クルー', ch_crew: 'クルー', crew_rank_leader: 'リーダー', crew_rank_vice: 'サブリーダー', crew_rank_member: 'メンバー',
      nt_title: '📢 お知らせ', nt_none: 'お知らせはまだありません', nt_new: '新しいお知らせ', nt_admin: 'お知らせ', nt_t: 'タイトル', nt_body: '内容', nt_img: '画像 URL', nt_up: 'または画像をアップロード（3MB まで）', nt_pin: '固定', nt_save: '公開', nt_edit: '編集',
      cr_title: '👯 クルー', cr_intro: 'クルーに入るか、自分のクルーを作ろう！クルーは管理者の本人確認後に公開されます。', cr_apply: 'クルーを作る', cr_search: 'クルーを検索…', cr_none: 'まだクルーがありません。最初のクルーを作ろう！',
      cr_members: 'メンバー {n} 人', cr_mine: '自分のクルー', cr_join: '加入申請', cr_joined: '申請しました。リーダーかサブリーダーの承認を待ってね', cr_pending_join: '申請中', cr_leave: 'クルーを抜ける', cr_leave_q: '「{n}」を抜けますか？',
      cr_name: 'クルー名', cr_ig: 'クルーの Instagram', cr_logo: 'クルーのロゴ', cr_logo_up: 'ロゴをアップロード（3MB まで）', cr_desc: 'クルー紹介（300 文字まで）', cr_submit: '申請する',
      cr_verify_t: '🔐 クルーの本人確認', cr_verify_1: 'このコードをクルーの Instagram の自己紹介に貼ってね：', cr_verify_2: '管理者がコードを確認したら承認され、あなたがリーダーになります！（承認後はコードを消して OK）',
      cr_status_pending: '⏳ 審査中', cr_status_rejected: '非承認', cr_gone: 'クルーが見つかりません',
      cr_manage: 'リーダー用', cr_reqs: '加入申請', cr_reqs_none: '新しい申請はありません', cr_accept: '承認', cr_decline: '断る', cr_kick: '外す', cr_kick_q: '{n} をクルーから外しますか？',
      cr_rank: '役職', cr_make_leader: 'リーダーを譲る', cr_leader_q: '{n} にリーダーを譲りますか？あなたはサブリーダーになります。', cr_label: '肩書きタグ', cr_label_none: '（タグなし）',
      cr_labels: 'オリジナル肩書き', cr_label_add: '追加', cr_label_ph: '例：マスコット、DJ、振付担当', cr_style: 'クルー称号のデザイン', cr_bg: '背景', cr_fg: '文字', cr_bd: '枠', cr_save: '保存', cr_edit: 'ロゴ・紹介を編集',
      cr_review: 'クルー審査', cr_code: 'コード', cr_leader: '申請者',
      cr_e_in: 'すでにクルーに入っています', cr_e_applied: '審査中の申請があります', cr_e_transfer: '抜ける前にリーダーを誰かに譲ってね', cr_e_dup: 'そのクルー名は使われています', cr_e_many: '多すぎます。先に今あるものを処理してね',
      cr_e_perm: '権限がありません', cr_ok: '更新しました！', cr_need: 'クルー名（2 文字以上）と Instagram を入力してね'
    },
    ko: {
      cr_e_in2: '상대는 이미 다른 크루에 있어요', 
      cr_intro2: '섬의 크루를 구경해 보세요! 크루는 초대제예요: 리더나 부리더의 초대, 또는 초대 코드 / QR 코드로 가입할 수 있어요. 직접 크루를 만들 수도 있어요.', cr_code_ph: '초대 코드', cr_code_go: '가입', cr_inv_title: '받은 크루 초대', cr_inv_got: '에서 초대했어요!', cr_view: '소개 보기', cr_joined_ok: '크루에 오신 걸 환영해요!', cr_slow: '연결이 느려요. 새로고침 후 다시 해 주세요', cr_code_bad: '초대 코드가 잘못됐거나 만료됐어요', cr_join_code: '초대 코드로 가입', cr_invite_only: '이 크루는 초대제예요. 초대나 초대 코드가 필요해요', cr_inv_send: '멤버 초대', cr_inv_ph: '상대 캐릭터 ID', cr_inv_btn: '초대 보내기', cr_codes: '초대 코드 / QR', cr_code_left: '사용 {u}/{m}・{d}까지', cr_code_revoke: '중지', cr_codes_none: '아직 초대 코드가 없어요', cr_code_days: '유효 기간(일)', cr_code_max: '사용 횟수', cr_code_new: '초대 코드 만들기', cr_inv_sent: '{n}님을 초대했어요!', cr_inv_text: '【👯 크루 초대】\n「{n}」에서 Booto 크루로 초대했어요!\n초대 코드: {code}\n▶ {url}', cr_qr_tip: '휴대폰 카메라로 스캔해서 가입', cr_inv_note: '{c}에서 크루 초대가 왔어요!', cr_inv_card: '크루에 초대',
      hub_notice: '공지', hub_crew: '크루', ch_crew: '크루', crew_rank_leader: '리더', crew_rank_vice: '부리더', crew_rank_member: '멤버',
      nt_title: '📢 공지사항', nt_none: '아직 공지가 없어요', nt_new: '새 공지', nt_admin: '공지사항', nt_t: '제목', nt_body: '내용', nt_img: '이미지 URL', nt_up: '또는 이미지 업로드(3MB 이하)', nt_pin: '고정', nt_save: '게시', nt_edit: '편집',
      cr_title: '👯 크루', cr_intro: '크루에 들어가거나 직접 만들어 보세요! 크루는 관리자 실명 인증 후 공개돼요.', cr_apply: '크루 만들기', cr_search: '크루 검색…', cr_none: '아직 크루가 없어요. 첫 크루를 만들어 보세요!',
      cr_members: '멤버 {n}명', cr_mine: '내 크루', cr_join: '가입 신청', cr_joined: '신청했어요. 리더나 부리더의 승인을 기다려 주세요', cr_pending_join: '신청 중', cr_leave: '크루 탈퇴', cr_leave_q: '「{n}」에서 탈퇴할까요?',
      cr_name: '크루 이름', cr_ig: '크루 인스타그램', cr_logo: '크루 로고', cr_logo_up: '로고 업로드(3MB 이하)', cr_desc: '크루 소개(300자 이하)', cr_submit: '신청하기',
      cr_verify_t: '🔐 크루 실명 인증', cr_verify_1: '이 코드를 크루 인스타그램 소개글에 붙여 주세요:', cr_verify_2: '관리자가 코드를 확인하면 승인되고 당신이 리더가 돼요! (승인 후 코드는 지워도 돼요)',
      cr_status_pending: '⏳ 검토 중', cr_status_rejected: '미승인', cr_gone: '크루를 찾을 수 없어요',
      cr_manage: '리더 관리', cr_reqs: '가입 신청', cr_reqs_none: '새 신청이 없어요', cr_accept: '수락', cr_decline: '거절', cr_kick: '내보내기', cr_kick_q: '{n}님을 크루에서 내보낼까요?',
      cr_rank: '등급', cr_make_leader: '리더 넘기기', cr_leader_q: '{n}님에게 리더를 넘길까요? 당신은 부리더가 돼요.', cr_label: '역할 태그', cr_label_none: '(태그 없음)',
      cr_labels: '커스텀 역할 태그', cr_label_add: '추가', cr_label_ph: '예: 마스코트, DJ, 안무 담당', cr_style: '크루 칭호 스타일', cr_bg: '배경', cr_fg: '글자', cr_bd: '테두리', cr_save: '저장', cr_edit: '로고·소개 수정',
      cr_review: '크루 검토', cr_code: '코드', cr_leader: '신청자',
      cr_e_in: '이미 크루에 들어가 있어요', cr_e_applied: '검토 중인 신청이 있어요', cr_e_transfer: '탈퇴 전에 리더를 넘겨 주세요', cr_e_dup: '이미 있는 크루 이름이에요', cr_e_many: '너무 많아요. 먼저 기존 것을 처리해 주세요',
      cr_e_perm: '권한이 없어요', cr_ok: '업데이트했어요!', cr_need: '크루 이름(2자 이상)과 인스타그램을 입력해 주세요'
    }
  });

  /* =========================================================
   * 公告欄
   * ========================================================= */
  const SEEN = 'danceIsland.noticeSeen';
  const safe = u => (/^https:\/\//i.test(u || '') ? u : '');
  const noticeHTML = n => `<article class="nt ${n.pinned ? 'pinned' : ''}"><div class="nt-h">${n.pinned ? `<span class="tag pin">📌</span>` : ''}<b>${esc(n.title)}</b><span class="tm">${new Date(n.created_at).toLocaleDateString()}</span></div>
    ${safe(n.image_url) ? `<a href="${esc(n.image_url)}" target="_blank" rel="noopener"><img class="nt-img" src="${esc(n.image_url)}" alt="" loading="lazy"></a>` : ''}
    ${n.body ? `<div class="nt-b" data-utr>${esc(n.body)}</div>` : ''}</article>`;
  async function openNotices() {
    let rows = []; try { rows = await Backend.notices(); } catch (x) {}
    const body = h(`<div class="nt-list">${rows.length ? rows.map(noticeHTML).join('') : `<p class="note">${t('nt_none')}</p>`}</div>`);
    modal({ title: t('nt_title'), color: 'yellow', body, wide: true });
    if (rows.length) { try { localStorage.setItem(SEEN, String(Math.max(...rows.map(r => r.id)))); } catch (x) {} dot(false); }
  }
  const dot = on => { const p = document.querySelector('.hub-phone'); if (p) p.classList.toggle('has-new', on); };
  async function checkNew() {
    if (!Backend.enabled) return;
    let rows = []; try { rows = await Backend.notices(); } catch (x) { return; }
    if (!rows.length) return;
    const top = Math.max(...rows.map(r => r.id)); let seen = 0; try { seen = +localStorage.getItem(SEEN) || 0; } catch (x) {}
    if (top <= seen) return;
    dot(true);
    const n = rows.find(r => r.id === top);
    const el = h(`<button class="nt-pop">📢 ${t('nt_new')}：<b>${esc(n.title)}</b></button>`);
    el.onclick = () => { el.remove(); openNotices(); };
    document.body.appendChild(el); SFX.play('coin');
    setTimeout(() => el.remove(), 12000);
  }
  window.Notices = { open: openNotices };
  if (Backend.enabled) Backend.ready.then(() => setTimeout(checkNew, 4000));

  A.adminTabs = A.adminTabs || [];
  A.adminTabs.push({
    key: 'notice', label: () => '📢 ' + t('nt_admin'),
    draw: async (pane, fail) => {
      let rows = []; try { rows = await Backend.notices(); } catch (x) { return fail(x); }
      const form = (n = {}) => `<form class="form nt-form" novalidate data-id="${n.id || ''}">
        <label class="field full"><span>${t('nt_t')} *</span><input class="input" name="title" maxlength="80" value="${esc(n.title || '')}"></label>
        <label class="field full"><span>${t('nt_body')}</span><textarea class="input" name="body" maxlength="3000" rows="5">${esc(n.body || '')}</textarea></label>
        <label class="field full"><span>${t('nt_img')}</span><input class="input" name="image_url" type="url" value="${esc(n.image_url || '')}" placeholder="https://…"><small class="note">${t('nt_up')}</small><input class="input" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
        <label class="chk"><input type="checkbox" name="pinned" ${n.pinned ? 'checked' : ''}> 📌 ${t('nt_pin')}</label>
        <div class="full form-foot"><span class="grow"></span><button class="btn pink">${t('nt_save')}</button></div></form>`;
      pane.innerHTML = `<details class="sp-newbox" open><summary>＋ ${t('nt_save')}</summary>${form()}</details><div class="nt-admin">${rows.map(n => `<div class="nt-row" data-id="${n.id}">${noticeHTML(n)}<div class="btn-row"><button class="btn sm ed">${t('nt_edit')}</button><button class="btn sm red del">${t('b_del')}</button></div></div>`).join('')}</div>`;
      const bind = f => f.onsubmit = async ev => {
        ev.preventDefault();
        const E = f.elements; if (!E.title.value.trim()) return toast(t('e_name'), '✕');
        const btn = f.querySelector('button.pink'); btn.disabled = true;
        try {
          let img = E.image_url.value.trim() || null; const file = E.file.files[0];
          if (file) { if (file.size > 3 * 1024 * 1024) throw new Error('3MB'); img = await Backend.uploadMedia('notice', file); }
          if (img && !/^https:\/\//i.test(img)) throw new Error('https://');
          await Backend.saveNotice({ ...(f.dataset.id ? { id: +f.dataset.id } : {}), title: E.title.value.trim(), body: E.body.value.trim() || null, image_url: img, pinned: E.pinned.checked });
          toast(t('adm_done'), '📢'); A.adminTabs.find(x => x.key === 'notice').draw(pane, fail);
        } catch (x) { btn.disabled = false; fail(x); }
      };
      bind(pane.querySelector('form'));
      pane.querySelector('.nt-admin').onclick = async e => {
        const r = e.target.closest('.nt-row'); if (!r) return; const n = rows.find(x => x.id === +r.dataset.id);
        if (e.target.closest('.del')) { if (!confirm(t('del_title'))) return; try { await Backend.deleteNotice(n.id); r.remove(); } catch (x) { fail(x); } }
        if (e.target.closest('.ed')) { r.innerHTML = form(n); bind(r.querySelector('form')); }
      };
    }
  });

  /* =========================================================
   * 舞團
   * ========================================================= */
  let my = null;   // 我的團員資料 { crew_id, rank, label_id }
  async function loadMine() {
    my = null;
    if (logged()) { try { my = await Backend.crewOf(Backend.uid); } catch (x) {} }
    if (window.Chat && Chat.setCrew) Chat.setCrew(my ? my.crew_id : null);
    return my;
  }
  const tagHTML = (c, rank, label) => Chat.crewTagHTML ? Chat.crewTagHTML({ crew: { id: c.id, name: c.name, rank, label, style: c.style } }) : '';
  const logoHTML = (c, cls = '') => safe(c.logo_url) ? `<img class="cr-logo ${cls}" src="${esc(c.logo_url)}" alt="${esc(c.name)}">` : `<span class="cr-logo ${cls} ph">👯</span>`;

  A.crumbs.crew = () => '👯 ' + t('hub_crew');
  const crewData = () => Promise.all([Backend.crews(), Backend.crewCounts().catch(() => ({})), myInvites()]);
  A.prefetch = A.prefetch || {};
  A.prefetch.crew = r => { if (!(r.arg && r.arg[0]) && Backend.enabled && A.prefetchKeep) A.prefetchKeep('crew', crewData); };
  // 等太久就放棄（避免畫面一直卡在「…」）
  const withTimeout = (p, ms = 10000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const myInvites = async () => { if (!logged()) return []; try { return (await Backend.crewInvites()).filter(i => i.to_user === Backend.uid && i.status === 'pending'); } catch (x) { return []; } };
  A.views.crew = async (r, stage) => {
    const view = h(`<div class="view city-view"><div class="city-inner"><p class="note">…</p></div></div>`);
    const inner = view.querySelector('.city-inner'); stage.appendChild(view);
    if (!Backend.enabled) { inner.innerHTML = `<p class="note">${t('need_cloud')}</p>`; return; }
    try {
      await withTimeout(Backend.ready); await withTimeout(loadMine());
      if (r.arg && r.arg[0] === 'join') return joinPage(inner, r.arg[1] || '');
      if (r.arg && r.arg[0]) return crewPage(inner, +r.arg[0]);
      const [crews, counts, invites] = await withTimeout(A.prefetchTake ? A.prefetchTake('crew', crewData) : crewData());
      let q = '';
      const draw = () => {
        const mine = crews.filter(c => c.status !== 'approved' && c.leader === Backend.uid);
        const list = crews.filter(c => c.status === 'approved' && (!q || c.name.toLowerCase().includes(q) || (c.intro || '').toLowerCase().includes(q)));
        const card = c => `<a class="cr-card cr-dir" href="#/crew/${c.id}">${logoHTML(c, 'mid')}<span class="cr-main"><b>${esc(c.name)}</b>
          ${c.status === 'approved' ? `<small>✔ IG @${esc(c.ig || '')} · ${t('cr_members', { n: counts[c.id] || 0 })}</small>${c.intro ? `<span class="cr-snip">${esc(c.intro.length > 70 ? c.intro.slice(0, 70) + '…' : c.intro)}</span>` : ''}` : `<small>${t('cr_status_' + c.status)}</small>`}</span>
          ${my && my.crew_id === c.id ? `<span class="tag pin">${t('cr_mine')}</span>` : ''}</a>`;
        const inv = invites.map(iv => { const c = crews.find(x => x.id === iv.crew_id); return c ? `<li class="fr-row" data-iv="${iv.id}">${logoHTML(c)}<span class="fr-nm"><b>${esc(c.name)}</b><small>${t('cr_inv_got')}</small></span><span class="grow"></span><a class="btn sm" href="#/crew/${c.id}">${t('cr_view')}</a><button class="btn sm green ok">${t('cr_accept')}</button><button class="btn sm no">${t('cr_decline')}</button></li>` : ''; }).join('');
        inner.innerHTML = `<div class="win">${UI.winHTML(t('cr_title'), 'pink', false)}<div class="win-body"><p>${t('cr_intro2')}</p>
            <div class="fo-bar"><input class="input sm cr-q" placeholder="${esc(t('cr_search'))}" value="${esc(q)}"><span class="grow"></span>
              ${my ? `<a class="btn yellow" href="#/crew/${my.crew_id}">👯 ${t('cr_mine')}</a>` : `<form class="chat-input cr-codef"><input class="input sm" maxlength="8" placeholder="${esc(t('cr_code_ph'))}" autocapitalize="characters" spellcheck="false"><button class="btn sm teal">${t('cr_code_go')}</button></form><button class="btn pink ap">＋ ${t('cr_apply')}</button>`}</div></div></div>
          ${inv ? `<div class="win">${UI.winHTML('💌 ' + t('cr_inv_title'), 'yellow', false)}<div class="win-body"><ul class="fr-list cr-invs">${inv}</ul></div></div>` : ''}
          ${mine.length ? `<div class="fo-list">${mine.map(card).join('')}</div>` : ''}
          <div class="cr-grid">${list.map(card).join('') || `<p class="note">${t('cr_none')}</p>`}</div>`;
        const qi = inner.querySelector('.cr-q'); qi.oninput = () => { q = qi.value.trim().toLowerCase(); const pos = qi.selectionStart; draw(); const n = inner.querySelector('.cr-q'); n.focus(); n.setSelectionRange(pos, pos); };
        const ap = inner.querySelector('.ap'); if (ap) ap.onclick = () => openApply(async () => { crews.splice(0, crews.length, ...(await Backend.crews())); draw(); });
        const cf = inner.querySelector('.cr-codef'); if (cf) cf.onsubmit = ev => { ev.preventDefault(); const v = cf.querySelector('input').value.trim().toUpperCase(); if (v) A.nav('#/crew/join/' + encodeURIComponent(v)); };
        inner.querySelectorAll('.cr-invs [data-iv]').forEach(li => {
          const go = async ok => { try { await Backend.crewRpc('crew_invite_answer', { iid: +li.dataset.iv, accept: ok }); SFX.play(ok ? 'fanfare' : 'select'); await loadMine(); if (ok && my) { toast(t('cr_joined_ok'), '👯'); return A.nav('#/crew/' + my.crew_id); } li.remove(); } catch (x) { toast(err(x), '✕'); } };
          li.querySelector('.ok').onclick = () => go(true); li.querySelector('.no').onclick = () => go(false);
        });
      };
      draw();
    } catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(/timeout/.test(x.message) ? t('cr_slow') : err(x))}</p><button class="btn" onclick="location.reload()">↻</button>`; }
  };

  // 邀請碼 / QR code 打開的頁面：先看舞團介紹，再按加入
  async function joinPage(inner, code) {
    let info = null;
    try { info = await Backend.crewRpc('crew_code_info', { p_code: code }); } catch (x) {}
    if (!info || !info.crew_id) { inner.innerHTML = `<div class="win">${UI.winHTML('👯 ' + t('hub_crew'), 'pink', false)}<div class="win-body"><p>⚠ ${t('cr_code_bad')}</p><a class="btn" href="#/crew">◀ ${t('hub_crew')}</a></div></div>`; return; }
    await crewPage(inner, info.crew_id, { code, valid: info.valid });
  }

  function openApply(after) {
    if (!logged()) return Player.prompt();
    const body = h(`<form class="form" novalidate>
      <label class="field"><span>${t('cr_name')} *</span><input class="input" name="name" maxlength="24"></label>
      <label class="field"><span>${t('cr_ig')} *</span><input class="input" name="ig" maxlength="31" placeholder="crew_account" autocapitalize="off" spellcheck="false"></label>
      <label class="field full"><span>${t('cr_logo_up')}</span><input class="input" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
      <label class="field full"><span>${t('cr_desc')}</span><textarea class="input" name="intro" maxlength="300" rows="3"></textarea></label>
      <div class="full"><div class="err"></div><div class="form-foot"><span class="grow"></span><button class="btn pink">${t('cr_submit')}</button></div></div></form>`);
    const m = modal({ title: '👯 ' + t('cr_apply'), color: 'pink', body, wide: true });
    body.onsubmit = async ev => {
      ev.preventDefault();
      const E = body.elements, name = E.name.value.trim(), ig = E.ig.value.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, ''), e2 = body.querySelector('.err');
      if (name.length < 2 || !/^[A-Za-z0-9._]{1,30}$/.test(ig)) { e2.textContent = '✕ ' + t('cr_need'); return; }
      const btn = body.querySelector('button.pink'); btn.disabled = true;
      try {
        let logo = ''; const f = E.logo.files[0];
        if (f) { if (f.size > 3 * 1024 * 1024) throw new Error('3MB'); logo = await Backend.uploadMedia('crew', f); }
        const code = 'DI-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
        await Backend.crewRpc('crew_apply', { p_name: name, p_ig: ig, p_logo: logo, p_intro: E.intro.value.trim(), p_code: code });
        m.close(); SFX.play('fanfare');
        modal({ title: t('cr_verify_t'), color: 'blue', body: `<div class="cr-verify"><p>${t('cr_verify_1')}</p><code class="vcode">${esc(code)}</code><p class="note">IG：<a href="https://www.instagram.com/${encodeURIComponent(ig)}/" target="_blank" rel="noopener">@${esc(ig)}</a></p><p>${t('cr_verify_2')}</p></div>` });
        after && after();
      } catch (x) { btn.disabled = false; e2.textContent = '✕ ' + err(x); }
    };
  }

  async function crewPage(inner, id, join = null) {
    let c = null, members = [], labels = [], codes = [], people = {};
    const load = async () => {
      c = await Backend.crew(id);
      if (!c) return;
      const myRank = my && my.crew_id === id ? my.rank : null;
      [members, labels, codes] = await Promise.all([Backend.crewMembers(id), Backend.crewLabels(id), myRank && myRank !== 'member' ? Backend.crewCodes(id).catch(() => []) : []]);
      (await Backend.playersByIds([...new Set([...members.map(m => m.user_id), c.leader])])).forEach(p => (people[p.user_id] = p));
    };
    try { await withTimeout(load()); } catch (x) { inner.innerHTML = `<p class="note">⚠ ${esc(/timeout/.test(x.message) ? t('cr_slow') : err(x))}</p><a class="btn" href="#/crew">◀ ${t('hub_crew')}</a>`; return; }
    if (!c) { inner.innerHTML = `<p class="note">${t('cr_gone')}</p><a class="btn" href="#/crew">◀ ${t('hub_crew')}</a>`; return; }
    const draw = () => {
      const myRank = my && my.crew_id === id ? my.rank : null, mgr = myRank === 'leader' || myRank === 'vice';
      const order = { leader: 0, vice: 1, member: 2 };
      const ms = members.slice().sort((a, b) => order[a.rank] - order[b.rank] || a.joined_at.localeCompare(b.joined_at));
      const labelName = lid => (labels.find(l => l.id === lid) || {}).name || '';
      const canKick = m => mgr && m.user_id !== Backend.uid && m.rank !== 'leader' && (myRank === 'leader' || m.rank === 'member');
      const memberRow = m => { const p = people[m.user_id] || { name: '?', handle: '' };
        return `<li class="fr-row cr-m" data-u="${esc(m.user_id)}" data-h="${esc(p.handle)}"><span class="fr-ic"></span><span class="fr-nm"><b>${Player.nameHTML({ ...p, handle: p.handle })}</b>${tagHTML(c, m.rank, labelName(m.label_id))}</span><span class="grow"></span>
          ${mgr ? `<select class="input sm lab" aria-label="${esc(t('cr_label'))}"><option value="">${t('cr_label_none')}</option>${labels.map(l => `<option value="${l.id}" ${l.id === m.label_id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>` : ''}
          ${myRank === 'leader' && m.user_id !== Backend.uid ? `<select class="input sm rk" aria-label="${esc(t('cr_rank'))}"><option value="vice" ${m.rank === 'vice' ? 'selected' : ''}>${t('crew_rank_vice')}</option><option value="member" ${m.rank === 'member' ? 'selected' : ''}>${t('crew_rank_member')}</option><option value="leader">${t('cr_make_leader')}</option></select>` : `<span class="tag">${t('crew_rank_' + m.rank)}</span>`}
          ${canKick(m) ? `<button class="btn sm red kk">${t('cr_kick')}</button>` : ''}</li>`; };
      inner.innerHTML = `<div class="win">${UI.winHTML(`👯 ${esc(c.name)}`, 'pink', false)}<div class="win-body cr-head">
          ${logoHTML(c, 'big')}<div class="cr-info"><div class="cr-name"><b>${esc(c.name)}</b>${c.status === 'approved' ? '<span class="vchk">✔</span>' : `<span class="tag wait">${t('cr_status_' + c.status)}</span>`}</div>
          ${c.ig ? `<a class="tag" href="https://www.instagram.com/${encodeURIComponent(c.ig)}/" target="_blank" rel="noopener">IG @${esc(c.ig)}</a>` : ''} <span class="tag">${t('cr_members', { n: members.length })}</span>
          ${c.intro ? `<p class="cr-intro" data-utr>${esc(c.intro)}</p>` : ''}
          <div class="btn-row"><a class="btn sm" href="#/crew">◀ ${t('hub_crew')}</a>${join && !my ? (join.valid ? (logged() ? `<button class="btn pink jn">＋ ${t('cr_join_code')}</button>` : `<button class="btn pink lg">${t('cd_login')}</button>`) : `<span class="tag wait">${t('cr_code_bad')}</span>`) : !my && c.status === 'approved' ? `<span class="note cr-inv-note">🔒 ${t('cr_invite_only')}</span>` : ''}${myRank ? `<button class="btn sm red lv">${t('cr_leave')}</button>` : ''}</div></div></div></div>
        <div class="win">${UI.winHTML('🧑‍🤝‍🧑 ' + t('cr_members', { n: members.length }), 'blue', false)}<div class="win-body"><ul class="fr-list">${ms.map(memberRow).join('')}</ul></div></div>
        ${mgr ? `<div class="win">${UI.winHTML('🛠 ' + t('cr_manage'), 'yellow', false)}<div class="win-body cr-mgr">
          <h4>💌 ${t('cr_inv_send')}</h4><form class="chat-input inv-f"><input class="input sm" maxlength="16" placeholder="${esc(t('cr_inv_ph'))}" autocapitalize="off" spellcheck="false"><button class="btn sm pink">${t('cr_inv_btn')}</button></form>
          <h4>🔑 ${t('cr_codes')}</h4><div class="cr-codes">${codes.filter(k => new Date(k.expires_at) > new Date()).map(k => `<div class="cr-code" data-c="${esc(k.code)}"><code class="vcode">${esc(k.code)}</code><small>${t('cr_code_left', { u: k.uses, m: k.max_uses, d: new Date(k.expires_at).toLocaleDateString() })}</small><button class="btn sm qr">QR</button><button class="btn sm cp">🔗</button><button class="btn sm red rv">${t('cr_code_revoke')}</button></div>`).join('') || `<p class="note">${t('cr_codes_none')}</p>`}</div>
          <form class="cr-newcode"><label>${t('cr_code_days')} <select class="input sm" name="d"><option>1</option><option selected>7</option><option>30</option></select></label><label>${t('cr_code_max')} <select class="input sm" name="m"><option>5</option><option selected>20</option><option>100</option></select></label><button class="btn sm yellow">${t('cr_code_new')}</button></form>
          <h4>${t('cr_labels')}</h4><div class="cr-labels">${labels.map(l => `<span class="cr-lab">${esc(l.name)}<button data-l="${l.id}" aria-label="${t('b_del')}">×</button></span>`).join('')}</div>
          <form class="chat-input lab-add"><input class="input sm" maxlength="12" placeholder="${esc(t('cr_label_ph'))}"><button class="btn sm yellow">${t('cr_label_add')}</button></form>
          <h4>${t('cr_style')}</h4><div class="cr-style"><label>${t('cr_bg')} <input type="color" name="bg" value="${esc((c.style || {}).bg || '#f4d77a')}"></label><label>${t('cr_fg')} <input type="color" name="fg" value="${esc((c.style || {}).fg || '#3b2b2b')}"></label><label>${t('cr_bd')} <input type="color" name="bd" value="${esc((c.style || {}).bd || '#3b2b2b')}"></label>
            <span class="cr-prev">${tagHTML(c, 'leader', '')}</span><button class="btn sm pink sv-st">${t('cr_save')}</button></div>
          <h4>${t('cr_edit')}</h4><form class="form cr-edit" novalidate><label class="field full"><span>${t('cr_logo_up')}</span><input class="input" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
            <label class="field full"><span>${t('cr_desc')}</span><textarea class="input" name="intro" maxlength="300" rows="3">${esc(c.intro || '')}</textarea></label><div class="full form-foot"><span class="grow"></span><button class="btn pink">${t('cr_save')}</button></div></form>
        </div></div>` : ''}`;
      if (window.CrewPK) CrewPK.mount(inner, c, myRank);
      inner.querySelectorAll('.fr-row').forEach(li => { const p = Object.values(people).find(x => x.handle === li.dataset.h); if (p) li.querySelector('.fr-ic').appendChild(Chat.headIcon(p.look)); });
      const act = async (fn, args, ok) => { try { await Backend.crewRpc(fn, args); SFX.play('coin'); toast(ok || t('cr_ok'), '👯'); await loadMine(); await load(); if (!c) return A.nav('#/crew'); draw(); } catch (x) { SFX.play('error'); toast(err(x), '✕'); } };
      const jn = inner.querySelector('.jn'); if (jn) jn.onclick = async () => { try { await Backend.crewRpc('crew_code_join', { p_code: join.code }); SFX.play('fanfare'); sparkle(innerWidth / 2, innerHeight / 3, 24); toast(t('cr_joined_ok'), '👯'); await loadMine(); A.nav('#/crew/' + id); } catch (x) { toast(/bad code/.test(x.message) ? t('cr_code_bad') : err(x), '✕'); } };
      const lg = inner.querySelector('.lg'); if (lg) lg.onclick = () => Player.prompt();
      const invF = inner.querySelector('.inv-f'); if (invF) invF.onsubmit = async ev => {
        ev.preventDefault(); const hd = invF.querySelector('input').value.trim().replace(/^@/, '').toLowerCase(); if (!hd) return;
        try { const p = await Backend.playerByHandle(hd); if (!p) throw new Error('not found'); await Backend.crewRpc('crew_invite', { uid: p.user_id }); invF.reset(); SFX.play('coin'); toast(t('cr_inv_sent', { n: p.name }), '💌'); } catch (x) { toast(/not found/.test(x.message) ? t('cd_notfound') : err(x), '✕'); }
      };
      const nc = inner.querySelector('.cr-newcode'); if (nc) nc.onsubmit = async ev => { ev.preventDefault(); try { const code = await Backend.crewRpc('crew_code_new', { days: +nc.elements.d.value, max_uses: +nc.elements.m.value }); await load(); draw(); showQR(code, c); } catch (x) { toast(err(x), '✕'); } };
      inner.querySelectorAll('.cr-code').forEach(el => {
        const code = el.dataset.c;
        el.querySelector('.qr').onclick = () => showQR(code, c);
        el.querySelector('.cp').onclick = () => copyInvite(code, c);
        el.querySelector('.rv').onclick = async () => { if (!confirm(t('cr_code_revoke') + '？')) return; try { await Backend.crewRpc('crew_code_revoke', { p_code: code }); await load(); draw(); } catch (x) { toast(err(x), '✕'); } };
      });
      const lv = inner.querySelector('.lv'); if (lv) lv.onclick = () => { if (confirm(t('cr_leave_q', { n: c.name }))) act('crew_leave').then(() => { if (!my) A.nav('#/crew'); }); };
      inner.querySelectorAll('.cr-m').forEach(li => {
        const uid = li.dataset.u, p = people[uid] || {};
        const lab = li.querySelector('.lab'); if (lab) lab.onchange = () => act('crew_label_set', { uid, lid: lab.value ? +lab.value : null });
        const rk = li.querySelector('.rk'); if (rk) rk.onchange = () => { if (rk.value === 'leader' && !confirm(t('cr_leader_q', { n: p.name }))) { draw(); return; } act('crew_set_rank', { uid, new_rank: rk.value }); };
        const kk = li.querySelector('.kk'); if (kk) kk.onclick = () => { if (confirm(t('cr_kick_q', { n: p.name }))) act('crew_kick', { uid }); };
      });
      const la = inner.querySelector('.lab-add'); if (la) la.onsubmit = ev => { ev.preventDefault(); const v = la.querySelector('input').value.trim(); if (v) act('crew_label_add', { p_name: v }); };
      inner.querySelectorAll('.cr-labels [data-l]').forEach(b => (b.onclick = () => act('crew_label_del', { lid: +b.dataset.l })));
      const stBox = inner.querySelector('.cr-style');
      if (stBox) {
        const cur = () => ({ bg: stBox.querySelector('[name=bg]').value, fg: stBox.querySelector('[name=fg]').value, bd: stBox.querySelector('[name=bd]').value });
        stBox.oninput = () => { stBox.querySelector('.cr-prev').innerHTML = tagHTML({ ...c, style: cur() }, 'leader', ''); };
        stBox.querySelector('.sv-st').onclick = () => act('crew_set_style', { p_style: cur() });
      }
      const ed = inner.querySelector('.cr-edit');
      if (ed) ed.onsubmit = async ev => {
        ev.preventDefault();
        try { let logo = c.logo_url || ''; const f = ed.elements.logo.files[0]; if (f) { if (f.size > 3 * 1024 * 1024) throw new Error('3MB'); logo = await Backend.uploadMedia('crew', f); }
          await act('crew_edit', { p_logo: logo, p_intro: ed.elements.intro.value.trim() }); } catch (x) { toast(err(x), '✕'); }
      };
    };
    draw();
  }

  /* 邀請連結、QR code */
  const inviteUrl = code => location.origin + location.pathname + '#/crew/join/' + code;
  async function copyInvite(code, c) {
    const txt = t('cr_inv_text', { n: c.name, code, url: inviteUrl(code) });
    try { await navigator.clipboard.writeText(txt); toast(t('share_copied'), '🔗'); } catch (x) { window.prompt('', txt); }
  }
  let qrLib = null;
  const loadQR = () => qrLib || (qrLib = new Promise((res, rej) => { if (window.qrcode) return res(window.qrcode); const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'; sc.onload = () => res(window.qrcode); sc.onerror = () => { qrLib = null; rej(new Error('qr')); }; document.head.appendChild(sc); }));
  async function showQR(code, c) {
    const body = h(`<div class="cr-qr"><div class="cr-qr-card">${logoHTML(c, 'mid')}<b>${esc(c.name)}</b><div class="cr-qr-img">…</div><code class="vcode">${esc(code)}</code><small>${esc(t('cr_qr_tip'))}</small></div>
      <div class="btn-row"><button class="btn pink cp">🔗 ${t('share_copy')}</button><button class="btn dl">⬇ ${t('share_dl')}</button></div></div>`);
    modal({ title: '🔑 ' + t('cr_codes'), color: 'yellow', body });
    body.querySelector('.cp').onclick = () => copyInvite(code, c);
    try {
      const qrcode = await loadQR(); const q = qrcode(0, 'M'); q.addData(inviteUrl(code)); q.make();
      const n = q.getModuleCount(), k = 8, pad = 4, cv = document.createElement('canvas'); cv.width = cv.height = (n + pad * 2) * k;
      const g = cv.getContext('2d'); g.fillStyle = '#fff6e8'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#3b2b2b';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) g.fillRect((x + pad) * k, (y + pad) * k, k, k);
      body.querySelector('.cr-qr-img').innerHTML = ''; body.querySelector('.cr-qr-img').appendChild(cv);
      body.querySelector('.dl').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `crew-invite-${code}.png`; a.click(); };
    } catch (x) { body.querySelector('.cr-qr-img').textContent = inviteUrl(code); }
  }

  /* 後台：舞團審核 */
  A.adminTabs.push({
    key: 'crew', label: () => '👯 ' + t('cr_review'),
    draw: async (pane, fail) => {
      let rows = []; try { rows = await Backend.pendingCrews(); } catch (x) { return fail(x); }
      const ps = {}; try { (await Backend.playersByIds(rows.map(r => r.leader))).forEach(p => (ps[p.user_id] = p)); } catch (x) {}
      pane.innerHTML = rows.length ? '' : `<p class="note">${t('adm_none')}</p>`;
      rows.forEach(c => {
        const p = ps[c.leader] || {};
        const el = h(`<div class="fo-review cr-rev">${logoHTML(c)}<div><h4>${esc(c.name)}</h4>
          <p>${t('cr_leader')}：<b>${esc(p.name || '?')}</b> @${esc(p.handle || '')}</p>
          <p>IG：<a href="https://www.instagram.com/${encodeURIComponent(c.ig || '')}/" target="_blank" rel="noopener">@${esc(c.ig || '')}</a>　${t('cr_code')}：<code class="vcode">${esc(c.code || '')}</code></p>
          ${c.intro ? `<p class="note">${esc(c.intro)}</p>` : ''}
          <div class="btn-row"><button class="btn sm green ok">✓ ${t('adm_approve')}</button><button class="btn sm red no">✕ ${t('adm_reject')}</button></div></div></div>`);
        el.querySelector('.ok').onclick = async () => { try { await Backend.crewRpc('crew_review', { cid: c.id, approve: true }); SFX.play('fanfare'); toast(t('adm_done'), '✔'); el.remove(); } catch (x) { fail(x); } };
        el.querySelector('.no').onclick = async () => { try { await Backend.crewRpc('crew_review', { cid: c.id, approve: false }); toast(t('adm_done'), '✕'); el.remove(); } catch (x) { fail(x); } };
        pane.appendChild(el);
      });
    }
  });

  // 收到舞團邀請 → 右上角通知，點了打開舞團頁
  let invOff = null;
  function watchInvites() {
    if (invOff) { invOff(); invOff = null; }
    if (!logged() || !Backend.subscribeTable) return;
    invOff = Backend.subscribeTable('crew_invites', `to_user=eq.${Backend.uid}`, async p => {
      const r = p.new; if (!r || r.status !== 'pending') return;
      let c = null; try { c = await Backend.crew(r.crew_id); } catch (x) {}
      let wrap = document.getElementById('fr-notes'); if (!wrap) { wrap = h('<div id="fr-notes"></div>'); document.body.appendChild(wrap); }
      const n = h(`<button class="fr-note">👯 ${esc(t('cr_inv_note', { c: c ? c.name : '' }))}</button>`);
      n.onclick = () => { n.remove(); A.nav('#/crew'); }; wrap.appendChild(n); SFX.play('coin'); setTimeout(() => n.remove(), 12000);
    });
  }
  // 登入後：確認自己在哪個舞團，打開舞團頻道
  if (Backend.enabled) {
    Backend.ready.then(() => Player.ready).then(() => { loadMine(); watchInvites(); });
    Player.onChange(() => setTimeout(() => { loadMine(); watchInvites(); }, 200));
  }
  window.Crews = { reload: loadMine, apply: openApply, get mine() { return my; } };
})();
