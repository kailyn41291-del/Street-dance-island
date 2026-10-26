-- =========================================================
-- 舞島 — 第十一批：街舞教室地圖、新玩家只看得到加入後的聊天、每日一推
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 1. 聊天室：只看得到自己加入（建立角色）之後的訊息 ----------
-- 還沒建立角色的訪客：只看得到最近 2 分鐘內的新訊息（等於「進來之後」的訊息）
-- 管理員：看得到全部（方便管理）
create or replace function public.chat_since() returns timestamptz
language sql stable security definer set search_path = public as $$
  select coalesce((select created_at from public.players where user_id = auth.uid()), now() - interval '2 minutes')
$$;
grant execute on function public.chat_since() to anon, authenticated;
drop policy if exists "messages readable" on public.messages;
create policy "messages readable" on public.messages for select using (
  public.can_use_channel(channel) and (created_at >= public.chat_since() or public.is_admin()));

-- ---------- 2. 街舞教室 ----------
create table if not exists public.studios (
  id bigint generated always as identity primary key,
  owner uuid default auth.uid() references auth.users on delete set null,
  name text not null check (char_length(name) between 2 and 60),
  country text not null default 'TW',
  city text,
  address text check (char_length(address) <= 200),
  lat double precision,
  lon double precision,
  styles text[] not null default '{}',
  intro text check (char_length(intro) <= 2000),
  phone text check (char_length(phone) <= 40),
  ig text check (char_length(ig) <= 200),
  link text check (char_length(link) <= 300),
  cover text check (char_length(cover) <= 500),
  teachers jsonb not null default '[]',   -- [{ "name", "styles", "ig", "handle", "bio" }]
  schedule jsonb not null default '[]',   -- [{ "d": 0~6, "s": "19:00", "e": "20:30", "title", "teacher", "level" }]
  events text[] not null default '{}',    -- 教室自己辦的比賽（活動 ID）
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.studios enable row level security;

create or replace function public.guard_studio() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  if public.is_admin() then new.updated_at := now(); return new; end if;
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if public.is_spam(coalesce(new.name, '') || ' ' || coalesce(new.intro, '')) then raise exception 'spam'; end if;
  if jsonb_typeof(new.teachers) <> 'array' or jsonb_array_length(new.teachers) > 40 then raise exception 'too many'; end if;
  if jsonb_typeof(new.schedule) <> 'array' or jsonb_array_length(new.schedule) > 120 then raise exception 'too many'; end if;
  if coalesce(array_length(new.events, 1), 0) > 50 then raise exception 'too many'; end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.studios where owner = auth.uid()) >= 3 then raise exception 'too many'; end if;
    new.owner := auth.uid(); new.status := 'pending'; new.created_at := now();
  else
    new.owner := old.owner; new.status := old.status; new.created_at := old.created_at;   -- 只有管理員能改狀態 / 負責人
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_studio on public.studios;
create trigger guard_studio before insert or update on public.studios for each row execute function public.guard_studio();

drop policy if exists "studios readable" on public.studios;
create policy "studios readable" on public.studios for select using (status = 'approved' or owner = auth.uid() or public.is_admin());
drop policy if exists "players add studio" on public.studios;
create policy "players add studio" on public.studios for insert with check (auth.uid() is not null);
drop policy if exists "owner edits studio" on public.studios;
create policy "owner edits studio" on public.studios for update using (owner = auth.uid() or public.is_admin());
drop policy if exists "owner deletes studio" on public.studios;
create policy "owner deletes studio" on public.studios for delete using (owner = auth.uid() or public.is_admin());
grant select on public.studios to anon, authenticated;
grant insert, update, delete on public.studios to authenticated;

-- 教室的公告 / 近期課程（workshop）/ 特殊活動
create table if not exists public.studio_posts (
  id bigint generated always as identity primary key,
  studio_id bigint not null references public.studios on delete cascade,
  kind text not null check (kind in ('notice', 'course', 'special')),
  title text not null check (char_length(title) between 1 and 80),
  body text check (char_length(body) <= 2000),
  date date,
  time text check (char_length(time) <= 20),
  teacher text check (char_length(teacher) <= 60),
  styles text[] not null default '{}',
  link text check (char_length(link) <= 300),
  image text check (char_length(image) <= 500),
  created_at timestamptz not null default now()
);
alter table public.studio_posts enable row level security;
create or replace function public.can_manage_studio(sid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.studios where id = sid and owner = auth.uid())
$$;
grant execute on function public.can_manage_studio(bigint) to anon, authenticated;
create or replace function public.guard_studio_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if public.is_spam(new.title || ' ' || coalesce(new.body, '')) then raise exception 'spam'; end if;
    if tg_op = 'INSERT' and (select count(*) from public.studio_posts where studio_id = new.studio_id and created_at > now() - interval '1 day') >= 20 then raise exception 'too many'; end if;
  end if;
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  return new;
end $$;
drop trigger if exists guard_studio_post on public.studio_posts;
create trigger guard_studio_post before insert or update on public.studio_posts for each row execute function public.guard_studio_post();
drop policy if exists "studio posts readable" on public.studio_posts;
create policy "studio posts readable" on public.studio_posts for select using (
  exists (select 1 from public.studios s where s.id = studio_id and s.status = 'approved') or public.can_manage_studio(studio_id));
