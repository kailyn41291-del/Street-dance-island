-- =========================================================
-- 舞島 — 第十三批：互動功能
-- 「我會去」、玩家 Like、生日 / 血型（名片欄位檢查）、雙人成就、隊友互評（可靠隊友）、
-- 活動現場合照牆、舞島知識+（論壇問答，選最佳解答）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- 好友判斷（很多地方會用到）
create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friend_requests where status = 'accepted' and ((from_user = a and to_user = b) or (from_user = b and to_user = a)))
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- ---------- 1. 我會去 ----------
create table if not exists public.going (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.going enable row level security;
drop policy if exists "own going" on public.going;
create policy "own going" on public.going for select using (user_id = auth.uid());
drop policy if exists "mark going" on public.going;
create policy "mark going" on public.going for insert with check (
  user_id = auth.uid() and exists (select 1 from public.players p where p.user_id = auth.uid() and not p.banned));
drop policy if exists "unmark going" on public.going;
create policy "unmark going" on public.going for delete using (user_id = auth.uid());
grant select, insert, delete on public.going to authenticated;
-- 每個活動有幾個人會去（只給數字，不給名單）
create or replace function public.going_counts() returns table (event_id text, n bigint)
language sql stable security definer set search_path = public as $$
  select event_id, count(*) from public.going group by event_id
$$;
-- 我的好友裡，誰會去哪些活動
create or replace function public.my_friends_going() returns table (event_id text, user_id uuid)
language sql stable security definer set search_path = public as $$
  select g.event_id, g.user_id from public.going g where auth.uid() is not null and g.user_id <> auth.uid() and public.are_friends(auth.uid(), g.user_id)
$$;
grant execute on function public.going_counts() to anon, authenticated;
grant execute on function public.my_friends_going() to authenticated;

-- ---------- 2. 玩家 Like（每天每人可以給同一個人 1 個，每天最多送 10 個；收到的人 +2 XP） ----------
create table if not exists public.player_likes (
  from_user uuid not null default auth.uid() references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  day date not null default public.tw_today(),
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, day)
);
alter table public.player_likes enable row level security;
create or replace function public.guard_player_like() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  new.from_user := auth.uid(); new.day := public.tw_today(); new.created_at := now();
  if new.to_user = new.from_user then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.players where user_id = new.to_user) then raise exception 'not allowed'; end if;
  if (select count(*) from public.player_likes where from_user = auth.uid() and day = public.tw_today()) >= 10 then raise exception 'too many'; end if;
  return new;
end $$;
drop trigger if exists guard_player_like on public.player_likes;
create trigger guard_player_like before insert on public.player_likes for each row execute function public.guard_player_like();
create or replace function public.player_like_xp() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform public.grant_xp(new.to_user, 'liked', new.from_user::text || ':' || new.day, 2, false); return new; end $$;
drop trigger if exists player_like_xp on public.player_likes;
create trigger player_like_xp after insert on public.player_likes for each row execute function public.player_like_xp();
drop policy if exists "own likes sent" on public.player_likes;
create policy "own likes sent" on public.player_likes for select using (from_user = auth.uid());
drop policy if exists "send like" on public.player_likes;
create policy "send like" on public.player_likes for insert with check (from_user = auth.uid());
grant select, insert on public.player_likes to authenticated;
create or replace function public.player_like_count(uid uuid) returns bigint
language sql stable security definer set search_path = public as $$ select count(*) from public.player_likes where to_user = uid $$;
grant execute on function public.player_like_count(uuid) to anon, authenticated;

-- ---------- 3. 名片：生日 / 出生年 / 血型 / 是否公開（格式不對就拿掉） ----------
create or replace function public.guard_card_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.card is not null then
    if new.card ? 'bday' and coalesce(new.card->>'bday', '') !~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then new.card := new.card - 'bday'; end if;
    if new.card ? 'byear' and coalesce(new.card->>'byear', '') !~ '^(19[3-9][0-9]|20[0-2][0-9])$' then new.card := new.card - 'byear'; end if;
    if new.card ? 'blood' and coalesce(new.card->>'blood', '') not in ('A', 'B', 'O', 'AB') then new.card := new.card - 'blood'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_card_profile on public.players;
create trigger guard_card_profile before insert or update on public.players for each row execute function public.guard_card_profile();

-- ---------- 4. 隊友互評（隊伍集合時間過後 14 天內，隊員可以給彼此「👍 可靠」） ----------
create table if not exists public.party_ratings (
  party_id bigint not null references public.parties on delete cascade,
  from_user uuid not null default auth.uid() references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (party_id, from_user, to_user)
);
alter table public.party_ratings enable row level security;
create or replace function public.guard_party_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare x public.parties;
begin
  new.from_user := auth.uid(); new.created_at := now();
  select * into x from public.parties where id = new.party_id;
  if x is null or new.to_user = new.from_user then raise exception 'not allowed'; end if;
  if x.meet_at > now() or x.meet_at < now() - interval '14 days' then raise exception 'bad time'; end if;
  if not exists (select 1 from public.party_members where party_id = x.id and user_id = new.from_user)
     or not exists (select 1 from public.party_members where party_id = x.id and user_id = new.to_user) then raise exception 'not allowed'; end if;
  return new;
