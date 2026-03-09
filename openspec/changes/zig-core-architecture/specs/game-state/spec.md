## ADDED Requirements

### Requirement: 牌局狀態為單一 truth source
系統 SHALL 在 Zig core 維護完整牌局狀態，包含所有玩家的手牌、副露、棄牌堆，以及牌山剩餘張數、局風、局數、當前輪到誰。TUI 不維護任何獨立狀態。

#### Scenario: 狀態完整性
- **WHEN** 任何玩家執行動作（摸牌、棄牌、副露、胡牌）
- **THEN** Zig core 更新內部狀態後，立即推送全量 state_update 給 TUI

---

### Requirement: 全量 snapshot 策略
系統 SHALL 在每次動作後推送完整的 `state_update` 訊息，包含所有玩家的手牌 tile_id 陣列、副露列表、棄牌堆，以及牌山剩餘張數。

#### Scenario: TUI 替換狀態
- **WHEN** TUI 收到 `state_update`
- **THEN** TUI 完整替換本地顯示狀態，不需合併或追蹤差異

#### Scenario: 狀態包含所有玩家資料
- **WHEN** 推送 state_update
- **THEN** 訊息包含四位玩家各自的 hand（tile_id 陣列）、melds（副露列表）、discards（棄牌堆 tile_id 陣列）

---

### Requirement: state_update 包含本回合事件列表
系統 SHALL 在 `state_update` 中附帶 `events[]` 欄位，記錄本回合發生的事（如補花），讓 TUI 可依序顯示動作。

#### Scenario: 花牌補牌事件
- **WHEN** 玩家摸到花牌並自動補牌
- **THEN** state_update 的 events 包含 `{ type: "bonus_tile", player_id, tile_id }` 事件

---

### Requirement: 玩家手牌依身份過濾
系統 SHALL 在推送給 TUI 的狀態中，僅提供真實玩家（player_id=0）的完整手牌；AI 玩家的手牌只提供張數（`hand_count`），不傳送實際 tile_id。

#### Scenario: AI 手牌不透明
- **WHEN** 推送 state_update
- **THEN** AI 玩家欄位包含 `hand_count: N` 而非 tile_id 陣列，TUI 渲染背面牌
