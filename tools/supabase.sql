-- =========================================================
-- 舞島 DANCE ISLAND — Supabase 資料庫設定
-- 用法：Supabase 後台 → SQL Editor → New query → 整段貼上 → Run
-- 可以重複執行（已經存在的東西會略過或更新）
-- =========================================================

-- ---------- 玩家角色 ----------
create table if not exists public.players (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,16}$'),
  name text not null check (char_length(name) between 1 and 20),
  nat text,
  style text,
  job text,
  title text,
  look jsonb,
  created_at timestamptz not null default now()
);
alter table public.players add column if not exists job text;
alter table public.players add column if not exists title text;

-- ---------- 管理員（role：owner = 網站架設者、admin = 管理員） ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin'))
);
alter table public.admins add column if not exists role text not null default 'admin';

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create or replace function public.admin_role(uid uuid) returns text
language sql stable security definer set search_path = public as
$$ select role from public.admins where user_id = uid $$;

-- 稱號 / 造型的管理員專屬檢查
create or replace function public.guard_player() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := public.admin_role(new.user_id);
begin
  if new.title = 'owner' and coalesce(r, '') <> 'owner' then new.title := null; end if;
  if new.title = 'admin' and r is null then new.title := null; end if;
  if r is null and new.look ? 'special' then new.look := new.look - 'special'; end if;
  if r = 'admin' and (new.look->>'special') = 'owner' then new.look := jsonb_set(new.look, '{special}', '"admin"'); end if;
  return new;
end $$;
drop trigger if exists guard_player on public.players;
create trigger guard_player before insert or update on public.players for each row execute function public.guard_player();

-- ---------- 活動 ----------
create table if not exists public.events (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users on delete set null
);

-- ---------- 聊天室 ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  channel text not null check (channel in ('world', 'tw')),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  author jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_channel_time on public.messages (channel, created_at desc);

-- ---------- 活動留言板 ----------
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  event_id text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  author jsonb,
  created_at timestamptz not null default now()
);
create index if not exists comments_event on public.comments (event_id, created_at);

-- ---------- 官方快訊 & 網站設定 ----------
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  text text not null check (char_length(text) between 1 and 200),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.settings (
  key text primary key,
  value jsonb
);
insert into public.settings (key, value) values ('announce_every', '60') on conflict (key) do nothing;

-- ---------- 防機器人 / 廣告：發言前自動檢查 ----------
create or replace function public.guard_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players; last_at timestamptz; t text := lower(new.text);
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null then raise exception 'need character'; end if;
  new.user_id := auth.uid();
  -- 管理員不受限制
  if not public.is_admin() then
    -- 連結、聯絡方式、常見廣告字
    if t ~ '(https?://|www\.|\.com|\.net|\.cc|\.xyz|t\.me|line\.me|bit\.ly)' then raise exception 'links not allowed'; end if;
    if t ~ '(加賴|加line|加微信|wechat|whatsapp|telegram|代購|代儲|賺錢|兼職|日賺|月入|投資|博弈|娛樂城|貸款|色情|約炮|casino|crypto|bitcoin|forex|investment|earn money|onlyfans)' then raise exception 'spam'; end if;
    -- 同一個字連打 12 次以上
    if t ~ '(.)\1{11,}' then raise exception 'spam'; end if;
    -- 發言間隔至少 3 秒、同樣的話 1 分鐘內不能重複
    if tg_table_name = 'messages' then
      select max(created_at) into last_at from public.messages where user_id = auth.uid();
      if last_at is not null and last_at > now() - interval '3 seconds' then raise exception 'too fast'; end if;
      if exists (select 1 from public.messages where user_id = auth.uid() and text = new.text and created_at > now() - interval '1 minute') then raise exception 'duplicate'; end if;
    else
      select max(created_at) into last_at from public.comments where user_id = auth.uid();
      if last_at is not null and last_at > now() - interval '10 seconds' then raise exception 'too fast'; end if;
    end if;
  end if;
  -- 名字 / 稱號 / 外觀由伺服器填入，不能偽造
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'job', p.job, 'nat', p.nat, 'look', p.look,
                                   'role', public.admin_role(auth.uid()));
  new.created_at := now();
  return new;
end $$;
drop trigger if exists guard_message on public.messages;
create trigger guard_message before insert on public.messages for each row execute function public.guard_post();
drop trigger if exists guard_comment on public.comments;
create trigger guard_comment before insert on public.comments for each row execute function public.guard_post();

-- ---------- 權限規則（RLS） ----------
alter table public.players       enable row level security;
alter table public.admins        enable row level security;
alter table public.events        enable row level security;
alter table public.messages      enable row level security;
alter table public.comments      enable row level security;
alter table public.announcements enable row level security;
alter table public.settings      enable row level security;

drop policy if exists "players readable" on public.players;
create policy "players readable" on public.players for select using (true);
drop policy if exists "create own player" on public.players;
create policy "create own player" on public.players for insert with check (user_id = auth.uid());
drop policy if exists "update own player" on public.players;
create policy "update own player" on public.players for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "see own admin row" on public.admins;
drop policy if exists "admins readable" on public.admins;
create policy "admins readable" on public.admins for select using (true);

drop policy if exists "events readable by everyone" on public.events;
create policy "events readable by everyone" on public.events for select using (true);
drop policy if exists "admins write events" on public.events;
create policy "admins write events" on public.events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "messages readable" on public.messages;
create policy "messages readable" on public.messages for select using (true);
drop policy if exists "players post messages" on public.messages;
create policy "players post messages" on public.messages for insert with check (auth.uid() is not null);
drop policy if exists "delete messages" on public.messages;
create policy "delete messages" on public.messages for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select using (true);
drop policy if exists "players post comments" on public.comments;
create policy "players post comments" on public.comments for insert with check (auth.uid() is not null);
drop policy if exists "delete comments" on public.comments;
create policy "delete comments" on public.comments for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements for select using (true);
drop policy if exists "admins write announcements" on public.announcements;
create policy "admins write announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings readable" on public.settings;
create policy "settings readable" on public.settings for select using (true);
drop policy if exists "admins write settings" on public.settings;
create policy "admins write settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.players, public.admins, public.events, public.messages, public.comments, public.announcements, public.settings to anon, authenticated;
grant insert, update on public.players to authenticated;
grant insert, update, delete on public.events, public.announcements, public.settings to authenticated;
grant insert, delete on public.messages, public.comments to authenticated;
grant execute on function public.is_admin(), public.admin_role(uuid) to anon, authenticated;

-- ---------- 即時更新（聊天室 / 留言板） ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'comments') then
    alter publication supabase_realtime add table public.comments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'announcements') then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;

-- =========================================================
-- 設定管理員：先在網站上「建立角色」，再把下面的角色 ID 換掉，單獨執行：
--   網站架設者：insert into public.admins (user_id, role) select user_id, 'owner' from public.players where handle = '你的角色ID' on conflict (user_id) do update set role = 'owner';
--   管理員：    insert into public.admins (user_id, role) select user_id, 'admin' from public.players where handle = 'choco的角色ID' on conflict (user_id) do update set role = 'admin';
-- =========================================================


-- =========================================================
-- 舞島 — 實名認證 / 檢舉 / 停權（第二包設定）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run
-- 可以重複執行
-- =========================================================

-- 玩家多幾個欄位
alter table public.players add column if not exists verified boolean not null default false;
alter table public.players add column if not exists ig text;
alter table public.players add column if not exists verified_key text;
alter table public.players add column if not exists banned boolean not null default false;
create unique index if not exists players_verified_key on public.players (verified_key) where verified_key is not null;

-- 名字正規化：小寫、去掉空白和符號（「Bboy.Ming」「bboy ming」都算同一個）
create or replace function public.name_key(n text) returns text
language sql immutable as $$ select regexp_replace(lower(coalesce(n, '')), '[^[:alnum:]]', '', 'g') $$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid() and role = 'owner') $$;

-- 玩家資料保護：一般玩家不能自己改「已認證 / IG / 停權」，也不能取別人認證過的名字
create or replace function public.guard_player() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := public.admin_role(new.user_id);
begin
  if not public.is_owner() then
    if tg_op = 'INSERT' then
      new.verified := false; new.ig := null; new.verified_key := null; new.banned := false;
    else
      new.verified := old.verified; new.ig := old.ig; new.verified_key := old.verified_key; new.banned := old.banned;
      if old.verified then new.name := old.name; end if;                 -- 認證後名字鎖定
    end if;
  end if;
  if exists (select 1 from public.players p where p.verified_key = public.name_key(new.name) and p.user_id <> new.user_id) then
    raise exception 'name reserved';
  end if;
  if new.title = 'owner' and coalesce(r, '') <> 'owner' then new.title := null; end if;
  if new.title = 'admin' and r is null then new.title := null; end if;
  if new.title = 'verified' and not new.verified then new.title := null; end if;
  if r is null and new.look ? 'special' then new.look := new.look - 'special'; end if;
  if r = 'admin' and (new.look->>'special') = 'owner' then new.look := jsonb_set(new.look, '{special}', '"admin"'); end if;
  return new;
end $$;
drop trigger if exists guard_player on public.players;
create trigger guard_player before insert or update on public.players for each row execute function public.guard_player();

-- 網站架設者可以修改任何玩家（強制改名、停權）
drop policy if exists "owner updates players" on public.players;
create policy "owner updates players" on public.players for update using (public.is_owner()) with check (public.is_owner());

