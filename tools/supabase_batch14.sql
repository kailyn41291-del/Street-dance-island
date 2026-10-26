-- =========================================================
-- 舞島 — 第十四批：練舞場地地圖、二手市集
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 1. 練舞場地（公園、地下道、有鏡面牆的地方…）：玩家投稿、管理員審核 ----------
create table if not exists public.practice_spots (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users on delete set null,
  name text not null check (char_length(name) between 2 and 60),
  kind text not null default 'other' check (kind in ('park', 'underpass', 'station', 'mall', 'plaza', 'other')),
  country text not null default 'TW',
  city text,
  address text check (char_length(address) <= 200),
  lat double precision,
  lon double precision,
  mirror boolean not null default false,     -- 有鏡面 / 反光玻璃
  roof boolean not null default false,       -- 下雨也能練
  light boolean not null default false,      -- 晚上有燈
  note text check (char_length(note) <= 500),
  photo text check (char_length(photo) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.practice_spots enable row level security;
create or replace function public.guard_spot() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  if public.is_admin() then if tg_op = 'INSERT' then new.status := 'approved'; end if; return new; end if;   -- 管理員新增的直接公開
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if public.is_spam(new.name || ' ' || coalesce(new.note, '')) then raise exception 'spam'; end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.practice_spots where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many'; end if;
    new.user_id := auth.uid(); new.status := 'pending'; new.created_at := now();
  else
    new.user_id := old.user_id; new.status := old.status; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists guard_spot on public.practice_spots;
create trigger guard_spot before insert or update on public.practice_spots for each row execute function public.guard_spot();
drop policy if exists "spots readable" on public.practice_spots;
create policy "spots readable" on public.practice_spots for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "add spot" on public.practice_spots;
create policy "add spot" on public.practice_spots for insert with check (auth.uid() is not null);
drop policy if exists "edit spot" on public.practice_spots;
create policy "edit spot" on public.practice_spots for update using (user_id = auth.uid() or public.is_admin());
drop policy if exists "delete spot" on public.practice_spots;
create policy "delete spot" on public.practice_spots for delete using (user_id = auth.uid() or public.is_admin());
grant select on public.practice_spots to anon, authenticated;
grant insert, update, delete on public.practice_spots to authenticated;

-- 現況回報：「今天可以練 ✔」或「不能用 ✖（被趕、施工、太多人…）」，每人每個場地每天一次
create table if not exists public.spot_reports (
  id bigint generated always as identity primary key,
  spot_id bigint not null references public.practice_spots on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author jsonb,
  ok boolean not null,
  note text check (char_length(note) <= 100),
  day date not null default public.tw_today(),
  created_at timestamptz not null default now(),
  unique (spot_id, user_id, day)
);
alter table public.spot_reports enable row level security;
create or replace function public.guard_spot_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if public.is_spam(coalesce(new.note, '')) then raise exception 'spam'; end if;
  new.user_id := auth.uid(); new.day := public.tw_today(); new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name);
  return new;
end $$;
drop trigger if exists guard_spot_report on public.spot_reports;
create trigger guard_spot_report before insert on public.spot_reports for each row execute function public.guard_spot_report();
drop policy if exists "spot reports readable" on public.spot_reports;
create policy "spot reports readable" on public.spot_reports for select using (true);
drop policy if exists "report spot" on public.spot_reports;
create policy "report spot" on public.spot_reports for insert with check (auth.uid() is not null);
drop policy if exists "delete spot report" on public.spot_reports;
create policy "delete spot report" on public.spot_reports for delete using (user_id = auth.uid() or public.is_admin());
grant select on public.spot_reports to anon, authenticated;
grant insert, delete on public.spot_reports to authenticated;

-- ---------- 2. 二手市集（舞鞋、服裝…）：玩家上架、管理員審核 ----------
create table if not exists public.market_items (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author jsonb,
  title text not null check (char_length(title) between 2 and 60),
  body text check (char_length(body) <= 1000),
  category text not null default 'other' check (category in ('shoes', 'top', 'bottom', 'hat', 'acc', 'other')),
  price int check (price between 0 and 10000000),
  currency text not null default 'TWD' check (currency in ('TWD', 'JPY', 'KRW', 'USD', 'HKD', 'CNY', 'EUR')),
  cond text not null default 'used' check (cond in ('new', 'like_new', 'used')),
  size text check (char_length(size) <= 20),
  trade text not null default 'both' check (trade in ('meet', 'ship', 'both')),
  country text not null default 'TW',
  city text,
  photos jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'sold')),
  created_at timestamptz not null default now()
);
alter table public.market_items enable row level security;
create or replace function public.guard_market() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players; m jsonb;
begin
  if public.is_admin() and tg_op = 'UPDATE' then return new; end if;
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if public.is_spam(new.title || ' ' || coalesce(new.body, '')) then raise exception 'spam'; end if;
  if jsonb_typeof(new.photos) <> 'array' or jsonb_array_length(new.photos) > 4 then raise exception 'bad media'; end if;
  for m in select * from jsonb_array_elements(new.photos) loop
    if jsonb_typeof(m) <> 'string' or (m #>> '{}') !~ ('/storage/v1/object/public/forum/' || auth.uid()::text || '/') then raise exception 'bad media'; end if;
  end loop;
  if tg_op = 'INSERT' then
    if (select count(*) from public.market_items where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many'; end if;
    new.user_id := auth.uid(); new.status := 'pending'; new.created_at := now();
  else
    new.user_id := old.user_id; new.created_at := old.created_at;
    -- 賣家自己只能把狀態改成「已售出」，或改內容後重新送審
    if new.status = 'sold' and old.status = 'approved' then null;
    elsif new.title is distinct from old.title or new.body is distinct from old.body or new.photos is distinct from old.photos or new.price is distinct from old.price then new.status := 'pending';
    else new.status := old.status; end if;
  end if;
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name);
  return new;
end $$;
drop trigger if exists guard_market on public.market_items;
create trigger guard_market before insert or update on public.market_items for each row execute function public.guard_market();
drop policy if exists "market readable" on public.market_items;
create policy "market readable" on public.market_items for select using (status in ('approved', 'sold') or user_id = auth.uid() or public.is_admin());
drop policy if exists "sell item" on public.market_items;
create policy "sell item" on public.market_items for insert with check (auth.uid() is not null);
drop policy if exists "edit item" on public.market_items;
create policy "edit item" on public.market_items for update using (user_id = auth.uid() or public.is_admin());
drop policy if exists "delete item" on public.market_items;
create policy "delete item" on public.market_items for delete using (user_id = auth.uid() or public.is_admin());
grant select on public.market_items to anon, authenticated;
grant insert, update, delete on public.market_items to authenticated;
