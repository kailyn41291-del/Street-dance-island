-- =========================================================
-- 舞島 — 第二十七批：影片改成「貼連結」
-- 論壇、本週動作接力的影片，只能貼 YouTube / IG / TikTok 連結，不再直接上傳到 Supabase
-- （省空間、省流量；之前已經上傳的影片照常播放）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- 論壇發文檢查
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
      if m->>'type' in ('youtube', 'clip') then          -- 影片：只能貼 YouTube / IG / TikTok 連結
        if coalesce(m->>'url', '') !~ '^https://((www\.|m\.)?(youtube\.com/(watch\?(.*&)?v=|shorts/|live/)|youtu\.be/)[A-Za-z0-9_-]{6,}|(www\.)?instagram\.com/([A-Za-z0-9_.]+/)?(p|reel|reels|tv)/[A-Za-z0-9_-]{5,}|(www\.|m\.)?tiktok\.com/@[A-Za-z0-9_.-]+/video/[0-9]{8,})' then raise exception 'bad media'; end if;
      elsif m->>'type' = 'image' then
        if coalesce(m->>'url', '') !~ ('/storage/v1/object/public/forum/' || auth.uid()::text || '/') then raise exception 'bad media'; end if;
      else raise exception 'bad media'; end if;          -- 不再接受直接上傳的影片
    end loop;
    if (select count(*) from jsonb_array_elements(new.media) x where x->>'type' = 'image') > 4
       or (select count(*) from jsonb_array_elements(new.media) x where x->>'type' in ('youtube', 'clip')) > 1 then raise exception 'bad media'; end if;
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

-- 本週動作接力投稿檢查
create or replace function public.guard_move_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if new.video !~ '^https://((www\.|m\.)?(youtube\.com/(watch\?(.*&)?v=|shorts/|live/)|youtu\.be/)[A-Za-z0-9_-]{6,}|(www\.)?instagram\.com/([A-Za-z0-9_.]+/)?(p|reel|reels|tv)/[A-Za-z0-9_-]{5,}|(www\.|m\.)?tiktok\.com/@[A-Za-z0-9_.-]+/video/[0-9]{8,})' then raise exception 'bad media'; end if;   -- 只能貼 YouTube / IG / TikTok 連結
  if public.is_spam(coalesce(new.caption, '')) then raise exception 'spam'; end if;
  if new.nominee is not null then
    new.nominee := lower(regexp_replace(new.nominee, '^@', ''));
    if new.nominee = p.handle or not exists (select 1 from public.players where handle = new.nominee) then new.nominee := null; end if;
  end if;
  new.week := public.tw_week(); new.user_id := auth.uid(); new.hidden := false; new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'look', p.look);
  return new;
end $$;

-- 論壇檔案空間只收照片（每張 5MB 內），擋掉影片
update storage.buckets set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'], file_size_limit = 5242880 where id = 'forum';
