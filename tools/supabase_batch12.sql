-- =========================================================
-- 舞島 — 第十二批：組隊頻道可以發言、新手任務（完成一步給一次經驗值）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 1. 聊天頻道：允許「組隊頻道」(party) 和隊伍專用頻道 (party:<id>) ----------
alter table public.messages drop constraint if exists messages_channel_check;
alter table public.messages add constraint messages_channel_check
  check (channel in ('world', 'tw', 'party') or channel ~ '^(crew|party):[0-9]+$');

-- ---------- 2. 新手任務：伺服器自己檢查有沒有做到，做到才發經驗值（每一步只能領一次） ----------
create or replace function public.newbie_steps() returns text[] language sql immutable as $$
  select array['char', 'island', 'view', 'fav', 'card', 'chat', 'friend', 'quest'] $$;
create or replace function public.newbie_reward(s text) returns int language sql immutable as $$
  select case s when 'char' then 20 when 'island' then 20 when 'view' then 20 when 'fav' then 30
    when 'card' then 30 when 'chat' then 30 when 'friend' then 50 when 'quest' then 50 else 0 end $$;

create or replace function public.newbie_done(uid uuid, s text) returns boolean
language sql stable security definer set search_path = public as $$
  select case s
    when 'char'   then exists (select 1 from public.players where user_id = uid)
    when 'island' then exists (select 1 from public.act_log where user_id = uid and kind = 'country')
    when 'view'   then exists (select 1 from public.act_log where user_id = uid and kind = 'view')
    when 'fav'    then exists (select 1 from public.favorites where user_id = uid)
    when 'card'   then exists (select 1 from public.players where user_id = uid and card is not null)
    when 'chat'   then exists (select 1 from public.messages where user_id = uid)
    when 'friend' then exists (select 1 from public.friend_requests where (from_user = uid or to_user = uid) and status = 'accepted')
    when 'quest'  then exists (select 1 from public.xp_log where user_id = uid and kind = 'quest')
    else false end
$$;
revoke all on function public.newbie_done(uuid, text) from public, anon, authenticated;

create or replace function public.newbie_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return '[]'::jsonb; end if;
  return (select jsonb_agg(jsonb_build_object('id', s, 'xp', public.newbie_reward(s), 'done', public.newbie_done(uid, s),
            'claimed', exists (select 1 from public.xp_log where user_id = uid and kind = 'newbie' and ref = s)) order by i)
          from unnest(public.newbie_steps()) with ordinality as x(s, i));
end $$;

create or replace function public.newbie_claim(s text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); got int := 0; bonus int := 0;
begin
  if uid is null or not (s = any (public.newbie_steps())) then raise exception 'not allowed'; end if;
  if not public.newbie_done(uid, s) then raise exception 'not done'; end if;
  got := public.grant_xp(uid, 'newbie', s, public.newbie_reward(s), false);
  -- 八步全部完成：畢業獎勵
  if (select count(*) from public.xp_log where user_id = uid and kind = 'newbie' and ref <> 'all') >= array_length(public.newbie_steps(), 1) then
    bonus := public.grant_xp(uid, 'newbie', 'all', 100, false);
  end if;
  return jsonb_build_object('xp', got, 'bonus', bonus);
end $$;
grant execute on function public.newbie_status(), public.newbie_claim(text) to authenticated;