-- ---------- 認證申請 ----------
create table if not exists public.verifications (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  dancer_name text not null check (char_length(dancer_name) between 1 and 20),
  ig text not null check (ig ~ '^[A-Za-z0-9._]{1,30}$'),
  code text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.verifications enable row level security;
drop policy if exists "see own or owner" on public.verifications;
create policy "see own or owner" on public.verifications for select using (user_id = auth.uid() or public.is_owner());
drop policy if exists "request own" on public.verifications;
create policy "request own" on public.verifications for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "owner reviews" on public.verifications;
create policy "owner reviews" on public.verifications for update using (public.is_owner()) with check (public.is_owner());

-- 審核：通過時把名字、IG、勾勾寫進玩家資料
create or replace function public.review_verification(vid bigint, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v public.verifications;
begin
  if not public.is_owner() then raise exception 'owner only'; end if;
  select * into v from public.verifications where id = vid;
  if v is null then raise exception 'not found'; end if;
  update public.verifications set status = case when approve then 'approved' else 'rejected' end, reviewed_at = now() where id = vid;
  if approve then
    -- 先把其他人身上同名的保護拿掉（理論上不會有）
    update public.players set verified_key = null where verified_key = public.name_key(v.dancer_name) and user_id <> v.user_id;
    update public.players set verified = true, ig = v.ig, name = v.dancer_name, verified_key = public.name_key(v.dancer_name), title = coalesce(title, 'verified')
      where user_id = v.user_id;
  end if;
end $$;
grant execute on function public.review_verification(bigint, boolean) to authenticated;
grant execute on function public.name_key(text), public.is_owner() to anon, authenticated;

-- ---------- 檢舉 ----------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users on delete cascade,
  target_handle text not null,
  reason text check (char_length(reason) <= 200),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "report" on public.reports;
create policy "report" on public.reports for insert with check (reporter = auth.uid());
drop policy if exists "admins read reports" on public.reports;
create policy "admins read reports" on public.reports for select using (public.is_admin());
drop policy if exists "admins close reports" on public.reports;
create policy "admins close reports" on public.reports for update using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.verifications, public.reports to authenticated;
grant update on public.verifications, public.reports to authenticated;

-- ---------- 發言：停權的人不能說話；作者資料加上認證資訊 ----------
create or replace function public.guard_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players; last_at timestamptz; t text := lower(new.text);
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null then raise exception 'need character'; end if;
  if p.banned then raise exception 'banned'; end if;
  new.user_id := auth.uid();
  if not public.is_admin() then
    if t ~ '(https?://|www\.|\.com|\.net|\.cc|\.xyz|t\.me|line\.me|bit\.ly)' then raise exception 'links not allowed'; end if;
    if t ~ '(加賴|加line|加微信|wechat|whatsapp|telegram|代購|代儲|賺錢|兼職|日賺|月入|投資|博弈|娛樂城|貸款|色情|約炮|casino|crypto|bitcoin|forex|investment|earn money|onlyfans)' then raise exception 'spam'; end if;
    if t ~ '(.)\1{11,}' then raise exception 'spam'; end if;
    if tg_table_name = 'messages' then
      select max(created_at) into last_at from public.messages where user_id = auth.uid();
      if last_at is not null and last_at > now() - interval '3 seconds' then raise exception 'too fast'; end if;
      if exists (select 1 from public.messages where user_id = auth.uid() and text = new.text and created_at > now() - interval '1 minute') then raise exception 'duplicate'; end if;
    else
      select max(created_at) into last_at from public.comments where user_id = auth.uid();
      if last_at is not null and last_at > now() - interval '10 seconds' then raise exception 'too fast'; end if;
    end if;
  end if;
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'job', p.job, 'nat', p.nat, 'look', p.look,
                                   'role', public.admin_role(auth.uid()), 'verified', p.verified, 'ig', p.ig);
  new.created_at := now();
  return new;
end $$;


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


-- =========================================================
-- 舞島 — 第三批：人氣 Battle 投票、節奏遊戲排行榜、NPC 對戰獎勵
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 人氣 Battle ----------
create table if not exists public.battles (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  a_name text not null, a_url text,
  b_name text not null, b_url text,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.votes (
  battle_id bigint not null references public.battles on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  choice text not null check (choice in ('a', 'b')),
  created_at timestamptz not null default now(),
  primary key (battle_id, user_id)
);
alter table public.battles enable row level security;
alter table public.votes enable row level security;
drop policy if exists "battles readable" on public.battles;
create policy "battles readable" on public.battles for select using (true);
drop policy if exists "admins manage battles" on public.battles;
create policy "admins manage battles" on public.battles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "votes readable" on public.votes;
create policy "votes readable" on public.votes for select using (true);
drop policy if exists "vote once" on public.votes;
create policy "vote once" on public.votes for insert with check (
  user_id = auth.uid() and exists (select 1 from public.battles b where b.id = battle_id and b.ends_at > now())
  and exists (select 1 from public.players p where p.user_id = auth.uid() and not p.banned));

-- ---------- 節奏遊戲分數 ----------
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  game text not null default 'rhythm',
  score int not null check (score between 0 and 6400),
  author jsonb,
  created_at timestamptz not null default now()
);
alter table public.scores enable row level security;
drop policy if exists "scores readable" on public.scores;
create policy "scores readable" on public.scores for select using (true);
drop policy if exists "post own score" on public.scores;
create policy "post own score" on public.scores for insert with check (user_id = auth.uid());
create or replace function public.guard_score() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  -- 一局 30 秒，兩次上傳至少隔 25 秒
  if exists (select 1 from public.scores where user_id = auth.uid() and created_at > now() - interval '25 seconds') then raise exception 'too fast'; end if;
  new.user_id := auth.uid();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'look', p.look, 'verified', p.verified);
  return new;
end $$;
drop trigger if exists guard_score on public.scores;
create trigger guard_score before insert on public.scores for each row execute function public.guard_score();

-- ---------- NPC 對戰：贏 5 次拿稱號 ----------
create table if not exists public.npc_wins (
  user_id uuid primary key references auth.users on delete cascade,
  wins int not null default 0,
  last_at timestamptz
);
alter table public.npc_wins enable row level security;
drop policy if exists "own npc" on public.npc_wins;
create policy "own npc" on public.npc_wins for select using (user_id = auth.uid());
create or replace function public.npc_win() returns jsonb
language plpgsql security definer set search_path = public as $$
declare w int; last timestamptz;
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid()) then raise exception 'need character'; end if;
  select wins, last_at into w, last from public.npc_wins where user_id = auth.uid();
  if last is not null and last > now() - interval '20 seconds' then raise exception 'too fast'; end if;
  insert into public.npc_wins (user_id, wins, last_at) values (auth.uid(), 1, now())
    on conflict (user_id) do update set wins = public.npc_wins.wins + 1, last_at = now()
    returning wins into w;
  if w >= 5 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcslayer') on conflict do nothing; end if;
  if w >= 30 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcboss') on conflict do nothing; end if;
  return jsonb_build_object('wins', w);
end $$;
grant execute on function public.npc_win() to authenticated;

-- ---------- 經驗值加上：投票 3、節奏遊戲（最高分 / 100）、NPC 勝場 10（最多 30 場） ----------
create or replace function public.player_stats(uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'checkins', (select count(*) from public.checkins where user_id = uid),
    'comments', (select count(*) from public.comments where user_id = uid),
    'messages', (select count(*) from public.messages where user_id = uid),
    'days', (select count(*) from public.daily where user_id = uid),
    'favorites', (select count(*) from public.favorites where user_id = uid),
    'approved', (select count(*) from public.submissions where user_id = uid and status = 'approved'),
    'votes', (select count(*) from public.votes where user_id = uid),
    'best', (select coalesce(max(score), 0) from public.scores where user_id = uid),
    'npc', (select coalesce(max(wins), 0) from public.npc_wins where user_id = uid),
    'xp',
      (select count(*) from public.checkins where user_id = uid) * 50
    + (select count(*) from public.daily where user_id = uid) * 20
    + (select coalesce(sum(case reward when 'xp20' then 20 when 'xp50' then 50 when 'xp100' then 100 else 0 end), 0) from public.daily where user_id = uid)
    + (select count(*) from public.comments where user_id = uid) * 5
    + least((select count(*) from public.messages where user_id = uid), 300)
    + (select count(*) from public.favorites where user_id = uid) * 2
    + (select count(*) from public.submissions where user_id = uid and status = 'approved') * 80
    + (select count(*) from public.votes where user_id = uid) * 3
    + (select coalesce(max(score), 0) from public.scores where user_id = uid) / 100
    + least((select coalesce(max(wins), 0) from public.npc_wins where user_id = uid), 30) * 10
  )
$$;

grant select on public.battles, public.votes, public.scores to anon, authenticated;
grant insert, update, delete on public.battles to authenticated;
grant insert on public.votes, public.scores to authenticated;
grant select on public.npc_wins to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'votes') then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;


-- =========================================================
-- choco（bboychoco）：設成管理員 + 換上「Choco 本人」造型
-- 也更新規則：Kailyn 本人只有網站架設者能用、Choco 本人只有 bboychoco 能用
-- =========================================================
create or replace function public.guard_player() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := public.admin_role(new.user_id);
begin
  if not public.is_owner() then
    if tg_op = 'INSERT' then
      new.verified := false; new.ig := null; new.verified_key := null; new.banned := false;
    else
      new.verified := old.verified; new.ig := old.ig; new.verified_key := old.verified_key; new.banned := old.banned;
      if old.verified then new.name := old.name; end if;
    end if;
  end if;
  if exists (select 1 from public.players p where p.verified_key = public.name_key(new.name) and p.user_id <> new.user_id) then
    raise exception 'name reserved';
  end if;
  if new.title = 'owner' and coalesce(r, '') <> 'owner' then new.title := null; end if;
  if new.title = 'admin' and r is null then new.title := null; end if;
  if new.title = 'verified' and not new.verified then new.title := null; end if;
  -- 本人造型
  if (new.look->>'special') = 'kailyn' and coalesce(r, '') <> 'owner' then new.look := new.look - 'special'; end if;
  if (new.look->>'special') = 'choco' and new.handle <> 'bboychoco' then new.look := new.look - 'special'; end if;
  -- 管理員造型
  if r is null and (new.look->>'special') in ('admin', 'owner') then new.look := new.look - 'special'; end if;
  if r = 'admin' and (new.look->>'special') = 'owner' then new.look := jsonb_set(new.look, '{special}', '"admin"'); end if;
  return new;
end $$;

insert into public.admins (user_id, role)
  select user_id, 'admin' from public.players where handle = 'bboychoco'
  on conflict (user_id) do update set role = 'admin';
update public.players set look = coalesce(look, '{}'::jsonb) || '{"special": "choco"}'::jsonb where handle = 'bboychoco';

