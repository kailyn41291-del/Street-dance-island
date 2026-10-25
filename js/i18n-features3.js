/* 多國語言（第四部分）：遊戲中心、節奏遊戲、NPC、散步、Battle 投票、Cypher 舞池、表情動作 */
I18N.extend({
  zh: {
    em_did: '秀了一招 {m}！', arc_title: '遊戲中心',
    arc_mini: '街舞小遊戲', arc_mini_d: '動作抽卡・節拍道場・Cypher 輪盤', arc_rhythm: '節奏挑戰', arc_rhythm_d: '跟著拍子按方向鍵，挑戰排行榜',
    arc_cypher: 'Cypher 舞池', arc_cypher_d: '跟線上的大家一起跳舞', arc_battle: '人氣 Battle', arc_battle_d: '看影片、投票選出人氣王', arc_walk: '地圖散步', arc_walk_d: '操控角色在世界地圖上走路',
    rh_start: '開始', rh_keys: '鍵盤 ← ↓ ↑ →（或 D F J K），手機點下面的按鈕。30 秒、最高 6400 分', rh_board: '排行榜', rh_result: '{s} 分！Perfect {p}・Great {g}・Miss {m}・最大 Combo {c}', rh_saved: '分數已登上排行榜', rh_login: '登入角色就能上排行榜', rh_none: '還沒有人挑戰',
    npc_rule: '🧊 Freeze 贏 🌀 Power、🌀 Power 贏 👟 Footwork、👟 Footwork 贏 🧊 Freeze。先贏兩回合的人勝利！', rps_freeze: 'Freeze', rps_power: 'Power Move', rps_foot: 'Footwork',
    npc_title: '與 {n} 的 Battle', npc_tie: '{a} 對 {b}，平手！', npc_win_r: '{a} 打敗 {b}，這回合你贏！', npc_lose_r: '{a} 被 {b} 打敗了…', npc_wins: '（累積打敗 NPC {n} 次）', npc_title_get: '解鎖新稱號！', npc_rest: '（休息一下再挑戰）', npc_victory: '🏆 你贏了！', npc_defeat: '😵 你輸了，下次再來！',
    npc_lines: ['Yo！要不要來 Battle？', '你的 Footwork 夠快嗎？', '我剛練好新的 Freeze！', '來一場吧，輸的請喝珍奶 🧋', '聽說你很會跳？'],
    walk_enter: '按 Enter / OK 進入', walk_tip: '方向鍵或 WASD 走路，走到國家上按 Enter 進入，Esc 離開',
    bt_vote: '投他一票', bt_ended: '已結束・共 {n} 票', bt_left: '還剩約 {h} 小時・目前 {n} 票', bt_intro: '看完兩邊的影片，投給你心中的贏家！每人每場一票。', bt_new: '建立新的 Battle', bt_t: '標題', bt_days: '投票天數', bt_create: '建立', bt_none: '目前沒有進行中的 Battle', bt_voted: '投票成功！',
    cy_music: '音樂', cy_online: '舞池裡有 {n} 人', cy_join: '登入角色加入舞池'
  },
  en: {
    em_did: 'just threw down a {m}!', arc_title: 'Arcade',
    arc_mini: 'Mini Games', arc_mini_d: 'Move Gacha · Beat Dojo · Cypher Roulette', arc_rhythm: 'Rhythm Challenge', arc_rhythm_d: 'Hit the arrows on the beat and climb the leaderboard',
    arc_cypher: 'Cypher Floor', arc_cypher_d: 'Dance with everyone online', arc_battle: 'Fan Battle', arc_battle_d: 'Watch videos and vote for your favorite', arc_walk: 'Map Walk', arc_walk_d: 'Walk your character around the world map',
    rh_start: 'Start', rh_keys: 'Keys ← ↓ ↑ → (or D F J K), or tap the pads. 30 seconds, max 6400', rh_board: 'Leaderboard', rh_result: '{s} pts! Perfect {p} · Great {g} · Miss {m} · Max combo {c}', rh_saved: 'Score posted to the leaderboard', rh_login: 'Log in to join the leaderboard', rh_none: 'No scores yet',
    npc_rule: '🧊 Freeze beats 🌀 Power, 🌀 Power beats 👟 Footwork, 👟 Footwork beats 🧊 Freeze. First to two rounds wins!', rps_freeze: 'Freeze', rps_power: 'Power Move', rps_foot: 'Footwork',
    npc_title: 'Battle vs {n}', npc_tie: '{a} vs {b} — tie!', npc_win_r: '{a} beats {b}, you win the round!', npc_lose_r: '{a} loses to {b}…', npc_wins: '(NPC wins: {n})', npc_title_get: 'New title unlocked!', npc_rest: '(take a short break)', npc_victory: '🏆 You win!', npc_defeat: '😵 You lost — try again!',
    npc_lines: ['Yo! Wanna battle?', 'Is your footwork fast enough?', 'I just learned a new freeze!', 'Loser buys bubble tea 🧋', 'Heard you can dance?'],
    walk_enter: 'Press Enter / OK to enter', walk_tip: 'Arrow keys or WASD to walk, Enter to enter a country, Esc to stop',
    bt_vote: 'Vote', bt_ended: 'Ended · {n} votes', bt_left: '~{h}h left · {n} votes', bt_intro: 'Watch both videos and vote for your winner! One vote per battle.', bt_new: 'Create a new battle', bt_t: 'Title', bt_days: 'Voting days', bt_create: 'Create', bt_none: 'No battles running right now', bt_voted: 'Vote counted!',
    cy_music: 'Music', cy_online: '{n} on the floor', cy_join: 'Log in to join the floor'
  },
  ja: {
    em_did: 'が {m} をキメた！', arc_title: 'ゲームセンター',
    arc_mini: 'ミニゲーム', arc_mini_d: '技ガチャ・ビート道場・サイファールーレット', arc_rhythm: 'リズムチャレンジ', arc_rhythm_d: 'リズムに合わせて矢印を押してランキングに挑戦',
    arc_cypher: 'サイファーフロア', arc_cypher_d: 'オンラインのみんなと一緒に踊ろう', arc_battle: '人気バトル', arc_battle_d: '動画を見て投票しよう', arc_walk: 'マップ散歩', arc_walk_d: 'キャラを操作して世界地図を歩こう',
    rh_start: 'スタート', rh_keys: 'キー ← ↓ ↑ →（または D F J K）、スマホは下のボタン。30 秒・最高 6400 点', rh_board: 'ランキング', rh_result: '{s} 点！Perfect {p}・Great {g}・Miss {m}・最大コンボ {c}', rh_saved: 'ランキングに登録しました', rh_login: 'ログインするとランキングに載ります', rh_none: 'まだ記録がありません',
    npc_rule: '🧊 フリーズは 🌀 パワーに勝ち、🌀 パワーは 👟 フットワークに勝ち、👟 フットワークは 🧊 フリーズに勝つ。先に 2 勝した方の勝ち！', rps_freeze: 'フリーズ', rps_power: 'パワームーブ', rps_foot: 'フットワーク',
    npc_title: '{n} とのバトル', npc_tie: '{a} 対 {b}、あいこ！', npc_win_r: '{a} が {b} に勝利！このラウンドはあなたの勝ち', npc_lose_r: '{a} は {b} に負けた…', npc_wins: '（NPC に {n} 勝）', npc_title_get: '新しい称号をゲット！', npc_rest: '（少し休んでから挑戦してね）', npc_victory: '🏆 あなたの勝ち！', npc_defeat: '😵 負けちゃった、また挑戦しよう！',
    npc_lines: ['よう！バトルしない？', 'そのフットワーク、速い？', '新しいフリーズ覚えたんだ！', '負けた方がタピオカおごりね 🧋', '踊れるって聞いたよ？'],
    walk_enter: 'Enter / OK で入る', walk_tip: '矢印キーか WASD で移動、国の上で Enter、Esc で終了',
    bt_vote: '投票する', bt_ended: '終了・{n} 票', bt_left: '残り約 {h} 時間・{n} 票', bt_intro: '両方の動画を見て、勝者に投票しよう！1 バトル 1 票。', bt_new: '新しいバトルを作成', bt_t: 'タイトル', bt_days: '投票日数', bt_create: '作成', bt_none: '開催中のバトルはありません', bt_voted: '投票しました！',
    cy_music: '音楽', cy_online: 'フロアに {n} 人', cy_join: 'ログインしてフロアに参加'
  },
  ko: {
    em_did: '님이 {m} 를 선보였어요!', arc_title: '게임 센터',
    arc_mini: '미니게임', arc_mini_d: '기술 가챠·비트 도장·사이퍼 룰렛', arc_rhythm: '리듬 챌린지', arc_rhythm_d: '박자에 맞춰 화살표를 누르고 랭킹에 도전',
    arc_cypher: '사이퍼 플로어', arc_cypher_d: '온라인의 모두와 함께 춤추기', arc_battle: '인기 배틀', arc_battle_d: '영상을 보고 투표하기', arc_walk: '지도 산책', arc_walk_d: '캐릭터로 세계 지도를 걸어 다니기',
    rh_start: '시작', rh_keys: '키보드 ← ↓ ↑ → (또는 D F J K), 모바일은 아래 버튼. 30초, 최고 6400점', rh_board: '랭킹', rh_result: '{s}점! Perfect {p}·Great {g}·Miss {m}·최대 콤보 {c}', rh_saved: '랭킹에 등록됐어요', rh_login: '로그인하면 랭킹에 올라가요', rh_none: '아직 기록이 없어요',
    npc_rule: '🧊 프리즈는 🌀 파워를, 🌀 파워는 👟 풋워크를, 👟 풋워크는 🧊 프리즈를 이겨요. 먼저 2승하면 승리!', rps_freeze: '프리즈', rps_power: '파워무브', rps_foot: '풋워크',
    npc_title: '{n} 와의 배틀', npc_tie: '{a} 대 {b}, 무승부!', npc_win_r: '{a} 가 {b} 를 이겼어요! 이번 라운드 승리', npc_lose_r: '{a} 가 {b} 에게 졌어요…', npc_wins: '(NPC {n}승)', npc_title_get: '새 칭호 획득!', npc_rest: '(잠깐 쉬고 다시 도전)', npc_victory: '🏆 승리!', npc_defeat: '😵 졌어요, 다시 도전!',
    npc_lines: ['요! 배틀할래?', '네 풋워크 빨라?', '새 프리즈 배웠어!', '진 사람이 버블티 쏘기 🧋', '춤 잘 춘다며?'],
    walk_enter: 'Enter / OK 로 입장', walk_tip: '방향키나 WASD 로 이동, 나라 위에서 Enter, Esc 로 종료',
    bt_vote: '투표', bt_ended: '종료·{n}표', bt_left: '약 {h}시간 남음·{n}표', bt_intro: '두 영상을 보고 승자에게 투표하세요! 배틀당 1표.', bt_new: '새 배틀 만들기', bt_t: '제목', bt_days: '투표 기간(일)', bt_create: '만들기', bt_none: '진행 중인 배틀이 없어요', bt_voted: '투표 완료!',
    cy_music: '음악', cy_online: '플로어에 {n}명', cy_join: '로그인하고 플로어 참가'
  }
});