end $$;
drop trigger if exists guard_party_rating on public.party_ratings;
create trigger guard_party_rating before insert on public.party_ratings for each row execute function public.guard_party_rating();
drop policy if exists "own ratings" on public.party_ratings;
create policy "own ratings" on public.party_ratings for select using (from_user = auth.uid());
drop policy if exists "give rating" on public.party_ratings;
create policy "give rating" on public.party_ratings for insert with check (from_user = auth.uid());
grant select, insert on public.party_ratings to authenticated;
-- 被幾個不同的隊友評為可靠
create or replace function public.reliable_count(uid uuid) returns bigint
language sql stable security definer set search_path = public as $$ select count(distinct from_user) from public.party_ratings where to_user = uid $$;
grant execute on function public.reliable_count(uuid) to anon, authenticated;

-- ---------- 5. 活動現場合照牆（有在那個活動打卡的人才能上傳，每人每場最多 6 張） ----------
create table if not exists public.event_photos (
  id bigint generated always as identity primary key,
  event_id text not null check (char_length(event_id) between 1 and 100),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author jsonb,
  url text not null check (char_length(url) <= 500),
  caption text check (char_length(caption) <= 60),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.event_photos enable row level security;
create or replace function public.guard_event_photo() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if not exists (select 1 from public.checkins where user_id = auth.uid() and event_id = new.event_id) then raise exception 'need checkin'; end if;
  if (select count(*) from public.event_photos where user_id = auth.uid() and event_id = new.event_id) >= 6 then raise exception 'too many'; end if;
  if new.url !~ ('/storage/v1/object/public/forum/' || auth.uid()::text || '/') then raise exception 'bad media'; end if;
  if public.is_spam(coalesce(new.caption, '')) then raise exception 'spam'; end if;
  new.user_id := auth.uid(); new.hidden := false; new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name);
  return new;
end $$;
drop trigger if exists guard_event_photo on public.event_photos;
create trigger guard_event_photo before insert on public.event_photos for each row execute function public.guard_event_photo();
drop policy if exists "photos readable" on public.event_photos;
create policy "photos readable" on public.event_photos for select using (not hidden or user_id = auth.uid() or public.is_admin());
drop policy if exists "post photo" on public.event_photos;
create policy "post photo" on public.event_photos for insert with check (auth.uid() is not null);
drop policy if exists "hide photo" on public.event_photos;
create policy "hide photo" on public.event_photos for update using (public.is_admin());
drop policy if exists "delete photo" on public.event_photos;
create policy "delete photo" on public.event_photos for delete using (user_id = auth.uid() or public.is_admin());
grant select on public.event_photos to anon, authenticated;
grant insert, update, delete on public.event_photos to authenticated;
create or replace function public.photo_counts() returns table (event_id text, n bigint)
language sql stable security definer set search_path = public as $$ select event_id, count(*) from public.event_photos where not hidden group by event_id $$;
grant execute on function public.photo_counts() to anon, authenticated;

-- ---------- 6. 舞島知識+：論壇多一個「問答」分類，發問的人可以選最佳解答 ----------
alter table public.forum_posts drop constraint if exists forum_posts_category_check;
alter table public.forum_posts add constraint forum_posts_category_check check (category in ('chat', 'crew', 'skill', 'event', 'music', 'other', 'qa'));
alter table public.forum_posts add column if not exists best_reply bigint;
-- 最佳解答：回答的人 +30 XP，發問的人 +5 XP（每題只能選一次，不能選自己）
create or replace function public.qa_accept(pid bigint, rid bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.forum_posts; r public.replies;
begin
  select * into p from public.forum_posts where id = pid;
  if p is null or p.user_id <> auth.uid() or p.category <> 'qa' or p.status <> 'approved' then raise exception 'not allowed'; end if;
  if p.best_reply is not null then raise exception 'already'; end if;
  select * into r from public.replies where id = rid and thread = 'p:' || pid;
  if r is null or r.user_id = auth.uid() then raise exception 'not allowed'; end if;
  update public.forum_posts set best_reply = rid where id = pid;
  perform public.grant_xp(r.user_id, 'qa_best', pid::text, 30, true);
  perform public.grant_xp(auth.uid(), 'qa_ask', pid::text, 5, false);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.qa_accept(bigint, bigint) to authenticated;

-- ---------- 7. 新成就：雙人同行、最佳拍檔、可靠隊友、人氣舞者、知識+ 達人 ----------
create or replace function public.check_achievements() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); got jsonb := '[]'; r record;
  tw int; cc int; ck int; best int; npc int; fr int; msg int; posts int; talk int; vt int; stk int; pw int; pts int; spins int; favs int; subs int; liked int;
  duo int; rel int; plk int; qa int;
