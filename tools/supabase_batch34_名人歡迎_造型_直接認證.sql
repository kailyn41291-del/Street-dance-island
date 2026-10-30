-- =========================================================
-- 第 34 批：封測名人歡迎＋新本人造型＋直接認證
-- 1. 直接認證：網站架設者在後台「帳號」可以直接幫人認證（不用他送申請），也可以整組認證
-- 2. Yan：真正的帳號是 yanshrimp（Yan Shrimp），刪掉之前建的 bboyyan，yanshrimp 歸到封測邀請
-- 3. 新本人造型：gonza、otopus、ranny、reflex、yan，綁定到各自的帳號並直接換上
-- 4. 封測名人：送「封測名人」稱號，第一次登入時跳出紅毯歡迎（看過就不再出現）
-- =========================================================

-- ---------- 1. 直接認證 ----------
create or replace function public.owner_verify(handles text[], "on" boolean default true, p_ig text default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; p public.players;
begin
  if not public.is_owner() then raise exception 'owner only'; end if;
  for p in select * from public.players where handle = any(handles) loop
    if "on" then
      update public.players set verified_key = null where verified_key = public.name_key(p.name) and user_id <> p.user_id;
      update public.players set verified = true, verified_key = public.name_key(p.name),
        ig = coalesce(nullif(regexp_replace(coalesce(p_ig, ''), '^@', ''), ''), ig),
        title = coalesce(title, 'verified')
        where user_id = p.user_id;
    else
      update public.players set verified = false, verified_key = null,
        title = case when title = 'verified' then null else title end
        where user_id = p.user_id;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.owner_verify(text[], boolean, text) from public, anon;
grant execute on function public.owner_verify(text[], boolean, text) to authenticated;

-- ---------- 2. Yan ----------
insert into public.owner_groups (user_id, grp) select user_id, '封測邀請' from public.players where handle = 'yanshrimp'
  on conflict (user_id) do update set grp = excluded.grp;
-- bboyyan 從來沒登入過，整個帳號刪掉（玩家資料、分類會一起刪）
delete from public.players where handle = 'bboyyan';
delete from auth.users where email = 'bboyyan@players.dance-island.app';

-- ---------- 3. 新本人造型 ----------
insert into public.skin_owners (skin, user_id)
select v.skin, p.user_id from (values ('gonza', 'bboygonza'), ('otopus', 'bboyotopus'), ('ranny', 'ranny'), ('reflex', 'bboyreflex'), ('yan', 'yanshrimp')) as v(skin, handle)
join public.players p on p.handle = v.handle
on conflict do nothing;
update public.players p set look = coalesce(p.look, '{}'::jsonb) || jsonb_build_object('special', o.skin)
from public.skin_owners o where o.user_id = p.user_id and o.skin in ('gonza', 'otopus', 'ranny', 'reflex', 'yan');

-- ---------- 4. 封測名人：稱號＋紅毯歡迎 ----------
insert into public.unlocks (user_id, item)
select user_id, 'r_vip' from public.owner_groups where grp = '封測邀請'
on conflict do nothing;
update auth.users u set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || '{"vip_welcome": true}'::jsonb
from public.owner_groups og
where og.user_id = u.id and og.grp = '封測邀請' and coalesce(u.raw_user_meta_data->>'vip_welcome', '') <> 'false';

-- ---------- 5. 確認 ----------
-- 應該看到：bboyyan 不見了；5 個新造型都有主人而且已經換上；封測邀請的人都有 r_vip
select o.skin, p.handle, p.look->>'special' as wearing from public.skin_owners o join public.players p on p.user_id = o.user_id order by o.skin;
select count(*) as 封測人數,
  count(*) filter (where exists (select 1 from public.unlocks x where x.user_id = og.user_id and x.item = 'r_vip')) as 有稱號,
  (select count(*) from public.players where handle = 'bboyyan') as bboyyan剩幾個
from public.owner_groups og where og.grp = '封測邀請';
