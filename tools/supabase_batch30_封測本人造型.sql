-- =========================================================
-- 第 30 批：本人造型綁帳號（user_id），玩家改 ID 也不會掉
-- skin_owners：哪個造型屬於哪個帳號（只有在 SQL Editor 才能新增／刪除）
-- 規則：
--   kailyn        → 只有網站架設者
--   admin / owner → 只有管理員（owner 只有架設者）
--   其他本人造型  → skin_owners 裡有登記這個帳號才能用
-- =========================================================
create table if not exists public.skin_owners (
  skin text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.skin_owners enable row level security;
drop policy if exists skin_owners_read on public.skin_owners;
create policy skin_owners_read on public.skin_owners for select using (true);

create or replace function public.guard_player() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := public.admin_role(new.user_id); sk text := new.look->>'special';
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
  if sk is not null and sk <> 'none' then
    if sk = 'kailyn' then
      if coalesce(r, '') <> 'owner' then new.look := new.look - 'special'; end if;
    elsif sk in ('admin', 'owner') then
      if r is null then new.look := new.look - 'special';
      elsif r = 'admin' and sk = 'owner' then new.look := jsonb_set(new.look, '{special}', '"admin"'); end if;
    elsif not exists (select 1 from public.skin_owners o where o.skin = sk and o.user_id = new.user_id) then
      new.look := new.look - 'special';
    end if;
  end if;
  return new;
end $$;

-- 登記造型的主人（用現在的 ID 找到帳號，之後改 ID 也沒關係）
insert into public.skin_owners (skin, user_id)
select v.skin, p.user_id from (values
  ('choco', 'bboychoco'),
  ('cros1', 'bboycros1'),
  ('matt', 'bboymatt'),
  ('icequeenie', 'icequeenie')
) as v(skin, handle) join public.players p on p.handle = v.handle
on conflict (skin) do update set user_id = excluded.user_id;

-- 幫三位封測玩家直接換上本人造型
update public.players p set look = coalesce(p.look, '{}'::jsonb) || jsonb_build_object('special', o.skin)
from public.skin_owners o where o.user_id = p.user_id and o.skin in ('cros1', 'matt', 'icequeenie');

-- 確認：應該看到 4 列，每一列的 handle 都對得上 skin
select o.skin, p.handle, p.look->>'special' as wearing from public.skin_owners o join public.players p on p.user_id = o.user_id order by o.skin;
