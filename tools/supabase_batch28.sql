-- =========================================================
-- 舞島 — 第二十八批：活動海報改存檔案＋數字改由資料庫算
-- 1. 管理員可以把活動海報存到「media/poster/」（不再塞在活動資料裡）
-- 2. 留言數、瀏覽數、按讚數、投票數……改成資料庫直接算好再給網站
--    （超過 1000 筆也不會算錯；原本的「誰能看到什麼」規則不變）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- 1. 海報空間
drop policy if exists "media upload" on storage.objects;
create policy "media upload" on storage.objects for insert with check (
  bucket_id = 'media' and (
    ((storage.foldername(name))[1] in ('notice', 'poster') and public.is_admin())
    or ((storage.foldername(name))[1] = 'crew' and (storage.foldername(name))[2] = auth.uid()::text)));

-- 2. 計數（security invoker：用看的人自己的權限，看不到的不會被算進去）
-- 活動留言數 {活動 id: 數量}
create or replace function public.comment_counts() returns json language sql stable as $$
  select coalesce(json_object_agg(event_id, n), '{}'::json) from (select event_id, count(*) n from public.comments group by event_id) s;
$$;
-- 活動瀏覽數 {活動 id: 數量}
create or replace function public.view_counts() returns json language sql stable as $$
  select coalesce(json_object_agg(event_id, n), '{}'::json) from public.event_views;
$$;
-- 活動點擊統計（只有管理員看得到）
create or replace function public.click_stats() returns json language sql stable as $$
  select coalesce(json_agg(json_build_object('event_id', event_id, 'kind', kind, 'day', day, 'n', n)), '[]'::json) from public.event_clicks;
$$;
-- 舞團人數 {舞團 id: 人數}
create or replace function public.crew_counts() returns json language sql stable as $$
  select coalesce(json_object_agg(crew_id, n), '{}'::json) from (select crew_id, count(*) n from public.crew_members group by crew_id) s;
$$;
-- 回覆數 {討論串: 數量}
create or replace function public.reply_counts(threads text[]) returns json language sql stable as $$
  select coalesce(json_object_agg(thread, n), '{}'::json) from (select thread, count(*) n from public.replies where thread = any(threads) group by thread) s;
$$;
-- 按讚 [{target, n, mine}]
create or replace function public.like_tally(targets text[]) returns json language sql stable as $$
  select coalesce(json_agg(json_build_object('target', target, 'n', n, 'mine', mine)), '[]'::json) from (
    select target, count(*) n, bool_or(user_id = auth.uid()) mine from public.likes where target = any(targets) group by target) s;
$$;
-- Battle 投票 [{battle_id, choice, n, mine}]
create or replace function public.battle_tally(ids bigint[]) returns json language sql stable as $$
  select coalesce(json_agg(json_build_object('battle_id', battle_id, 'choice', choice, 'n', n, 'mine', mine)), '[]'::json) from (
    select battle_id, choice, count(*) n, bool_or(user_id = auth.uid()) mine from public.votes where battle_id = any(ids) group by battle_id, choice) s;
$$;
-- 論壇投票 [{choice, n, mine}]
create or replace function public.poll_tally(pid bigint) returns json language sql stable as $$
  select coalesce(json_agg(json_build_object('choice', choice, 'n', n, 'mine', mine)), '[]'::json) from (
    select choice, count(*) n, bool_or(user_id = auth.uid()) mine from public.poll_votes where post_id = pid group by choice) s;
$$;
-- 本週動作接力投票 [{entry_id, n, mine}]
create or replace function public.move_tally(pweek date) returns json language sql stable as $$
  select coalesce(json_agg(json_build_object('entry_id', entry_id, 'n', n, 'mine', mine)), '[]'::json) from (
    select entry_id, count(*) n, bool_or(user_id = auth.uid()) mine from public.move_votes where week = pweek group by entry_id) s;
$$;

grant execute on function public.comment_counts(), public.view_counts(), public.click_stats(), public.crew_counts(),
  public.reply_counts(text[]), public.like_tally(text[]), public.battle_tally(bigint[]), public.poll_tally(bigint), public.move_tally(date) to anon, authenticated;
