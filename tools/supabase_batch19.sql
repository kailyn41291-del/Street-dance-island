-- =========================================================
-- 舞島 — 第十九批：後台「帳號」分頁（只有網站架設者看得到）
-- 列出所有註冊的角色，可以用 ID 或名字搜尋
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- q：搜尋文字（ID 或名字，空白 = 全部）；sort：'new' 最新註冊、'seen' 最近上線、'xp' 經驗值最高
create or replace function public.owner_players(q text default '', sort text default 'new', lim int default 50, off int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare rows jsonb; total int; pat text := '%' || lower(coalesce(q, '')) || '%';
begin
  if not public.is_owner() then raise exception 'not allowed'; end if;
  select count(*) into total from public.players p where lower(p.handle) like pat or lower(p.name) like pat;
  select coalesce(jsonb_agg(r), '[]') into rows from (
    select p.handle, p.name, p.nat, p.style, p.job, p.title, p.verified, p.ig, p.banned, p.created_at, p.last_seen,
      a.role,
      coalesce((select sum(x.amount) from public.xp_log x where x.user_id = p.user_id), 0) as xp
    from public.players p left join public.admins a on a.user_id = p.user_id
    where lower(p.handle) like pat or lower(p.name) like pat
    order by
      case when sort = 'seen' then p.last_seen end desc nulls last,
      case when sort = 'xp' then coalesce((select sum(x.amount) from public.xp_log x where x.user_id = p.user_id), 0) end desc,
      p.created_at desc
    limit greatest(1, least(lim, 200)) offset greatest(0, off)
  ) r;
  return jsonb_build_object('total', total, 'rows', rows,
    'all', (select count(*) from public.players),
    'today', (select count(*) from public.players where (created_at at time zone 'Asia/Taipei')::date = public.tw_today()),
    'week', (select count(*) from public.players where created_at > now() - interval '7 days'),
    'online', (select count(*) from public.players where last_seen > now() - interval '10 minutes'));
end $$;
revoke all on function public.owner_players(text, text, int, int) from public, anon;
grant execute on function public.owner_players(text, text, int, int) to authenticated;
