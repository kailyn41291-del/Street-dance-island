-- 檢查第二十七批有沒有成功（跑完會出現一行結果）
select
  case when position('tiktok' in pg_get_functiondef('public.guard_forum_post'::regproc)) > 0 then '✅ 論壇' else '❌ 論壇' end as 論壇,
  case when position('tiktok' in pg_get_functiondef('public.guard_move_entry'::regproc)) > 0 then '✅ 接力' else '❌ 接力' end as 接力,
  (select case when 'video/mp4' = any(allowed_mime_types) or allowed_mime_types is null then '❌ 檔案空間' else '✅ 檔案空間' end from storage.buckets where id = 'forum') as 檔案空間;
