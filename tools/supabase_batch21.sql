-- =========================================================
-- 舞島 — 第二十一批：刪除全部測試帳號（永久刪除，不能復原）
-- 只刪下面列出的 15 個測試角色，和名字是「（測試）」開頭的舞團
-- 他們的聊天、留言、好友、經驗值、舞團成員資料會跟著一起刪掉；
-- 他們新增過的活動不會被刪，只是不再顯示是誰新增的
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run
-- =========================================================

-- 1. 測試舞團
delete from public.crews where name like '（測試）%';

-- 2. 測試帳號（刪掉登入帳號，角色和相關資料會自動一起刪除）
delete from auth.users where id in (
  select user_id from public.players where handle in (
    'claude_test', 'claude_test2', 'claude_test3', 'claude_test4',
    'claude_t5', 'claude_t6', 'claude_t7', 'claude_t8', 'claude_t9', 'claude_t10',
    'claude_t11', 'claude_t12', 'claude_t13', 'claude_t14', 'claude_t15'
  )
);

-- 3. 確認：下面兩個數字都應該是 0
select
  (select count(*) from public.players where handle like 'claude\_%') as test_players_left,
  (select count(*) from public.crews where name like '（測試）%') as test_crews_left;
