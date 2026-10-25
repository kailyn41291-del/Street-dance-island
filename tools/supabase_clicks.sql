-- =========================================================
-- 舞島 — 活動連結點擊次數（後台統計用，只有管理員看得到）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================
create table if not exists public.event_clicks (
  event_id text not null check (char_length(event_id) between 1 and 100),
  kind text not null check (kind in ('link', 'map')),
  day date not null default (now() at time zone 'Asia/Taipei')::date,
  n bigint not null default 0,
  primary key (event_id, kind, day)
);
alter table public.event_clicks enable row level security;
drop policy if exists "admins read clicks" on public.event_clicks;
create policy "admins read clicks" on public.event_clicks for select using (public.is_admin());

-- 只能透過這個函式 +1
create or replace function public.bump_click(eid text, k text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if eid is null or char_length(eid) not between 1 and 100 or k not in ('link', 'map') then return; end if;
  insert into public.event_clicks (event_id, kind, n) values (eid, k, 1)
    on conflict (event_id, kind, day) do update set n = public.event_clicks.n + 1;
end $$;
grant select on public.event_clicks to authenticated;
grant execute on function public.bump_click(text, text) to anon, authenticated;
