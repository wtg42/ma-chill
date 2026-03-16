## Purpose

定義 Zig core 與 TUI 之間透過 Unix Domain Socket 傳輸的 JSONL 通訊協定與訊息型別。

## Requirements

### Requirement: JSONL over UDS 為唯一通訊格式
系統 SHALL 使用 Unix Domain Socket 傳輸訊息，每條訊息為一個 JSON 物件後接換行符（`\n`），固定包含 `type` 欄位作為 discriminator。

#### Scenario: 訊息格式正確
- **WHEN** Zig 傳送任何訊息給 TUI
- **THEN** 訊息為單行 JSON 物件，結尾為 `\n`，且包含 `type` 欄位

#### Scenario: TUI 傳送動作
- **WHEN** 玩家在 TUI 執行操作（如按下 c=吃）
- **THEN** TUI 傳送一條 JSONL 訊息給 Zig，包含 `type: "player_action"` 與對應欄位

### Requirement: Zig 為 server，TUI 為 client
系統 SHALL 在 Zig 啟動時建立 UDS socket 並監聽，TUI 在被 spawn 後主動連線。Socket path 透過環境變數 `MA_CHILL_SOCKET` 傳給 TUI。

#### Scenario: 啟動順序
- **WHEN** 使用者執行 ma-chill 執行檔
- **THEN** Zig 先建立 socket -> spawn TUI -> TUI 連線 -> Zig 推送 init

### Requirement: Zig → TUI 訊息型別定義
系統 SHALL 支援以下 Zig → TUI 訊息：

- `init`：tile catalog（144 張）+ 初始遊戲狀態（各玩家手牌、牌山剩餘、局風、局數、莊家、座位風）+ `pass_timeout_seconds`（從設定檔讀取）
- `state_update`：全量遊戲狀態 + events[]
- `turn_changed`：輪到誰（player_id）+ 可用動作列表（`["chi","pon","kong","win","discard"]` 子集）
- `game_over`：勝者 player_id + 最終分數列表 + 計番明細（scoring_detail）

#### Scenario: init 觸發時機
- **WHEN** TUI 連上 UDS socket
- **THEN** Zig 立即推送 init 訊息，包含 `pass_timeout_seconds` 欄位

#### Scenario: init 包含座位風
- **WHEN** Zig 推送 init 訊息
- **THEN** `state` 物件包含 `seat_winds` 欄位，為四個風位字串的陣列（如 `["west", "north", "east", "south"]`）

#### Scenario: pass_timeout_seconds 來源
- **WHEN** Zig 啟動時
- **THEN** 從設定檔讀取 pass 倒數秒數，並在 init 訊息中傳給 TUI；TUI 收到後自行計時，倒數結束時送出 `player_action: "pass"`

#### Scenario: turn_changed 觸發時機
- **WHEN** 任何玩家完成其回合（棄牌或副露後）
- **THEN** Zig 推送 turn_changed，指定下一位玩家與其可用動作

#### Scenario: game_over 包含計番明細
- **WHEN** 有玩家胡牌，Zig 推送 game_over
- **THEN** 訊息包含 `scoring_detail` 物件：`{ total_fan: number, lines: [{ pattern: string, fan: number }] }`

#### Scenario: 流局 game_over
- **WHEN** 流局（無人胡牌）
- **THEN** `game_over` 的 `scoring_detail` 為 `null`，`winner_id` 為 `null`

#### Scenario: scoring_detail 牌型名稱
- **WHEN** game_over 包含 scoring_detail
- **THEN** lines 中的 pattern 為英文識別符（如 `"self_draw"`、`"all_triplets"`、`"flush"` 等），TUI 負責翻譯為中文顯示

### Requirement: TUI → Zig player_ready 訊息
系統 SHALL 支援 TUI 傳送 `player_ready` 訊息，通知 Zig core 玩家已確認座位分配，可開始遊戲迴圈。

#### Scenario: player_ready 觸發
- **WHEN** 玩家在 Lobby 畫面按任意鍵
- **THEN** TUI 傳送 `{ type: "player_ready" }`

#### Scenario: Zig 等待 player_ready
- **WHEN** Zig 送出 init 訊息後
- **THEN** Zig 等待收到 `player_ready` 後才呼叫 `playRound` 進入遊戲迴圈

### Requirement: TUI → Zig 訊息型別定義
系統 SHALL 支援以下 TUI → Zig 訊息：

- `player_action`：type（`"discard"` | `"chi"` | `"pon"` | `"kong"` | `"win"` | `"pass"`）+ 選用 `tile_id`（棄牌或吃牌時必填）

#### Scenario: 棄牌動作
- **WHEN** 玩家按下手牌對應熱鍵
- **THEN** TUI 傳送 `{ type: "player_action", action: "discard", tile_id: <id> }`

#### Scenario: 非法動作被忽略
- **WHEN** TUI 傳送 Zig 判定為非法的 player_action（如不可吃的牌）
- **THEN** Zig 忽略該訊息，不更新狀態，可選擇推送 error 訊息給 TUI
