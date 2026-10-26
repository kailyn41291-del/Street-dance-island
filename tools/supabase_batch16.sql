-- =========================================================
-- 舞島 — 第十六批：每週動作接力挑戰
-- 每週一個指定動作 → 上傳影片（MP4 或 YouTube）→ 點名朋友接力 → 每人 3 票 → 週末前三名拿經驗值
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- 管理員指定的每週動作（沒指定的週，網站會用內建清單輪流）
create table if not exists public.move_challenges (
  week date primary key,
  move text not null check (char_length(move) between 1 and 60),
  style text,
  tip text check (char_length(tip) <= 300),
  demo text check (char_length(demo) <= 300)
);
alter table public.move_challenges enable row level security;
drop policy if exists "move challenges readable" on public.move_challenges;
create policy "move challenges readable" on public.move_challenges for select using (true);
drop policy if exists "admins set move challenges" on public.move_challenges;
create policy "admins set move challenges" on public.move_challenges for all using (public.is_admin()) with check (public.is_admin());
grant select on public.move_challenges to anon, authenticated;
grant insert, update, delete on public.move_challenges to authenticated;

-- 參賽影片（每人每週一支）
create table if not exists public.move_entries (
  id bigint generated always as identity primary key,
  week date not null default public.tw_week(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author jsonb,
  video text not null check (char_length(video) <= 300),
  caption text check (char_length(caption) <= 100),
  nominee text check (char_length(nominee) <= 16),     -- 點名接力的玩家 ID
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (week, user_id)
);
alter table public.move_entries enable row level security;
create or replace function public.guard_move_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if new.video !~ ('^https://(www\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)[A-Za-z0-9_-]{6,}') and new.video !~ ('/storage/v1/object/public/forum/' || auth.uid()::text || '/') then raise exception 'bad media'; end if;
  if public.is_spam(coalesce(new.caption, '')) then raise exception 'spam'; end if;
  if new.nominee is not null then
    new.nominee := lower(regexp_replace(new.nominee, '^@', ''));
    if new.nominee = p.handle or not exists (select 1 from public.players where handle = new.nominee) then new.nominee := null; end if;
  end if;
  new.week := public.tw_week(); new.user_id := auth.uid(); new.hidden := false; new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'look', p.look);
  return new;
end $$;
drop trigger if exists guard_move_entry on public.move_entries;
create trigger guard_move_entry before insert on public.move_entries for each row execute function public.guard_move_entry();
drop policy if exists "move entries readable" on public.move_entries;
create policy "move entries readable" on public.move_entries for select using (not hidden or user_id = auth.uid() or public.is_admin());
drop policy if exists "post move entry" on public.move_entries;
create policy "post move entry" on public.move_entries for insert with check (auth.uid() is not null);
drop policy if exists "hide move entry" on public.move_entries;
create policy "hide move entry" on public.move_entries for update using (public.is_admin());
drop policy if exists "delete move entry" on public.move_entries;
create policy "delete move entry" on public.move_entries for delete using (user_id = auth.uid() or public.is_admin());
grant select on public.move_entries to anon, authenticated;
grant insert, update, delete on public.move_entries to authenticated;

-- 投票：每人每週 3 票，不能投自己，同一支影片只能投一次，只能投本週的
create table if not exists public.move_votes (
  entry_id bigint not null references public.move_entries on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week date not null default public.tw_week(),
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);
alter table public.move_votes enable row level security;
create or replace function public.guard_move_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare e public.move_entries;
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  select * into e from public.move_entries where id = new.entry_id;
  if e is null or e.hidden or e.week <> public.tw_week() then raise exception 'closed'; end if;
  if e.user_id = auth.uid() then raise exception 'not allowed'; end if;
  if (select count(*) from public.move_votes where user_id = auth.uid() and week = public.tw_week()) >= 3 then raise exception 'too many'; end if;
  new.user_id := auth.uid(); new.week := public.tw_week(); new.created_at := now();
  return new;
end $$;
drop trigger if exists guard_move_vote on public.move_votes;
create trigger guard_move_vote before insert on public.move_votes for each row execute function public.guard_move_vote();
drop policy if exists "move votes readable" on public.move_votes;
create policy "move votes readable" on public.move_votes for select using (true);
drop policy if exists "cast move vote" on public.move_votes;
create policy "cast move vote" on public.move_votes for insert with check (auth.uid() is not null);
drop policy if exists "remove move vote" on public.move_votes;
create policy "remove move vote" on public.move_votes for delete using (user_id = auth.uid() and week = public.tw_week());
grant select on public.move_votes to anon, authenticated;
grant insert, delete on public.move_votes to authenticated;

-- 結算上週：票數前三名 +150 / +80 / +40 XP，第一名拿「本週動作王」稱號
create table if not exists public.move_results (
  week date primary key,
  top jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.move_results enable row level security;
drop policy if exists "move results readable" on public.move_results;
create policy "move results readable" on public.move_results for select using (true);
grant select on public.move_results to anon, authenticated;
create or replace function public.move_settle() returns void
language plpgsql security definer set search_path = public as $$
declare w date := public.tw_week() - 7; r record; i int := 0; top jsonb := '[]';
begin
  if exists (select 1 from public.move_results where week = w) then return; end if;
  for r in select e.id, e.user_id, e.author, count(v.user_id) as n from public.move_entries e left join public.move_votes v on v.entry_id = e.id
           where e.week = w and not e.hidden group by e.id having count(v.user_id) > 0 order by count(v.user_id) desc, e.created_at limit 3 loop
    i := i + 1;
    perform public.grant_xp(r.user_id, 'relay', w::text, (array[150, 80, 40])[i], false);
    if i = 1 then insert into public.unlocks (user_id, item) values (r.user_id, 'r_moveking') on conflict do nothing; end if;
    top := top || jsonb_build_object('place', i, 'entry', r.id, 'author', r.author, 'votes', r.n);
  end loop;
  insert into public.move_results (week, top) values (w, top) on conflict do nothing;
end $$;
grant execute on function public.move_settle() to authenticated;
