## ADDED Requirements

### Requirement: LatestTileBox 資料來源

兩種情境的資料來源不同：

- **玩家（PlayerRow）**：從 `state_update.drawn_tile_id` 讀取；`null` 時顯示空白
- **AI（AiPlayerRow）**：從該玩家 `discards[]` 的最後一張推算；空陣列時顯示空白

#### Scenario: drawn_tile_id 有值
- **WHEN** `state_update.drawn_tile_id` 不為 null
- **THEN** PlayerRow 的 LatestTileBox 顯示該牌

#### Scenario: drawn_tile_id 為 null
- **WHEN** `state_update.drawn_tile_id` 為 null（非玩家回合）
- **THEN** PlayerRow 的 LatestTileBox 顯示空白佔位

---

### Requirement: LatestTileBox 位置與排列

`LatestTileBox` SHALL 以 inline 方式緊接在手牌列（玩家）或副露列（AI）之後，以 gap 視覺區隔，不使用 label 文字。

#### Scenario: 玩家有摸牌
- **WHEN** 玩家摸到一張牌
- **THEN** LatestTileBox 顯示該牌完整牌面（7×4），位置在手牌最右側，有 gap 區隔

#### Scenario: 玩家無摸牌
- **WHEN** 玩家尚未摸牌
- **THEN** LatestTileBox 顯示空白，但保留固定寬度佔位

#### Scenario: AI 棄牌後
- **WHEN** AI 打出一張牌
- **THEN** LatestTileBox 顯示該牌完整牌面，位置在副露列最右側，有 gap 區隔

#### Scenario: AI 非棄牌狀態
- **WHEN** AI 尚未棄牌或輪到其他玩家
- **THEN** LatestTileBox 顯示空白，保留固定寬度佔位

---

### Requirement: LatestTileBox 無 label

`LatestTileBox` SHALL 不顯示任何文字 label（如「摸牌」、「棄牌」），語意由位置與時機傳達。

#### Scenario: 顯示任意狀態
- **WHEN** LatestTileBox 顯示牌面或空白
- **THEN** 元件內不出現任何文字 label
