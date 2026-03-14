# tui-game-state

## Purpose

定義 TUI 層遊戲狀態管理的規格，包含 `useGameState()` hook 的行為、手牌資料結構，以及 tile catalog 對應邏輯。

## Requirements

### Requirement: useGameState hook 集中管理遊戲狀態
系統 SHALL 提供 `useGameState()` hook，以 SolidJS signal 儲存遊戲狀態，供 UI 元件響應式讀取。

#### Scenario: 初始化
- **WHEN** 收到 `init` 訊息
- **THEN** `gameState` signal 設為初始 GameState，`tileCatalog` Map 建立完成，`availableActions` 設為空陣列

#### Scenario: 狀態更新
- **WHEN** 收到 `state_update` 訊息
- **THEN** `gameState` signal 更新為新的 GameState，UI 自動重繪

#### Scenario: 輪次變更
- **WHEN** 收到 `turn_changed` 訊息
- **THEN** `availableActions` signal 更新，`currentPlayerId` signal 更新

### Requirement: 手牌以 id + CanonicalTile 配對儲存
系統 SHALL 將手牌表示為 `{ id: number, tile: CanonicalTile }[]`，id 來自 Zig state，tile 由 tileCatalog Map lookup 得到。

#### Scenario: 手牌 lookup
- **WHEN** gameState.players[0].hand 包含 tile_id 陣列
- **THEN** 每個 id 透過 tileCatalog Map 取得對應 CanonicalTile，組成配對陣列供 PlayerRow 渲染

#### Scenario: 打牌取得 id
- **WHEN** 玩家選擇手牌中的某張 CanonicalTile
- **THEN** 從配對陣列取得對應 id，傳給 sendAction

### Requirement: tileCatalog 以 Zig rank string 對應本地 CanonicalTile
系統 SHALL 在收到 `init` 訊息時，將 Zig 的 `tile_catalog`（含 suit/rank string）對應至本地 `buildTaiwanMahjongCatalog()` 的 CanonicalTile，建立 `Map<number, CanonicalTile>`。

#### Scenario: rank string 轉換
- **WHEN** Zig 送來 `rank: "three"`
- **THEN** 對應本地 catalog 中 rank 為 `3` 的 CanonicalTile

#### Scenario: copy_index 忽略
- **WHEN** Zig 送來同種牌的不同 copy（如 id=80 和 id=81 都是竹三）
- **THEN** 兩者都對應同一個 CanonicalTile（竹三），渲染結果相同
