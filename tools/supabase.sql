-- =========================================================
-- 舞島 DANCE ISLAND — Supabase 資料庫設定
-- 用法：Supabase 後台 → SQL Editor → New query → 整段貼上 → Run
-- =========================================================

-- 活動
create table if not exists public.events (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users on delete set null
);

-- 管理員名單（在這裡的帳號才能新增 / 編輯 / 刪除活動）
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);

-- 玩家角色
create table if not exists public.players (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,16}$'),
  name text not null check (char_length(name) between 1 and 20),
  nat text,
  style text,
  look jsonb,
  created_at timestamptz not null default now()
);

alter table public.events  enable row level security;
alter table public.admins  enable row level security;
alter table public.players enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

drop policy if exists "events readable by everyone" on public.events;
create policy "events readable by everyone" on public.events for select using (true);
drop policy if exists "admins write events" on public.events;
create policy "admins write events" on public.events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "see own admin row" on public.admins;
create policy "see own admin row" on public.admins for select using (user_id = auth.uid());

drop policy if exists "players readable" on public.players;
create policy "players readable" on public.players for select using (true);
drop policy if exists "create own player" on public.players;
create policy "create own player" on public.players for insert with check (user_id = auth.uid());
drop policy if exists "update own player" on public.players;
create policy "update own player" on public.players for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 權限（就算沒勾「Automatically expose new tables」也能用；真正的保護靠上面的 RLS 規則）
grant usage on schema public to anon, authenticated;
grant select on public.events, public.players to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant insert, update on public.players to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- =========================================================
-- 設定管理員：先到 Authentication → Users → Add user 建立管理員帳號（勾 Auto Confirm），
-- 再把下面的 email 換成那個帳號，單獨執行這一行：
--   insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';
-- =========================================================