-- 確認：應該看到 bboychoco、admin、choco
select p.handle, a.role, p.look->>'special' as skin from public.players p join public.admins a on a.user_id = p.user_id where p.handle = 'bboychoco';


-- =========================================================
-- 舞島 — 第四批：名片、好友、私訊、封鎖
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 自訂名片（存在玩家資料裡） ----------
alter table public.players add column if not exists card jsonb;
create or replace function public.guard_card() returns trigger
language plpgsql security definer set search_path = public as $$
declare bio text;
begin
  if new.card is not null then
    bio := coalesce(new.card->>'bio', '');
    if char_length(bio) > 80 then new.card := jsonb_set(new.card, '{bio}', to_jsonb(left(bio, 80))); end if;
    if char_length(coalesce(new.card->>'crew', '')) > 24 then new.card := jsonb_set(new.card, '{crew}', to_jsonb(left(new.card->>'crew', 24))); end if;
    -- 名片上不能放連結和廣告
    if lower(coalesce(new.card->>'bio', '') || ' ' || coalesce(new.card->>'crew', '')) ~ '(https?://|www\.|\.com|line\.me|t\.me|加賴|加line|wechat|賺錢|投資|博弈)' then
      new.card := new.card - 'bio' - 'crew';
    end if;
    if new.card ? 'ig' and coalesce(new.card->>'ig', '') !~ '^[A-Za-z0-9._]{0,30}$' then new.card := new.card - 'ig'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_card on public.players;
create trigger guard_card before insert or update on public.players for each row execute function public.guard_card();

-- ---------- 好友邀請 / 好友 ----------
create table if not exists public.friend_requests (
  id bigint generated always as identity primary key,
  from_user uuid not null default auth.uid() references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user, to_user),
  check (from_user <> to_user)
);
alter table public.friend_requests enable row level security;
drop policy if exists "see my requests" on public.friend_requests;
create policy "see my requests" on public.friend_requests for select using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists "send request" on public.friend_requests;
create policy "send request" on public.friend_requests for insert with check (from_user = auth.uid() and status = 'pending');
drop policy if exists "answer request" on public.friend_requests;
create policy "answer request" on public.friend_requests for update using (to_user = auth.uid()) with check (to_user = auth.uid());
drop policy if exists "remove friend" on public.friend_requests;
create policy "remove friend" on public.friend_requests for delete using (from_user = auth.uid() or to_user = auth.uid());

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.friend_requests where status = 'accepted' and ((from_user = a and to_user = b) or (from_user = b and to_user = a))) $$;

-- ---------- 封鎖 ----------
create table if not exists public.blocks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked)
);
alter table public.blocks enable row level security;
drop policy if exists "own blocks" on public.blocks;
create policy "own blocks" on public.blocks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 送邀請前檢查：被封鎖不能送、一天最多 30 個、反方向已經有邀請就直接成為好友
create or replace function public.guard_friend_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.blocks where user_id = new.to_user and blocked = auth.uid()) then raise exception 'blocked'; end if;
  if (select count(*) from public.friend_requests where from_user = auth.uid() and created_at > now() - interval '1 day') >= 30 then raise exception 'too many'; end if;
  if exists (select 1 from public.friend_requests where from_user = new.to_user and to_user = auth.uid() and status = 'pending') then
    update public.friend_requests set status = 'accepted', responded_at = now() where from_user = new.to_user and to_user = auth.uid();
    return null;
  end if;
  return new;
end $$;
drop trigger if exists guard_friend_request on public.friend_requests;
create trigger guard_friend_request before insert on public.friend_requests for each row execute function public.guard_friend_request();

-- ---------- 私訊（只有好友之間） ----------
create table if not exists public.dms (
  id bigint generated always as identity primary key,
  from_user uuid not null default auth.uid() references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists dms_pair on public.dms (from_user, to_user, created_at desc);
alter table public.dms enable row level security;
drop policy if exists "see my dms" on public.dms;
create policy "see my dms" on public.dms for select using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists "send dm" on public.dms;
create policy "send dm" on public.dms for insert with check (from_user = auth.uid());
drop policy if exists "mark read" on public.dms;
create policy "mark read" on public.dms for update using (to_user = auth.uid()) with check (to_user = auth.uid());
create or replace function public.guard_dm() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text := lower(new.text);
begin
  new.from_user := auth.uid(); new.created_at := now(); new.read_at := null;
  if not public.are_friends(auth.uid(), new.to_user) then raise exception 'not friends'; end if;
  if exists (select 1 from public.blocks where (user_id = new.to_user and blocked = auth.uid()) or (user_id = auth.uid() and blocked = new.to_user)) then raise exception 'blocked'; end if;
  if exists (select 1 from public.players where user_id = auth.uid() and banned) then raise exception 'banned'; end if;
  if exists (select 1 from public.dms where from_user = auth.uid() and created_at > now() - interval '1 second') then raise exception 'too fast'; end if;
  if t ~ '(加賴|加line|wechat|代購|賺錢|兼職|日賺|投資|博弈|娛樂城|貸款|casino|crypto|forex|onlyfans)' then raise exception 'spam'; end if;
  return new;
end $$;
drop trigger if exists guard_dm on public.dms;
create trigger guard_dm before insert on public.dms for each row execute function public.guard_dm();

grant select, insert, update, delete on public.friend_requests to authenticated;
grant select, insert, update on public.dms to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'dms') then alter publication supabase_realtime add table public.dms; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'friend_requests') then alter publication supabase_realtime add table public.friend_requests; end if;
end $$;
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
-- =========================================================
-- 舞島 — 第五批：論壇（發文要審核）、討論串回覆、按讚、Battle 置頂問題、MP4 影片上傳
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- 共用：擋廣告字眼
create or replace function public.is_spam(t text) returns boolean
language sql immutable as $$
  select lower(coalesce(t, '')) ~ '(加賴|加line|line\.me|wechat|微信|代購|賺錢|兼職|日賺|投資|博弈|娛樂城|貸款|casino|crypto|forex|onlyfans|t\.me/)'
$$;

-- ---------- 論壇主題（玩家發文 → 管理員審核後才公開） ----------
create table if not exists public.forum_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author jsonb,
  category text not null default 'chat' check (category in ('chat', 'crew', 'skill', 'event', 'music', 'other')),
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists forum_posts_list on public.forum_posts (status, pinned desc, created_at desc);
alter table public.forum_posts enable row level security;
drop policy if exists "see approved or own" on public.forum_posts;
create policy "see approved or own" on public.forum_posts for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "post own" on public.forum_posts;
create policy "post own" on public.forum_posts for insert with check (user_id = auth.uid() and status = 'pending' and not pinned);
drop policy if exists "admin review posts" on public.forum_posts;
create policy "admin review posts" on public.forum_posts for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "delete own or admin" on public.forum_posts;
create policy "delete own or admin" on public.forum_posts for delete using (user_id = auth.uid() or public.is_admin());

create or replace function public.guard_forum_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if (select count(*) from public.forum_posts where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many'; end if;
  if public.is_spam(new.title || ' ' || new.body) then raise exception 'spam'; end if;
  new.user_id := auth.uid(); new.status := 'pending'; new.pinned := false; new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'look', p.look, 'verified', p.verified);
  return new;
end $$;
drop trigger if exists guard_forum_post on public.forum_posts;
create trigger guard_forum_post before insert on public.forum_posts for each row execute function public.guard_forum_post();

-- ---------- 討論串回覆（論壇主題 p:<id>、Battle b:<id>），可以回覆別人的留言 ----------
create table if not exists public.replies (
  id bigint generated always as identity primary key,
  thread text not null check (thread ~ '^[pb]:[0-9]+$'),
  parent_id bigint references public.replies on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author jsonb,
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists replies_thread on public.replies (thread, created_at);
alter table public.replies enable row level security;
drop policy if exists "replies readable" on public.replies;
create policy "replies readable" on public.replies for select using (
  thread like 'b:%' or exists (select 1 from public.forum_posts f where 'p:' || f.id = thread and (f.status = 'approved' or f.user_id = auth.uid() or public.is_admin())));
drop policy if exists "reply own" on public.replies;
create policy "reply own" on public.replies for insert with check (user_id = auth.uid());
drop policy if exists "delete reply own or admin" on public.replies;
create policy "delete reply own or admin" on public.replies for delete using (user_id = auth.uid() or public.is_admin());

create or replace function public.guard_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if new.thread like 'p:%' and not exists (select 1 from public.forum_posts where 'p:' || id = new.thread and status = 'approved') then raise exception 'not approved'; end if;
  if new.thread like 'b:%' and not exists (select 1 from public.battles where 'b:' || id = new.thread) then raise exception 'no battle'; end if;
  if new.parent_id is not null and not exists (select 1 from public.replies where id = new.parent_id and thread = new.thread) then raise exception 'bad parent'; end if;
  if exists (select 1 from public.replies where user_id = auth.uid() and created_at > now() - interval '5 seconds') then raise exception 'too fast'; end if;
  if public.is_spam(new.text) then raise exception 'spam'; end if;
  new.user_id := auth.uid(); new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'look', p.look, 'verified', p.verified);
  return new;
end $$;
drop trigger if exists guard_reply on public.replies;
create trigger guard_reply before insert on public.replies for each row execute function public.guard_reply();

-- ---------- 按讚（主題 p:<id>、回覆 r:<id>） ----------
create table if not exists public.likes (
  target text not null check (target ~ '^[pr]:[0-9]+$'),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (target, user_id)
);
alter table public.likes enable row level security;
drop policy if exists "likes readable" on public.likes;
create policy "likes readable" on public.likes for select using (true);
drop policy if exists "like own" on public.likes;
create policy "like own" on public.likes for insert with check (user_id = auth.uid());
drop policy if exists "unlike own" on public.likes;
create policy "unlike own" on public.likes for delete using (user_id = auth.uid());

-- ---------- Battle：管理員置頂問題、上傳的 MP4 ----------
alter table public.battles add column if not exists pinned_q text check (char_length(pinned_q) <= 200);

