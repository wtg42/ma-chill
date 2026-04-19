## MODIFIED Requirements

### Requirement: useGameState hook 集中管理遊戲狀態
系統 SHALL 由集中式 TUI state 層同時管理：

- 來自 Zig 的遊戲狀態（gameState、tileCatalog、availableActions、currentPlayerId）
- 當前 prompt phase 與 claim context（例如 `phaseKind`、`discardedTileId`、`discarderPlayerId`、可選吃牌組合）
- shell UI 本地狀態（命令列內容、最近命令回饋、事件流、可用命令提示）

#### Scenario: 收到自己回合 prompt
- **WHEN** TUI 收到 `phase_kind = "self_turn"` 的 `turn_changed`
- **THEN** state 更新 `availableActions`、`currentPlayerId` 與目前 prompt phase，並清除上一個 claim window 的上下文

#### Scenario: 收到棄牌反應窗 prompt
- **WHEN** TUI 收到 `phase_kind = "discard_reaction"` 的 `turn_changed`
- **THEN** state MUST 保存該 prompt 的 claim context，供命令層、倒數與事件流使用

### Requirement: 可用命令提示由 state 統一派生
系統 SHALL 根據 `available_actions`、目前 `phase_kind`、claim context 與本地 command registry 派生出目前可用的命令提示，供頂部狀態列與底部命令列共用。收到 `turn_changed` 時，系統 SHALL 更新 `availableActions`、`currentPlayerId`、phase 資訊與 `availableCommandHints`；若該 prompt 屬於玩家，事件流 MUST 能辨識這是自己回合提示還是棄牌反應窗提示。

#### Scenario: 玩家自己的回合提示
- **WHEN** TUI 收到 `player_id === 0` 且 `phase_kind = "self_turn"` 的 `turn_changed`
- **THEN** state 重新派生目前可用的自己回合命令提示，並將對應提示寫入事件流

#### Scenario: 玩家棄牌反應窗提示
- **WHEN** TUI 收到 `player_id === 0` 且 `phase_kind = "discard_reaction"` 的 `turn_changed`
- **THEN** state 重新派生目前可用的 claim 命令提示，並在事件流中清楚指出正在回應哪位玩家打出的哪一張牌

#### Scenario: AI prompt 不寫入玩家指令提示
- **WHEN** TUI 收到 `player_id !== 0` 的 `turn_changed`
- **THEN** state 更新相關 signal，但不將玩家可執行指令提示寫入事件流
