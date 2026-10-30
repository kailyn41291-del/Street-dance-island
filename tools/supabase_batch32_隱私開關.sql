-- =========================================================
-- 第 32 批：隱私開關（玩家在「名片 → 搜尋與隱私」自己選）
--   card.fr      誰可以送我好友邀請：'all'（預設）/ 'mutual'（有共同好友）/ 'none'（沒有人）
--   card.replyF  true = 只有好友可以回覆我的論壇貼文
-- 其他開關（不被搜尋、隱藏上線狀態、邀請不跳通知）在網站上處理，不用改資料庫
-- 管理員不受限制（處理檢舉、客服用）
-- =========================================================

-- ---------- 1. 好友邀請 ----------
create or replace function public.guard_friend_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare mode text;
begin
  if exists (select 1 from public.blocks where user_id = new.to_user and blocked = auth.uid()) then raise exception 'blocked'; end if;
  if (select count(*) from public.friend_requests where from_user = auth.uid() and created_at > now() - interval '1 day') >= 30 then raise exception 'too many'; end if;
  -- 對方已經先邀請我了：直接變成好友（不受對方的設定影響，因為是對方先邀的）
  if exists (select 1 from public.friend_requests where from_user = new.to_user and to_user = auth.uid() and status = 'pending') then
    update public.friend_requests set status = 'accepted', responded_at = now() where from_user = new.to_user and to_user = auth.uid();
    return null;
  end if;
  if not public.is_admin() then
    select coalesce(card->>'fr', 'all') into mode from public.players where user_id = new.to_user;
    if mode = 'none' then raise exception 'requests closed'; end if;
    if mode = 'mutual' and not exists (
      select 1 from public.friend_requests a join public.friend_requests b
        on (case when a.from_user = auth.uid() then a.to_user else a.from_user end)
         = (case when b.from_user = new.to_user then b.to_user else b.from_user end)
      where a.status = 'accepted' and b.status = 'accepted'
        and auth.uid() in (a.from_user, a.to_user) and new.to_user in (b.from_user, b.to_user)
    ) then raise exception 'mutual only'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_friend_request on public.friend_requests;
create trigger guard_friend_request before insert on public.friend_requests for each row execute function public.guard_friend_request();

-- ---------- 2. 論壇回覆 ----------
create or replace function public.guard_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players; owner uuid;
begin
  select * into p from public.players where user_id = auth.uid();
  if p is null or p.banned then raise exception 'need character'; end if;
  if new.thread like 'p:%' and not exists (select 1 from public.forum_posts where 'p:' || id = new.thread and status = 'approved') then raise exception 'not approved'; end if;
  if new.thread like 'b:%' and not exists (select 1 from public.battles where 'b:' || id = new.thread) then raise exception 'no battle'; end if;
  if new.parent_id is not null and not exists (select 1 from public.replies where id = new.parent_id and thread = new.thread) then raise exception 'bad parent'; end if;
  -- 作者設定「只有好友可以回覆」
  if new.thread like 'p:%' then
    select f.user_id into owner from public.forum_posts f where 'p:' || f.id = new.thread;
    if owner is not null and owner <> auth.uid() and not public.is_admin()
       and exists (select 1 from public.players where user_id = owner and card->>'replyF' = 'true')
       and not public.are_friends(auth.uid(), owner) then raise exception 'friends only'; end if;
  end if;
  if exists (select 1 from public.replies where user_id = auth.uid() and created_at > now() - interval '5 seconds') then raise exception 'too fast'; end if;
  if public.is_spam(new.text) then raise exception 'spam'; end if;
  new.user_id := auth.uid(); new.created_at := now();
  new.author := jsonb_build_object('handle', p.handle, 'name', p.name, 'title', p.title, 'look', p.look, 'verified', p.verified);
  return new;
end $$;
drop trigger if exists guard_reply on public.replies;
create trigger guard_reply before insert on public.replies for each row execute function public.guard_reply();

-- ---------- 3. 確認：應該看到兩列，都有 true ----------
select 'guard_friend_request' as 名稱, prosrc like '%requests closed%' as 已更新 from pg_proc where proname = 'guard_friend_request'
union all
select 'guard_reply', prosrc like '%friends only%' from pg_proc where proname = 'guard_reply';