-- 影片儲存空間：公開觀看，只有管理員能上傳 / 刪除，單檔 50MB，只收 MP4
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['video/mp4'];
drop policy if exists "videos public read" on storage.objects;
create policy "videos public read" on storage.objects for select using (bucket_id = 'videos');
drop policy if exists "admins upload videos" on storage.objects;
create policy "admins upload videos" on storage.objects for insert with check (bucket_id = 'videos' and public.is_admin());
drop policy if exists "admins delete videos" on storage.objects;
create policy "admins delete videos" on storage.objects for delete using (bucket_id = 'videos' and public.is_admin());

grant select, insert, update, delete on public.forum_posts, public.replies to authenticated;
grant select on public.forum_posts, public.replies, public.likes to anon;
grant select, insert, delete on public.likes to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'replies') then alter publication supabase_realtime add table public.replies; end if;
end $$;
-- =========================================================
-- 舞島 — 第六批：上線時間、私訊傳圖片、贊助商廣告
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 最後上線時間（好友列表顯示「3 小時前上線」） ----------
alter table public.players add column if not exists last_seen timestamptz;
create or replace function public.touch_seen() returns void
language sql security definer set search_path = public as
$$ update public.players set last_seen = now() where user_id = auth.uid() $$;
grant execute on function public.touch_seen() to authenticated;

-- ---------- 私訊圖片：只有傳送者和接收者看得到；只能傳給好友；單張 5MB ----------
-- 檔案路徑：<傳送者 id>/<接收者 id>/<檔名>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dm-images', 'dm-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
drop policy if exists "dm images read" on storage.objects;
create policy "dm images read" on storage.objects for select using (
  bucket_id = 'dm-images' and (auth.uid()::text = (storage.foldername(name))[1] or auth.uid()::text = (storage.foldername(name))[2]));
drop policy if exists "dm images upload" on storage.objects;
create policy "dm images upload" on storage.objects for insert with check (
  bucket_id = 'dm-images' and auth.uid()::text = (storage.foldername(name))[1]
  and public.are_friends(auth.uid(), ((storage.foldername(name))[2])::uuid)
  and not exists (select 1 from public.blocks b where b.user_id = ((storage.foldername(name))[2])::uuid and b.blocked = auth.uid()));
drop policy if exists "dm images delete own" on storage.objects;
create policy "dm images delete own" on storage.objects for delete using (bucket_id = 'dm-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ---------- 贊助商廣告（彈窗 / 橫幅 / 圖片輪播） ----------
create table if not exists public.sponsors (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'banner' check (kind in ('popup', 'banner', 'broadcast')),
  image_url text,
  link text check (link is null or link ~ '^https://'),
  text text check (char_length(text) <= 200),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  weight int not null default 1 check (weight between 1 and 10),
  created_at timestamptz not null default now()
);
alter table public.sponsors enable row level security;
drop policy if exists "sponsors readable" on public.sponsors;
create policy "sponsors readable" on public.sponsors for select using (true);
drop policy if exists "admins manage sponsors" on public.sponsors;
create policy "admins manage sponsors" on public.sponsors for all using (public.is_admin()) with check (public.is_admin());

-- 曝光 / 點擊次數（只有管理員看得到）
create table if not exists public.sponsor_stats (
  sponsor_id bigint not null references public.sponsors on delete cascade,
  day date not null default (now() at time zone 'Asia/Taipei')::date,
  kind text not null check (kind in ('imp', 'click')),
  n bigint not null default 0,
  primary key (sponsor_id, day, kind)
);
alter table public.sponsor_stats enable row level security;
drop policy if exists "admins read sponsor stats" on public.sponsor_stats;
create policy "admins read sponsor stats" on public.sponsor_stats for select using (public.is_admin());
create or replace function public.bump_sponsor(sid bigint, k text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if k not in ('imp', 'click') or not exists (select 1 from public.sponsors where id = sid) then return; end if;
  insert into public.sponsor_stats (sponsor_id, kind, n) values (sid, k, 1)
    on conflict (sponsor_id, day, kind) do update set n = public.sponsor_stats.n + 1;
end $$;
grant execute on function public.bump_sponsor(bigint, text) to anon, authenticated;

-- 廣告圖片：公開觀看，只有管理員上傳
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsors', 'sponsors', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 3145728;
drop policy if exists "sponsor images read" on storage.objects;
create policy "sponsor images read" on storage.objects for select using (bucket_id = 'sponsors');
drop policy if exists "admins upload sponsor images" on storage.objects;
create policy "admins upload sponsor images" on storage.objects for insert with check (bucket_id = 'sponsors' and public.is_admin());
drop policy if exists "admins delete sponsor images" on storage.objects;
create policy "admins delete sponsor images" on storage.objects for delete using (bucket_id = 'sponsors' and public.is_admin());

grant select on public.sponsors to anon, authenticated;
grant insert, update, delete on public.sponsors to authenticated;
grant select on public.sponsor_stats to authenticated;
-- =========================================================
-- 舞島 — 第七批：公告欄（可放圖片）、舞團（公會）系統、舞團頻道
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 公告欄 ----------
create table if not exists public.notices (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  body text check (char_length(body) <= 3000),
  image_url text check (image_url is null or image_url ~ '^https://'),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notices enable row level security;
drop policy if exists "notices readable" on public.notices;
create policy "notices readable" on public.notices for select using (true);
drop policy if exists "admins manage notices" on public.notices;
create policy "admins manage notices" on public.notices for all using (public.is_admin()) with check (public.is_admin());
grant select on public.notices to anon, authenticated;
grant insert, update, delete on public.notices to authenticated;

-- 圖片空間：公告圖（管理員上傳）、舞團 LOGO（玩家上傳到自己的資料夾）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media upload" on storage.objects;
create policy "media upload" on storage.objects for insert with check (
  bucket_id = 'media' and (
    ((storage.foldername(name))[1] = 'notice' and public.is_admin())
    or ((storage.foldername(name))[1] = 'crew' and (storage.foldername(name))[2] = auth.uid()::text)));
drop policy if exists "media delete" on storage.objects;
create policy "media delete" on storage.objects for delete using (bucket_id = 'media' and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text));

-- ---------- 舞團 ----------
create table if not exists public.crews (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 2 and 24),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  ig text check (ig ~ '^[A-Za-z0-9._]{1,30}$'),
  intro text check (char_length(intro) <= 300),
  code text,                                   -- 實名認證：放在 IG 自介裡的驗證碼
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  leader uuid not null references auth.users on delete cascade,
  style jsonb not null default '{"bg":"#f4d77a","fg":"#3b2b2b","bd":"#3b2b2b"}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create table if not exists public.crew_labels (
  id bigint generated always as identity primary key,
  crew_id bigint not null references public.crews on delete cascade,
  name text not null check (char_length(name) between 1 and 12),
  unique (crew_id, name)
);
create table if not exists public.crew_members (
  user_id uuid primary key references auth.users on delete cascade,   -- 一個人只能在一個舞團
  crew_id bigint not null references public.crews on delete cascade,
  rank text not null default 'member' check (rank in ('leader', 'vice', 'member')),
  label_id bigint references public.crew_labels on delete set null,
  joined_at timestamptz not null default now()
);
create table if not exists public.crew_requests (
  id bigint generated always as identity primary key,
  crew_id bigint not null references public.crews on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (crew_id, user_id)
);
alter table public.crews enable row level security;
alter table public.crew_labels enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_requests enable row level security;
drop policy if exists "crews readable" on public.crews;
create policy "crews readable" on public.crews for select using (status = 'approved' or leader = auth.uid() or public.is_admin());
drop policy if exists "crew labels readable" on public.crew_labels;
create policy "crew labels readable" on public.crew_labels for select using (true);
drop policy if exists "crew members readable" on public.crew_members;
create policy "crew members readable" on public.crew_members for select using (true);
drop policy if exists "crew requests visible" on public.crew_requests;
create policy "crew requests visible" on public.crew_requests for select using (
  user_id = auth.uid() or exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = crew_requests.crew_id and m.rank in ('leader', 'vice')));
-- 所有寫入都透過下面的函式（會檢查身分），不能直接改資料表
grant select on public.crews, public.crew_labels, public.crew_members to anon, authenticated;
grant select on public.crew_requests to authenticated;

create or replace function public.my_crew_rank(cid bigint) returns text
language sql stable security definer set search_path = public as
$$ select rank from public.crew_members where user_id = auth.uid() and crew_id = cid $$;

-- 申請成立舞團（等管理員審核）
create or replace function public.crew_apply(p_name text, p_ig text, p_logo text, p_intro text, p_code text) returns bigint
language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  if exists (select 1 from public.crew_members where user_id = auth.uid()) then raise exception 'already in crew'; end if;
  if exists (select 1 from public.crews where leader = auth.uid() and status = 'pending') then raise exception 'already applied'; end if;
  if public.is_spam(p_name || ' ' || coalesce(p_intro, '')) then raise exception 'spam'; end if;
  delete from public.crews where leader = auth.uid() and status = 'rejected';
  insert into public.crews (name, ig, logo_url, intro, code, leader) values (trim(p_name), nullif(p_ig, ''), nullif(p_logo, ''), nullif(p_intro, ''), p_code, auth.uid()) returning id into cid;
  return cid;
end $$;

