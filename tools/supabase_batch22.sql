-- =========================================================
-- 舞島 — 第二十二批：新稱號（分銅 / 銀 / 金三級）、球鞋收藏、DJ / MC / 評審 / 主辦身分申請、管理員頒發稱號
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 1. 身分申請：DJ / MC / 評審 / 主辦（網站架設者審核，通過就拿到專屬稱號） ----------
create table if not exists public.role_apps (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('dj', 'mc', 'judge', 'host')),
  note text not null check (char_length(note) between 5 and 500),   -- 經歷、作品連結、IG
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.role_apps enable row level security;
create or replace function public.guard_role_app() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  if exists (select 1 from public.role_apps where user_id = auth.uid() and role = new.role and status in ('pending', 'approved')) then raise exception 'already applied'; end if;
  new.user_id := auth.uid(); new.status := 'pending'; new.created_at := now(); new.reviewed_at := null;
  return new;
end $$;
drop trigger if exists guard_role_app on public.role_apps;
create trigger guard_role_app before insert on public.role_apps for each row execute function public.guard_role_app();
drop policy if exists "own role apps" on public.role_apps;
create policy "own role apps" on public.role_apps for select using (user_id = auth.uid() or public.is_owner());
drop policy if exists "apply role" on public.role_apps;
create policy "apply role" on public.role_apps for insert with check (user_id = auth.uid());
grant select, insert on public.role_apps to authenticated;

create or replace function public.role_review(aid bigint, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare a public.role_apps;
begin
  if not public.is_owner() then raise exception 'not allowed'; end if;
  update public.role_apps set status = case when approve then 'approved' else 'rejected' end, reviewed_at = now() where id = aid returning * into a;
  if a is null then raise exception 'not found'; end if;
  if approve then insert into public.unlocks (user_id, item) values (a.user_id, 't_id_' || a.role) on conflict do nothing; end if;
end $$;
grant execute on function public.role_review(bigint, boolean) to authenticated;
create or replace function public.role_apps_pending() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_owner() then coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'role', a.role, 'note', a.note, 'created_at', a.created_at, 'handle', p.handle, 'name', p.name) order by a.created_at), '[]') else '[]' end
  from public.role_apps a join public.players p on p.user_id = a.user_id where a.status = 'pending'
$$;
grant execute on function public.role_apps_pending() to authenticated;

-- ---------- 2. 網站架設者頒發 / 收回稱號（冠軍、頒獎台、世界冠軍…） ----------
create or replace function public.owner_grant(ph text, pitem text, pgive boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_owner() then raise exception 'not allowed'; end if;
  if pitem !~ '^(t_|r_)[a-z0-9_]{1,30}$' then raise exception 'bad title'; end if;
  select user_id into uid from public.players where handle = lower(ph);
  if uid is null then raise exception 'no such player'; end if;
  if pgive then insert into public.unlocks (user_id, item) values (uid, pitem) on conflict do nothing;
  else delete from public.unlocks u where u.user_id = uid and u.item = pitem;
       update public.players set title = null where user_id = uid and title = pitem; end if;
end $$;
grant execute on function public.owner_grant(text, text, boolean) to authenticated;

-- ---------- 3. 球鞋收藏（12 款；逛網站每天撿 1 雙、活動打卡保證拿 1 雙沒有的、重複的可以送朋友） ----------
create table if not exists public.sneakers (
  user_id uuid not null references auth.users on delete cascade,
  sid int not null check (sid between 1 and 12),
  n int not null default 1 check (n >= 0),
  primary key (user_id, sid)
);
create table if not exists public.sneaker_log (
  user_id uuid not null references auth.users on delete cascade,
  src text not null,            -- day：每天撿的、ev：活動打卡、give：送出去的
  ref text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, src, ref)
);
alter table public.sneakers enable row level security;
alter table public.sneaker_log enable row level security;
drop policy if exists "sneakers readable" on public.sneakers;
create policy "sneakers readable" on public.sneakers for select using (true);
grant select on public.sneakers to anon, authenticated;

