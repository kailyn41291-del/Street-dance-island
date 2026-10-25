-- =========================================================
-- 設定網站架設者（Kailyn）：先在網站上建立角色，再把下面的 你的角色ID 換掉，整段執行
-- =========================================================

-- 1. 「Kailyn 本人」造型只有網站架設者能用
create or replace function public.guard_player() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := public.admin_role(new.user_id);
begin
  if not public.is_owner() then
    if tg_op = 'INSERT' then
      new.verified := false; new.ig := null; new.verified_key := null; new.banned := false;
    else
      new.verified := old.verified; new.ig := old.ig; new.verified_key := old.verified_key; new.banned := old.banned;
      if old.verified then new.name := old.name; end if;
    end if;
  end if;
  if exists (select 1 from public.players p where p.verified_key = public.name_key(new.name) and p.user_id <> new.user_id) then
    raise exception 'name reserved';
  end if;
  if new.title = 'owner' and coalesce(r, '') <> 'owner' then new.title := null; end if;
  if new.title = 'admin' and r is null then new.title := null; end if;
  if new.title = 'verified' and not new.verified then new.title := null; end if;
  if r is null and new.look ? 'special' then new.look := new.look - 'special'; end if;
  if r = 'admin' and (new.look->>'special') in ('owner', 'kailyn') then new.look := jsonb_set(new.look, '{special}', '"admin"'); end if;
  return new;
end $$;

-- 2. 把你的角色設成網站架設者，換上 Kailyn 本人造型和「網站架設者」稱號
insert into public.admins (user_id, role)
  select user_id, 'owner' from public.players where handle = '你的角色ID'
  on conflict (user_id) do update set role = 'owner';
update public.players
  set look = coalesce(look, '{}'::jsonb) || '{"special": "kailyn"}'::jsonb, title = 'owner'
  where handle = '你的角色ID';

-- 3. 確認：應該會看到你的角色、role = owner
select p.handle, p.name, p.title, a.role, p.look->>'special' as skin
  from public.players p join public.admins a on a.user_id = p.user_id where p.handle = '你的角色ID';
