-- =========================================================
-- 舞島 — 第九批：舞團改成邀請制（直接邀請 / 邀請碼 / QR code）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- 不能再自己申請加入（改成邀請制）
create or replace function public.crew_join(cid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin raise exception 'invite only'; end $$;

-- ---------- 直接邀請：團長 / 副團長邀請某位玩家 ----------
create table if not exists public.crew_invites (
  id bigint generated always as identity primary key,
  crew_id bigint not null references public.crews on delete cascade,
  from_user uuid not null references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (crew_id, to_user)
);
alter table public.crew_invites enable row level security;
drop policy if exists "see crew invites" on public.crew_invites;
create policy "see crew invites" on public.crew_invites for select using (
  to_user = auth.uid() or from_user = auth.uid()
  or exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = crew_invites.crew_id and m.rank in ('leader', 'vice')));
grant select on public.crew_invites to authenticated;

create or replace function public.crew_invite(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  select crew_id into cid from public.crew_members where user_id = auth.uid() and rank in ('leader', 'vice');
  if cid is null then raise exception 'not allowed'; end if;
  if uid = auth.uid() or not exists (select 1 from public.players where user_id = uid and not banned) then raise exception 'not found'; end if;
  if exists (select 1 from public.crew_members where user_id = uid) then raise exception 'already in crew'; end if;
  if exists (select 1 from public.blocks where user_id = uid and blocked = auth.uid()) then raise exception 'blocked'; end if;
  if (select count(*) from public.crew_invites where from_user = auth.uid() and created_at > now() - interval '1 day') >= 30 then raise exception 'too many'; end if;
  insert into public.crew_invites (crew_id, from_user, to_user) values (cid, auth.uid(), uid)
    on conflict (crew_id, to_user) do update set status = 'pending', from_user = auth.uid(), created_at = now();
end $$;

create or replace function public.crew_invite_answer(iid bigint, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare i public.crew_invites;
begin
  select * into i from public.crew_invites where id = iid and to_user = auth.uid() and status = 'pending';
  if i is null then raise exception 'not found'; end if;
  if not accept then update public.crew_invites set status = 'declined' where id = iid; return; end if;
  if exists (select 1 from public.crew_members where user_id = auth.uid()) then raise exception 'already in crew'; end if;
  if not exists (select 1 from public.crews where id = i.crew_id and status = 'approved') then raise exception 'not found'; end if;
  insert into public.crew_members (user_id, crew_id) values (auth.uid(), i.crew_id);
  update public.crew_invites set status = 'accepted' where id = iid;
  update public.crew_invites set status = 'declined' where to_user = auth.uid() and status = 'pending';
end $$;

-- ---------- 邀請碼 / QR code ----------
create table if not exists public.crew_codes (
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  crew_id bigint not null references public.crews on delete cascade,
  created_by uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null,
  max_uses int not null default 20 check (max_uses between 1 and 200),
  uses int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.crew_codes enable row level security;
drop policy if exists "crew managers see codes" on public.crew_codes;
create policy "crew managers see codes" on public.crew_codes for select using (
  exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = crew_codes.crew_id and m.rank in ('leader', 'vice')));
grant select on public.crew_codes to authenticated;

create or replace function public.crew_code_new(days int, max_uses int) returns text
language plpgsql security definer set search_path = public as $$
declare cid bigint; c text; chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  select crew_id into cid from public.crew_members where user_id = auth.uid() and rank in ('leader', 'vice');
  if cid is null then raise exception 'not allowed'; end if;
  if (select count(*) from public.crew_codes where crew_id = cid and expires_at > now()) >= 10 then raise exception 'too many'; end if;
  loop
    c := ''; for i in 1 .. 8 loop c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    exit when not exists (select 1 from public.crew_codes where code = c);
  end loop;
  insert into public.crew_codes (code, crew_id, created_by, expires_at, max_uses)
    values (c, cid, auth.uid(), now() + make_interval(days => greatest(1, least(coalesce(days, 7), 30))), greatest(1, least(coalesce(max_uses, 20), 200)));
  return c;
end $$;

create or replace function public.crew_code_revoke(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.crew_codes c where c.code = upper(p_code)
    and exists (select 1 from public.crew_members m where m.user_id = auth.uid() and m.crew_id = c.crew_id and m.rank in ('leader', 'vice'));
end $$;

-- 用邀請碼看是哪個舞團（還沒加入前先看介紹）
create or replace function public.crew_code_info(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('crew_id', c.id, 'name', c.name, 'valid', k.expires_at > now() and k.uses < k.max_uses)
  from public.crew_codes k join public.crews c on c.id = k.crew_id and c.status = 'approved' where k.code = upper(p_code)
$$;

create or replace function public.crew_code_join(p_code text) returns bigint
language plpgsql security definer set search_path = public as $$
declare k public.crew_codes;
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  select * into k from public.crew_codes where code = upper(p_code) for update;
  if k is null or k.expires_at <= now() or k.uses >= k.max_uses then raise exception 'bad code'; end if;
  if not exists (select 1 from public.crews where id = k.crew_id and status = 'approved') then raise exception 'bad code'; end if;
  if exists (select 1 from public.crew_members where user_id = auth.uid()) then raise exception 'already in crew'; end if;
  insert into public.crew_members (user_id, crew_id) values (auth.uid(), k.crew_id);
  update public.crew_codes set uses = uses + 1 where code = k.code;
  update public.crew_invites set status = 'declined' where to_user = auth.uid() and status = 'pending';
  return k.crew_id;
end $$;

grant execute on function public.crew_invite(uuid), public.crew_invite_answer(bigint, boolean), public.crew_code_new(int, int),
  public.crew_code_revoke(text), public.crew_code_join(text) to authenticated;
grant execute on function public.crew_code_info(text) to anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'crew_invites') then alter publication supabase_realtime add table public.crew_invites; end if;
end $$;
