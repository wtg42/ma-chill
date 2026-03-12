## ADDED Requirements

### Requirement: Session 封裝雙向 UDS 連線
系統 SHALL 提供 `Session` struct，持有與單一 TUI client 的 stream，並提供 `sendMessage` 與 `receivePlayerAction` 兩個操作介面。

#### Scenario: 傳送訊息給 TUI
- **WHEN** 遊戲迴圈呼叫 `session.sendMessage(msg)`
- **THEN** 訊息以 JSONL 格式寫入 stream，結尾含 `\n`

#### Scenario: 接收玩家動作（無 timeout）
- **WHEN** 呼叫 `session.receivePlayerAction(null)`
- **THEN** 阻塞讀取直到收到一行 JSONL，解析為 `PlayerActionMessage` 並回傳

#### Scenario: 接收玩家動作（有 timeout）
- **WHEN** 呼叫 `session.receivePlayerAction(timeout_ms)` 且在 timeout 內未收到訊息
- **THEN** 回傳 `{ action: .pass, tile_id: null }`（模擬自動 pass）

#### Scenario: 收到非 player_action 訊息
- **WHEN** stream 傳來的訊息不是 `player_action` 型別
- **THEN** Session SHALL 忽略該訊息並繼續等待下一條
