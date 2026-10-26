-- =========================================================
-- 舞島 — 第十八批：節慶活動、路人 NPC 彩蛋
-- 節日日曆（2026～2028）、節日限定稱號、新年紅包、情人節 / 中秋組隊任務、暑假百日練舞、世界舞蹈日打卡地圖
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 1. 節日日曆（伺服器以這張表判斷今天是不是節日，獎勵才不會被亂領） ----------
create table if not exists public.fest_days (
  fid text not null,
  day date not null,
  primary key (fid, day)
);
alter table public.fest_days enable row level security;
drop policy if exists "fest days readable" on public.fest_days;
create policy "fest days readable" on public.fest_days for select using (true);
drop policy if exists "admins edit fest days" on public.fest_days;
create policy "admins edit fest days" on public.fest_days for all using (public.is_admin()) with check (public.is_admin());
grant select on public.fest_days to anon, authenticated;
grant insert, update, delete on public.fest_days to authenticated;

-- 固定日期的節日：2026～2028 每年都塞進去
do $$
declare y int;
begin
  for y in 2026 .. 2028 loop
    insert into public.fest_days (fid, day) select 'newyear', make_date(y, 1, 1) on conflict do nothing;
    insert into public.fest_days (fid, day) select 'valentine', d::date from generate_series(make_date(y, 2, 12), make_date(y, 2, 14), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'danceday', d::date from generate_series(make_date(y, 4, 27), make_date(y, 5, 3), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'summer100', d::date from generate_series(make_date(y, 7, 1), make_date(y, 7, 1) + 99, interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'hiphop', d::date from generate_series(make_date(y, 8, 8), make_date(y, 8, 14), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'halloween', d::date from generate_series(make_date(y, 10, 24), make_date(y, 11, 1), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'xmas', d::date from generate_series(make_date(y, 12, 20), make_date(y, 12, 26), interval '1 day') d on conflict do nothing;
  end loop;
end $$;
-- 農曆節日（每年日期不同）：春節前 3 天到後 7 天、中秋前後 3 天
insert into public.fest_days (fid, day) select 'lunar', d::date from generate_series(date '2027-02-03', date '2027-02-13', interval '1 day') d on conflict do nothing;
insert into public.fest_days (fid, day) select 'lunar', d::date from generate_series(date '2028-01-23', date '2028-02-02', interval '1 day') d on conflict do nothing;
insert into public.fest_days (fid, day) select 'moon', d::date from generate_series(date '2027-09-12', date '2027-09-18', interval '1 day') d on conflict do nothing;
insert into public.fest_days (fid, day) select 'moon', d::date from generate_series(date '2028-09-30', date '2028-10-06', interval '1 day') d on conflict do nothing;

create or replace function public.fest_today(f text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.fest_days where fid = f and day = public.tw_today())
$$;
grant execute on function public.fest_today(text) to anon, authenticated;

-- ---------- 2. 節日限定稱號：節日期間登入、而且當天每日任務全清 → 稱號 + 50 XP ----------
create or replace function public.fest_claim(f text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.tw_today(); xp int;
begin
  if uid is null or not exists (select 1 from public.players where user_id = uid and not banned) then raise exception 'need character'; end if;
  if f not in ('newyear', 'lunar', 'valentine', 'danceday', 'hiphop', 'moon', 'halloween', 'xmas') or not public.fest_today(f) then raise exception 'not today'; end if;
  if not exists (select 1 from public.xp_log where user_id = uid and kind = 'quest_all' and ref = d::text) then raise exception 'quests first'; end if;
  insert into public.unlocks (user_id, item) values (uid, 'r_f_' || f) on conflict do nothing;
  xp := public.grant_xp(uid, 'fest', f || ':' || extract(year from d)::int, 50, false);
  return jsonb_build_object('title', 'r_f_' || f, 'xp', xp);
end $$;
grant execute on function public.fest_claim(text) to authenticated;

-- ---------- 3. 新年紅包：春節期間每天島上藏 3 個紅包，每個 +8 XP ----------
create or replace function public.fest_redpacket(k int) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid() and not banned) then return 0; end if;
  if not public.fest_today('lunar') or k not between 1 and 3 then return 0; end if;
  return public.grant_xp(auth.uid(), 'fest_rp', public.tw_today() || ':' || k, 8, false);
end $$;
grant execute on function public.fest_redpacket(int) to authenticated;

-- ---------- 4. 情人節雙人任務 / 中秋烤肉 cypher：節日期間跟別人組隊（隊伍 2 人以上、集合時間在節日期間）→ +80 XP ----------
create or replace function public.fest_party_claim(f text) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if f not in ('valentine', 'moon') or uid is null then raise exception 'not allowed'; end if;
  if not exists (
    select 1 from public.party_members m join public.parties p on p.id = m.party_id
    where m.user_id = uid and (select count(*) from public.party_members x where x.party_id = p.id) >= 2
      and exists (select 1 from public.fest_days fd where fd.fid = f and fd.day = (p.meet_at at time zone 'Asia/Taipei')::date)
  ) then raise exception 'no party'; end if;
  insert into public.unlocks (user_id, item) values (uid, 'r_f_' || f) on conflict do nothing;
  return public.grant_xp(uid, 'fest_party', f || ':' || extract(year from public.tw_today())::int, 80, false);
end $$;
grant execute on function public.fest_party_claim(text) to authenticated;

-- ---------- 5. 暑假百日練舞挑戰：7/1 起 100 天，每天按一次「今天練舞了」；30 / 60 / 100 天有獎勵 ----------
create table if not exists public.fest_practice (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null default public.tw_today(),
  primary key (user_id, day)
);
alter table public.fest_practice enable row level security;
create or replace function public.guard_fest_practice() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  if not public.fest_today('summer100') then raise exception 'not today'; end if;
  new.user_id := auth.uid(); new.day := public.tw_today();
  return new;
end $$;
drop trigger if exists guard_fest_practice on public.fest_practice;
create trigger guard_fest_practice before insert on public.fest_practice for each row execute function public.guard_fest_practice();
drop policy if exists "own practice" on public.fest_practice;
create policy "own practice" on public.fest_practice for select using (user_id = auth.uid());
drop policy if exists "log practice" on public.fest_practice;
create policy "log practice" on public.fest_practice for insert with check (user_id = auth.uid());
grant select, insert on public.fest_practice to authenticated;
create or replace function public.fest_practice_claim() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); y int := extract(year from public.tw_today())::int; n int; got jsonb := '[]'; r record;
begin
  select count(*) into n from public.fest_practice where user_id = uid and extract(year from day) = y;
  for r in select * from (values (30, 50), (60, 100), (100, 300)) as m(days, xp) loop
    if n >= r.days and public.grant_xp(uid, 'fest_100', y || ':' || r.days, r.xp, false) > 0 then got := got || jsonb_build_object('days', r.days, 'xp', r.xp); end if;
  end loop;
  if n >= 100 then insert into public.unlocks (user_id, item) values (uid, 'r_f_summer100') on conflict do nothing; end if;
  return jsonb_build_object('n', n, 'got', got);
end $$;
grant execute on function public.fest_practice_claim() to authenticated;

-- ---------- 6. 4/29 世界舞蹈日：在地圖上打卡「我在這裡跳舞」（每年一次，+30 XP） ----------
create table if not exists public.danceday_pins (
  year int not null default extract(year from public.tw_today())::int,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author jsonb,
  country text not null,
  city text,
  lat double precision not null,
  lon double precision not null,
  created_at timestamptz not null default now(),
  primary key (year, user_id)
);
alter table public.danceday_pins enable row level security;
create or replace function public.guard_danceday_pin() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if not public.fest_today('danceday') then raise exception 'not today'; end if;
  if new.lat not between -90 and 90 or new.lon not between -180 and 180 then raise exception 'bad place'; end if;
  new.year := extract(year from public.tw_today())::int; new.user_id := auth.uid(); new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name);
  -- 位置只存到大約城市的精度（小數點後 2 位，約 1 公里），保護隱私
  new.lat := round(new.lat::numeric, 2); new.lon := round(new.lon::numeric, 2);
  perform public.grant_xp(auth.uid(), 'danceday', new.year::text, 30, false);
  insert into public.unlocks (user_id, item) values (auth.uid(), 'r_f_danceday') on conflict do nothing;
  return new;
end $$;
drop trigger if exists guard_danceday_pin on public.danceday_pins;
create trigger guard_danceday_pin before insert on public.danceday_pins for each row execute function public.guard_danceday_pin();
drop policy if exists "danceday pins readable" on public.danceday_pins;
create policy "danceday pins readable" on public.danceday_pins for select using (true);
drop policy if exists "pin danceday" on public.danceday_pins;
create policy "pin danceday" on public.danceday_pins for insert with check (auth.uid() is not null);
grant select on public.danceday_pins to anon, authenticated;
grant insert on public.danceday_pins to authenticated;

-- ---------- 7. 路人 NPC 小彩蛋：地圖上偶爾會出現神秘舞者，聊天可以拿 +5 XP（每天最多 3 次） ----------
create or replace function public.rpg_egg(k text) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.tw_today(); n int;
begin
  if uid is null or not exists (select 1 from public.players where user_id = uid and not banned) then return 0; end if;
  if k <> 'walker' then return 0; end if;
  select count(*) into n from public.xp_log where user_id = uid and kind = 'rpg_walker' and ref like d || ':%';
  if n >= 3 then return 0; end if;
  return public.grant_xp(uid, 'rpg_walker', d || ':' || (n + 1), 5, false);
end $$;
grant execute on function public.rpg_egg(text) to authenticated;
