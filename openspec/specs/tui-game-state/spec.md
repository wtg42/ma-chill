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
系統 SHALL 根據 `available_actions` 與本地 command registry 派生出目前可用的命令提示，供頂部狀態列與底部命令列共用。收到 `turn_changed` 時，系統 SHALL 更新 `availableActions`、`currentPlayerId` 與 `availableCommandHints` 等 signal，**但 MUST 僅在 `player_id === 0`（人類玩家）時才將可用指令提示寫入事件流**；AI 玩家回合（`player_id !== 0`）不應在事件流中產生指令提示訊息。

#### Scenario: 新的 turn_changed 到達（人類玩家）
- **WHEN** TUI 收到 `turn_changed`，且 `player_id === 0`
- **THEN** state 重新派生當前可用命令提示，更新相關 UI，**並將可用指令提示寫入事件流**

#### Scenario: 新的 turn_changed 到達（AI 玩家）
- **WHEN** TUI 收到 `turn_changed`，且 `player_id !== 0`
- **THEN** state 更新 `currentPlayerId` 與其他 signal，但**不寫入任何指令提示到事件流**

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

### Requirement: 手牌摘要由本地 state 派生
系統 SHALL 由玩家目前的 `handWithIds()` 與 `drawn_tile_id` 派生手牌摘要。摘要 MUST 依固定組序顯示萬、筒、條、風、三元、四季、四君子；各組內 MUST 依 canonical tile sort order 做升冪排序，並依實際持有數量重複顯示同種牌；各組輸出 MUST 使用既有 ASCII 牌面模板組成，不得退回為純文字牌名；空組別 MUST 不輸出；目前摸到的牌 MUST 另列為 `摸牌` 區塊；摘要 MUST 不包含 `tile_id`。

#### Scenario: 混合手牌被整理成分組摘要
- **WHEN** 玩家手牌同時含萬、筒、條、風牌、三元牌與 bonus 牌
- **THEN** 系統輸出多行摘要，且各行依固定組序與升冪排序呈現

#### Scenario: 缺少的分類不顯示空行
- **WHEN** 玩家手牌中沒有四季或四君子
- **THEN** 摘要中不產生對應的空白分類行

### Requirement: 玩家自摸後自動寫入手牌摘要
系統 SHALL 在 viewer 玩家於 `state_update` 中摸到新牌時，自動將與 `/hand` 相同格式的手牌摘要寫入事件流，且該摘要 SHALL 緊接在摸牌敘事之後。其他玩家摸牌或非摸牌更新 MUST 不自動重印玩家手牌摘要。

#### Scenario: 玩家自摸後自動顯示摘要
- **WHEN** `state_update` 讓 viewer 的 `drawn_tile_id` 變為新的非空值
- **THEN** 事件流先追加摸牌訊息，再追加同格式的手牌摘要

#### Scenario: 非 viewer 自摸或一般更新不重印手牌
- **WHEN** `state_update` 只反映其他玩家摸牌、棄牌或一般局面變化
- **THEN** 系統不自動追加 viewer 的手牌摘要
