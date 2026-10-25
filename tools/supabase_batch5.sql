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
