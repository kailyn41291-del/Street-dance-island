# 舞島 Dance Island — 像素圖示製作需求（給 Codex / ChatGPT）

請幫我設計一整套網站用的像素風圖示，用來**取代網站上所有的系統 emoji**，讓全站風格一致。網站叫「舞島 Dance Island」，是台灣街舞活動地圖，整體是可愛的像素 RPG 風格。

## 一、風格（每一張都要遵守）

- 像素藝術（pixel art）：先用 **32 × 32 像素**的格子畫，再用「最近鄰（nearest neighbor）」放大 8 倍，輸出成 **256 × 256 PNG**。不要模糊、不要漸層柔化、不要寫實。
- **背景透明**。只畫圖示本身，不要外框方塊、不要底色、不要文字。
- 外框：深咖啡色 **#3b2b2b**，1 格像素粗（放大後 8px）。
- 主色盤（粉彩）：粉紅 **#f07ca3**、薄荷綠 **#5bb5a6**、奶油黃 **#eac45a**、天空藍 **#7895df**、奶油白 **#fff6e8**、橘 **#f08c3a**、紅 **#d9534f**、綠 **#7fcf73**。可以少量加金色亮點（#f4d77a）和白色高光。
- 視角統一：正面或微俯視；光源統一從左上方來。
- 主體置中、填滿畫面約 80%，四周留一點空白。
- 要跟「粉彩像素手機、棕櫚樹、海浪、星星、音符」的舞島主視覺一致：可愛、明亮、熱帶島嶼感。
- 圖示會小到 20～24 像素顯示，所以**輪廓要簡單、一眼看得懂**。

## 二、輸出方式

- **一張圖示一個 PNG**，用下面的「資料夾 / 檔名」存，全部放在 `assets/icons/` 底下。
- 如果只能一次輸出一張大圖，也可以：每個分類一張「圖示表」，每格 256 × 256、格子之間不留空隙、背景透明，**照清單順序由左到右、由上到下排**，每排 6 格。我會自己切開。
- 每做完一個分類，另外給一張「總覽圖」方便檢查風格是否一致。

## 三、圖示清單

### 1. 功能導覽 `assets/icons/menu/`（功能選單、上方按鈕列）

| 檔名 | 內容 |
|---|---|
| events.png | 活動總覽：一張貼著星星的活動行事曆 |
| near.png | 附近活動：地圖圖釘加小地圖 |
| add.png | 投稿活動：一張紙加大大的加號 |
| me.png | 我的頁面：一本小護照（深藍封面、金色框） |
| char.png | 編輯角色：一頂街舞棒球帽 |
| card.png | 我的名片：一張有大頭貼的玩家名片 |
| quests.png | 每日任務：一張捲起來的任務卷軸 |
| friends.png | 好友：兩個並排的小人頭像 |
| find.png | 找好友：放大鏡 |
| chat.png | 聊天室：對話泡泡（裡面三個點） |
| forum.png | 舞者論壇：佈告欄貼著彩色便條紙和對話泡泡 |
| crew.png | 舞團：一面舞團旗幟 |
| battle.png | 人氣 Battle：兩支交叉的麥克風，中間一道閃電 |
| cypher.png | Cypher 舞池：一個跳舞的小人加音符 |
| rhythm.png | 節奏挑戰：音符加四個方向鍵 |
| games.png | 小遊戲：一台掌上型遊戲機 |
| walk.png | 地圖散步：一雙球鞋加腳印 |
| notice.png | 公告欄：一個大聲公 |
| tut.png | 新手教學：一本打開的小書加問號 |
| lang.png | 切換語言：地球加對話泡泡 |
| admin.png | 管理後台：扳手加齒輪 |
| world.png | 世界地圖：一顆像素地球（看得到台灣在中間） |
| save.png | 存檔：像素磁碟片 |
| sound_on.png | 音效開：喇叭加聲波 |
| sound_off.png | 音效關：喇叭加一個叉 |

