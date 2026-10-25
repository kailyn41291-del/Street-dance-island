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
