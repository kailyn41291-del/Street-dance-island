# 舞島 DANCE ISLAND 🏝️

台灣 × 世界街舞活動行事曆，像素 RPG 風格。

- 中間是台灣主島，世界各國依照相對於台灣的方位漂浮在海上
- 點島嶼 → 看到各城市按鈕 → 點城市 → 活動行事曆（月曆＋活動卡片）
- 可以新增 / 編輯 / 刪除活動，可選擇是否附海報
- 小遊戲：動作抽卡、節拍道場（BPM / 八拍計數）、Cypher 輪盤
- 新手教學、捏角色（角色 ID + 密碼登入）、本週任務板
- 中文 / English / 日本語 / 한국어（註冊時依國籍自動切換）
- 雲端模式（Supabase）：管理員登入後新增活動，所有人立刻看到

## 檔案結構

```
index.html        入口
data/config.js    ★ 雲端資料庫設定（Supabase 網址與公開金鑰）
css/style.css     所有樣式（色票在最上面的 :root）
data/geo.js       241 個國家 / 地區的輪廓與 1000+ 城市（想加城市改這裡）
data/events.js    ★ 活動資料庫（網站上大家看到的活動）
js/pixel.js       像素島嶼 / 角色 / icon 繪製
js/app.js         畫面與路由（世界 → 國家 → 城市）
js/games.js       街舞小遊戲
js/store.js       活動資料存取
js/sfx.js         8-bit 音效
js/ui.js          視窗、對話框、轉場等共用元件
js/i18n.js        四國語言字典
js/player.js      角色創建 / 登入 / 任務板
js/tutorial.js    新手教學
js/backend.js     雲端資料庫（Supabase）
tools/supabase.sql 雲端資料庫建表語法
fonts/            俐方體11號 Cubic 11（OFL 授權）
posters/          放海報圖片的地方
tools/build_geo.py 重新產生 geo.js 的腳本（用 Natural Earth 資料）
```

地圖資料來源：[Natural Earth](https://www.naturalearthdata.com/)（公有領域）。

## 上傳到 GitHub Pages

1. 在 GitHub 建立新 repository（例如 `dance-island`）
2. 把這個資料夾裡的所有檔案上傳（或 `git push`）
3. Repository → **Settings → Pages** → Source 選 `Deploy from a branch`，Branch 選 `main` / `(root)` → Save
4. 約 1 分鐘後網址會是 `https://你的帳號.github.io/dance-island/`

## 怎麼讓新增的活動永久保存

GitHub Pages 是靜態網站，沒有後端資料庫，所以流程是：

1. 在網站上按「新增活動」→ 活動先存在**你這台瀏覽器**
2. 按右上角「💾 存檔」→「匯出 events.js」
3. 到 GitHub，把 `data/events.js` 換成剛下載的檔案 → Commit
4. 網站更新後，所有人都看得到

海報：上傳的圖片會被壓縮後直接存進 events.js。海報很多的話，建議把圖檔放到 `posters/`，表單選「圖片網址」並填 `posters/檔名.jpg`。

> 之後如果想讓「任何人都能直接投稿活動」，可以再接 Google 表單、Supabase 或 Firebase 當資料庫。

## 本機預覽

直接用瀏覽器打開 `index.html` 就可以（資料是用 `<script>` 載入，不需要伺服器）。