drop policy if exists "studio managers write posts" on public.studio_posts;
create policy "studio managers write posts" on public.studio_posts for insert with check (public.can_manage_studio(studio_id));
drop policy if exists "studio managers edit posts" on public.studio_posts;
create policy "studio managers edit posts" on public.studio_posts for update using (public.can_manage_studio(studio_id));
drop policy if exists "studio managers delete posts" on public.studio_posts;
create policy "studio managers delete posts" on public.studio_posts for delete using (public.can_manage_studio(studio_id));
grant select on public.studio_posts to anon, authenticated;
grant insert, update, delete on public.studio_posts to authenticated;

-- 管理員：審核教室、把教室綁定（轉交）給某位玩家
create or replace function public.studio_review(sid bigint, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.studios set status = case when ok then 'approved' else 'rejected' end where id = sid;
end $$;
create or replace function public.studio_set_owner(sid bigint, p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select user_id into uid from public.players where handle = lower(p_handle);
  if uid is null then raise exception 'no such player'; end if;
  update public.studios set owner = uid where id = sid;
end $$;
grant execute on function public.studio_review(bigint, boolean), public.studio_set_owner(bigint, text) to authenticated;

-- ---------- 3. 每日一推（管理員可以指定某一天要推的品牌 / 故事 / 文化 / 新聞） ----------
-- 沒有指定的日子，網站會從內建的街舞小知識裡輪流挑一則
create table if not exists public.daily_picks (
  day date primary key,
  kind text not null check (kind in ('brand', 'story', 'culture', 'news')),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) <= 3000),
  link text check (char_length(link) <= 300),
  image text check (char_length(image) <= 500),
  created_at timestamptz not null default now()
);
alter table public.daily_picks enable row level security;
drop policy if exists "daily picks readable" on public.daily_picks;
create policy "daily picks readable" on public.daily_picks for select using (day <= (now() at time zone 'Asia/Taipei')::date or public.is_admin());
drop policy if exists "admins write daily picks" on public.daily_picks;
create policy "admins write daily picks" on public.daily_picks for all using (public.is_admin()) with check (public.is_admin());
grant select on public.daily_picks to anon, authenticated;
grant insert, update, delete on public.daily_picks to authenticated;

-- ---------- 4. 揪練舞組隊 ----------
create table if not exists public.parties (
  id bigint generated always as identity primary key,
  leader uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 2 and 30),
  intro text check (char_length(intro) <= 500),
  styles text[] not null default '{}',
  country text not null default 'TW',
  city text,
  place text check (char_length(place) <= 100),
  lat double precision,
  lon double precision,
  meet_at timestamptz not null,
  max_members int not null default 6 check (max_members between 2 and 30),
  public boolean not null default true,       -- 公開：會推送給附近的玩家；不公開：只能用邀請碼加入
  code text unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.party_members (
  party_id bigint not null references public.parties on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);
alter table public.parties enable row level security;
alter table public.party_members enable row level security;

create or replace function public.in_party(pid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.party_members where party_id = pid and user_id = auth.uid())
$$;
grant execute on function public.in_party(bigint) to anon, authenticated;

create or replace function public.guard_party() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players; c text;
begin
  if tg_op = 'INSERT' then
    select * into p from public.players where user_id = auth.uid();
    if p is null or p.banned then raise exception 'need character'; end if;
    if (select count(*) from public.parties where leader = auth.uid() and meet_at > now() and status = 'open') >= 3 then raise exception 'too many'; end if;
    new.leader := auth.uid(); new.status := 'open'; new.created_at := now();
    loop
      c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when not exists (select 1 from public.parties where code = c);
    end loop;
    new.code := c;
  else
    if coalesce(current_setting('app.party_transfer', true), '') = '1' then return new; end if;   -- 隊長離隊時自動交接
    if not (old.leader = auth.uid() or public.is_admin()) then raise exception 'not allowed'; end if;
    new.leader := old.leader; new.code := old.code; new.created_at := old.created_at;
  end if;
  if (tg_op = 'INSERT' or new.meet_at <> old.meet_at) and (new.meet_at < now() - interval '1 hour' or new.meet_at > now() + interval '90 days') then raise exception 'bad time'; end if;
  if public.is_spam(new.name || ' ' || coalesce(new.intro, '') || ' ' || coalesce(new.place, '')) then raise exception 'spam'; end if;
  return new;
