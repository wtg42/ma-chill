## MODIFIED Requirements

### Requirement: Session 封裝雙向 UDS 連線
系統 SHALL 提供 `Session` struct，持有與單一 TUI client 的 stream，並提供 `sendMessage` 與 `receivePlayerAction` 兩個操作介面。

#### Scenario: 傳送訊息給 TUI
- **WHEN** 遊戲迴圈呼叫 `session.sendMessage(msg)`
- **THEN** 訊息以 JSONL 格式寫入 stream，結尾含 `\n`

#### Scenario: 接收玩家動作
- **WHEN** 呼叫 `session.receivePlayerAction()`
- **THEN** 阻塞讀取直到收到一行 JSONL，解析為 `PlayerActionMessage` 並回傳

#### Scenario: 收到非 player_action 訊息
- **WHEN** stream 傳來的訊息不是 `player_action` 型別
- **THEN** Session SHALL 忽略該訊息並繼續等待下一條

## REMOVED Requirements

### Requirement: 接收玩家動作（有 timeout）
**Reason**: Pass timeout 責任移至 TUI 端 auto-pass timer，Zig core 不再需要獨立超時機制
**Migration**: 所有呼叫 `receivePlayerAction(timeout_ms)` 的地方改為 `receivePlayerAction()`，移除 timeout 參數