-- 抽一雙：11、12 號是稀有款（機率比較低）；only_missing = 只從還沒有的裡面抽
create or replace function public.sneaker_roll(uid uuid, only_missing boolean) returns int
language plpgsql security definer set search_path = public as $$
declare pick int;
begin
  select s into pick from generate_series(1, 12) s
    where not only_missing or not exists (select 1 from public.sneakers k where k.user_id = uid and k.sid = s and k.n > 0)
    order by random() * (case when s >= 11 then 0.3 else 1 end) desc limit 1;
  if pick is null then pick := 1 + floor(random() * 10)::int; end if;
  insert into public.sneakers (user_id, sid, n) values (uid, pick, 1) on conflict (user_id, sid) do update set n = public.sneakers.n + 1;
  return pick;
end $$;
revoke all on function public.sneaker_roll(uuid, boolean) from public, anon, authenticated;

create or replace function public.sneaker_find() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); had boolean; s int;
begin
  if uid is null or not exists (select 1 from public.players where user_id = uid and not banned) then raise exception 'need character'; end if;
  insert into public.sneaker_log (user_id, src, ref) values (uid, 'day', public.tw_today()::text) on conflict do nothing;
  if not found then return jsonb_build_object('sid', 0); end if;
  s := public.sneaker_roll(uid, false);
  select n = 1 into had from public.sneakers where user_id = uid and sid = s;
  return jsonb_build_object('sid', s, 'new', had);
end $$;
grant execute on function public.sneaker_find() to authenticated;

create or replace function public.sneaker_checkin(eid text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s int; had boolean;
begin
  if uid is null or not exists (select 1 from public.checkins where user_id = uid and event_id = eid) then return jsonb_build_object('sid', 0); end if;
  insert into public.sneaker_log (user_id, src, ref) values (uid, 'ev', eid) on conflict do nothing;
  if not found then return jsonb_build_object('sid', 0); end if;
  s := public.sneaker_roll(uid, true);
  select n = 1 into had from public.sneakers where user_id = uid and sid = s;
  return jsonb_build_object('sid', s, 'new', had);
end $$;
grant execute on function public.sneaker_checkin(text) to authenticated;

-- 送朋友重複的球鞋（自己要留 1 雙；要是好友；每天最多送 3 次）
create or replace function public.sneaker_give(h text, s int) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); to_uid uuid;
begin
  select user_id into to_uid from public.players where handle = lower(h) and not banned;
  if to_uid is null or to_uid = uid then raise exception 'no such player'; end if;
  if not exists (select 1 from public.friend_requests where status = 'accepted' and ((from_user = uid and to_user = to_uid) or (from_user = to_uid and to_user = uid))) then raise exception 'friends only'; end if;
  if (select count(*) from public.sneaker_log where user_id = uid and src = 'give' and created_at > now() - interval '1 day') >= 3 then raise exception 'too many'; end if;
  update public.sneakers set n = n - 1 where user_id = uid and sid = s and n >= 2;
  if not found then raise exception 'no duplicate'; end if;
  insert into public.sneakers (user_id, sid, n) values (to_uid, s, 1) on conflict (user_id, sid) do update set n = public.sneakers.n + 1;
  insert into public.sneaker_log (user_id, src, ref) values (uid, 'give', h || ':' || s || ':' || extract(epoch from now())::bigint);
end $$;
grant execute on function public.sneaker_give(text, int) to authenticated;

