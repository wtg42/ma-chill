## MODIFIED Requirements

### Requirement: 可用命令提示由 state 統一派生
系統 SHALL 根據 `available_actions` 與本地 command registry 派生出目前可用的命令提示，供頂部狀態列與底部命令列共用。收到 `turn_changed` 時，系統 SHALL 更新 `availableActions`、`currentPlayerId` 與 `availableCommandHints` 等 signal，**但 MUST 僅在 `player_id === 0`（人類玩家）時才將可用指令提示寫入事件流**；AI 玩家回合（`player_id !== 0`）不應在事件流中產生指令提示訊息。

#### Scenario: 新的 turn_changed 到達（人類玩家）
- **WHEN** TUI 收到 `turn_changed`，且 `player_id === 0`
- **THEN** state 重新派生當前可用命令提示，更新相關 UI，**並將可用指令提示寫入事件流**

#### Scenario: 新的 turn_changed 到達（AI 玩家）
- **WHEN** TUI 收到 `turn_changed`，且 `player_id !== 0`
- **THEN** state 更新 `currentPlayerId` 與其他 signal，但**不寫入任何指令提示到事件流**
