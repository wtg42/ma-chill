## ADDED Requirements

### Requirement: 牌局狀態為單一 truth source
系統 SHALL 在 Zig core 維護完整牌局狀態，包含所有玩家的手牌、副露、棄牌堆，以及牌山剩餘張數、局風、局數、當前輪到誰。TUI 不維護任何獨立狀態。

#### Scenario: 狀態完整性
- **WHEN** 任何玩家執行動作（摸牌、棄牌、副露、胡牌）
- **THEN** Zig core 更新內部狀態後，立即推送全量 state_update 給 TUI

---

### Requirement: 全量 snapshot 策略
系統 SHALL 在每次動作後推送完整的 `state_update` 訊息，包含所有玩家的手牌 tile_id 陣列、副露列表、棄牌堆，以及牌山剩餘張數。`state_update` 亦包含 `drawn_tile_id`（玩家當前摸牌，非玩家回合時為 `null`）。

#### Scenario: TUI 替換狀態
- **WHEN** TUI 收到 `state_update`
- **THEN** TUI 完整替換本地顯示狀態，不需合併或追蹤差異

#### Scenario: 狀態包含所有玩家資料
- **WHEN** 推送 state_update
- **THEN** 訊息包含四位玩家各自的 hand（tile_id 陣列）、melds（副露列表）、discards（棄牌堆 tile_id 陣列）

---

### Requirement: 副露物件 JSON schema

每個副露物件 SHALL 符合以下結構：

```json
{
  "type": "chi" | "pon" | "open_kong" | "closed_kong",
  "tiles": [tile_id, tile_id, tile_id],
  "source_index": 1
}
```

- `tiles`：副露的牌 tile_id 陣列（chi/pon 為 3 張，open_kong/closed_kong 為 4 張）
- `source_index`：`tiles` 陣列中來源牌的索引（吃入/碰入/槓入的那張）；chi 時 TUI 用此決定置中位置，pon/kong 時可為 `null`
- AI 的 `closed_kong` 仍傳送實際 `tile_id`，TUI 依擁有者身份決定顯示正面（dimmed）或背面牌

#### Scenario: 吃牌副露格式
- **WHEN** 玩家吃入上家棄牌（如吃入 tile_id=5，搭配手牌 tile_id=3、4）
- **THEN** melds 新增 `{ "type": "chi", "tiles": [3, 4, 5], "source_index": 2 }`

#### Scenario: 碰牌副露格式
- **WHEN** 玩家碰入他家棄牌（tile_id=7，手牌有兩張 tile_id=8、9）
- **THEN** melds 新增 `{ "type": "pon", "tiles": [7, 8, 9], "source_index": 0 }`

#### Scenario: AI closed_kong 傳送 tile_id
- **WHEN** AI 宣告暗槓
- **THEN** melds 仍包含實際 tile_id 陣列，TUI 收到後依 player_id 判斷顯示背面牌

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

---

### Requirement: drawn_tile_id 欄位

`state_update` SHALL 包含 `drawn_tile_id` 欄位，指示真實玩家（player_id=0）當前摸到的牌。

#### Scenario: 玩家回合摸牌
- **WHEN** 輪到玩家摸牌
- **THEN** `state_update` 的 `drawn_tile_id` 為該張牌的 tile_id，TUI 在 LatestTileBox 顯示此牌

#### Scenario: 非玩家回合
- **WHEN** 輪到 AI 行動或等待狀態
- **THEN** `state_update` 的 `drawn_tile_id` 為 `null`，TUI 的 LatestTileBox 空白

---

### Requirement: state_update 包含當前分數

系統 SHALL 在完整狀態中維護並序列化四位玩家的當前分數 `scores[4]`，供 `game_over` 顯示與 AI 的 `score_sensitive` 判斷使用。

#### Scenario: AI 使用分數差距調整策略
- **WHEN** AI 進行決策
- **THEN** 傳入的 game state 包含四位玩家目前分數，讓 AI 可判斷自己是否落後或領先
