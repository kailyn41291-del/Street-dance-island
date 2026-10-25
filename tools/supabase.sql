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
