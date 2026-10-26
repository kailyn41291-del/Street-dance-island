-- =========================================================
-- 舞島 — 第二十四批：節日活動日期調整
-- 每個節日活動大約兩週，最後一天就是節日當天（例：聖誕節 12/12 ~ 12/25）
-- 跨年活動接在聖誕節後面：12/26 ~ 隔年 1/1
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================
delete from public.fest_days where fid in ('newyear', 'lunar', 'valentine', 'danceday', 'hiphop', 'moon', 'halloween', 'xmas');
do $$
declare y int;
begin
  for y in 2026 .. 2028 loop
    insert into public.fest_days (fid, day) select 'newyear', d::date from generate_series(make_date(y, 12, 26), make_date(y + 1, 1, 1), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'valentine', d::date from generate_series(make_date(y, 2, 1), make_date(y, 2, 14), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'danceday', d::date from generate_series(make_date(y, 4, 16), make_date(y, 4, 29), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'hiphop', d::date from generate_series(make_date(y, 7, 29), make_date(y, 8, 11), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'halloween', d::date from generate_series(make_date(y, 10, 18), make_date(y, 10, 31), interval '1 day') d on conflict do nothing;
    insert into public.fest_days (fid, day) select 'xmas', d::date from generate_series(make_date(y, 12, 12), make_date(y, 12, 25), interval '1 day') d on conflict do nothing;
  end loop;
end $$;
-- 農曆節日：最後一天是大年初一 / 中秋當天
insert into public.fest_days (fid, day) select 'lunar', d::date from generate_series(date '2027-01-24', date '2027-02-06', interval '1 day') d on conflict do nothing;
insert into public.fest_days (fid, day) select 'lunar', d::date from generate_series(date '2028-01-13', date '2028-01-26', interval '1 day') d on conflict do nothing;
insert into public.fest_days (fid, day) select 'moon', d::date from generate_series(date '2027-09-02', date '2027-09-15', interval '1 day') d on conflict do nothing;
insert into public.fest_days (fid, day) select 'moon', d::date from generate_series(date '2028-09-20', date '2028-10-03', interval '1 day') d on conflict do nothing;

-- 跨年活動會跨到隔年：用「活動結束那一年」當作年份，同一檔跨年只能領一次
create or replace function public.fest_year(f text, d date) returns int
language sql immutable as $$ select extract(year from d + case when f = 'newyear' then 7 else 0 end)::int $$;

create or replace function public.fest_claim(f text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.tw_today(); xp int;
begin
  if uid is null or not exists (select 1 from public.players where user_id = uid and not banned) then raise exception 'need character'; end if;
  if f not in ('newyear', 'lunar', 'valentine', 'danceday', 'hiphop', 'moon', 'halloween', 'xmas') or not public.fest_today(f) then raise exception 'not today'; end if;
  if not exists (select 1 from public.xp_log where user_id = uid and kind = 'quest_all' and ref = d::text) then raise exception 'quests first'; end if;
  insert into public.unlocks (user_id, item) values (uid, 'r_f_' || f) on conflict do nothing;
  xp := public.grant_xp(uid, 'fest', f || ':' || public.fest_year(f, d), 50, false);
  return jsonb_build_object('title', 'r_f_' || f, 'xp', xp);
end $$;
grant execute on function public.fest_claim(text) to authenticated;