### 2. 活動卡片 `assets/icons/event/`

| 檔名 | 內容 |
|---|---|
| time.png | 時間：時鐘 |
| pin.png | 地點：紅色地圖圖釘 |
| organizer.png | 主辦單位：一棟小房子 |
| fee.png | 費用：錢袋（上面有 $） |
| register.png | 報名：寫字板加鉛筆 |
| link.png | 官網連結：鏈條 |
| comment.png | 留言：小對話泡泡 |
| share.png | 分享：盒子加往上的箭頭 |
| calendar.png | 加入行事曆：日曆頁 |
| fav.png | 收藏（未收藏）：空心星星 |
| fav_on.png | 收藏（已收藏）：實心金色星星 |
| checkin.png | 打卡：護照印章（蓋章的樣子） |
| report.png | 回報錯誤：黃色三角形驚嘆號 |
| views.png | 瀏覽次數：眼睛 |
| poster.png | 海報：一張小海報圖框 |
| delete.png | 刪除：垃圾桶 |
| download.png | 下載：往下的箭頭加托盤 |
| hot.png | 倒數 / 熱門：火焰 |
| results.png | 比賽結果：獎盃 |

### 3. 社交 `assets/icons/social/`

| 檔名 | 內容 |
|---|---|
| dm.png | 私訊：信封 |
| dm_new.png | 新私訊 / 好友邀請：信封加愛心 |
| friend_add.png | 成為好友：握手 |
| block.png | 封鎖：禁止符號 |
| report_flag.png | 檢舉：小旗子 |
| image.png | 傳圖片：相框（山和太陽） |
| emoji.png | 表情按鈕：像素貓咪臉 |
| pin_post.png | 置頂：圖釘（大頭針） |
| lock.png | 鎖：鎖頭 |
| login.png | 登入：鑰匙 |
| logout.png | 登出：揮手 |
| sponsor.png | 贊助廣告：金色大聲公加星星 |

### 4. 遊戲與對戰 `assets/icons/game/`

| 檔名 | 內容 |
|---|---|
| freeze.png | Freeze 招式：冰塊 |
| power.png | Power Move 招式：旋轉的漩渦 |
| footwork.png | Footwork 招式：一隻球鞋加速度線 |
| vs.png | 對戰：「VS」字樣（這張可以有字母 V S） |
| trophy.png | 勝利：金色獎盃 |
| lose.png | 落敗：暈眩的小臉（眼睛畫叉叉） |
| sleep.png | 休息 / 離線：Zzz |
| timer.png | 倒數：沙漏 |
| dice.png | 抽籤：骰子 |
| gift.png | 獎勵：禮物盒 |
| drum.png | 節拍：小鼓 |
| slot.png | 每日簽到抽獎：拉霸機 |
| gem.png | 稀有獎勵：寶石 |
| headphones.png | 音樂：耳機 |
| gamepad.png | 遊戲中心：遊戲手把 |
| npc.png | NPC 舞者：戴帽子的小舞者頭像 |

### 5. 經驗值與等級 `assets/icons/xp/`

| 檔名 | 內容 |
|---|---|
| streak.png | 連續登入：火焰加數字感的小星星 |
| xp.png | 經驗值：閃亮的星星光點 |
| level_up.png | 升級：往上的箭頭加星星 |
| medal.png | 成就：獎牌 |
| rank_bronze.png | 銅牌段位：銅色獎牌 |
| rank_silver.png | 銀牌段位：銀色獎牌 |
| rank_gold.png | 金牌段位：金色獎牌 |
| rank_king.png | 舞王段位：皇冠 |
| weekly.png | 每週挑戰：月曆加星星 |
| stats.png | 數據統計：長條圖 |
| passport.png | 護照：深藍色護照（跟護照封面同風格） |
| island.png | 舞島：一座小島加棕櫚樹 |
| taiwan.png | 台灣：台灣島的像素剪影（綠色） |

