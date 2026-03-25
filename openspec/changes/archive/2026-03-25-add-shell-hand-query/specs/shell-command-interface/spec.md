## ADDED Requirements

### Requirement: `/hand` 本地查詢命令
系統 SHALL 提供 `/hand` 作為純本地查詢命令。執行 `/hand` 時 MUST 不送出任何 IPC 訊息，而是直接使用目前 TUI state 將玩家手牌摘要逐行追加到 shell 事件流；輸出 MUST 使用既有 ASCII 牌面渲染，而不是純文字牌名，且不得顯示 `tile_id`。

#### Scenario: 玩家手動查詢手牌
- **WHEN** 玩家在主畫面輸入 `/hand`
- **THEN** 系統在本地執行查詢，並依既定摘要格式將手牌內容逐行寫入事件流

#### Scenario: 尚未有遊戲狀態時查詢手牌
- **WHEN** 玩家輸入 `/hand` 但 TUI 尚未持有可用的遊戲狀態
- **THEN** 系統提供清楚的本地錯誤回饋，且不送出任何 IPC 訊息

#### Scenario: 幫助內容列出 `/hand`
- **WHEN** 玩家輸入 `/help`
- **THEN** 幫助內容包含 `/hand` 的 usage 與簡短說明
