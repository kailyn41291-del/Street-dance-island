-- =========================================================
-- 舞島 — 活動瀏覽次數
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================
create table if not exists public.event_views (
  event_id text primary key check (char_length(event_id) between 1 and 100),
  n bigint not null default 0
);
alter table public.event_views enable row level security;
drop policy if exists "views readable" on public.event_views;
create policy "views readable" on public.event_views for select using (true);

-- 只能透過這個函式 +1（不能直接改數字）
create or replace function public.bump_view(eid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if eid is null or char_length(eid) not between 1 and 100 then return; end if;
  insert into public.event_views (event_id, n) values (eid, 1)
    on conflict (event_id) do update set n = public.event_views.n + 1;
end $$;
grant select on public.event_views to anon, authenticated;
grant execute on function public.bump_view(text) to anon, authenticated;
