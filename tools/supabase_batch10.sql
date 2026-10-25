-- =========================================================
-- 舞島 — 第十批：論壇文章可以附照片 / 影片 / YouTube，可以附投票
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

alter table public.forum_posts add column if not exists media jsonb;   -- [{ "type": "image"|"video"|"youtube", "url": "..." }]
alter table public.forum_posts add column if not exists poll jsonb;    -- { "q": "...", "options": ["A", "B"] }

-- 檔案空間：照片（5MB 內）、影片（MP4，50MB 內）；玩家只能放到自己的資料夾
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forum', 'forum', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
drop policy if exists "forum media read" on storage.objects;
create policy "forum media read" on storage.objects for select using (bucket_id = 'forum');
drop policy if exists "forum media upload" on storage.objects;
create policy "forum media upload" on storage.objects for insert with check (
  bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.players p where p.user_id = auth.uid() and not p.banned));
drop policy if exists "forum media delete" on storage.objects;
create policy "forum media delete" on storage.objects for delete using (bucket_id = 'forum' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 發文檢查：加上附件和投票的規則
create or replace function public.guard_forum_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players; m jsonb; n int; o text;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if (select count(*) from public.forum_posts where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many'; end if;
  if public.is_spam(new.title || ' ' || new.body || ' ' || coalesce(new.poll::text, '')) then raise exception 'spam'; end if;
  -- 附件：最多 4 張照片 + 1 支影片或 YouTube；照片 / 影片只能是論壇空間裡自己的檔案
  if new.media is not null then
    if jsonb_typeof(new.media) <> 'array' or jsonb_array_length(new.media) > 5 then raise exception 'bad media'; end if;
    for m in select * from jsonb_array_elements(new.media) loop
      if m->>'type' = 'youtube' then
        if coalesce(m->>'url', '') !~ '^https://(www\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)[A-Za-z0-9_-]{6,}' then raise exception 'bad media'; end if;
      elsif m->>'type' in ('image', 'video') then
        if coalesce(m->>'url', '') !~ ('/storage/v1/object/public/forum/' || auth.uid()::text || '/') then raise exception 'bad media'; end if;
      else raise exception 'bad media'; end if;
    end loop;
    if (select count(*) from jsonb_array_elements(new.media) x where x->>'type' = 'image') > 4
       or (select count(*) from jsonb_array_elements(new.media) x where x->>'type' in ('video', 'youtube')) > 1 then raise exception 'bad media'; end if;
  end if;
  -- 投票：題目 100 字內、2～6 個選項、每個 40 字內
  if new.poll is not null then
    if char_length(coalesce(new.poll->>'q', '')) not between 1 and 100 or jsonb_typeof(new.poll->'options') <> 'array' then raise exception 'bad poll'; end if;
    n := jsonb_array_length(new.poll->'options');
    if n < 2 or n > 6 then raise exception 'bad poll'; end if;
    for o in select jsonb_array_elements_text(new.poll->'options') loop
      if char_length(trim(o)) not between 1 and 40 then raise exception 'bad poll'; end if;
    end loop;
    new.poll := jsonb_build_object('q', new.poll->>'q', 'options', new.poll->'options');
  end if;
  new.user_id := auth.uid(); new.status := 'pending'; new.pinned := false; new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'look', p.look, 'verified', p.verified);
  return new;
end $$;

-- 投票：每人每篇一票；文章要通過審核才能投
create table if not exists public.poll_votes (
  post_id bigint not null references public.forum_posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  choice int not null check (choice between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.poll_votes enable row level security;
drop policy if exists "poll votes readable" on public.poll_votes;
create policy "poll votes readable" on public.poll_votes for select using (true);
drop policy if exists "vote in poll" on public.poll_votes;
create policy "vote in poll" on public.poll_votes for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.forum_posts f where f.id = post_id and f.status = 'approved' and f.poll is not null
    and choice < jsonb_array_length(f.poll->'options'))
  and exists (select 1 from public.players p where p.user_id = auth.uid() and not p.banned));
grant select on public.poll_votes to anon, authenticated;
grant insert on public.poll_votes to authenticated;
