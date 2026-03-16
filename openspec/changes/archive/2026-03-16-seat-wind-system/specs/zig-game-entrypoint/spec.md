## MODIFIED Requirements

### Requirement: 遊戲啟動順序
系統 SHALL 按照固定順序啟動：先建立 UDS socket 監聽，再 spawn TUI，再接受連線，初始化牌局（含骰子擲骰與座位風分配），推送 init 訊息，等待 `player_ready`，再進入遊戲迴圈。

#### Scenario: 正常啟動
- **WHEN** 執行 ma-chill 執行檔
- **THEN** 依序執行：listen(socket_path) → spawnTui() → accept() → Session.init() → 擲骰決定莊家與座位風 → initGameState() → sendMessage(init) → 等待 player_ready → playRound()

#### Scenario: 等待 player_ready
- **WHEN** Zig 送出 init 訊息後
- **THEN** Zig 等待 TUI 回傳 `{ type: "player_ready" }`，收到後才呼叫 `playRound` 進入遊戲迴圈