end $$;
drop trigger if exists guard_party on public.parties;
create trigger guard_party before insert or update on public.parties for each row execute function public.guard_party();
-- 開隊的人自動成為隊員
create or replace function public.party_leader_join() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into public.party_members (party_id, user_id) values (new.id, new.leader) on conflict do nothing; return new; end $$;
drop trigger if exists party_leader_join on public.parties;
create trigger party_leader_join after insert on public.parties for each row execute function public.party_leader_join();

drop policy if exists "parties readable" on public.parties;
create policy "parties readable" on public.parties for select using (public or leader = auth.uid() or public.in_party(id) or public.is_admin());
drop policy if exists "players open party" on public.parties;
create policy "players open party" on public.parties for insert with check (auth.uid() is not null);
drop policy if exists "leader edits party" on public.parties;
create policy "leader edits party" on public.parties for update using (leader = auth.uid() or public.is_admin());
drop policy if exists "leader deletes party" on public.parties;
create policy "leader deletes party" on public.parties for delete using (leader = auth.uid() or public.is_admin());
grant select on public.parties to anon, authenticated;
grant insert, update, delete on public.parties to authenticated;

drop policy if exists "party members readable" on public.party_members;
create policy "party members readable" on public.party_members for select using (
  exists (select 1 from public.parties x where x.id = party_id and (x.public or public.in_party(x.id) or public.is_admin())));
grant select on public.party_members to anon, authenticated;

-- 加入（公開隊伍直接加入；不公開的要邀請碼）、離開、踢人
create or replace function public.party_join(pid bigint, p_code text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare x public.parties; p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if pid is null then select * into x from public.parties where code = upper(coalesce(p_code, ''));
  else select * into x from public.parties where id = pid; end if;
  if x is null then raise exception 'no such party'; end if;
  if public.in_party(x.id) then return x.id; end if;
  if not x.public and upper(coalesce(p_code, '')) <> x.code then raise exception 'need code'; end if;
  if x.status <> 'open' or x.meet_at < now() - interval '1 hour' then raise exception 'party closed'; end if;
  if (select count(*) from public.party_members where party_id = x.id) >= x.max_members then raise exception 'party full'; end if;
  if (select count(*) from public.party_members m join public.parties y on y.id = m.party_id where m.user_id = auth.uid() and y.meet_at > now()) >= 8 then raise exception 'too many'; end if;
  insert into public.party_members (party_id, user_id) values (x.id, auth.uid());
  return x.id;
end $$;
create or replace function public.party_leave(pid bigint) returns void
language plpgsql security definer set search_path = public as $$
declare x public.parties; nxt uuid;
begin
  select * into x from public.parties where id = pid;
  if x is null then return; end if;
  delete from public.party_members where party_id = pid and user_id = auth.uid();
  if x.leader = auth.uid() then
    select user_id into nxt from public.party_members where party_id = pid order by joined_at limit 1;
    if nxt is null then delete from public.parties where id = pid;
    else perform set_config('app.party_transfer', '1', true); update public.parties set leader = nxt where id = pid; perform set_config('app.party_transfer', '', true); end if;    -- 隊長離開：交給最早加入的隊員
  end if;
end $$;
create or replace function public.party_kick(pid bigint, uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.parties where id = pid and (leader = auth.uid() or public.is_admin())) then raise exception 'not allowed'; end if;
  if uid = auth.uid() then raise exception 'not allowed'; end if;
  delete from public.party_members where party_id = pid and user_id = uid;
end $$;
grant execute on function public.party_join(bigint, text), public.party_leave(bigint), public.party_kick(bigint, uuid) to authenticated;

-- 聊天頻道：多一個公開的「組隊頻道」(party)，每支隊伍也有隊員專用頻道 (party:<id>)
create or replace function public.can_use_channel(ch text) returns boolean
language sql stable security definer set search_path = public as $$
  select ch in ('world', 'tw', 'party')
    or (ch ~ '^crew:[0-9]+$' and exists (select 1 from public.crew_members where user_id = auth.uid() and crew_id = substring(ch from 6)::bigint))
    or (ch ~ '^party:[0-9]+$' and public.in_party(substring(ch from 7)::bigint))
$$;
grant execute on function public.can_use_channel(text) to anon, authenticated;
