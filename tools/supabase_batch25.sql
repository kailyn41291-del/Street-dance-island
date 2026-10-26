-- =========================================================
-- 舞島 — 第二十五批：註冊見面禮
-- 新玩家創角的那一刻自動送：「初登舞島」稱號＋100 XP＋1 雙隨機球鞋
-- （只送給之後新創的角色；已經有角色的人不會重複拿）
-- 用法：Supabase → SQL Editor → 右上角選 Database → 貼上 → Run（可以重複執行）
-- =========================================================
create or replace function public.welcome_gift() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.unlocks (user_id, item) values (new.user_id, 'r_welcome') on conflict do nothing;
  perform public.grant_xp(new.user_id, 'welcome', 'gift', 100, false);
  if not exists (select 1 from public.sneaker_log where user_id = new.user_id and src = 'welcome') then
    insert into public.sneaker_log (user_id, src, ref) values (new.user_id, 'welcome', 'gift') on conflict do nothing;
    perform public.sneaker_roll(new.user_id, false);
  end if;
  return new;
end $$;
drop trigger if exists welcome_gift on public.players;
create trigger welcome_gift after insert on public.players for each row execute function public.welcome_gift();
