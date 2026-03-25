## ADDED Requirements

### Requirement: 事件流捲動快捷鍵

系統 SHALL 提供事件流歷史導覽快捷鍵，讓玩家在底部命令列維持主要輸入入口的前提下，仍可直接控制中間事件流。`PageUp` MUST 將事件流往較早內容捲動、`PageDown` MUST 將事件流往較新內容捲動、`Home` MUST 跳到最早可見內容、`End` MUST 跳回最新內容並恢復自動跟隨；這些操作 MUST 為前端本地行為，不得送出 IPC，也不得改寫目前命令列文字。

#### Scenario: 玩家以導覽鍵回看較早事件
- **WHEN** 玩家按下 `PageUp` 或 `Home`
- **THEN** 系統在本地捲動中間事件流，且不送出任何遊戲 action 或改變命令列內容

#### Scenario: 玩家回到最新事件並恢復跟隨
- **WHEN** 玩家按下 `End`
- **THEN** 系統將事件流跳到最新內容，並在後續新事件追加時自動跟隨到底部

#### Scenario: 玩家向較新內容逐步前進
- **WHEN** 玩家按下 `PageDown`
- **THEN** 系統在本地將事件流往較新內容捲動；若已無更晚內容，畫面保持在目前位置
