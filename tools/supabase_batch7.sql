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