### 6. 成就徽章 `assets/icons/ach/`（31 個，做成圓形或盾形徽章，風格統一）

| 檔名 | 成就 | 圖案建議 |
|---|---|---|
| tw5.png | 台灣走透透 | 小地圖加腳印 |
| tw22.png | 寶島全制霸 | 金框台灣島 |
| country3.png | 出國比賽囉 | 小飛機 |
| country10.png | 世界巡迴舞者 | 地球加飛機航線 |
| comp1.png | 第一次參賽 | 一張票 |
| comp5.png | 比賽常客 | 兩張票 |
| comp10.png | 比賽成癮 | 比賽場館 |
| rhythm_a.png | 節奏感不錯 | 一個音符 |
| rhythm_s.png | S 級律動 | 兩個音符加「S」 |
| npc5.png | 街頭新秀 | 拳擊手套 |
| npc30.png | NPC 剋星 | 小魔王面具 |
| friend1.png | 第一個朋友 | 握手 |
| friend10.png | 社交舞者 | 兩個跳舞的小人 |
| friend30.png | 舞島人氣王 | 彩帶拉炮 |
| chat100.png | 話匣子 | 一疊對話泡泡 |
| forum1.png | 第一篇主題 | 便條紙加筆 |
| talk50.png | 熱心回覆 | 說話的小人 |
| vote10.png | 人氣評審 | 投票箱 |
| streak7.png | 一週不間斷 | 火焰加「7」 |
| streak30.png | 定居舞島 | 小島上的小房子 |
| pvp1.png | 初勝利 | 交叉的劍 |
| pvp10.png | 對戰高手 | 星星勳章 |
| gold.png | 金牌舞者 | 金牌 |
| king.png | 舞王 | 皇冠 |
| crew.png | 有家可歸 | 舞團旗 |
| crewlead.png | 開山團長 | 插在山頂的旗子 |
| verified.png | 本人認證 | 藍色打勾盾牌 |
| spin30.png | 簽到達人 | 拉霸機 |
| fav10.png | 收藏家 | 一疊星星 |
| submit1.png | 情報員 | 信箱 |
| liked10.png | 人氣作者 | 一顆大愛心 |

### 7. 國家主題 `assets/icons/theme/`（進入各國頁面時的代表圖案）

| 檔名 | 內容 |
|---|---|
| tw.png | 台灣：珍珠奶茶 |
| jp.png | 日本：鳥居 |
| kr.png | 韓國：傳統宮殿屋頂 |
| cn.png | 中國：紅燈籠 |
| hk.png | 香港：夜景高樓 |
| sea.png | 東南亞：棕櫚樹 |
| th.png | 泰國：大象 |
| in.png | 印度：蓮花 |
| mideast.png | 中東：清真寺圓頂 |
| us.png | 美國：自由女神 |
| latam.png | 拉丁美洲：沙鈴 |
| fr.png | 法國：艾菲爾鐵塔 |
| gb.png | 英國：衛兵帽 |
| europe.png | 歐洲：城堡 |
| snow.png | 北歐 / 冰雪國家：雪花 |
| africa.png | 非洲：猴麵包樹加夕陽 |
| oceania.png | 大洋洲：無尾熊 |

### 8. 節慶 `assets/icons/fest/`

| 檔名 | 內容 |
|---|---|
| halloween.png | 萬聖節：南瓜燈 |
| xmas.png | 聖誕節：聖誕樹 |
| newyear.png | 新年：煙火 |
| valentine.png | 情人節：愛心信封 |
| lunar.png | 農曆新年：紅包 |
| party.png | 慶祝：拉炮 |

## 四、最後檢查

- 全部約 **139 張**，同一套配色、同樣粗細的外框、同樣的光源方向。
- 檔名全部用英文小寫，跟上面的清單一模一樣（網站會用檔名自動對應）。
- 做完後把整個 `assets/icons/` 資料夾交給我。