-- 管理員審核：通過 → 申請人成為團長，舞團 + 團長都算實名認證
create or replace function public.crew_review(cid bigint, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c public.crews;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into c from public.crews where id = cid;
  if c is null then raise exception 'not found'; end if;
  update public.crews set status = case when approve then 'approved' else 'rejected' end, reviewed_at = now() where id = cid;
  if approve then
    insert into public.crew_members (user_id, crew_id, rank) values (c.leader, cid, 'leader') on conflict (user_id) do nothing;
    delete from public.crew_requests where user_id = c.leader;
  end if;
end $$;

-- 申請加入舞團
create or replace function public.crew_join(cid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  if exists (select 1 from public.crew_members where user_id = auth.uid()) then raise exception 'already in crew'; end if;
  if not exists (select 1 from public.crews where id = cid and status = 'approved') then raise exception 'not found'; end if;
  if (select count(*) from public.crew_requests where user_id = auth.uid() and status = 'pending') >= 3 then raise exception 'too many'; end if;
  insert into public.crew_requests (crew_id, user_id) values (cid, auth.uid())
    on conflict (crew_id, user_id) do update set status = 'pending', created_at = now();
end $$;

-- 團長 / 副團長：同意或拒絕入團
create or replace function public.crew_answer(rid bigint, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r public.crew_requests;
begin
  select * into r from public.crew_requests where id = rid;
  if r is null or coalesce(public.my_crew_rank(r.crew_id), '') not in ('leader', 'vice') then raise exception 'not allowed'; end if;
  update public.crew_requests set status = case when accept then 'accepted' else 'declined' end where id = rid;
  if accept then
    if exists (select 1 from public.crew_members where user_id = r.user_id) then raise exception 'already in crew'; end if;
    insert into public.crew_members (user_id, crew_id) values (r.user_id, r.crew_id);
    delete from public.crew_requests where user_id = r.user_id and status = 'pending';
  end if;
end $$;

-- 踢出團員：團長可以踢任何人；副團長只能踢一般團員
create or replace function public.crew_kick(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m public.crew_members; my text;
begin
  select * into m from public.crew_members where user_id = uid;
  if m is null then return; end if;
  my := public.my_crew_rank(m.crew_id);
  if uid = auth.uid() or my is null or my = 'member' or m.rank = 'leader' or (my = 'vice' and m.rank <> 'member') then raise exception 'not allowed'; end if;
  delete from public.crew_members where user_id = uid;
end $$;

-- 自己離團：團長要先把團長交給別人；只剩自己時直接解散舞團
create or replace function public.crew_leave() returns void
language plpgsql security definer set search_path = public as $$
declare m public.crew_members;
begin
  select * into m from public.crew_members where user_id = auth.uid();
  if m is null then return; end if;
  if m.rank = 'leader' then
    if (select count(*) from public.crew_members where crew_id = m.crew_id) > 1 then raise exception 'transfer first'; end if;
    delete from public.crews where id = m.crew_id;
  else
    delete from public.crew_members where user_id = auth.uid();
  end if;
end $$;

-- 團長：設定階級（副團長 / 團員），或把團長交給別人
create or replace function public.crew_set_rank(uid uuid, new_rank text) returns void
language plpgsql security definer set search_path = public as $$
declare m public.crew_members;
begin
  select * into m from public.crew_members where user_id = uid;
  if m is null or uid = auth.uid() or public.my_crew_rank(m.crew_id) <> 'leader' or new_rank not in ('leader', 'vice', 'member') then raise exception 'not allowed'; end if;
  if new_rank = 'leader' then
    update public.crew_members set rank = 'vice' where user_id = auth.uid();
    update public.crews set leader = uid where id = m.crew_id;
  end if;
  update public.crew_members set rank = new_rank where user_id = uid;
end $$;

-- 團長 / 副團長：自訂身分標籤（新增 / 刪除 / 指派）、自訂標籤樣式
create or replace function public.crew_label_add(p_name text) returns bigint
language plpgsql security definer set search_path = public as $$
declare cid bigint; lid bigint;
begin
  select crew_id into cid from public.crew_members where user_id = auth.uid() and rank in ('leader', 'vice');
  if cid is null then raise exception 'not allowed'; end if;
  if (select count(*) from public.crew_labels where crew_id = cid) >= 20 then raise exception 'too many'; end if;
  if public.is_spam(p_name) then raise exception 'spam'; end if;
  insert into public.crew_labels (crew_id, name) values (cid, trim(p_name)) returning id into lid;
  return lid;
end $$;
create or replace function public.crew_label_del(lid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_crew_rank((select crew_id from public.crew_labels where id = lid)), '') not in ('leader', 'vice') then raise exception 'not allowed'; end if;
  delete from public.crew_labels where id = lid;
end $$;
create or replace function public.crew_label_set(uid uuid, lid bigint) returns void
language plpgsql security definer set search_path = public as $$
declare m public.crew_members;
begin
  select * into m from public.crew_members where user_id = uid;
  if m is null or coalesce(public.my_crew_rank(m.crew_id), '') not in ('leader', 'vice') then raise exception 'not allowed'; end if;
  if lid is not null and not exists (select 1 from public.crew_labels where id = lid and crew_id = m.crew_id) then raise exception 'not allowed'; end if;
  update public.crew_members set label_id = lid where user_id = uid;
end $$;
create or replace function public.crew_set_style(p_style jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  select crew_id into cid from public.crew_members where user_id = auth.uid() and rank in ('leader', 'vice');
  if cid is null then raise exception 'not allowed'; end if;
  if not (coalesce(p_style->>'bg', '') ~ '^#[0-9a-fA-F]{6}$' and coalesce(p_style->>'fg', '') ~ '^#[0-9a-fA-F]{6}$' and coalesce(p_style->>'bd', '') ~ '^#[0-9a-fA-F]{6}$') then raise exception 'bad style'; end if;
  update public.crews set style = jsonb_build_object('bg', p_style->>'bg', 'fg', p_style->>'fg', 'bd', p_style->>'bd') where id = cid;
end $$;
-- 團長 / 副團長：修改 LOGO、IG、介紹
create or replace function public.crew_edit(p_logo text, p_intro text) returns void
language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  select crew_id into cid from public.crew_members where user_id = auth.uid() and rank in ('leader', 'vice');
  if cid is null then raise exception 'not allowed'; end if;
  if public.is_spam(coalesce(p_intro, '')) then raise exception 'spam'; end if;
  update public.crews set logo_url = nullif(p_logo, ''), intro = nullif(p_intro, '') where id = cid;
end $$;

grant execute on function public.crew_apply(text, text, text, text, text), public.crew_review(bigint, boolean), public.crew_join(bigint),
  public.crew_answer(bigint, boolean), public.crew_kick(uuid), public.crew_leave(), public.crew_set_rank(uuid, text),
  public.crew_label_add(text), public.crew_label_del(bigint), public.crew_label_set(uuid, bigint), public.crew_set_style(jsonb), public.crew_edit(text, text) to authenticated;

-- 名字旁邊的舞團稱號（例如「A舞團-團長」「A舞團-團寵」）
create or replace function public.crew_tag(uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'name', c.name, 'rank', m.rank, 'label', l.name, 'style', c.style)
  from public.crew_members m join public.crews c on c.id = m.crew_id and c.status = 'approved'
  left join public.crew_labels l on l.id = m.label_id where m.user_id = uid
$$;
grant execute on function public.crew_tag(uuid) to anon, authenticated;

-- ---------- 舞團頻道：聊天室多一個「crew:<舞團 id>」頻道，只有團員看得到、能發言 ----------
alter table public.messages drop constraint if exists messages_channel_check;
alter table public.messages add constraint messages_channel_check check (channel in ('world', 'tw') or channel ~ '^crew:[0-9]+$');
create or replace function public.can_use_channel(ch text) returns boolean
language sql stable security definer set search_path = public as $$
  select ch in ('world', 'tw') or (ch ~ '^crew:[0-9]+$' and exists (select 1 from public.crew_members where user_id = auth.uid() and crew_id = substring(ch from 6)::bigint))
$$;
grant execute on function public.can_use_channel(text) to anon, authenticated;
drop policy if exists "messages readable" on public.messages;
create policy "messages readable" on public.messages for select using (public.can_use_channel(channel));
drop policy if exists "players post messages" on public.messages;
create policy "players post messages" on public.messages for insert with check (auth.uid() is not null and public.can_use_channel(channel));

-- 發言時把舞團稱號放進作者資料（聊天室、留言都會顯示）
create or replace function public.guard_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players; last_at timestamptz; t text := lower(new.text);
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null then raise exception 'need character'; end if;
  if p.banned then raise exception 'banned'; end if;
  new.user_id := auth.uid();
  if not public.is_admin() then
    if t ~ '(https?://|www\.|\.com|\.net|\.cc|\.xyz|t\.me|line\.me|bit\.ly)' then raise exception 'links not allowed'; end if;
    if t ~ '(加賴|加line|加微信|wechat|whatsapp|telegram|代購|代儲|賺錢|兼職|日賺|月入|投資|博弈|娛樂城|貸款|色情|約炮|casino|crypto|bitcoin|forex|investment|earn money|onlyfans)' then raise exception 'spam'; end if;
    if t ~ '(.)\1{11,}' then raise exception 'spam'; end if;
    if tg_table_name = 'messages' then
      select max(created_at) into last_at from public.messages where user_id = auth.uid();
      if last_at is not null and last_at > now() - interval '3 seconds' then raise exception 'too fast'; end if;
      if exists (select 1 from public.messages where user_id = auth.uid() and text = new.text and created_at > now() - interval '1 minute') then raise exception 'duplicate'; end if;
    else
      select max(created_at) into last_at from public.comments where user_id = auth.uid();
      if last_at is not null and last_at > now() - interval '10 seconds' then raise exception 'too fast'; end if;
    end if;
  end if;
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'job', p.job, 'nat', p.nat, 'look', p.look,
                                   'role', public.admin_role(auth.uid()), 'verified', p.verified, 'ig', p.ig, 'crew', public.crew_tag(auth.uid()));
  new.created_at := now();
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'crew_requests') then alter publication supabase_realtime add table public.crew_requests; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notices') then alter publication supabase_realtime add table public.notices; end if;
end $$;
-- =========================================================
-- 舞島 — 第八批：經驗值系統（全部在伺服器端計算，不能作弊）
-- 每日任務 / 連續登入倍率 / 每週挑戰 / 好友互動 / 排名賽 / 論壇優質內容 /
-- 成就 / 舞團經驗與每週排行 / 活動現場加成 / 活動資訊糾錯
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 經驗值帳本：每筆獎勵一行，(人, 種類, 編號) 不能重複領 ----------
create table if not exists public.xp_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  ref text not null,
  amount int not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index if not exists xp_log_user_time on public.xp_log (user_id, created_at);
alter table public.xp_log enable row level security;
drop policy if exists "own xp log" on public.xp_log;
create policy "own xp log" on public.xp_log for select using (user_id = auth.uid());
grant select on public.xp_log to authenticated;

-- 台灣時間的「今天」、「這週一」
create or replace function public.tw_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Taipei')::date $$;
create or replace function public.tw_week() returns date language sql stable as $$ select date_trunc('week', now() at time zone 'Asia/Taipei')::date $$;
create or replace function public.tw_start(d date) returns timestamptz language sql stable as $$ select (d::timestamp at time zone 'Asia/Taipei') $$;

-- ---------- 連續登入 ----------
create table if not exists public.login_days (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.login_days enable row level security;
drop policy if exists "own login days" on public.login_days;
create policy "own login days" on public.login_days for select using (user_id = auth.uid());

create or replace function public.login_streak(uid uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare d date := public.tw_today(); n int := 0;
begin
  if not exists (select 1 from public.login_days where user_id = uid and day = d) then d := d - 1; end if;
  while exists (select 1 from public.login_days where user_id = uid and day = d) loop n := n + 1; d := d - 1; end loop;
  return n;
end $$;
-- 倍率：3 天 ×1.2、7 天 ×1.5、14 天 ×1.75、30 天 ×2
create or replace function public.xp_mult(uid uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select case when s >= 30 then 2.0 when s >= 14 then 1.75 when s >= 7 then 1.5 when s >= 3 then 1.2 else 1.0 end
  from (select public.login_streak(uid) s) x
$$;

-- 發經驗值（只有伺服器內部的函式會呼叫）
create or replace function public.grant_xp(uid uuid, k text, r text, base int, use_mult boolean default true) returns int
language plpgsql security definer set search_path = public as $$
declare amt int := case when use_mult then round(base * public.xp_mult(uid))::int else base end; got int;
begin
  insert into public.xp_log (user_id, kind, ref, amount) values (uid, k, r, amt) on conflict do nothing returning amount into got;
  return coalesce(got, 0);
end $$;
revoke all on function public.grant_xp(uuid, text, text, int, boolean) from public, anon, authenticated;

-- 上線時間（每 4 分鐘呼叫）：順便記錄登入日、連續 30 天送「定居島民」
create or replace function public.touch_seen() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.players set last_seen = now() where user_id = auth.uid();
  insert into public.login_days (user_id, day) values (auth.uid(), public.tw_today()) on conflict do nothing;
  if public.login_streak(auth.uid()) >= 30 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_islander') on conflict do nothing; end if;
end $$;
grant execute on function public.touch_seen() to authenticated;

-- ---------- 玩家行為紀錄（瀏覽活動、逛國家、看名片、分享、舞池出招） ----------
create table if not exists public.act_log (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('view', 'country', 'card', 'share', 'cypher')),
  ref text not null check (char_length(ref) between 1 and 100),
  day date not null default public.tw_today(),
  primary key (user_id, kind, ref, day)
);
alter table public.act_log enable row level security;
drop policy if exists "own acts" on public.act_log;
create policy "own acts" on public.act_log for select using (user_id = auth.uid());
create or replace function public.log_act(k text, r text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid()) then return; end if;
  if k = 'country' and r !~ '^[A-Z]{2}$' then return; end if;
  if k in ('view', 'share') and r !~ '^[A-Za-z0-9_-]{1,100}$' then return; end if;
  if k = 'card' and not exists (select 1 from public.players where handle = r) then return; end if;
  if (select count(*) from public.act_log where user_id = auth.uid() and day = public.tw_today()) >= 300 then return; end if;
  insert into public.act_log (user_id, kind, ref) values (auth.uid(), k, left(r, 100)) on conflict do nothing;
end $$;
grant execute on function public.log_act(text, text) to authenticated;

-- ---------- 每日任務：每人每天 3 個（伺服器決定、伺服器算進度） ----------
create or replace function public.quest_need(q text) returns int language sql immutable as $$
  select case q when 'view' then 3 when 'country' then 3 when 'friend' then 2 when 'card' then 3 when 'chat' then 3 when 'fav' then 2 else 1 end $$;
create or replace function public.quest_prog(uid uuid, q text, d date) returns int
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := public.tw_start(d); e timestamptz := public.tw_start(d + 1);
begin
  return case q
    when 'view' then (select count(*) from public.act_log where user_id = uid and kind = 'view' and day = d)
    when 'country' then (select count(*) from public.act_log where user_id = uid and kind = 'country' and day = d)
    when 'card' then (select count(*) from public.act_log where user_id = uid and kind = 'card' and day = d)
    when 'share' then (select count(*) from public.act_log where user_id = uid and kind = 'share' and day = d)
    when 'cypher' then (select count(*) from public.act_log where user_id = uid and kind = 'cypher' and day = d)
    when 'friend' then (select count(*) from public.friend_requests where (from_user = uid or to_user = uid) and status = 'accepted' and coalesce(responded_at, created_at) >= s and coalesce(responded_at, created_at) < e)
               + (select count(*) from public.friend_requests where from_user = uid and status = 'pending' and created_at >= s and created_at < e)
    when 'emote' then (select count(*) from public.messages where user_id = uid and text ~ '^/[a-z]+$' and created_at >= s and created_at < e)
    when 'chat' then (select count(*) from public.messages where user_id = uid and text !~ '^/[a-z]+$' and created_at >= s and created_at < e)
    when 'vote' then (select count(*) from public.votes where user_id = uid and created_at >= s and created_at < e)
    when 'speak' then (select count(*) from public.replies where user_id = uid and created_at >= s and created_at < e)
               + (select count(*) from public.comments where user_id = uid and created_at >= s and created_at < e)
               + (select count(*) from public.forum_posts where user_id = uid and created_at >= s and created_at < e)
    when 'comment' then (select count(*) from public.comments where user_id = uid and created_at >= s and created_at < e)
    when 'fav' then (select count(*) from public.favorites where user_id = uid and created_at >= s and created_at < e)
    when 'rhythm' then (select count(*) from public.scores where user_id = uid and created_at >= s and created_at < e)
    when 'npc' then (select count(*) from public.xp_log where user_id = uid and kind = 'npcwin' and created_at >= s and created_at < e)
    when 'spin' then (select count(*) from public.daily where user_id = uid and day = d)
    else 0 end;
end $$;
create or replace function public.my_quests() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.tw_today(); live boolean; out jsonb := '[]'; q text;
begin
  if uid is null then return '[]'; end if;
  live := exists (select 1 from public.battles where ends_at > now());
  for q in select x from unnest(array['view','country','friend','card','emote','chat','vote','speak','comment','fav','share','rhythm','npc','spin','cypher']) x
           where x <> 'vote' or live order by md5(uid::text || d::text || x) limit 3 loop
    out := out || jsonb_build_object('id', q, 'n', public.quest_need(q), 'prog', least(public.quest_need(q), public.quest_prog(uid, q, d)),
      'claimed', exists (select 1 from public.xp_log where user_id = uid and kind = 'quest' and ref = d || ':' || q));
  end loop;
  return jsonb_build_object('day', d, 'quests', out, 'all', exists (select 1 from public.xp_log where user_id = uid and kind = 'quest_all' and ref = d::text),
    'streak', public.login_streak(uid), 'mult', public.xp_mult(uid));
end $$;
-- 領任務獎勵：+15 XP（乘連續登入倍率）；三個都領完再 +30
create or replace function public.claim_quest(q text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.tw_today(); mine jsonb; got int := 0; bonus int := 0;
begin
  mine := public.my_quests()->'quests';
  if not exists (select 1 from jsonb_array_elements(mine) j where j->>'id' = q) then raise exception 'not your quest'; end if;
  if public.quest_prog(uid, q, d) < public.quest_need(q) then raise exception 'not done'; end if;
  got := public.grant_xp(uid, 'quest', d || ':' || q, 15);
  if (select count(*) from public.xp_log where user_id = uid and kind = 'quest' and ref like d || ':%') >= 3 then bonus := public.grant_xp(uid, 'quest_all', d::text, 30); end if;
  return jsonb_build_object('xp', got, 'bonus', bonus);
end $$;
grant execute on function public.my_quests(), public.claim_quest(text) to authenticated;

-- NPC 對戰勝利也記在帳本（每日任務用）
create or replace function public.npc_win() returns jsonb
language plpgsql security definer set search_path = public as $$
declare w int; last timestamptz;
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid()) then raise exception 'need character'; end if;
  select wins, last_at into w, last from public.npc_wins where user_id = auth.uid();
  if last is not null and last > now() - interval '20 seconds' then raise exception 'too fast'; end if;
  insert into public.npc_wins (user_id, wins, last_at) values (auth.uid(), 1, now())
    on conflict (user_id) do update set wins = public.npc_wins.wins + 1, last_at = now() returning wins into w;
  if w >= 5 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcslayer') on conflict do nothing; end if;
  if w >= 30 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcboss') on conflict do nothing; end if;
  perform public.grant_xp(auth.uid(), 'npcwin', w::text, 0, false);
  return jsonb_build_object('wins', w);
end $$;

-- ---------- 每週挑戰：每人每週 1 個，+200 XP，第一次完成送「週週挑戰王」 ----------
create or replace function public.weekly_need(q text) returns int language sql immutable as $$
  select case q when 'checkin' then 1 when 'pvp' then 3 when 'talk' then 8 when 'daily' then 4 when 'rhythm' then 1 when 'friends' then 3 when 'votes' then 3 else 1 end $$;
create or replace function public.weekly_prog(uid uuid, q text) returns int
language plpgsql stable security definer set search_path = public as $$
declare w date := public.tw_week(); s timestamptz := public.tw_start(public.tw_week());
begin
  return case q
    when 'checkin' then (select count(*) from public.checkins where user_id = uid and created_at >= s)
    when 'pvp' then (select count(*) from public.xp_log where user_id = uid and kind = 'pvpwin' and created_at >= s)
    when 'talk' then (select count(*) from public.replies where user_id = uid and created_at >= s) + (select count(*) from public.comments where user_id = uid and created_at >= s)
    when 'daily' then (select count(*) from public.xp_log where user_id = uid and kind = 'quest_all' and created_at >= s)
    when 'rhythm' then (select count(*) from public.scores where user_id = uid and score >= 5000 and created_at >= s)
    when 'friends' then (select count(*) from public.friend_requests where (from_user = uid or to_user = uid) and status = 'accepted' and coalesce(responded_at, created_at) >= s)
    when 'votes' then (select count(*) from public.votes where user_id = uid and created_at >= s)
    else 0 end;
end $$;
create or replace function public.my_weekly() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w date := public.tw_week(); q text;
begin
  if uid is null then return null; end if;
  select x into q from unnest(array['checkin','pvp','talk','daily','rhythm','friends','votes']) x order by md5(uid::text || w::text || x) limit 1;
  return jsonb_build_object('week', w, 'id', q, 'n', public.weekly_need(q), 'prog', least(public.weekly_need(q), public.weekly_prog(uid, q)),
    'claimed', exists (select 1 from public.xp_log where user_id = uid and kind = 'weekly' and ref = w::text));
end $$;
create or replace function public.claim_weekly() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m jsonb := public.my_weekly(); got int;
begin
  if m is null or (m->>'prog')::int < (m->>'n')::int then raise exception 'not done'; end if;
  got := public.grant_xp(uid, 'weekly', m->>'week', 200);
  insert into public.unlocks (user_id, item) values (uid, 'r_challenger') on conflict do nothing;
  return jsonb_build_object('xp', got);
end $$;
grant execute on function public.my_weekly(), public.claim_weekly() to authenticated;

-- ---------- 打卡次數稱號：1 場「我有比過賽」、5 場「我真的有比過」、10 場「我超愛比賽」 ----------
create or replace function public.after_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.checkins where user_id = new.user_id;
  if n >= 1 then insert into public.unlocks (user_id, item) values (new.user_id, 'r_comp1') on conflict do nothing; end if;
  if n >= 5 then insert into public.unlocks (user_id, item) values (new.user_id, 'r_comp5') on conflict do nothing; end if;
  if n >= 10 then insert into public.unlocks (user_id, item) values (new.user_id, 'r_comp10') on conflict do nothing; end if;
  return new;
end $$;
drop trigger if exists after_checkin on public.checkins;
create trigger after_checkin after insert on public.checkins for each row execute function public.after_checkin();
-- 已經打卡過的人補發
insert into public.unlocks (user_id, item) select user_id, 'r_comp1' from public.checkins group by user_id having count(*) >= 1 on conflict do nothing;
insert into public.unlocks (user_id, item) select user_id, 'r_comp5' from public.checkins group by user_id having count(*) >= 5 on conflict do nothing;
insert into public.unlocks (user_id, item) select user_id, 'r_comp10' from public.checkins group by user_id having count(*) >= 10 on conflict do nothing;

-- ---------- 好友互動：成為好友、第一次私訊，雙方各 +10（每天最多 5 次 = 50 XP） ----------
create or replace function public.social_xp(uid uuid, k text, r text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.xp_log where user_id = uid and kind in ('friend', 'dm1') and created_at >= public.tw_start(public.tw_today())) >= 5 then return; end if;
  perform public.grant_xp(uid, k, r, 10);
end $$;
revoke all on function public.social_xp(uuid, text, text) from public, anon, authenticated;
create or replace function public.after_friend() returns trigger
language plpgsql security definer set search_path = public as $$
declare pair text := least(new.from_user::text, new.to_user::text) || '|' || greatest(new.from_user::text, new.to_user::text);
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then
    perform public.social_xp(new.from_user, 'friend', pair); perform public.social_xp(new.to_user, 'friend', pair);
  end if;
  return new;
end $$;
drop trigger if exists after_friend on public.friend_requests;
create trigger after_friend after insert or update on public.friend_requests for each row execute function public.after_friend();
create or replace function public.after_dm() returns trigger
language plpgsql security definer set search_path = public as $$
declare pair text := least(new.from_user::text, new.to_user::text) || '|' || greatest(new.from_user::text, new.to_user::text);
begin
  if (select count(*) from public.dms where (from_user = new.from_user and to_user = new.to_user) or (from_user = new.to_user and to_user = new.from_user)) = 1 then
    perform public.social_xp(new.from_user, 'dm1', pair); perform public.social_xp(new.to_user, 'dm1', pair);
  end if;
  return new;
end $$;
drop trigger if exists after_dm on public.dms;
create trigger after_dm after insert on public.dms for each row execute function public.after_dm();

-- ---------- 玩家對戰排名賽：雙方都回報同一個結果才算；贏 +20、輸 +5；同一對手一天最多 3 場 ----------
create table if not exists public.pvp_matches (
  room text primary key check (char_length(room) between 8 and 40),
  a uuid not null, b uuid not null,
  a_says uuid, b_says uuid,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.pvp_season (
  user_id uuid not null references auth.users on delete cascade,
  season text not null,
  points int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  primary key (user_id, season)
);
alter table public.pvp_matches enable row level security;
alter table public.pvp_season enable row level security;
drop policy if exists "season readable" on public.pvp_season;
create policy "season readable" on public.pvp_season for select using (true);
grant select on public.pvp_season to anon, authenticated;
create or replace function public.season_now() returns text language sql stable as $$ select to_char(now() at time zone 'Asia/Taipei', 'YYYY"-Q"Q') $$;
grant execute on function public.season_now() to anon, authenticated;
create or replace function public.pvp_report(p_room text, opp uuid, winner uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.pvp_matches; loser uuid; s text := public.season_now(); today_n int;
begin
  if uid is null or opp is null or uid = opp or winner not in (uid, opp) then raise exception 'bad report'; end if;
  select * into m from public.pvp_matches where room = p_room;
  if m is null then
    insert into public.pvp_matches (room, a, b, a_says) values (p_room, uid, opp, winner);
    return jsonb_build_object('status', 'waiting');
  end if;
  if m.done then return jsonb_build_object('status', 'done'); end if;
  if m.b = uid and m.a = opp then update public.pvp_matches set b_says = winner where room = p_room returning * into m;
  elsif m.a = uid and m.b = opp then update public.pvp_matches set a_says = winner where room = p_room returning * into m;
  else raise exception 'bad report'; end if;
  if m.a_says is null or m.b_says is null then return jsonb_build_object('status', 'waiting'); end if;
  update public.pvp_matches set done = true where room = p_room;
  if m.a_says <> m.b_says then return jsonb_build_object('status', 'mismatch'); end if;
  select count(*) into today_n from public.pvp_matches where done and created_at >= public.tw_start(public.tw_today()) and ((a = m.a and b = m.b) or (a = m.b and b = m.a));
  if today_n > 3 then return jsonb_build_object('status', 'limit'); end if;
  loser := case when m.a_says = m.a then m.b else m.a end;
  perform public.grant_xp(m.a_says, 'pvpwin', p_room, 20);
  perform public.grant_xp(loser, 'pvplose', p_room, 5);
  insert into public.pvp_season (user_id, season, points, wins) values (m.a_says, s, 25, 1)
    on conflict (user_id, season) do update set points = public.pvp_season.points + 25, wins = public.pvp_season.wins + 1;
  insert into public.pvp_season (user_id, season, points, losses) values (loser, s, 0, 1)
    on conflict (user_id, season) do update set points = greatest(0, public.pvp_season.points - 10), losses = public.pvp_season.losses + 1;
  return jsonb_build_object('status', 'ok', 'winner', m.a_says);
end $$;
grant execute on function public.pvp_report(text, uuid, uuid) to authenticated;

-- ---------- 論壇優質內容：主題被按讚 10 次 +50、被管理員置頂 +100 ----------
create or replace function public.after_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid bigint; author uuid;
begin
  if new.target like 'p:%' then
    pid := substring(new.target from 3)::bigint;
    if (select count(*) from public.likes where target = new.target) >= 10 then
      select user_id into author from public.forum_posts where id = pid;
      if author is not null then perform public.grant_xp(author, 'forum_like10', pid::text, 50); end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists after_like on public.likes;
create trigger after_like after insert on public.likes for each row execute function public.after_like();
create or replace function public.after_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pinned and not old.pinned and new.status = 'approved' then perform public.grant_xp(new.user_id, 'forum_pin', new.id::text, 100); end if;
  return new;
end $$;
drop trigger if exists after_pin on public.forum_posts;
create trigger after_pin after update on public.forum_posts for each row execute function public.after_pin();
-- 不能幫自己按讚
drop policy if exists "like own" on public.likes;
create policy "like own" on public.likes for insert with check (user_id = auth.uid() and not exists (
  select 1 from public.forum_posts f where 'p:' || f.id = target and f.user_id = auth.uid()) and not exists (
  select 1 from public.replies r where 'r:' || r.id = target and r.user_id = auth.uid()));

-- ---------- 活動現場加成：活動期間、在活動城市附近打卡，經驗值 ×2（再 +50） ----------
create table if not exists public.event_geo (
  event_id text primary key,
  lat double precision not null, lon double precision not null,
  start_date date not null, end_date date
);
alter table public.event_geo enable row level security;
drop policy if exists "event geo readable" on public.event_geo;
create policy "event geo readable" on public.event_geo for select using (true);
drop policy if exists "admins manage event geo" on public.event_geo;
create policy "admins manage event geo" on public.event_geo for all using (public.is_admin()) with check (public.is_admin());
grant select on public.event_geo to anon, authenticated;
grant insert, update, delete on public.event_geo to authenticated;
insert into public.event_geo (event_id, lat, lon, start_date, end_date) values
  ('fss-2026-wf-day1', 35.63, 140.06, '2026-11-14', '2026-11-14'),
  ('fss-2026-wf-day2', 35.63, 140.06, '2026-11-15', '2026-11-15')
on conflict (event_id) do nothing;
create or replace function public.checkin_onsite(eid text, p_lat double precision, p_lon double precision) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.event_geo; km double precision; d date := public.tw_today();
begin
  if auth.uid() is null or not exists (select 1 from public.checkins where user_id = auth.uid() and event_id = eid) then raise exception 'check in first'; end if;
  select * into g from public.event_geo where event_id = eid;
  if g is null then return jsonb_build_object('ok', false, 'why', 'no location'); end if;
  if d < g.start_date - 1 or d > coalesce(g.end_date, g.start_date) + 1 then return jsonb_build_object('ok', false, 'why', 'not today'); end if;
  km := 6371 * 2 * asin(sqrt(power(sin(radians(p_lat - g.lat) / 2), 2) + cos(radians(g.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lon - g.lon) / 2), 2)));
  if km > 30 then return jsonb_build_object('ok', false, 'why', 'too far', 'km', round(km::numeric, 1)); end if;
  return jsonb_build_object('ok', true, 'xp', public.grant_xp(auth.uid(), 'onsite', eid, 50));
end $$;
grant execute on function public.checkin_onsite(text, double precision, double precision) to authenticated;

-- ---------- 活動資訊糾錯：回報錯誤，管理員確認後 +30 ----------
create table if not exists public.event_reports (
  id bigint generated always as identity primary key,
  event_id text not null check (char_length(event_id) between 1 and 100),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null check (char_length(text) between 2 and 300),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.event_reports enable row level security;
drop policy if exists "report own" on public.event_reports;
create policy "report own" on public.event_reports for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "see own reports or admin" on public.event_reports;
create policy "see own reports or admin" on public.event_reports for select using (user_id = auth.uid() or public.is_admin());
grant select, insert on public.event_reports to authenticated;
create or replace function public.guard_event_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.event_reports where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many'; end if;
  if public.is_spam(new.text) then raise exception 'spam'; end if;
  return new;
end $$;
drop trigger if exists guard_event_report on public.event_reports;
create trigger guard_event_report before insert on public.event_reports for each row execute function public.guard_event_report();
create or replace function public.review_event_report(rid bigint, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r public.event_reports;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.event_reports set status = case when ok then 'confirmed' else 'rejected' end where id = rid and status = 'pending' returning * into r;
  if r is not null and ok then perform public.grant_xp(r.user_id, 'report', rid::text, 30); end if;
end $$;
grant execute on function public.review_event_report(bigint, boolean) to authenticated;

-- ---------- 成就（一次性，伺服器檢查條件後發經驗值） ----------
create table if not exists public.achievements (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.achievements enable row level security;
drop policy if exists "achievements readable" on public.achievements;
create policy "achievements readable" on public.achievements for select using (true);
grant select on public.achievements to anon, authenticated;
create or replace function public.check_achievements() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); got jsonb := '[]'; r record;
  tw int; cc int; ck int; best int; npc int; fr int; msg int; posts int; talk int; vt int; stk int; pw int; pts int; spins int; favs int; subs int; liked int;
begin
  if uid is null or not exists (select 1 from public.players where user_id = uid) then return '[]'; end if;
  select count(distinct city) into tw from public.checkins where user_id = uid and country = 'TW';
  select count(distinct country) into cc from public.checkins where user_id = uid;
  select count(*) into ck from public.checkins where user_id = uid;
  select coalesce(max(score), 0) into best from public.scores where user_id = uid;
  select coalesce(max(wins), 0) into npc from public.npc_wins where user_id = uid;
  select count(*) into fr from public.friend_requests where (from_user = uid or to_user = uid) and status = 'accepted';
  select count(*) into msg from public.messages where user_id = uid;
  select count(*) into posts from public.forum_posts where user_id = uid and status = 'approved';
  select (select count(*) from public.replies where user_id = uid) + (select count(*) from public.comments where user_id = uid) into talk;
  select count(*) into vt from public.votes where user_id = uid;
  stk := public.login_streak(uid);
  select count(*) into pw from public.xp_log where user_id = uid and kind = 'pvpwin';
  select coalesce(max(points), 0) into pts from public.pvp_season where user_id = uid;
  select count(*) into spins from public.daily where user_id = uid;
  select count(*) into favs from public.favorites where user_id = uid;
  select count(*) into subs from public.submissions where user_id = uid and status = 'approved';
  select count(*) into liked from public.xp_log where user_id = uid and kind = 'forum_like10';
  for r in select * from (values
      ('tw5', tw >= 5, 100), ('tw22', tw >= 22, 800), ('country3', cc >= 3, 150), ('country10', cc >= 10, 600),
      ('comp1', ck >= 1, 50), ('comp5', ck >= 5, 200), ('comp10', ck >= 10, 400),
      ('rhythm_a', best >= 5000, 100), ('rhythm_s', best >= 6000, 250), ('npc5', npc >= 5, 50), ('npc30', npc >= 30, 200),
      ('friend1', fr >= 1, 30), ('friend10', fr >= 10, 150), ('friend30', fr >= 30, 300), ('chat100', msg >= 100, 100),
      ('forum1', posts >= 1, 50), ('talk50', talk >= 50, 150), ('vote10', vt >= 10, 100), ('streak7', stk >= 7, 100), ('streak30', stk >= 30, 400),
      ('pvp1', pw >= 1, 50), ('pvp10', pw >= 10, 200), ('gold', pts >= 500, 300), ('king', pts >= 1000, 600),
      ('crew', exists (select 1 from public.crew_members where user_id = uid), 50), ('crewlead', exists (select 1 from public.crews where leader = uid and status = 'approved'), 200),
      ('verified', exists (select 1 from public.players where user_id = uid and verified), 100), ('spin30', spins >= 30, 200), ('fav10', favs >= 10, 50),
      ('submit1', subs >= 1, 100), ('liked10', liked >= 1, 100)
    ) as a(id, ok, xp) loop
    if r.ok and not exists (select 1 from public.achievements where user_id = uid and id = r.id) then
      insert into public.achievements (user_id, id) values (uid, r.id);
      perform public.grant_xp(uid, 'ach', r.id, r.xp, false);
      got := got || jsonb_build_object('id', r.id, 'xp', r.xp);
    end if;
  end loop;
  return got;
end $$;
grant execute on function public.check_achievements() to authenticated;

-- ---------- 舞團經驗值、每週舞團排行（前 3 名全團 +100 / +60 / +30） ----------
create or replace function public.crew_xp(cid bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('total', coalesce(sum(x.amount), 0), 'week', coalesce(sum(x.amount) filter (where x.created_at >= public.tw_start(public.tw_week())), 0))
  from public.crew_members m join public.xp_log x on x.user_id = m.user_id and x.created_at >= m.joined_at where m.crew_id = cid
$$;
create or replace function public.crew_week_rank(w date default null) returns table (crew_id bigint, name text, logo_url text, style jsonb, xp bigint)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.logo_url, c.style, coalesce(sum(x.amount), 0)::bigint
  from public.crews c join public.crew_members m on m.crew_id = c.id
  left join public.xp_log x on x.user_id = m.user_id and x.kind <> 'crewweek' and x.created_at >= public.tw_start(coalesce(w, public.tw_week())) and x.created_at < public.tw_start(coalesce(w, public.tw_week()) + 7) and x.created_at >= m.joined_at
  where c.status = 'approved' group by c.id order by 5 desc, c.id limit 20
$$;
create table if not exists public.crew_week_rewards (week date primary key, crews bigint[], created_at timestamptz not null default now());
alter table public.crew_week_rewards enable row level security;
drop policy if exists "crew week readable" on public.crew_week_rewards;
create policy "crew week readable" on public.crew_week_rewards for select using (true);
grant select on public.crew_week_rewards to anon, authenticated;
-- 上週還沒結算就結算（誰打開網站都會觸發，重複呼叫也只會發一次）
create or replace function public.crew_week_settle() returns void
language plpgsql security definer set search_path = public as $$
declare w date := public.tw_week() - 7; top bigint[]; i int; m record;
begin
  if exists (select 1 from public.crew_week_rewards where week = w) then return; end if;
  select array_agg(crew_id) into top from (select crew_id, xp from public.crew_week_rank(w) where xp > 0 limit 3) t;
  insert into public.crew_week_rewards (week, crews) values (w, coalesce(top, '{}')) on conflict do nothing;
  if not found or top is null then return; end if;
  for i in 1 .. array_length(top, 1) loop
    for m in select user_id from public.crew_members where crew_id = top[i] loop
      perform public.grant_xp(m.user_id, 'crewweek', w::text, (array[100, 60, 30])[i], false);
    end loop;
  end loop;
end $$;
grant execute on function public.crew_xp(bigint), public.crew_week_rank(date), public.crew_week_settle() to anon, authenticated;

-- ---------- 等級 = 原本的經驗值 + 帳本上的經驗值 ----------
create or replace function public.player_stats(uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'checkins', (select count(*) from public.checkins where user_id = uid),
    'comments', (select count(*) from public.comments where user_id = uid),
    'messages', (select count(*) from public.messages where user_id = uid),
    'days', (select count(*) from public.daily where user_id = uid),
    'favorites', (select count(*) from public.favorites where user_id = uid),
    'approved', (select count(*) from public.submissions where user_id = uid and status = 'approved'),
    'votes', (select count(*) from public.votes where user_id = uid),
    'best', (select coalesce(max(score), 0) from public.scores where user_id = uid),
    'npc', (select coalesce(max(wins), 0) from public.npc_wins where user_id = uid),
    'streak', public.login_streak(uid),
    'mult', public.xp_mult(uid),
    'bonus', (select coalesce(sum(amount), 0) from public.xp_log where user_id = uid),
    'xp',
      (select count(*) from public.checkins where user_id = uid) * 50
    + (select count(*) from public.daily where user_id = uid) * 20
    + (select coalesce(sum(case reward when 'xp20' then 20 when 'xp50' then 50 when 'xp100' then 100 else 0 end), 0) from public.daily where user_id = uid)
    + (select count(*) from public.comments where user_id = uid) * 5
    + least((select count(*) from public.messages where user_id = uid), 300)
    + (select count(*) from public.favorites where user_id = uid) * 2
    + (select count(*) from public.submissions where user_id = uid and status = 'approved') * 80
    + (select count(*) from public.votes where user_id = uid) * 3
    + (select coalesce(max(score), 0) from public.scores where user_id = uid) / 100
    + least((select coalesce(max(wins), 0) from public.npc_wins where user_id = uid), 30) * 10
    + (select coalesce(sum(amount), 0) from public.xp_log where user_id = uid)
  )
$$;
grant execute on function public.player_stats(uuid) to anon, authenticated;
