# zig-game-entrypoint

## Purpose

定義 Zig core 的主程式進入點行為：啟動順序、UDS socket 建立、TUI spawn、以及透過 `GameDriver` 將 `Session` 接線至遊戲迴圈的方式。

## Requirements

### Requirement: 遊戲啟動順序
系統 SHALL 按照固定順序啟動：先建立 UDS socket 監聽，再 spawn TUI，再接受連線，初始化牌局（含骰子擲骰與座位風分配），推送 init 訊息，等待 `player_ready`，再進入遊戲迴圈。

#### Scenario: 正常啟動
- **WHEN** 執行 ma-chill 執行檔
- **THEN** 依序執行：listen(socket_path) → spawnTui() → accept() → Session.init() → 擲骰決定莊家與座位風 → initGameState() → sendMessage(init) → 等待 player_ready → playRound()

#### Scenario: 等待 player_ready
- **WHEN** Zig 送出 init 訊息後
- **THEN** Zig 等待 TUI 回傳 `{ type: "player_ready" }`，收到後才呼叫 `playRound` 進入遊戲迴圈

#### Scenario: socket path 來源
- **WHEN** 啟動時
- **THEN** socket path 優先讀取環境變數 `MA_CHILL_SOCKET`，否則使用預設值 `/tmp/ma-chill.sock`

### Requirement: 遊戲迴圈接線
系統 SHALL 透過 `GameDriver` struct 將 `Session` 注入 `playRound` 的 `turn_decider` 與 `claim_decider`。

#### Scenario: player 0 的 turn_decider
- **WHEN** `playRound` 呼叫 `turn_decider`，且 `current_player_id == 0`
- **THEN** `GameDriver` 呼叫 `session.receivePlayerAction(timeout)`，timeout 根據 `available_actions` 是否含 `.pass` 決定（含 pass → `pass_timeout_ms`，否則 → null）

#### Scenario: AI 玩家的 turn_decider
- **WHEN** `playRound` 呼叫 `turn_decider`，且 `current_player_id != 0`
- **THEN** `GameDriver` 呼叫 `ai.agent.decide()`，立即回傳結果

#### Scenario: claim_decider 相同邏輯
- **WHEN** `playRound` 呼叫 `claim_decider`
- **THEN** 與 `turn_decider` 相同判斷：player 0 → session，AI → agent

### Requirement: sink 將訊息轉發給 TUI
系統 SHALL 提供 sink function，將 `playRound` 產生的每條 `Message` 透過 `Session.sendMessage` 傳給 TUI。

#### Scenario: state_update 轉發
- **WHEN** `playRound` 產生 `state_update` 訊息
- **THEN** sink 立即呼叫 `session.sendMessage(msg)`

#### Scenario: game_over 轉發
- **WHEN** `playRound` 產生 `game_over` 訊息
- **THEN** sink 立即呼叫 `session.sendMessage(msg)`，遊戲迴圈正常結束

### Requirement: pass timeout 設定
系統 SHALL 使用固定的 pass timeout 值（5 秒），作為 player 0 在副露詢問時自動 pass 的等待上限。

#### Scenario: 倒數結束自動 pass
- **WHEN** player 0 收到含 `pass` 的 `turn_changed`，且在 5 秒內未傳送 `player_action`
- **THEN** 系統自動以 `{ action: pass }` 繼續遊戲
