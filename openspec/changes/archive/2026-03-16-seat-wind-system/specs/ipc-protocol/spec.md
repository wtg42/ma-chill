## MODIFIED Requirements

### Requirement: Zig → TUI 訊息型別定義
系統 SHALL 支援以下 Zig → TUI 訊息：

- `init`：tile catalog（144 張）+ 初始遊戲狀態（各玩家手牌、牌山剩餘、局風、局數、莊家、座位風）+ `pass_timeout_seconds`（從設定檔讀取）
- `state_update`：全量遊戲狀態 + events[]
- `turn_changed`：輪到誰（player_id）+ 可用動作列表（`["chi","pon","kong","win","discard"]` 子集）
- `game_over`：勝者 player_id + 最終分數列表

#### Scenario: init 觸發時機
- **WHEN** TUI 連上 UDS socket
- **THEN** Zig 立即推送 init 訊息，包含 `pass_timeout_seconds` 欄位

#### Scenario: init 包含座位風
- **WHEN** Zig 推送 init 訊息
- **THEN** `state` 物件包含 `seat_winds` 欄位，為四個風位字串的陣列（如 `["west", "north", "east", "south"]`）

#### Scenario: turn_changed 觸發時機
- **WHEN** 任何玩家完成其回合（棄牌或副露後）
- **THEN** Zig 推送 turn_changed，指定下一位玩家與其可用動作

## ADDED Requirements

### Requirement: TUI → Zig player_ready 訊息
系統 SHALL 支援 TUI 傳送 `player_ready` 訊息，通知 Zig core 玩家已確認座位分配，可開始遊戲迴圈。

#### Scenario: player_ready 觸發
- **WHEN** 玩家在 Lobby 畫面按任意鍵
- **THEN** TUI 傳送 `{ type: "player_ready" }`

#### Scenario: Zig 等待 player_ready
- **WHEN** Zig 送出 init 訊息後
- **THEN** Zig 等待收到 `player_ready` 後才呼叫 `playRound` 進入遊戲迴圈
