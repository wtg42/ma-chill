## MODIFIED Requirements

### Requirement: 牌局狀態為單一 truth source
系統 SHALL 在 Zig core 維護完整牌局狀態，包含所有玩家的手牌、副露、棄牌堆，以及牌山剩餘張數、局風、局數、當前輪到誰、四位玩家的座位風（`seat_winds`）。TUI 不維護任何獨立狀態。

#### Scenario: 狀態完整性
- **WHEN** 任何玩家執行動作（摸牌、棄牌、副露、胡牌）
- **THEN** Zig core 更新內部狀態後，立即推送全量 state_update 給 TUI

#### Scenario: 座位風包含於狀態中
- **WHEN** GameState 初始化
- **THEN** `seat_winds` 包含四位玩家的門風，且在後續 state_update 中持續傳送
