## ADDED Requirements

### Requirement: 獨立合法動作判定入口
系統 SHALL 提供獨立於 `playRound` 的合法動作判定入口，使用 `GameState`、`player_id` 與可選的棄牌上下文計算可執行動作，而不依賴 driver、UDS session 或訊息推送。

#### Scenario: 自己回合的合法動作判定
- **WHEN** 單元測試提供輪到自己的 `GameState`，且沒有待回應的棄牌上下文
- **THEN** 合法動作判定入口可直接回傳 `discard` / `kong` / `win` 等動作子集，而不需要執行完整回合流程

#### Scenario: 他家棄牌後的合法動作判定
- **WHEN** 單元測試提供他家棄牌的 `tile_id` 與 discarder 上下文
- **THEN** 合法動作判定入口依規則回傳 `chi` / `pon` / `kong` / `win` / `pass` 的合法子集

### Requirement: 獨立狀態轉移入口
系統 SHALL 提供以 `tile_id` 為唯一識別的狀態轉移入口，分別處理棄牌、暗槓、吃牌、碰牌與明槓，並直接更新 `GameState`，但不得在這些函式內觸發 driver 或 IPC 副作用。

#### Scenario: 棄牌狀態轉移
- **WHEN** 單元測試以特定 `tile_id` 呼叫棄牌狀態轉移入口
- **THEN** 該牌會自玩家手牌移除、加入棄牌列，且 `drawn_tile_id` 依規則更新

#### Scenario: 副露狀態轉移
- **WHEN** 單元測試以棄牌 `tile_id` 與 claim 玩家呼叫吃牌、碰牌或明槓狀態轉移入口
- **THEN** `GameState` 的手牌、melds 與當前行動玩家會反映該次副露結果

### Requirement: 獨立搶牌仲裁入口
系統 SHALL 提供獨立的搶牌仲裁入口，接收多位玩家對同一張棄牌的合法回應，依既有優先序決定唯一結果，並以結構化 outcome 回傳仲裁結果。

#### Scenario: 高優先序 claim 勝出
- **WHEN** 同一張棄牌同時出現 `win` 與 `pon` 等多個合法回應
- **THEN** 搶牌仲裁入口會依既有優先序選出唯一勝出結果

#### Scenario: 全部玩家 pass
- **WHEN** 所有合法回應都為 `pass`
- **THEN** 搶牌仲裁入口回傳無人 claim 的 outcome，讓回合正常輪轉到下一位玩家

### Requirement: `playRound` 僅負責 orchestration
系統 SHALL 讓 `playRound` 保留 driver 互動、流程排序與 `state_update` / `turn_changed` / `game_over` 訊息推送責任，並將規則判定與狀態轉移委派給抽出的 turn engine 模組。

#### Scenario: 正常回合編排
- **WHEN** `playRound` 處理一次正常摸牌與棄牌流程
- **THEN** 它會透過抽出的模組取得合法動作並套用狀態轉移，而非在函式內內嵌完整規則細節

#### Scenario: 搶牌後的訊息推送
- **WHEN** `playRound` 收到搶牌仲裁 outcome
- **THEN** 它會依 outcome 決定是否推送 `state_update` 或 `game_over`，但不在 orchestrator 內重新實作搶牌規則

### Requirement: 以單元測試作為 turn engine 主要驗證方式
系統 SHALL 允許 turn engine 的核心行為透過 Zig `std.testing` 單元測試直接驗證，而不要求每個回歸案例都經由完整牌局或 TUI 整合流程重現。

#### Scenario: 直接測試 turn engine 模組
- **WHEN** 開發者需要驗證合法動作、狀態轉移或搶牌優先序
- **THEN** 測試可直接建立 `GameState` 並呼叫抽出的 turn engine 入口函式

#### Scenario: 既有測試指令仍可執行
- **WHEN** 開發者執行 `zig build test`
- **THEN** turn engine 的單元測試會與既有 core 模組測試一起執行，而不需新增獨立 feature test runner
