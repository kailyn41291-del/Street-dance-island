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
