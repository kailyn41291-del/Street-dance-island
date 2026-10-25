-- =========================================================
-- 舞島 — 第六批：上線時間、私訊傳圖片、贊助商廣告
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 最後上線時間（好友列表顯示「3 小時前上線」） ----------
alter table public.players add column if not exists last_seen timestamptz;
create or replace function public.touch_seen() returns void
language sql security definer set search_path = public as
$$ update public.players set last_seen = now() where user_id = auth.uid() $$;
grant execute on function public.touch_seen() to authenticated;

-- ---------- 私訊圖片：只有傳送者和接收者看得到；只能傳給好友；單張 5MB ----------
-- 檔案路徑：<傳送者 id>/<接收者 id>/<檔名>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dm-images', 'dm-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
drop policy if exists "dm images read" on storage.objects;
create policy "dm images read" on storage.objects for select using (
  bucket_id = 'dm-images' and (auth.uid()::text = (storage.foldername(name))[1] or auth.uid()::text = (storage.foldername(name))[2]));
drop policy if exists "dm images upload" on storage.objects;
create policy "dm images upload" on storage.objects for insert with check (
  bucket_id = 'dm-images' and auth.uid()::text = (storage.foldername(name))[1]
  and public.are_friends(auth.uid(), ((storage.foldername(name))[2])::uuid)
  and not exists (select 1 from public.blocks b where b.user_id = ((storage.foldername(name))[2])::uuid and b.blocked = auth.uid()));
drop policy if exists "dm images delete own" on storage.objects;
create policy "dm images delete own" on storage.objects for delete using (bucket_id = 'dm-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ---------- 贊助商廣告（彈窗 / 橫幅 / 圖片輪播） ----------
create table if not exists public.sponsors (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'banner' check (kind in ('popup', 'banner', 'broadcast')),
  image_url text,
  link text check (link is null or link ~ '^https://'),
  text text check (char_length(text) <= 200),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  weight int not null default 1 check (weight between 1 and 10),
  created_at timestamptz not null default now()
);
alter table public.sponsors enable row level security;
drop policy if exists "sponsors readable" on public.sponsors;
create policy "sponsors readable" on public.sponsors for select using (true);
drop policy if exists "admins manage sponsors" on public.sponsors;
create policy "admins manage sponsors" on public.sponsors for all using (public.is_admin()) with check (public.is_admin());

-- 曝光 / 點擊次數（只有管理員看得到）
create table if not exists public.sponsor_stats (
  sponsor_id bigint not null references public.sponsors on delete cascade,
  day date not null default (now() at time zone 'Asia/Taipei')::date,
  kind text not null check (kind in ('imp', 'click')),
  n bigint not null default 0,
  primary key (sponsor_id, day, kind)
);
alter table public.sponsor_stats enable row level security;
drop policy if exists "admins read sponsor stats" on public.sponsor_stats;
create policy "admins read sponsor stats" on public.sponsor_stats for select using (public.is_admin());
create or replace function public.bump_sponsor(sid bigint, k text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if k not in ('imp', 'click') or not exists (select 1 from public.sponsors where id = sid) then return; end if;
  insert into public.sponsor_stats (sponsor_id, kind, n) values (sid, k, 1)
    on conflict (sponsor_id, day, kind) do update set n = public.sponsor_stats.n + 1;
end $$;
grant execute on function public.bump_sponsor(bigint, text) to anon, authenticated;

-- 廣告圖片：公開觀看，只有管理員上傳
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsors', 'sponsors', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 3145728;
drop policy if exists "sponsor images read" on storage.objects;
create policy "sponsor images read" on storage.objects for select using (bucket_id = 'sponsors');
drop policy if exists "admins upload sponsor images" on storage.objects;
create policy "admins upload sponsor images" on storage.objects for insert with check (bucket_id = 'sponsors' and public.is_admin());
drop policy if exists "admins delete sponsor images" on storage.objects;
create policy "admins delete sponsor images" on storage.objects for delete using (bucket_id = 'sponsors' and public.is_admin());

grant select on public.sponsors to anon, authenticated;
grant insert, update, delete on public.sponsors to authenticated;
grant select on public.sponsor_stats to authenticated;
