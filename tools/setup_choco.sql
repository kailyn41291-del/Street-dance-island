-- =========================================================
-- choco（bboychoco）：設成管理員 + 換上「Choco 本人」造型
-- 也更新規則：Kailyn 本人只有網站架設者能用、Choco 本人只有 bboychoco 能用
-- =========================================================
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
  -- 本人造型
  if (new.look->>'special') = 'kailyn' and coalesce(r, '') <> 'owner' then new.look := new.look - 'special'; end if;
  if (new.look->>'special') = 'choco' and new.handle <> 'bboychoco' then new.look := new.look - 'special'; end if;
  -- 管理員造型
  if r is null and (new.look->>'special') in ('admin', 'owner') then new.look := new.look - 'special'; end if;
  if r = 'admin' and (new.look->>'special') = 'owner' then new.look := jsonb_set(new.look, '{special}', '"admin"'); end if;
  return new;
end $$;

insert into public.admins (user_id, role)
  select user_id, 'admin' from public.players where handle = 'bboychoco'
  on conflict (user_id) do update set role = 'admin';
update public.players set look = coalesce(look, '{}'::jsonb) || '{"special": "choco"}'::jsonb where handle = 'bboychoco';

-- 確認：應該看到 bboychoco、admin、choco
select p.handle, a.role, p.look->>'special' as skin from public.players p join public.admins a on a.user_id = p.user_id where p.handle = 'bboychoco';
