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
