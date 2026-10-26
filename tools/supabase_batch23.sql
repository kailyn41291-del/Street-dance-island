-- =========================================================
-- 舞島 — 第二十三批：稱號圖鑑的進度（每個稱號「目前做到多少」）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================
create or replace function public.title_progress() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date; ds int := 0;
begin
  if uid is null then return '{}'; end if;
  -- 每日幸運卡連續天數
  d := public.tw_today();
  if not exists (select 1 from public.daily where user_id = uid and day = d) then d := d - 1; end if;
  while exists (select 1 from public.daily where user_id = uid and day = d) loop ds := ds + 1; d := d - 1; end loop;
  return jsonb_build_object(
    'pvp',    (select count(*) from public.xp_log where user_id = uid and kind = 'pvpwin'),
    'vet',    (select count(*) from public.checkins where user_id = uid),
    'hall',   (select count(*) from public.achievements where user_id = uid),
    'crew',   coalesce((select count(*) from public.crew_members m where m.crew_id = (select crew_id from public.crew_members where user_id = uid)), 0),
    'graf',   (select count(*) from public.likes l where l.user_id <> uid and (
                 (l.target like 'p:%' and exists (select 1 from public.forum_posts f where f.id = substr(l.target, 3)::bigint and f.user_id = uid)) or
                 (l.target like 'r:%' and exists (select 1 from public.replies x where x.id = substr(l.target, 3)::bigint and x.user_id = uid)))),
    'drip',   (select count(*) from public.player_likes where to_user = uid),
    'stk',    (select count(*) from public.messages where user_id = uid and text ~ ':[cd][0-9]{1,2}:'),
    'relay',  (select count(distinct week) from public.move_entries where user_id = uid and not hidden),
    'skate',  (select count(*) from public.practice_spots where user_id = uid and status = 'approved'),
    'shoe',   (select count(*) from public.sneakers where user_id = uid and n > 0),
    'npc',    coalesce((select max(wins) from public.npc_wins where user_id = uid), 0),
    'streak', public.login_streak(uid),
    'dstreak', ds,
    'duo',    (select count(distinct c2.user_id) from public.checkins c1 join public.checkins c2 on c2.event_id = c1.event_id and c2.user_id <> c1.user_id
                 where c1.user_id = uid and public.are_friends(uid, c2.user_id)),
    'rel',    public.reliable_count(uid),
    'verified', (select verified from public.players where user_id = uid),
    'vpending', exists (select 1 from public.verifications where user_id = uid and status = 'pending'));
end $$;
grant execute on function public.title_progress() to authenticated;
