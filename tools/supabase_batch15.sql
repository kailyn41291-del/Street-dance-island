-- =========================================================
-- 舞島 — 第十五批：師徒系統、舞團每週 PK、知識+ 懸賞
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- 玩家等級（跟網站上顯示的算法一樣：等級 = √(經驗值 ÷ 30) + 1）
create or replace function public.player_level(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select floor(sqrt(greatest(coalesce((public.player_stats(uid)->>'xp')::numeric, 0), 0) / 30))::int + 1
$$;
grant execute on function public.player_level(uuid) to anon, authenticated;
create or replace function public.player_xp(uid uuid) returns int
language sql stable security definer set search_path = public as $$ select coalesce((public.player_stats(uid)->>'xp')::int, 0) $$;
revoke all on function public.player_xp(uuid) from public, anon, authenticated;

-- ---------- 1. 師徒系統 ----------
-- 師父：10 級以上、最多 3 個徒弟；徒弟：5 級以下、同時只能有 1 個師父
create table if not exists public.mentor_profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  pitch text check (char_length(pitch) <= 200),        -- 招生文案
  styles text[] not null default '{}',
  open boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.mentor_profiles enable row level security;
drop policy if exists "mentor profiles readable" on public.mentor_profiles;
create policy "mentor profiles readable" on public.mentor_profiles for select using (true);
grant select on public.mentor_profiles to anon, authenticated;

create table if not exists public.mentorships (
  id bigint generated always as identity primary key,
  mentor uuid not null references auth.users on delete cascade,
  apprentice uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'graduated', 'ended', 'declined')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz
);
create unique index if not exists mentorships_one_master on public.mentorships (apprentice) where status in ('pending', 'active');
alter table public.mentorships enable row level security;
drop policy if exists "own mentorships" on public.mentorships;
create policy "own mentorships" on public.mentorships for select using (mentor = auth.uid() or apprentice = auth.uid() or status in ('active', 'graduated'));
grant select on public.mentorships to anon, authenticated;

