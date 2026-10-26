-- =========================================================
-- 舞島 — 第十七批：副本島（期間限定的特別群島，第一座是 Red Bull BC One）
-- 管理員決定開放期間、直播連結、選手和玩家帳號的連結、開不開放冠軍預測
-- 玩家可以應援選手、預測冠軍、觸發彩蛋拿經驗值
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 1. 副本島設定 ----------
create table if not exists public.dungeons (
  id text primary key check (id ~ '^[a-z0-9_-]{2,30}$'),
  enabled boolean not null default false,          -- 手動開放（打勾就開）
  open_from timestamptz,                           -- 或是設定開放期間
  open_until timestamptz,
  live_url text check (char_length(live_url) <= 300),
  live_note text check (char_length(live_note) <= 200),
  predict_year int,                                -- 哪一年開放冠軍預測（空白 = 不開放）
  predict_until timestamptz,                       -- 預測截止時間
  updated_at timestamptz not null default now()
);
alter table public.dungeons enable row level security;
drop policy if exists "dungeons readable" on public.dungeons;
create policy "dungeons readable" on public.dungeons for select using (true);
drop policy if exists "admins manage dungeons" on public.dungeons;
create policy "admins manage dungeons" on public.dungeons for all using (public.is_admin()) with check (public.is_admin());
grant select on public.dungeons to anon, authenticated;
grant insert, update, delete on public.dungeons to authenticated;
insert into public.dungeons (id) values ('bcone') on conflict do nothing;

create or replace function public.dungeon_open(did text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select enabled or (open_from is not null and now() >= open_from and (open_until is null or now() < open_until)) from public.dungeons where id = did), false)
$$;
grant execute on function public.dungeon_open(text) to anon, authenticated;

-- ---------- 2. 選手 ↔ 玩家帳號（選手有註冊的話，點島上的選手會跳出他的名片） ----------
create table if not exists public.dungeon_links (
  dungeon_id text not null references public.dungeons on delete cascade,
  athlete text not null check (char_length(athlete) between 1 and 60),
  handle text not null check (handle ~ '^[a-z0-9_]{3,16}$'),
  primary key (dungeon_id, athlete)
);
alter table public.dungeon_links enable row level security;
drop policy if exists "dungeon links readable" on public.dungeon_links;
create policy "dungeon links readable" on public.dungeon_links for select using (true);
drop policy if exists "admins manage dungeon links" on public.dungeon_links;
create policy "admins manage dungeon links" on public.dungeon_links for all using (public.is_admin()) with check (public.is_admin());
grant select on public.dungeon_links to anon, authenticated;
grant insert, update, delete on public.dungeon_links to authenticated;

-- ---------- 3. 應援（每年每個組別可以應援一位選手，可以改） ----------
create table if not exists public.dungeon_cheers (
  dungeon_id text not null references public.dungeons on delete cascade,
  year int not null,
  division text not null check (division in ('bboy', 'bgirl')),
  athlete text not null check (char_length(athlete) between 1 and 60),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dungeon_id, year, division, user_id)
);
alter table public.dungeon_cheers enable row level security;
create or replace function public.guard_dungeon_cheer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  if not public.dungeon_open(new.dungeon_id) and not public.is_admin() then raise exception 'closed'; end if;
  new.user_id := auth.uid(); new.created_at := now();
  return new;
end $$;
drop trigger if exists guard_dungeon_cheer on public.dungeon_cheers;
create trigger guard_dungeon_cheer before insert or update on public.dungeon_cheers for each row execute function public.guard_dungeon_cheer();
drop policy if exists "own cheers" on public.dungeon_cheers;
create policy "own cheers" on public.dungeon_cheers for select using (user_id = auth.uid());
drop policy if exists "cheer" on public.dungeon_cheers;
create policy "cheer" on public.dungeon_cheers for insert with check (user_id = auth.uid());
drop policy if exists "change cheer" on public.dungeon_cheers;
create policy "change cheer" on public.dungeon_cheers for update using (user_id = auth.uid());
grant select, insert, update on public.dungeon_cheers to authenticated;
create or replace function public.dungeon_cheer_counts(did text, y int) returns table (athlete text, n bigint)
language sql stable security definer set search_path = public as $$
  select athlete, count(*) from public.dungeon_cheers where dungeon_id = did and year = y group by athlete