begin
  if uid is null or not exists (select 1 from public.players where user_id = uid) then return '[]'; end if;
  select count(distinct city) into tw from public.checkins where user_id = uid and country = 'TW';
  select count(distinct country) into cc from public.checkins where user_id = uid;
  select count(*) into ck from public.checkins where user_id = uid;
  select coalesce(max(score), 0) into best from public.scores where user_id = uid;
  select coalesce(max(wins), 0) into npc from public.npc_wins where user_id = uid;
  select count(*) into fr from public.friend_requests where (from_user = uid or to_user = uid) and status = 'accepted';
  select count(*) into msg from public.messages where user_id = uid;
  select count(*) into posts from public.forum_posts where user_id = uid and status = 'approved';
  select (select count(*) from public.replies where user_id = uid) + (select count(*) from public.comments where user_id = uid) into talk;
  select count(*) into vt from public.votes where user_id = uid;
  stk := public.login_streak(uid);
  select count(*) into pw from public.xp_log where user_id = uid and kind = 'pvpwin';
  select coalesce(max(points), 0) into pts from public.pvp_season where user_id = uid;
  select count(*) into spins from public.daily where user_id = uid;
  select count(*) into favs from public.favorites where user_id = uid;
  select count(*) into subs from public.submissions where user_id = uid and status = 'approved';
  select count(*) into liked from public.xp_log where user_id = uid and kind = 'forum_like10';
  -- 和幾位不同的好友一起打卡過同一場活動
  select count(distinct c2.user_id) into duo from public.checkins c1 join public.checkins c2 on c2.event_id = c1.event_id and c2.user_id <> c1.user_id
    where c1.user_id = uid and public.are_friends(uid, c2.user_id);
  rel := public.reliable_count(uid);
  plk := public.player_like_count(uid);
  select count(*) into qa from public.xp_log where user_id = uid and kind = 'qa_best';
  for r in select * from (values
      ('tw5', tw >= 5, 100), ('tw22', tw >= 22, 800), ('country3', cc >= 3, 150), ('country10', cc >= 10, 600),
      ('comp1', ck >= 1, 50), ('comp5', ck >= 5, 200), ('comp10', ck >= 10, 400),
      ('rhythm_a', best >= 5000, 100), ('rhythm_s', best >= 6000, 250), ('npc5', npc >= 5, 50), ('npc30', npc >= 30, 200),
      ('friend1', fr >= 1, 30), ('friend10', fr >= 10, 150), ('friend30', fr >= 30, 300), ('chat100', msg >= 100, 100),
      ('forum1', posts >= 1, 50), ('talk50', talk >= 50, 150), ('vote10', vt >= 10, 100), ('streak7', stk >= 7, 100), ('streak30', stk >= 30, 400),
      ('pvp1', pw >= 1, 50), ('pvp10', pw >= 10, 200), ('gold', pts >= 500, 300), ('king', pts >= 1000, 600),
      ('crew', exists (select 1 from public.crew_members where user_id = uid), 50), ('crewlead', exists (select 1 from public.crews where leader = uid and status = 'approved'), 200),
      ('verified', exists (select 1 from public.players where user_id = uid and verified), 100), ('spin30', spins >= 30, 200), ('fav10', favs >= 10, 50),
      ('submit1', subs >= 1, 100), ('liked10', liked >= 1, 100),
      ('duo1', duo >= 1, 80), ('duo5', duo >= 5, 300), ('reliable', rel >= 5, 200), ('plike30', plk >= 30, 150), ('qa1', qa >= 1, 50), ('qa10', qa >= 10, 300)
    ) as a(id, ok, xp) loop
    if r.ok and not exists (select 1 from public.achievements where user_id = uid and id = r.id) then
      insert into public.achievements (user_id, id) values (uid, r.id);
      perform public.grant_xp(uid, 'ach', r.id, r.xp, false);
      got := got || jsonb_build_object('id', r.id, 'xp', r.xp);
    end if;
  end loop;
  -- 稱號：可靠隊友、最佳拍檔
  if rel >= 5 then insert into public.unlocks (user_id, item) values (uid, 'r_reliable') on conflict do nothing; end if;
  if duo >= 5 then insert into public.unlocks (user_id, item) values (uid, 'r_duo') on conflict do nothing; end if;
  return got;
end $$;
grant execute on function public.check_achievements() to authenticated;
