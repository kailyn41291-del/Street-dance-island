/* =========================================================
 * 雲端資料庫設定（Supabase）
 * 兩個都填好 → 網站自動切換成「雲端模式」：
 *   - 活動存在雲端，管理員登入後新增 / 編輯 / 刪除，馬上對所有人生效
 *   - 角色 ID 可以跨裝置登入
 * 留空 → 「本機模式」：活動用 data/events.js，新增的只存在自己的瀏覽器
 * 這兩個值是「公開」的，放在網站上沒關係（資料庫有權限規則保護）
 * ========================================================= */
window.DANCE_CONFIG = {
  supabaseUrl: '',      // 例：https://abcdefgh.supabase.co
  supabaseAnonKey: ''   // 例：eyJhbGciOi...（Project Settings → API → anon public）
};
