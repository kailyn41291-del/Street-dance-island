-- =========================================================
-- 第 30 批：封測帳號「本人造型」
-- 規則：
--   kailyn          → 只有網站架設者
--   admin / owner   → 只有管理員（owner 只有架設者）
--   其他本人造型    → 造型名稱要對上自己的 ID：
--                     ID 等於造型名稱，或 ID 是 bboy＋造型名稱、bgirl＋造型名稱
--                     （例如 choco → bboychoco、cros1 → bboycros1、icequeenie → icequeenie）
-- 以後新增封測造型，只要照這個方式取名，就不用再跑 SQL
-- =========================================================
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
    elsif lower(new.handle) not in (lower(sk), 'bboy' || lower(sk), 'bgirl' || lower(sk)) then
      new.look := new.look - 'special';
    end if;
  end if;
  return new;
end $$;

-- 幫三位封測玩家直接換上本人造型
update public.players set look = coalesce(look, '{}'::jsonb) || '{"special": "cros1"}'::jsonb where handle = 'bboycros1';
update public.players set look = coalesce(look, '{}'::jsonb) || '{"special": "matt"}'::jsonb where handle = 'bboymatt';
update public.players set look = coalesce(look, '{}'::jsonb) || '{"special": "icequeenie"}'::jsonb where handle = 'icequeenie';

-- 確認：應該看到 3 列，skin 分別是 cros1、matt、icequeenie
select handle, look->>'special' as skin from public.players where handle in ('bboycros1', 'bboymatt', 'icequeenie');