-- ---------- 4. 檢查新稱號（每個稱號分 1 銅 / 2 銀 / 3 金三級），回傳這次新拿到的 ----------
create or replace function public.check_titles() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); h text; got jsonb := '[]'; r record; k text; i int; c int;
begin
  select handle into h from public.players where user_id = uid and not banned;
  if h is null then return '[]'; end if;
  for r in select * from (values
    ('pvp',   (select count(*) from public.xp_log where user_id = uid and kind = 'pvpwin')::int,                         array[10, 30, 50]),
    ('vet',   (select count(*) from public.checkins where user_id = uid)::int,                                           array[15, 25, 40]),
    ('hall',  (select count(*) from public.achievements where user_id = uid)::int,                                       array[10, 20, 30]),
    ('crew',  coalesce((select count(*) from public.crew_members m where m.crew_id = (select crew_id from public.crew_members where user_id = uid)), 0)::int, array[3, 5, 8]),
    ('graf',  (select count(*) from public.likes l where l.user_id <> uid and (
                 (l.target like 'p:%' and exists (select 1 from public.forum_posts f where f.id = substr(l.target, 3)::bigint and f.user_id = uid)) or
                 (l.target like 'r:%' and exists (select 1 from public.replies x where x.id = substr(l.target, 3)::bigint and x.user_id = uid))))::int, array[10, 30, 50]),
    ('drip',  (select count(*) from public.player_likes where to_user = uid)::int,                                       array[10, 30, 50]),
    ('stk',   (select count(*) from public.messages where user_id = uid and text ~ ':[cd][0-9]{1,2}:')::int,             array[30, 80, 150]),
    ('relay', (select count(distinct week) from public.move_entries where user_id = uid and not hidden)::int,            array[2, 4, 6]),
    ('skate', (select count(*) from public.practice_spots where user_id = uid and status = 'approved')::int,             array[1, 2, 3]),
    ('shoe',  (select count(*) from public.sneakers where user_id = uid and n > 0)::int,                                 array[4, 8, 12])
  ) as v(key, cnt, th) loop
    for i in 1 .. 3 loop
      if r.cnt >= r.th[i] then
        k := 't_' || r.key || '_' || i;
        insert into public.unlocks (user_id, item) values (uid, k) on conflict do nothing;
        if found then got := got || to_jsonb(k); end if;
      end if;
    end loop;
  end loop;
  -- 本季腰帶：上一季（或更早）排名賽第 1 名
  if exists (select 1 from public.pvp_season s where s.user_id = uid and s.season < public.season_now() and s.points > 0
             and s.points = (select max(points) from public.pvp_season x where x.season = s.season)) then
    insert into public.unlocks (user_id, item) values (uid, 't_belt') on conflict do nothing;
    if found then got := got || to_jsonb('t_belt'::text); end if;
  end if;
  -- 人氣 DJ / 派對主持人：通過身分申請，而且被 @ 列進 3 場活動陣容
  foreach k in array array['dj', 'mc'] loop
    if exists (select 1 from public.unlocks where user_id = uid and item = 't_id_' || k) then
      select count(*) into c from public.events e
        where exists (select 1 from jsonb_array_elements_text(coalesce(e.data -> (k || 's'), '[]')) x where lower(x) ~ ('@' || h || '($|[^a-z0-9_])'));
      if c >= 3 then
        insert into public.unlocks (user_id, item) values (uid, 't_' || k || '_pop') on conflict do nothing;
        if found then got := got || to_jsonb('t_' || k || '_pop'); end if;
      end if;
    end if;
  end loop;
  return got;
end $$;
grant execute on function public.check_titles() to authenticated;

-- 進度（顯示「還差多少」）
create or replace function public.title_progress() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pvp',   (select count(*) from public.xp_log where user_id = auth.uid() and kind = 'pvpwin'),
    'vet',   (select count(*) from public.checkins where user_id = auth.uid()),
    'hall',  (select count(*) from public.achievements where user_id = auth.uid()),
    'crew',  coalesce((select count(*) from public.crew_members m where m.crew_id = (select crew_id from public.crew_members where user_id = auth.uid())), 0),
    'drip',  (select count(*) from public.player_likes where to_user = auth.uid()),
    'stk',   (select count(*) from public.messages where user_id = auth.uid() and text ~ ':[cd][0-9]{1,2}:'),
    'relay', (select count(distinct week) from public.move_entries where user_id = auth.uid() and not hidden),
    'skate', (select count(*) from public.practice_spots where user_id = auth.uid() and status = 'approved'),
    'shoe',  (select count(*) from public.sneakers where user_id = auth.uid() and n > 0))
$$;
grant execute on function public.title_progress() to authenticated;
