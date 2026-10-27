-- =========================================================
-- 舞島 — 第二十六批：在線人數「打卡」
-- 每個開著網站的人，每 1～2 分鐘在背景打一次卡（「我還在」）
-- 在線人數＝最近 3 分鐘內有打卡的人。人很多時（超過 100 人）網站會自動改用這個算法
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================
create table if not exists public.online_pings (
  k text primary key,                 -- 'p:<玩家 id>' 或 'g:<訪客代號>'
  uid uuid,                           -- 登入的玩家才有
  last_at timestamptz not null default now()
);
create index if not exists online_pings_last on public.online_pings (last_at);
alter table public.online_pings enable row level security;   -- 只能透過下面的函式讀寫

-- 打卡：回傳 目前在線玩家數 p、訪客數 g、以及 pwatch（好友名單）裡誰在線
create or replace function public.online_ping(pk text, pwatch uuid[] default '{}')
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); key text;
begin
  if me is not null then key := 'p:' || me;
  else
    key := 'g:' || left(regexp_replace(coalesce(pk, ''), '[^a-zA-Z0-9]', '', 'g'), 24);
    if key = 'g:' then raise exception 'bad key'; end if;
  end if;
  insert into online_pings (k, uid, last_at) values (key, me, now())
    on conflict (k) do update set uid = excluded.uid, last_at = now();
  if random() < 0.02 then delete from online_pings where last_at < now() - interval '15 minutes'; end if;
  return json_build_object(
    'p', (select count(*) from online_pings where uid is not null and last_at > now() - interval '3 minutes'),
    'g', (select count(*) from online_pings where uid is null and last_at > now() - interval '3 minutes'),
    'on', coalesce((select json_agg(uid) from online_pings where uid = any(coalesce(pwatch, '{}')) and last_at > now() - interval '3 minutes'), '[]'::json));
end $$;

-- 在線玩家列表（打開「在線」視窗時才抓；隱藏在線狀態的人只算人數）
create or replace function public.online_list(lim int default 200)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(r), '[]'::json) from (
    select case when coalesce((p.card ->> 'hideOn')::boolean, false)
             then json_build_object('x', 1)
             else json_build_object('h', p.handle, 'u', p.user_id, 'n', p.name, 'c', coalesce(p.nat, ''), 'v', p.verified, 't', coalesce(p.title, ''), 'l', p.look) end as r
    from online_pings o join players p on p.user_id = o.uid
    where o.last_at > now() - interval '3 minutes'
    order by o.last_at desc
    limit least(greatest(coalesce(lim, 200), 1), 500)
  ) s;
$$;

grant execute on function public.online_ping(text, uuid[]) to anon, authenticated;
grant execute on function public.online_list(int) to anon, authenticated;
