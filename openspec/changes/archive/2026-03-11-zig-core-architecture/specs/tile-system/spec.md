## ADDED Requirements

### Requirement: 每張牌擁有唯一 ID
系統 SHALL 為 144 張牌各分配一個唯一整數 ID（0–143），確保任何時刻每個 ID 在整個牌局中只對應一張實體牌。

#### Scenario: ID 唯一性
- **WHEN** 系統初始化 tile catalog
- **THEN** 144 個 ID 彼此不重複，且每張牌的 suit/rank/copy_index 組合唯一

#### Scenario: ID 範圍
- **WHEN** 系統產生 tile catalog
- **THEN** 所有 ID 落在 0–143 的整數範圍內

---

### Requirement: Tile catalog 定義完整牌組對照表
系統 SHALL 產生一份 tile catalog，記錄每個 ID 對應的 suit、rank、copy_index。

#### Scenario: 牌組組成正確
- **WHEN** 產生 tile catalog
- **THEN** 包含萬 1–9 各 4 張（36 張）、索 1–9 各 4 張（36 張）、筒 1–9 各 4 張（36 張）、東南西北各 4 張（16 張）、中發白各 4 張（12 張）、花牌 8 張，合計 144 張

#### Scenario: copy_index 區分同花色同點數
- **WHEN** 同一花色同點數有多張牌（如萬一有 4 張）
- **THEN** copy_index 分別為 0、1、2、3，用以區分個體

---

### Requirement: Tile catalog 隨 init 訊息傳送給 TUI
系統 SHALL 在遊戲開始時，將完整 tile catalog 包含在 `init` 訊息中傳給 TUI，格式為 `{ id, suit, rank, copy_index }` 陣列。

#### Scenario: TUI 建立本地 lookup
- **WHEN** TUI 收到 `init` 訊息
- **THEN** TUI 可用 tile_id 查詢對應的 suit 與 rank，用以渲染牌面，不需了解任何 ID 編碼規則
