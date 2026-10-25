-- =========================================================
-- 舞島 — 第二批功能：收藏、追蹤主辦方、投稿、打卡護照、每日簽到、等級
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 收藏活動 ----------
create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  event_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.favorites enable row level security;
drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 追蹤主辦方 ----------
create table if not exists public.follows (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  org text not null check (char_length(org) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, org)
);
alter table public.follows enable row level security;
drop policy if exists "own follows" on public.follows;
create policy "own follows" on public.follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 活動投稿（等管理員審核） ----------
create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.submissions enable row level security;
drop policy if exists "submit own" on public.submissions;
create policy "submit own" on public.submissions for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "see own or admin" on public.submissions;
create policy "see own or admin" on public.submissions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin reviews submissions" on public.submissions;
create policy "admin reviews submissions" on public.submissions for update using (public.is_admin()) with check (public.is_admin());
-- 一天最多投稿 10 筆
create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.submissions where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then raise exception 'too many'; end if;
  if pg_column_size(new.data) > 400000 then raise exception 'too big'; end if;
  return new;
end $$;
drop trigger if exists guard_submission on public.submissions;
create trigger guard_submission before insert on public.submissions for each row execute function public.guard_submission();

-- ---------- 打卡（街舞護照） ----------
create table if not exists public.checkins (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  event_id text not null,
  country text not null,
  city text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.checkins enable row level security;
drop policy if exists "checkins readable" on public.checkins;
create policy "checkins readable" on public.checkins for select using (true);
drop policy if exists "check in own" on public.checkins;
create policy "check in own" on public.checkins for insert with check (user_id = auth.uid());
drop policy if exists "undo own checkin" on public.checkins;
create policy "undo own checkin" on public.checkins for delete using (user_id = auth.uid());
create or replace function public.guard_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.checkins where user_id = auth.uid() and created_at > now() - interval '1 day') >= 6 then raise exception 'too many'; end if;
  return new;
end $$;
drop trigger if exists guard_checkin on public.checkins;
create trigger guard_checkin before insert on public.checkins for each row execute function public.guard_checkin();

-- ---------- 每日簽到抽獎 ----------
create table if not exists public.daily (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  reward text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
create table if not exists public.unlocks (
  user_id uuid not null references auth.users on delete cascade,
  item text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.daily enable row level security;
alter table public.unlocks enable row level security;
drop policy if exists "own daily" on public.daily;
create policy "own daily" on public.daily for select using (user_id = auth.uid());
drop policy if exists "unlocks readable" on public.unlocks;
create policy "unlocks readable" on public.unlocks for select using (true);

-- 抽獎在伺服器端決定（不能作弊），每天一次（以台灣時間計算日期）
create or replace function public.daily_spin() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Taipei')::date;
  pool text[] := array['xp20','xp20','xp20','xp50','xp50','xp100','r_lucky','r_spinner','r_goldfeet','r_cypherking','r_vinyl','r_rainbow','r_moonwalk','r_sushi'];
  w int[] := array[30,30,30,18,18,8,3,3,3,2,3,3,3,3];
  total int := 0; pick int; acc int := 0; reward text; i int; streak int := 0; d date;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if not exists (select 1 from public.players where user_id = auth.uid()) then raise exception 'need character'; end if;
  if exists (select 1 from public.daily where user_id = auth.uid() and day = today) then raise exception 'already'; end if;
  foreach i in array w loop total := total + i; end loop;
  pick := floor(random() * total)::int;
  for i in 1 .. array_length(pool, 1) loop
    acc := acc + w[i];
    if pick < acc then reward := pool[i]; exit; end if;
  end loop;
  -- 已經有的稱號就換成經驗值
  if reward like 'r_%' and exists (select 1 from public.unlocks where user_id = auth.uid() and item = reward) then reward := 'xp50'; end if;
  insert into public.daily (user_id, day, reward) values (auth.uid(), today, reward);
  if reward like 'r_%' then insert into public.unlocks (user_id, item) values (auth.uid(), reward) on conflict do nothing; end if;
  d := today;
  while exists (select 1 from public.daily where user_id = auth.uid() and day = d) loop streak := streak + 1; d := d - 1; end loop;
  -- 連續 7 天額外獎勵
  if streak % 7 = 0 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_week7') on conflict do nothing; end if;
  return jsonb_build_object('reward', reward, 'streak', streak);
end $$;
grant execute on function public.daily_spin() to authenticated;

-- ---------- 經驗值 / 等級 ----------
-- 打卡 50、每日簽到 20（+ 抽到的經驗值）、留言 5、聊天 1（最多算 300 則）、收藏 2、通過的投稿 80
create or replace function public.player_stats(uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'checkins', (select count(*) from public.checkins where user_id = uid),
    'comments', (select count(*) from public.comments where user_id = uid),
    'messages', (select count(*) from public.messages where user_id = uid),
    'days', (select count(*) from public.daily where user_id = uid),
    'favorites', (select count(*) from public.favorites where user_id = uid),
    'approved', (select count(*) from public.submissions where user_id = uid and status = 'approved'),
    'xp',
      (select count(*) from public.checkins where user_id = uid) * 50
    + (select count(*) from public.daily where user_id = uid) * 20
    + (select coalesce(sum(case reward when 'xp20' then 20 when 'xp50' then 50 when 'xp100' then 100 else 0 end), 0) from public.daily where user_id = uid)
    + (select count(*) from public.comments where user_id = uid) * 5
    + least((select count(*) from public.messages where user_id = uid), 300)
    + (select count(*) from public.favorites where user_id = uid) * 2
    + (select count(*) from public.submissions where user_id = uid and status = 'approved') * 80
  )
$$;
grant execute on function public.player_stats(uuid) to anon, authenticated;

-- 獎勵稱號（r_ 開頭）要真的抽到過才能掛
create or replace function public.guard_reward_title() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.title like 'r\_%' and not exists (select 1 from public.unlocks where user_id = new.user_id and item = new.title) then new.title := null; end if;
  return new;
end $$;
drop trigger if exists guard_reward_title on public.players;
create trigger guard_reward_title before insert or update on public.players for each row execute function public.guard_reward_title();

grant select, insert, delete on public.favorites, public.follows, public.checkins to authenticated;
grant select on public.checkins, public.unlocks to anon;
grant select, insert, update on public.submissions to authenticated;
grant select on public.daily, public.unlocks to authenticated;
