-- =========================================================
-- 舞島 — 第八批：經驗值系統（全部在伺服器端計算，不能作弊）
-- 每日任務 / 連續登入倍率 / 每週挑戰 / 好友互動 / 排名賽 / 論壇優質內容 /
-- 成就 / 舞團經驗與每週排行 / 活動現場加成 / 活動資訊糾錯
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 經驗值帳本：每筆獎勵一行，(人, 種類, 編號) 不能重複領 ----------
create table if not exists public.xp_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  ref text not null,
  amount int not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index if not exists xp_log_user_time on public.xp_log (user_id, created_at);
alter table public.xp_log enable row level security;
drop policy if exists "own xp log" on public.xp_log;
create policy "own xp log" on public.xp_log for select using (user_id = auth.uid());
grant select on public.xp_log to authenticated;

-- 台灣時間的「今天」、「這週一」
create or replace function public.tw_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Taipei')::date $$;
create or replace function public.tw_week() returns date language sql stable as $$ select date_trunc('week', now() at time zone 'Asia/Taipei')::date $$;
create or replace function public.tw_start(d date) returns timestamptz language sql stable as $$ select (d::timestamp at time zone 'Asia/Taipei') $$;

-- ---------- 連續登入 ----------
create table if not exists public.login_days (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.login_days enable row level security;
drop policy if exists "own login days" on public.login_days;
create policy "own login days" on public.login_days for select using (user_id = auth.uid());

create or replace function public.login_streak(uid uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare d date := public.tw_today(); n int := 0;
begin
  if not exists (select 1 from public.login_days where user_id = uid and day = d) then d := d - 1; end if;
  while exists (select 1 from public.login_days where user_id = uid and day = d) loop n := n + 1; d := d - 1; end loop;
  return n;
end $$;
-- 倍率：3 天 ×1.2、7 天 ×1.5、14 天 ×1.75、30 天 ×2
create or replace function public.xp_mult(uid uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select case when s >= 30 then 2.0 when s >= 14 then 1.75 when s >= 7 then 1.5 when s >= 3 then 1.2 else 1.0 end
  from (select public.login_streak(uid) s) x
$$;

-- 發經驗值（只有伺服器內部的函式會呼叫）
create or replace function public.grant_xp(uid uuid, k text, r text, base int, use_mult boolean default true) returns int
language plpgsql security definer set search_path = public as $$
declare amt int := case when use_mult then round(base * public.xp_mult(uid))::int else base end; got int;
begin
  insert into public.xp_log (user_id, kind, ref, amount) values (uid, k, r, amt) on conflict do nothing returning amount into got;
  return coalesce(got, 0);
end $$;
revoke all on function public.grant_xp(uuid, text, text, int, boolean) from public, anon, authenticated;

-- 上線時間（每 4 分鐘呼叫）：順便記錄登入日、連續 30 天送「定居島民」
create or replace function public.touch_seen() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.players set last_seen = now() where user_id = auth.uid();
  insert into public.login_days (user_id, day) values (auth.uid(), public.tw_today()) on conflict do nothing;
  if public.login_streak(auth.uid()) >= 30 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_islander') on conflict do nothing; end if;
end $$;
grant execute on function public.touch_seen() to authenticated;

-- ---------- 玩家行為紀錄（瀏覽活動、逛國家、看名片、分享、舞池出招） ----------
create table if not exists public.act_log (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('view', 'country', 'card', 'share', 'cypher')),
  ref text not null check (char_length(ref) between 1 and 100),
  day date not null default public.tw_today(),
  primary key (user_id, kind, ref, day)
);
alter table public.act_log enable row level security;
drop policy if exists "own acts" on public.act_log;
create policy "own acts" on public.act_log for select using (user_id = auth.uid());
create or replace function public.log_act(k text, r text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid()) then return; end if;
  if k = 'country' and r !~ '^[A-Z]{2}$' then return; end if;
  if k in ('view', 'share') and r !~ '^[A-Za-z0-9_-]{1,100}$' then return; end if;
  if k = 'card' and not exists (select 1 from public.players where handle = r) then return; end if;
  if (select count(*) from public.act_log where user_id = auth.uid() and day = public.tw_today()) >= 300 then return; end if;
  insert into public.act_log (user_id, kind, ref) values (auth.uid(), k, left(r, 100)) on conflict do nothing;
end $$;
grant execute on function public.log_act(text, text) to authenticated;

-- ---------- 每日任務：每人每天 3 個（伺服器決定、伺服器算進度） ----------
create or replace function public.quest_need(q text) returns int language sql immutable as $$
  select case q when 'view' then 3 when 'country' then 3 when 'friend' then 2 when 'card' then 3 when 'chat' then 3 when 'fav' then 2 else 1 end $$;
create or replace function public.quest_prog(uid uuid, q text, d date) returns int
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := public.tw_start(d); e timestamptz := public.tw_start(d + 1);
begin
  return case q
    when 'view' then (select count(*) from public.act_log where user_id = uid and kind = 'view' and day = d)
    when 'country' then (select count(*) from public.act_log where user_id = uid and kind = 'country' and day = d)
    when 'card' then (select count(*) from public.act_log where user_id = uid and kind = 'card' and day = d)
    when 'share' then (select count(*) from public.act_log where user_id = uid and kind = 'share' and day = d)
    when 'cypher' then (select count(*) from public.act_log where user_id = uid and kind = 'cypher' and day = d)
    when 'friend' then (select count(*) from public.friend_requests where (from_user = uid or to_user = uid) and status = 'accepted' and coalesce(responded_at, created_at) >= s and coalesce(responded_at, created_at) < e)
               + (select count(*) from public.friend_requests where from_user = uid and status = 'pending' and created_at >= s and created_at < e)
    when 'emote' then (select count(*) from public.messages where user_id = uid and text ~ '^/[a-z]+$' and created_at >= s and created_at < e)
    when 'chat' then (select count(*) from public.messages where user_id = uid and text !~ '^/[a-z]+$' and created_at >= s and created_at < e)
    when 'vote' then (select count(*) from public.votes where user_id = uid and created_at >= s and created_at < e)
    when 'speak' then (select count(*) from public.replies where user_id = uid and created_at >= s and created_at < e)
               + (select count(*) from public.comments where user_id = uid and created_at >= s and created_at < e)
               + (select count(*) from public.forum_posts where user_id = uid and created_at >= s and created_at < e)
    when 'comment' then (select count(*) from public.comments where user_id = uid and created_at >= s and created_at < e)
    when 'fav' then (select count(*) from public.favorites where user_id = uid and created_at >= s and created_at < e)
    when 'rhythm' then (select count(*) from public.scores where user_id = uid and created_at >= s and created_at < e)
    when 'npc' then (select count(*) from public.xp_log where user_id = uid and kind = 'npcwin' and created_at >= s and created_at < e)
    when 'spin' then (select count(*) from public.daily where user_id = uid and day = d)
    else 0 end;
end $$;
create or replace function public.my_quests() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.tw_today(); live boolean; out jsonb := '[]'; q text;
begin
  if uid is null then return '[]'; end if;
  live := exists (select 1 from public.battles where ends_at > now());
  for q in select x from unnest(array['view','country','friend','card','emote','chat','vote','speak','comment','fav','share','rhythm','npc','spin','cypher']) x
           where x <> 'vote' or live order by md5(uid::text || d::text || x) limit 3 loop
    out := out || jsonb_build_object('id', q, 'n', public.quest_need(q), 'prog', least(public.quest_need(q), public.quest_prog(uid, q, d)),
      'claimed', exists (select 1 from public.xp_log where user_id = uid and kind = 'quest' and ref = d || ':' || q));
  end loop;
  return jsonb_build_object('day', d, 'quests', out, 'all', exists (select 1 from public.xp_log where user_id = uid and kind = 'quest_all' and ref = d::text),
    'streak', public.login_streak(uid), 'mult', public.xp_mult(uid));
end $$;
-- 領任務獎勵：+15 XP（乘連續登入倍率）；三個都領完再 +30
create or replace function public.claim_quest(q text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.tw_today(); mine jsonb; got int := 0; bonus int := 0;
begin
  mine := public.my_quests()->'quests';
  if not exists (select 1 from jsonb_array_elements(mine) j where j->>'id' = q) then raise exception 'not your quest'; end if;
  if public.quest_prog(uid, q, d) < public.quest_need(q) then raise exception 'not done'; end if;
  got := public.grant_xp(uid, 'quest', d || ':' || q, 15);
  if (select count(*) from public.xp_log where user_id = uid and kind = 'quest' and ref like d || ':%') >= 3 then bonus := public.grant_xp(uid, 'quest_all', d::text, 30); end if;
  return jsonb_build_object('xp', got, 'bonus', bonus);
end $$;
grant execute on function public.my_quests(), public.claim_quest(text) to authenticated;

-- NPC 對戰勝利也記在帳本（每日任務用）
create or replace function public.npc_win() returns jsonb
language plpgsql security definer set search_path = public as $$
declare w int; last timestamptz;
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid()) then raise exception 'need character'; end if;
  select wins, last_at into w, last from public.npc_wins where user_id = auth.uid();
  if last is not null and last > now() - interval '20 seconds' then raise exception 'too fast'; end if;
  insert into public.npc_wins (user_id, wins, last_at) values (auth.uid(), 1, now())
    on conflict (user_id) do update set wins = public.npc_wins.wins + 1, last_at = now() returning wins into w;
  if w >= 5 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcslayer') on conflict do nothing; end if;
  if w >= 30 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcboss') on conflict do nothing; end if;
  perform public.grant_xp(auth.uid(), 'npcwin', w::text, 0, false);
  return jsonb_build_object('wins', w);
end $$;

-- ---------- 每週挑戰：每人每週 1 個，+200 XP，第一次完成送「週週挑戰王」 ----------
create or replace function public.weekly_need(q text) returns int language sql immutable as $$
  select case q when 'checkin' then 1 when 'pvp' then 3 when 'talk' then 8 when 'daily' then 4 when 'rhythm' then 1 when 'friends' then 3 when 'votes' then 3 else 1 end $$;
create or replace function public.weekly_prog(uid uuid, q text) returns int
language plpgsql stable security definer set search_path = public as $$
declare w date := public.tw_week(); s timestamptz := public.tw_start(public.tw_week());
begin
  return case q
    when 'checkin' then (select count(*) from public.checkins where user_id = uid and created_at >= s)
    when 'pvp' then (select count(*) from public.xp_log where user_id = uid and kind = 'pvpwin' and created_at >= s)
    when 'talk' then (select count(*) from public.replies where user_id = uid and created_at >= s) + (select count(*) from public.comments where user_id = uid and created_at >= s)
    when 'daily' then (select count(*) from public.xp_log where user_id = uid and kind = 'quest_all' and created_at >= s)
    when 'rhythm' then (select count(*) from public.scores where user_id = uid and score >= 5000 and created_at >= s)
    when 'friends' then (select count(*) from public.friend_requests where (from_user = uid or to_user = uid) and status = 'accepted' and coalesce(responded_at, created_at) >= s)
    when 'votes' then (select count(*) from public.votes where user_id = uid and created_at >= s)
    else 0 end;
end $$;
create or replace function public.my_weekly() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w date := public.tw_week(); q text;
begin
  if uid is null then return null; end if;
  select x into q from unnest(array['checkin','pvp','talk','daily','rhythm','friends','votes']) x order by md5(uid::text || w::text || x) limit 1;
  return jsonb_build_object('week', w, 'id', q, 'n', public.weekly_need(q), 'prog', least(public.weekly_need(q), public.weekly_prog(uid, q)),
    'claimed', exists (select 1 from public.xp_log where user_id = uid and kind = 'weekly' and ref = w::text));
end $$;
create or replace function public.claim_weekly() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m jsonb := public.my_weekly(); got int;
begin
  if m is null or (m->>'prog')::int < (m->>'n')::int then raise exception 'not done'; end if;
  got := public.grant_xp(uid, 'weekly', m->>'week', 200);
  insert into public.unlocks (user_id, item) values (uid, 'r_challenger') on conflict do nothing;
  return jsonb_build_object('xp', got);
end $$;
grant execute on function public.my_weekly(), public.claim_weekly() to authenticated;

-- ---------- 打卡次數稱號：1 場「我有比過賽」、5 場「我真的有比過」、10 場「我超愛比賽」 ----------
create or replace function public.after_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.checkins where user_id = new.user_id;
  if n >= 1 then insert into public.unlocks (user_id, item) values (new.user_id, 'r_comp1') on conflict do nothing; end if;
  if n >= 5 then insert into public.unlocks (user_id, item) values (new.user_id, 'r_comp5') on conflict do nothing; end if;
  if n >= 10 then insert into public.unlocks (user_id, item) values (new.user_id, 'r_comp10') on conflict do nothing; end if;
  return new;
end $$;
drop trigger if exists after_checkin on public.checkins;
create trigger after_checkin after insert on public.checkins for each row execute function public.after_checkin();
-- 已經打卡過的人補發
insert into public.unlocks (user_id, item) select user_id, 'r_comp1' from public.checkins group by user_id having count(*) >= 1 on conflict do nothing;
insert into public.unlocks (user_id, item) select user_id, 'r_comp5' from public.checkins group by user_id having count(*) >= 5 on conflict do nothing;
insert into public.unlocks (user_id, item) select user_id, 'r_comp10' from public.checkins group by user_id having count(*) >= 10 on conflict do nothing;

-- ---------- 好友互動：成為好友、第一次私訊，雙方各 +10（每天最多 5 次 = 50 XP） ----------
create or replace function public.social_xp(uid uuid, k text, r text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.xp_log where user_id = uid and kind in ('friend', 'dm1') and created_at >= public.tw_start(public.tw_today())) >= 5 then return; end if;
  perform public.grant_xp(uid, k, r, 10);
end $$;
revoke all on function public.social_xp(uuid, text, text) from public, anon, authenticated;
create or replace function public.after_friend() returns trigger
language plpgsql security definer set search_path = public as $$
declare pair text := least(new.from_user::text, new.to_user::text) || '|' || greatest(new.from_user::text, new.to_user::text);
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then
    perform public.social_xp(new.from_user, 'friend', pair); perform public.social_xp(new.to_user, 'friend', pair);
  end if;
  return new;
end $$;
drop trigger if exists after_friend on public.friend_requests;
create trigger after_friend after insert or update on public.friend_requests for each row execute function public.after_friend();
create or replace function public.after_dm() returns trigger
language plpgsql security definer set search_path = public as $$
declare pair text := least(new.from_user::text, new.to_user::text) || '|' || greatest(new.from_user::text, new.to_user::text);
begin
  if (select count(*) from public.dms where (from_user = new.from_user and to_user = new.to_user) or (from_user = new.to_user and to_user = new.from_user)) = 1 then
    perform public.social_xp(new.from_user, 'dm1', pair); perform public.social_xp(new.to_user, 'dm1', pair);
  end if;
  return new;
end $$;
drop trigger if exists after_dm on public.dms;
create trigger after_dm after insert on public.dms for each row execute function public.after_dm();

-- ---------- 玩家對戰排名賽：雙方都回報同一個結果才算；贏 +20、輸 +5；同一對手一天最多 3 場 ----------
create table if not exists public.pvp_matches (
  room text primary key check (char_length(room) between 8 and 40),
  a uuid not null, b uuid not null,
  a_says uuid, b_says uuid,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.pvp_season (
  user_id uuid not null references auth.users on delete cascade,
  season text not null,
  points int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  primary key (user_id, season)
);
alter table public.pvp_matches enable row level security;
alter table public.pvp_season enable row level security;
drop policy if exists "season readable" on public.pvp_season;
create policy "season readable" on public.pvp_season for select using (true);
grant select on public.pvp_season to anon, authenticated;
create or replace function public.season_now() returns text language sql stable as $$ select to_char(now() at time zone 'Asia/Taipei', 'YYYY"-Q"Q') $$;
grant execute on function public.season_now() to anon, authenticated;
create or replace function public.pvp_report(p_room text, opp uuid, winner uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m public.pvp_matches; loser uuid; s text := public.season_now(); today_n int;
begin
  if uid is null or opp is null or uid = opp or winner not in (uid, opp) then raise exception 'bad report'; end if;
  select * into m from public.pvp_matches where room = p_room;
  if m is null then
    insert into public.pvp_matches (room, a, b, a_says) values (p_room, uid, opp, winner);
    return jsonb_build_object('status', 'waiting');
  end if;
  if m.done then return jsonb_build_object('status', 'done'); end if;
  if m.b = uid and m.a = opp then update public.pvp_matches set b_says = winner where room = p_room returning * into m;
  elsif m.a = uid and m.b = opp then update public.pvp_matches set a_says = winner where room = p_room returning * into m;
  else raise exception 'bad report'; end if;
  if m.a_says is null or m.b_says is null then return jsonb_build_object('status', 'waiting'); end if;
  update public.pvp_matches set done = true where room = p_room;
  if m.a_says <> m.b_says then return jsonb_build_object('status', 'mismatch'); end if;
  select count(*) into today_n from public.pvp_matches where done and created_at >= public.tw_start(public.tw_today()) and ((a = m.a and b = m.b) or (a = m.b and b = m.a));
  if today_n > 3 then return jsonb_build_object('status', 'limit'); end if;
  loser := case when m.a_says = m.a then m.b else m.a end;
  perform public.grant_xp(m.a_says, 'pvpwin', p_room, 20);
  perform public.grant_xp(loser, 'pvplose', p_room, 5);
  insert into public.pvp_season (user_id, season, points, wins) values (m.a_says, s, 25, 1)
    on conflict (user_id, season) do update set points = public.pvp_season.points + 25, wins = public.pvp_season.wins + 1;
  insert into public.pvp_season (user_id, season, points, losses) values (loser, s, 0, 1)
    on conflict (user_id, season) do update set points = greatest(0, public.pvp_season.points - 10), losses = public.pvp_season.losses + 1;
  return jsonb_build_object('status', 'ok', 'winner', m.a_says);
end $$;
grant execute on function public.pvp_report(text, uuid, uuid) to authenticated;

-- ---------- 論壇優質內容：主題被按讚 10 次 +50、被管理員置頂 +100 ----------
create or replace function public.after_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid bigint; author uuid;
begin
  if new.target like 'p:%' then
    pid := substring(new.target from 3)::bigint;
    if (select count(*) from public.likes where target = new.target) >= 10 then
      select user_id into author from public.forum_posts where id = pid;
      if author is not null then perform public.grant_xp(author, 'forum_like10', pid::text, 50); end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists after_like on public.likes;
create trigger after_like after insert on public.likes for each row execute function public.after_like();
create or replace function public.after_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pinned and not old.pinned and new.status = 'approved' then perform public.grant_xp(new.user_id, 'forum_pin', new.id::text, 100); end if;
  return new;
end $$;
drop trigger if exists after_pin on public.forum_posts;
create trigger after_pin after update on public.forum_posts for each row execute function public.after_pin();
-- 不能幫自己按讚
drop policy if exists "like own" on public.likes;
create policy "like own" on public.likes for insert with check (user_id = auth.uid() and not exists (
  select 1 from public.forum_posts f where 'p:' || f.id = target and f.user_id = auth.uid()) and not exists (
  select 1 from public.replies r where 'r:' || r.id = target and r.user_id = auth.uid()));

-- ---------- 活動現場加成：活動期間、在活動城市附近打卡，經驗值 ×2（再 +50） ----------
create table if not exists public.event_geo (
  event_id text primary key,
  lat double precision not null, lon double precision not null,
  start_date date not null, end_date date
);
alter table public.event_geo enable row level security;
drop policy if exists "event geo readable" on public.event_geo;
create policy "event geo readable" on public.event_geo for select using (true);
drop policy if exists "admins manage event geo" on public.event_geo;
create policy "admins manage event geo" on public.event_geo for all using (public.is_admin()) with check (public.is_admin());
grant select on public.event_geo to anon, authenticated;
grant insert, update, delete on public.event_geo to authenticated;
insert into public.event_geo (event_id, lat, lon, start_date, end_date) values
  ('fss-2026-wf-day1', 35.63, 140.06, '2026-11-14', '2026-11-14'),
  ('fss-2026-wf-day2', 35.63, 140.06, '2026-11-15', '2026-11-15')
on conflict (event_id) do nothing;
create or replace function public.checkin_onsite(eid text, p_lat double precision, p_lon double precision) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.event_geo; km double precision; d date := public.tw_today();
begin
  if auth.uid() is null or not exists (select 1 from public.checkins where user_id = auth.uid() and event_id = eid) then raise exception 'check in first'; end if;
  select * into g from public.event_geo where event_id = eid;
  if g is null then return jsonb_build_object('ok', false, 'why', 'no location'); end if;
  if d < g.start_date - 1 or d > coalesce(g.end_date, g.start_date) + 1 then return jsonb_build_object('ok', false, 'why', 'not today'); end if;
  km := 6371 * 2 * asin(sqrt(power(sin(radians(p_lat - g.lat) / 2), 2) + cos(radians(g.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lon - g.lon) / 2), 2)));
  if km > 30 then return jsonb_build_object('ok', false, 'why', 'too far', 'km', round(km::numeric, 1)); end if;
  return jsonb_build_object('ok', true, 'xp', public.grant_xp(auth.uid(), 'onsite', eid, 50));
end $$;
grant execute on function public.checkin_onsite(text, double precision, double precision) to authenticated;

-- ---------- 活動資訊糾錯：回報錯誤，管理員確認後 +30 ----------
create table if not exists public.event_reports (
  id bigint generated always as identity primary key,
  event_id text not null check (char_length(event_id) between 1 and 100),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null check (char_length(text) between 2 and 300),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.event_reports enable row level security;
drop policy if exists "report own" on public.event_reports;
create policy "report own" on public.event_reports for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "see own reports or admin" on public.event_reports;
create policy "see own reports or admin" on public.event_reports for select using (user_id = auth.uid() or public.is_admin());
grant select, insert on public.event_reports to authenticated;
create or replace function public.guard_event_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.event_reports where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many'; end if;
  if public.is_spam(new.text) then raise exception 'spam'; end if;
  return new;
end $$;
drop trigger if exists guard_event_report on public.event_reports;
create trigger guard_event_report before insert on public.event_reports for each row execute function public.guard_event_report();
create or replace function public.review_event_report(rid bigint, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r public.event_reports;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.event_reports set status = case when ok then 'confirmed' else 'rejected' end where id = rid and status = 'pending' returning * into r;
  if r is not null and ok then perform public.grant_xp(r.user_id, 'report', rid::text, 30); end if;
end $$;
grant execute on function public.review_event_report(bigint, boolean) to authenticated;

-- ---------- 成就（一次性，伺服器檢查條件後發經驗值） ----------
create table if not exists public.achievements (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.achievements enable row level security;
drop policy if exists "achievements readable" on public.achievements;
create policy "achievements readable" on public.achievements for select using (true);
grant select on public.achievements to anon, authenticated;
create or replace function public.check_achievements() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); got jsonb := '[]'; r record;
  tw int; cc int; ck int; best int; npc int; fr int; msg int; posts int; talk int; vt int; stk int; pw int; pts int; spins int; favs int; subs int; liked int;
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
  for r in select * from (values
      ('tw5', tw >= 5, 100), ('tw22', tw >= 22, 800), ('country3', cc >= 3, 150), ('country10', cc >= 10, 600),
      ('comp1', ck >= 1, 50), ('comp5', ck >= 5, 200), ('comp10', ck >= 10, 400),
      ('rhythm_a', best >= 5000, 100), ('rhythm_s', best >= 6000, 250), ('npc5', npc >= 5, 50), ('npc30', npc >= 30, 200),
      ('friend1', fr >= 1, 30), ('friend10', fr >= 10, 150), ('friend30', fr >= 30, 300), ('chat100', msg >= 100, 100),
      ('forum1', posts >= 1, 50), ('talk50', talk >= 50, 150), ('vote10', vt >= 10, 100), ('streak7', stk >= 7, 100), ('streak30', stk >= 30, 400),
      ('pvp1', pw >= 1, 50), ('pvp10', pw >= 10, 200), ('gold', pts >= 500, 300), ('king', pts >= 1000, 600),
      ('crew', exists (select 1 from public.crew_members where user_id = uid), 50), ('crewlead', exists (select 1 from public.crews where leader = uid and status = 'approved'), 200),
      ('verified', exists (select 1 from public.players where user_id = uid and verified), 100), ('spin30', spins >= 30, 200), ('fav10', favs >= 10, 50),
      ('submit1', subs >= 1, 100), ('liked10', liked >= 1, 100)
    ) as a(id, ok, xp) loop
    if r.ok and not exists (select 1 from public.achievements where user_id = uid and id = r.id) then
      insert into public.achievements (user_id, id) values (uid, r.id);
      perform public.grant_xp(uid, 'ach', r.id, r.xp, false);
      got := got || jsonb_build_object('id', r.id, 'xp', r.xp);
    end if;
  end loop;
  return got;
end $$;
grant execute on function public.check_achievements() to authenticated;

-- ---------- 舞團經驗值、每週舞團排行（前 3 名全團 +100 / +60 / +30） ----------
create or replace function public.crew_xp(cid bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('total', coalesce(sum(x.amount), 0), 'week', coalesce(sum(x.amount) filter (where x.created_at >= public.tw_start(public.tw_week())), 0))
  from public.crew_members m join public.xp_log x on x.user_id = m.user_id and x.created_at >= m.joined_at where m.crew_id = cid
$$;
create or replace function public.crew_week_rank(w date default null) returns table (crew_id bigint, name text, logo_url text, style jsonb, xp bigint)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.logo_url, c.style, coalesce(sum(x.amount), 0)::bigint
  from public.crews c join public.crew_members m on m.crew_id = c.id
  left join public.xp_log x on x.user_id = m.user_id and x.kind <> 'crewweek' and x.created_at >= public.tw_start(coalesce(w, public.tw_week())) and x.created_at < public.tw_start(coalesce(w, public.tw_week()) + 7) and x.created_at >= m.joined_at
  where c.status = 'approved' group by c.id order by 5 desc, c.id limit 20
$$;
create table if not exists public.crew_week_rewards (week date primary key, crews bigint[], created_at timestamptz not null default now());
alter table public.crew_week_rewards enable row level security;
drop policy if exists "crew week readable" on public.crew_week_rewards;
create policy "crew week readable" on public.crew_week_rewards for select using (true);
grant select on public.crew_week_rewards to anon, authenticated;
-- 上週還沒結算就結算（誰打開網站都會觸發，重複呼叫也只會發一次）
create or replace function public.crew_week_settle() returns void
language plpgsql security definer set search_path = public as $$
declare w date := public.tw_week() - 7; top bigint[]; i int; m record;
begin
  if exists (select 1 from public.crew_week_rewards where week = w) then return; end if;
  select array_agg(crew_id) into top from (select crew_id, xp from public.crew_week_rank(w) where xp > 0 limit 3) t;
  insert into public.crew_week_rewards (week, crews) values (w, coalesce(top, '{}')) on conflict do nothing;
  if not found or top is null then return; end if;
  for i in 1 .. array_length(top, 1) loop
    for m in select user_id from public.crew_members where crew_id = top[i] loop
      perform public.grant_xp(m.user_id, 'crewweek', w::text, (array[100, 60, 30])[i], false);
    end loop;
  end loop;
end $$;
grant execute on function public.crew_xp(bigint), public.crew_week_rank(date), public.crew_week_settle() to anon, authenticated;

-- ---------- 等級 = 原本的經驗值 + 帳本上的經驗值 ----------
create or replace function public.player_stats(uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'checkins', (select count(*) from public.checkins where user_id = uid),
    'comments', (select count(*) from public.comments where user_id = uid),
    'messages', (select count(*) from public.messages where user_id = uid),
    'days', (select count(*) from public.daily where user_id = uid),
    'favorites', (select count(*) from public.favorites where user_id = uid),
    'approved', (select count(*) from public.submissions where user_id = uid and status = 'approved'),
    'votes', (select count(*) from public.votes where user_id = uid),
    'best', (select coalesce(max(score), 0) from public.scores where user_id = uid),
    'npc', (select coalesce(max(wins), 0) from public.npc_wins where user_id = uid),
    'streak', public.login_streak(uid),
    'mult', public.xp_mult(uid),
    'bonus', (select coalesce(sum(amount), 0) from public.xp_log where user_id = uid),
    'xp',
      (select count(*) from public.checkins where user_id = uid) * 50
    + (select count(*) from public.daily where user_id = uid) * 20
    + (select coalesce(sum(case reward when 'xp20' then 20 when 'xp50' then 50 when 'xp100' then 100 else 0 end), 0) from public.daily where user_id = uid)
    + (select count(*) from public.comments where user_id = uid) * 5
    + least((select count(*) from public.messages where user_id = uid), 300)
    + (select count(*) from public.favorites where user_id = uid) * 2
    + (select count(*) from public.submissions where user_id = uid and status = 'approved') * 80
    + (select count(*) from public.votes where user_id = uid) * 3
    + (select coalesce(max(score), 0) from public.scores where user_id = uid) / 100
    + least((select coalesce(max(wins), 0) from public.npc_wins where user_id = uid), 30) * 10
    + (select coalesce(sum(amount), 0) from public.xp_log where user_id = uid)
  )
$$;
grant execute on function public.player_stats(uuid) to anon, authenticated;