$$;
grant execute on function public.dungeon_cheer_counts(text, int) to anon, authenticated;

-- ---------- 4. 冠軍預測（管理員開放某一年的預測；結果出來後管理員結算，猜中 +100 XP） ----------
create table if not exists public.dungeon_predictions (
  dungeon_id text not null references public.dungeons on delete cascade,
  year int not null,
  division text not null check (division in ('bboy', 'bgirl')),
  athlete text not null check (char_length(athlete) between 1 and 60),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dungeon_id, year, division, user_id)
);
alter table public.dungeon_predictions enable row level security;
create or replace function public.guard_dungeon_predict() returns trigger
language plpgsql security definer set search_path = public as $$
declare d public.dungeons;
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  select * into d from public.dungeons where id = new.dungeon_id;
  if d is null or d.predict_year is distinct from new.year or (d.predict_until is not null and now() >= d.predict_until) or not public.dungeon_open(new.dungeon_id) then raise exception 'closed'; end if;
  new.user_id := auth.uid(); new.created_at := now();
  return new;
end $$;
drop trigger if exists guard_dungeon_predict on public.dungeon_predictions;
create trigger guard_dungeon_predict before insert or update on public.dungeon_predictions for each row execute function public.guard_dungeon_predict();
drop policy if exists "own predictions" on public.dungeon_predictions;
create policy "own predictions" on public.dungeon_predictions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "predict" on public.dungeon_predictions;
create policy "predict" on public.dungeon_predictions for insert with check (user_id = auth.uid());
drop policy if exists "change prediction" on public.dungeon_predictions;
create policy "change prediction" on public.dungeon_predictions for update using (user_id = auth.uid());
grant select, insert, update on public.dungeon_predictions to authenticated;
create or replace function public.dungeon_predict_counts(did text, y int) returns table (division text, athlete text, n bigint)
language sql stable security definer set search_path = public as $$
  select division, athlete, count(*) from public.dungeon_predictions where dungeon_id = did and year = y group by division, athlete
$$;
grant execute on function public.dungeon_predict_counts(text, int) to anon, authenticated;
-- 管理員結算：猜中的人 +100 XP（同一年同一組別只會給一次）
create or replace function public.dungeon_predict_settle(did text, y int, div text, winner text) returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  for r in select user_id from public.dungeon_predictions where dungeon_id = did and year = y and division = div and lower(athlete) = lower(winner) loop
    if public.grant_xp(r.user_id, 'predict', did || ':' || y || ':' || div, 100, false) > 0 then n := n + 1; end if;
  end loop;
  return n;
end $$;
grant execute on function public.dungeon_predict_settle(text, int, text, text) to authenticated;

-- ---------- 5. 彩蛋：在副本島裡發現的小秘密，每個只能拿一次 ----------
create table if not exists public.dungeon_eggs (
  dungeon_id text not null references public.dungeons on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]{2,30}$'),
  xp int not null check (xp between 1 and 200),
  primary key (dungeon_id, key)
);
alter table public.dungeon_eggs enable row level security;
drop policy if exists "admins manage eggs" on public.dungeon_eggs;
create policy "admins manage eggs" on public.dungeon_eggs for all using (public.is_admin()) with check (public.is_admin());
insert into public.dungeon_eggs (dungeon_id, key, xp) values
  ('bcone', 'all_regions', 50),      -- 逛完所有區域賽小島
  ('bcone', 'champs', 30),           -- 跟兩位世界冠軍都聊過天
  ('bcone', 'trophy', 11),           -- 連點冠軍獎盃（8/11 Hip Hop 生日的小彩蛋）
  ('bcone', 'first_cheer', 10)       -- 第一次應援
on conflict do nothing;
create or replace function public.dungeon_egg(did text, k text) returns int
language plpgsql security definer set search_path = public as $$
declare e public.dungeon_eggs;
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then return 0; end if;
  if not public.dungeon_open(did) and not public.is_admin() then return 0; end if;
  select * into e from public.dungeon_eggs where dungeon_id = did and key = k;
  if e is null then return 0; end if;
  return public.grant_xp(auth.uid(), 'egg', did || ':' || k, e.xp, false);
end $$;
grant execute on function public.dungeon_egg(text, text) to authenticated;
