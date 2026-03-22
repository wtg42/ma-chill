# tui-game-state

## Purpose

定義 TUI 層遊戲狀態管理的規格，包含 `useGameState()` hook 的行為、手牌資料結構，以及 tile catalog 對應邏輯。

## Requirements

### Requirement: useGameState hook 集中管理遊戲狀態
系統 SHALL 由集中式 TUI state 層同時管理兩類資訊：
- 來自 Zig 的遊戲狀態（gameState、tileCatalog、availableActions、currentPlayerId）
- shell UI 本地狀態（命令列內容、最近命令回饋、事件流、可用命令提示）

#### Scenario: 收到 init 訊息後初始化 shell state
- **WHEN** TUI 收到 `init` 訊息
- **THEN** 集中式 state 同時建立遊戲狀態與 shell 介面初始狀態

#### Scenario: 命令執行結果更新本地狀態
- **WHEN** 玩家送出命令且解析成功或失敗
- **THEN** shell 本地狀態更新最近命令結果與對應事件流內容

#### Scenario: 狀態更新
- **WHEN** 收到 `state_update` 訊息
- **THEN** `gameState` signal 更新為新的 GameState，UI 自動重繪

#### Scenario: 輪次變更
- **WHEN** 收到 `turn_changed` 訊息
- **THEN** `availableActions` signal 更新，`currentPlayerId` signal 更新

### Requirement: 事件流以本地 state 管理
系統 SHALL 以本地 state 保存可回溯的事件流，內容可同時來自 Zig 訊息與前端命令回饋，供 shell 中間區域渲染。

#### Scenario: 收到 Zig 狀態事件
- **WHEN** TUI 收到可轉譯為遊戲敘事的 IPC 訊息
- **THEN** 系統將對應描述追加到事件流

#### Scenario: 前端命令錯誤
- **WHEN** 命令解析或合法性檢查失敗
- **THEN** 系統將錯誤回饋追加到事件流，而不改動 Zig game state

### Requirement: 可用命令提示由 state 統一派生
系統 SHALL 根據 `available_actions` 與本地 command registry 派生出目前可用的命令提示，供頂部狀態列與底部命令列共用。

#### Scenario: 新的 turn_changed 到達
- **WHEN** TUI 收到新的 `turn_changed`
- **THEN** state 重新派生當前可用命令提示，並更新相關 UI

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