-- 開 / 關招生、寫招生文案（要 10 級以上）
create or replace function public.mentor_set(p_pitch text, p_styles text[], p_open boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.player_level(auth.uid()) < 10 then raise exception 'level too low'; end if;
  if public.is_spam(coalesce(p_pitch, '')) then raise exception 'spam'; end if;
  insert into public.mentor_profiles (user_id, pitch, styles, open, updated_at) values (auth.uid(), left(p_pitch, 200), coalesce(p_styles, '{}'), p_open, now())
  on conflict (user_id) do update set pitch = excluded.pitch, styles = excluded.styles, open = excluded.open, updated_at = now();
end $$;
-- 拜師
create or replace function public.mentor_request(p_mentor uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.players where user_id = auth.uid() and not banned) then raise exception 'need character'; end if;
  if p_mentor = auth.uid() then raise exception 'not allowed'; end if;
  if public.player_level(auth.uid()) > 5 then raise exception 'level too high'; end if;
  if public.player_level(p_mentor) < 10 or not exists (select 1 from public.mentor_profiles where user_id = p_mentor and open) then raise exception 'not a mentor'; end if;
  if (select count(*) from public.mentorships where mentor = p_mentor and status = 'active') >= 3 then raise exception 'mentor full'; end if;
  if exists (select 1 from public.mentorships where apprentice = auth.uid() and status in ('pending', 'active')) then raise exception 'already'; end if;
  insert into public.mentorships (mentor, apprentice) values (p_mentor, auth.uid());
end $$;
-- 師父回覆拜師申請
create or replace function public.mentor_answer(mid bigint, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m public.mentorships;
begin
  select * into m from public.mentorships where id = mid and mentor = auth.uid() and status = 'pending';
  if m is null then raise exception 'not allowed'; end if;
  if ok and (select count(*) from public.mentorships where mentor = auth.uid() and status = 'active') >= 3 then raise exception 'mentor full'; end if;
  update public.mentorships set status = case when ok then 'active' else 'declined' end, accepted_at = case when ok then now() end where id = mid;
end $$;
-- 解除師徒關係（任一方都可以）
create or replace function public.mentor_end(mid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.mentorships set status = 'ended', ended_at = now() where id = mid and status in ('pending', 'active') and (mentor = auth.uid() or apprentice = auth.uid());
end $$;
-- 檢查徒弟的里程碑：做到就師徒雙方都拿經驗值；徒弟升到 10 級就出師
create or replace function public.mentor_check() returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.mentorships; lv int; got jsonb := '[]'; r record; a int; b int;
begin
  for m in select * from public.mentorships where status = 'active' and (apprentice = auth.uid() or mentor = auth.uid()) loop
    lv := public.player_level(m.apprentice);
    for r in select * from (values
        ('quest', exists (select 1 from public.xp_log where user_id = m.apprentice and kind = 'quest' and created_at >= m.accepted_at), 20, 20),
        ('checkin', exists (select 1 from public.checkins where user_id = m.apprentice and created_at >= m.accepted_at), 40, 40),
        ('lv5', lv >= 5, 40, 60),
        ('lv10', lv >= 10, 100, 150)
      ) as x(k, ok, ap, mt) loop
      if r.ok then
        a := public.grant_xp(m.apprentice, 'mentor', m.id || ':' || r.k || ':a', r.ap, false);
        b := public.grant_xp(m.mentor, 'mentor', m.id || ':' || r.k || ':m', r.mt, false);
        if a > 0 or b > 0 then got := got || jsonb_build_object('k', r.k, 'a', a, 'm', b); end if;
      end if;
    end loop;
    if lv >= 10 then
      update public.mentorships set status = 'graduated', ended_at = now() where id = m.id;
      insert into public.unlocks (user_id, item) values (m.mentor, 'r_master'), (m.apprentice, 'r_graduate') on conflict do nothing;
    end if;
  end loop;
  return got;
end $$;
grant execute on function public.mentor_set(text, text[], boolean), public.mentor_request(uuid), public.mentor_answer(bigint, boolean), public.mentor_end(bigint), public.mentor_check() to authenticated;
-- 師父列表（含等級、目前徒弟人數）
create or replace function public.mentor_list() returns table (user_id uuid, handle text, name text, look jsonb, style text, pitch text, styles text[], lv int, n bigint)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.handle, p.name, p.look, p.style, mp.pitch, mp.styles, public.player_level(p.user_id),
    (select count(*) from public.mentorships m where m.mentor = p.user_id and m.status = 'active')
  from public.mentor_profiles mp join public.players p on p.user_id = mp.user_id
  where mp.open and not p.banned and public.player_level(p.user_id) >= 10
$$;
grant execute on function public.mentor_list() to anon, authenticated;

-- ---------- 2. 舞團每週 PK：系統把實力相近的舞團兩兩配對，雙方團長 / 副團長都同意才開打 ----------
create table if not exists public.crew_pk (
  id bigint generated always as identity primary key,
  week date not null,
  crew_a bigint not null references public.crews on delete cascade,
  crew_b bigint not null references public.crews on delete cascade,
  a_ok boolean,            -- null = 還沒回覆
  b_ok boolean,
  xp_a bigint,
  xp_b bigint,
  winner bigint,
  settled boolean not null default false,
  unique (week, crew_a), unique (week, crew_b)
);
alter table public.crew_pk enable row level security;
drop policy if exists "crew pk readable" on public.crew_pk;
create policy "crew pk readable" on public.crew_pk for select using (true);
grant select on public.crew_pk to anon, authenticated;

-- 這週的配對（還沒配就現在配：依上週經驗值排序，相鄰的兩團一組）
create or replace function public.crew_pk_pair() returns void
language plpgsql security definer set search_path = public as $$
declare w date := public.tw_week(); ids bigint[]; i int := 1;
begin
  if exists (select 1 from public.crew_pk where week = w) then return; end if;
  select array_agg(c.id order by coalesce(r.xp, 0) desc, c.id) into ids
    from public.crews c left join public.crew_week_rank(w - 7) r on r.crew_id = c.id where c.status = 'approved';
  if ids is null then return; end if;
  while i + 1 <= array_length(ids, 1) loop
    insert into public.crew_pk (week, crew_a, crew_b) values (w, ids[i], ids[i + 1]) on conflict do nothing;
    i := i + 2;
  end loop;
end $$;
-- 團長 / 副團長回覆要不要 PK
create or replace function public.crew_pk_answer(pid bigint, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare x public.crew_pk; my bigint;
begin
  select * into x from public.crew_pk where id = pid and week = public.tw_week();
  if x is null then raise exception 'not allowed'; end if;
  select crew_id into my from public.crew_members where user_id = auth.uid() and rank in ('leader', 'vice');
  if my = x.crew_a then update public.crew_pk set a_ok = ok where id = pid;
  elsif my = x.crew_b then update public.crew_pk set b_ok = ok where id = pid;
  else raise exception 'not allowed'; end if;
end $$;
-- 結算上週：雙方都同意的 PK，本週經驗值多的那團全員 +80 XP
create or replace function public.crew_pk_settle() returns void
language plpgsql security definer set search_path = public as $$
declare w date := public.tw_week() - 7; x record; xa bigint; xb bigint; win bigint; m record;
begin
  for x in select * from public.crew_pk where week = w and not settled loop
    if coalesce(x.a_ok, false) and coalesce(x.b_ok, false) then
      select coalesce(max(xp), 0) into xa from public.crew_week_rank(w) where crew_id = x.crew_a;
      select coalesce(max(xp), 0) into xb from public.crew_week_rank(w) where crew_id = x.crew_b;
      win := case when xa > xb then x.crew_a when xb > xa then x.crew_b else null end;
      if win is not null then
        for m in select user_id from public.crew_members where crew_id = win loop
          perform public.grant_xp(m.user_id, 'crewpk', w::text, 80, false);
        end loop;
      end if;
      update public.crew_pk set xp_a = xa, xp_b = xb, winner = win, settled = true where id = x.id;
    else
      update public.crew_pk set settled = true where id = x.id;
    end if;
  end loop;
end $$;
grant execute on function public.crew_pk_pair(), public.crew_pk_answer(bigint, boolean), public.crew_pk_settle() to authenticated;

-- ---------- 3. 知識+ 懸賞：發問時可以懸賞 10 / 20 / 50 / 100 XP，選出最佳解答時轉給回答的人 ----------
alter table public.forum_posts add column if not exists bounty int not null default 0;
create or replace function public.guard_bounty() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.bounty, 0) = 0 then new.bounty := 0; return new; end if;
  if new.category <> 'qa' or new.bounty not in (10, 20, 50, 100) then raise exception 'bad bounty'; end if;
  if public.player_xp(auth.uid()) < new.bounty then raise exception 'not enough xp'; end if;
  return new;
end $$;
drop trigger if exists guard_bounty on public.forum_posts;
create trigger guard_bounty before insert on public.forum_posts for each row execute function public.guard_bounty();
create or replace function public.qa_accept(pid bigint, rid bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.forum_posts; r public.replies; bonus int := 0;
begin
  select * into p from public.forum_posts where id = pid;
  if p is null or p.user_id <> auth.uid() or p.category <> 'qa' or p.status <> 'approved' then raise exception 'not allowed'; end if;
  if p.best_reply is not null then raise exception 'already'; end if;
  select * into r from public.replies where id = rid and thread = 'p:' || pid;
  if r is null or r.user_id = auth.uid() then raise exception 'not allowed'; end if;
  update public.forum_posts set best_reply = rid where id = pid;
  perform public.grant_xp(r.user_id, 'qa_best', pid::text, 30, true);
  perform public.grant_xp(auth.uid(), 'qa_ask', pid::text, 5, false);
  -- 懸賞：從發問的人轉給回答的人（發問的人經驗值不夠就給剩下的）
  if p.bounty > 0 then
    bonus := least(p.bounty, greatest(public.player_xp(auth.uid()), 0));
    if bonus > 0 then
      insert into public.xp_log (user_id, kind, ref, amount) values (auth.uid(), 'qa_bounty_paid', pid::text, -bonus) on conflict do nothing;
      perform public.grant_xp(r.user_id, 'qa_bounty', pid::text, bonus, false);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'bounty', bonus);
end $$;
grant execute on function public.qa_accept(bigint, bigint) to authenticated;
