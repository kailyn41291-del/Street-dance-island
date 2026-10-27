/* =========================================================
 * 影片連結：YouTube / IG / TikTok
 * 影片不放在 Supabase（省空間、省流量），只存連結，在網站裡直接播放
 * Vid.parse(url) → { k: 'yt' | 'ig' | 'tt', id } 或 null
 * Vid.html(url)  → 播放器 HTML（舊的 MP4 影片也照常播）
 * ========================================================= */
window.Vid = (() => {
  I18N.extend({
    zh: { vid_ph: '影片連結（YouTube / IG / TikTok）', vid_bad: '看不懂這個影片連結，請貼 YouTube、IG 或 TikTok 的影片網址', vid_tt_short: 'TikTok 請打開影片後，複製網址列上完整的網址（有 /video/ 的那種）', vid_hint: '影片請先放到 YouTube、IG 或 TikTok，再把連結貼上來。不想公開的話，可以用 YouTube 的「不公開」。' },
    en: { vid_ph: 'Video link (YouTube / IG / TikTok)', vid_bad: "That link doesn't look like a YouTube, IG or TikTok video", vid_tt_short: 'For TikTok, open the video and copy the full address (the one with /video/)', vid_hint: "Post your video on YouTube, IG or TikTok first, then paste the link here. Want it private? Use YouTube's “Unlisted”." },
    ja: { vid_ph: '動画リンク（YouTube / IG / TikTok）', vid_bad: 'YouTube・IG・TikTok の動画リンクを貼ってください', vid_tt_short: 'TikTok は動画を開いて、/video/ が入った完全な URL をコピーしてください', vid_hint: '動画は YouTube・IG・TikTok に投稿してから、リンクを貼ってください。非公開にしたい場合は YouTube の「限定公開」が使えます。' },
    ko: { vid_ph: '영상 링크 (YouTube / IG / TikTok)', vid_bad: 'YouTube, IG, TikTok 영상 링크를 붙여 넣어 주세요', vid_tt_short: 'TikTok은 영상을 연 뒤 /video/ 가 들어간 전체 주소를 복사해 주세요', vid_hint: '영상은 YouTube, IG, TikTok에 먼저 올린 뒤 링크를 붙여 넣어 주세요. 비공개로 하고 싶다면 YouTube의 “일부 공개”를 쓰면 돼요.' }
  });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RX = {
    yt: /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    ig: /^https:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/,
    tt: /^https:\/\/(?:www\.|m\.)?tiktok\.com\/@[A-Za-z0-9_.-]+\/video\/(\d{8,})/
  };
  function parse(url) {
    const u = String(url || '').trim();
    let m = RX.yt.exec(u); if (m) return { k: 'yt', id: m[1] };
    m = RX.ig.exec(u); if (m) return { k: 'ig', id: m[2], kind: m[1] === 'p' ? 'p' : 'reel' };
    m = RX.tt.exec(u); if (m) return { k: 'tt', id: m[1] };
    return null;
  }
  /** 有問題的話回傳錯誤訊息，沒問題回傳 '' */
  const check = url => { const u = String(url || '').trim(); if (!u || parse(u)) return ''; return /(vm|vt)\.tiktok\.com|tiktok\.com\/t\//i.test(u) ? t('vid_tt_short') : t('vid_bad'); };
  function embed(p) {
    if (!p) return null;
    if (p.k === 'yt') return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(p.id)}`;
    if (p.k === 'ig') return `https://www.instagram.com/${p.kind}/${encodeURIComponent(p.id)}/embed`;
    if (p.k === 'tt') return `https://www.tiktok.com/embed/v2/${encodeURIComponent(p.id)}`;
    return null;
  }
  const isMp4 = url => /^https:\/\//.test(url || '') && /\.mp4(\?|$)/i.test(url || '');
  /** 播放器：YouTube 先顯示縮圖（點了才載入，比較省），IG / TikTok 直接嵌入，舊的 MP4 用內建播放器 */
  function html(url, title = '') {
    const p = parse(url);
    if (p && p.k === 'yt') return `<div class="vid vid-yt"><button type="button" class="vid-thumb" data-yt="${esc(p.id)}" aria-label="▶ ${esc(title)}"><img src="https://i.ytimg.com/vi/${esc(p.id)}/hqdefault.jpg" alt="" loading="lazy"><span>▶</span></button></div>`;
    if (p) return `<div class="vid vid-${p.k}"><iframe src="${esc(embed(p))}" title="${esc(title || 'video')}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen scrolling="no"></iframe></div>`;
    if (isMp4(url)) return `<div class="vid vid-mp4"><video src="${esc(url)}" controls playsinline preload="metadata"></video></div>`;
    return '';
  }
  // 點 YouTube 縮圖 → 換成播放器
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.vid-thumb'); if (!b) return;
    b.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.yt)}?autoplay=1" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  });
  return { parse, check, embed: url => embed(parse(url)), html, isMp4 };
})();
