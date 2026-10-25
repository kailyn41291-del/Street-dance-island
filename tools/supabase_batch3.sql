-- =========================================================
-- 舞島 — 第三批：人氣 Battle 投票、節奏遊戲排行榜、NPC 對戰獎勵
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================

-- ---------- 人氣 Battle ----------
create table if not exists public.battles (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  a_name text not null, a_url text,
  b_name text not null, b_url text,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.votes (
  battle_id bigint not null references public.battles on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  choice text not null check (choice in ('a', 'b')),
  created_at timestamptz not null default now(),
  primary key (battle_id, user_id)
);
alter table public.battles enable row level security;
alter table public.votes enable row level security;
drop policy if exists "battles readable" on public.battles;
create policy "battles readable" on public.battles for select using (true);
drop policy if exists "admins manage battles" on public.battles;
create policy "admins manage battles" on public.battles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "votes readable" on public.votes;
create policy "votes readable" on public.votes for select using (true);
drop policy if exists "vote once" on public.votes;
create policy "vote once" on public.votes for insert with check (
  user_id = auth.uid() and exists (select 1 from public.battles b where b.id = battle_id and b.ends_at > now())
  and exists (select 1 from public.players p where p.user_id = auth.uid() and not p.banned));

-- ---------- 節奏遊戲分數 ----------
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  game text not null default 'rhythm',
  score int not null check (score between 0 and 6400),
  author jsonb,
  created_at timestamptz not null default now()
);
alter table public.scores enable row level security;
drop policy if exists "scores readable" on public.scores;
create policy "scores readable" on public.scores for select using (true);
drop policy if exists "post own score" on public.scores;
create policy "post own score" on public.scores for insert with check (user_id = auth.uid());
create or replace function public.guard_score() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  -- 一局 30 秒，兩次上傳至少隔 25 秒
  if exists (select 1 from public.scores where user_id = auth.uid() and created_at > now() - interval '25 seconds') then raise exception 'too fast'; end if;
  new.user_id := auth.uid();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'look', p.look, 'verified', p.verified);
  return new;
end $$;
drop trigger if exists guard_score on public.scores;
create trigger guard_score before insert on public.scores for each row execute function public.guard_score();

-- ---------- NPC 對戰：贏 5 次拿稱號 ----------
create table if not exists public.npc_wins (
  user_id uuid primary key references auth.users on delete cascade,
  wins int not null default 0,
  last_at timestamptz
);
alter table public.npc_wins enable row level security;
drop policy if exists "own npc" on public.npc_wins;
create policy "own npc" on public.npc_wins for select using (user_id = auth.uid());
create or replace function public.npc_win() returns jsonb
language plpgsql security definer set search_path = public as $$
declare w int; last timestamptz;
begin
  if auth.uid() is null or not exists (select 1 from public.players where user_id = auth.uid()) then raise exception 'need character'; end if;
  select wins, last_at into w, last from public.npc_wins where user_id = auth.uid();
  if last is not null and last > now() - interval '20 seconds' then raise exception 'too fast'; end if;
  insert into public.npc_wins (user_id, wins, last_at) values (auth.uid(), 1, now())
    on conflict (user_id) do update set wins = public.npc_wins.wins + 1, last_at = now()
    returning wins into w;
  if w >= 5 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcslayer') on conflict do nothing; end if;
  if w >= 30 then insert into public.unlocks (user_id, item) values (auth.uid(), 'r_npcboss') on conflict do nothing; end if;
  return jsonb_build_object('wins', w);
end $$;
grant execute on function public.npc_win() to authenticated;

-- ---------- 經驗值加上：投票 3、節奏遊戲（最高分 / 100）、NPC 勝場 10（最多 30 場） ----------
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
  )
$$;

grant select on public.battles, public.votes, public.scores to anon, authenticated;
grant insert, update, delete on public.battles to authenticated;
grant insert on public.votes, public.scores to authenticated;
grant select on public.npc_wins to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'votes') then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;
