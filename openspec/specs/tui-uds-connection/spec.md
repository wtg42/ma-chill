# tui-uds-connection

## Purpose

定義 TUI 層與 Zig core 之間 UDS（Unix Domain Socket）連線的規格，包含連線建立、訊息接收分派，以及玩家動作送出。

## Requirements

### Requirement: TUI 啟動時連線至 UDS
系統 SHALL 在 TUI 啟動時連線至 UDS socket，socket path 從環境變數 `MA_CHILL_SOCKET` 讀取，預設為 `/tmp/ma-chill.sock`。

#### Scenario: 連線成功
- **WHEN** TUI 啟動且 UDS socket 存在
- **THEN** 建立連線並開始監聽 JSONL 訊息串流

#### Scenario: 連線失敗
- **WHEN** TUI 啟動但 UDS socket 不存在或連線被拒
- **THEN** TUI 顯示「無法連線至遊戲核心」錯誤畫面並退出

### Requirement: 接收並分派 JSONL 訊息
系統 SHALL 持續讀取 UDS 串流，每收到一行 JSONL 即解析並根據 `type` 欄位分派處理。

#### Scenario: 收到 init 訊息
- **WHEN** UDS 串流傳來 `type: "init"` 訊息
- **THEN** 以 `tile_catalog` 建立 `Map<id, CanonicalTile>`，並以 `state` 初始化 gameState signal

#### Scenario: 收到 state_update 訊息
- **WHEN** UDS 串流傳來 `type: "state_update"` 訊息
- **THEN** 更新 gameState signal

#### Scenario: 收到 turn_changed 訊息
- **WHEN** UDS 串流傳來 `type: "turn_changed"` 訊息
- **THEN** 更新 availableActions signal 與 currentPlayerId signal

#### Scenario: 收到未知型別訊息
- **WHEN** UDS 串流傳來 `type` 不在已知清單的訊息
- **THEN** 忽略該訊息，繼續監聽

### Requirement: 送出 player_action
系統 SHALL 提供 `sendAction(action, tileId?)` 函式，將玩家操作序列化為 JSONL 並寫入 UDS 連線。

#### Scenario: 棄牌動作
- **WHEN** 玩家選牌並確認棄牌
- **THEN** 送出 `{"type":"player_action","action":"discard","tile_id":<id>}\n`

#### Scenario: pass 動作
- **WHEN** 玩家按下 pass 或倒數到期
- **THEN** 送出 `{"type":"player_action","action":"pass"}\n`
