## MODIFIED Requirements

### Requirement: 回合推進邏輯
系統 SHALL 以 phase-based 模型推進台灣麻將回合，而不是僅以單一線性 action loop 表示。回合流程 MUST 明確區分兩類 phase family：

- `self-turn`：當前玩家摸牌後處理自己的手牌，可做自摸、可做的槓、或棄牌。
- `discard-reaction`：某位玩家棄牌後，其他玩家依優先層級進入反應窗。

在 `discard-reaction` family 中，系統 SHALL 依以下優先層級處理：

1. 胡牌層
2. 碰 / 槓層
3. 吃牌層

在同一層級內，若玩家具備合法動作，系統 MUST 先提供玩家決策視窗；只有在玩家不可行、pass 或逾時後，AI 才可在同層內做決策。只要某一層已產生結果，較低層 SHALL 不再繼續處理。

#### Scenario: 正常回合無人反應
- **WHEN** 當前玩家完成棄牌，且胡牌層、碰 / 槓層、吃牌層都無人產生結果
- **THEN** 系統結束本次 `discard-reaction` phase，輪到下一位玩家進入 `self-turn` 並摸牌

#### Scenario: 玩家與 AI 同時可碰時玩家先決策
- **WHEN** 某張棄牌進入碰 / 槓層，且玩家與至少一位 AI 都可對該牌宣告碰或槓
- **THEN** 系統 MUST 先提供玩家決策視窗，只有在玩家 pass、逾時或不可行後，AI 才能在該層內進行決策

#### Scenario: 玩家可吃但另一家可碰
- **WHEN** 某張棄牌讓玩家可吃，且另一位玩家可碰或槓同一張牌
- **THEN** 系統 MUST 先處理碰 / 槓層；若該層已有結果，吃牌層 SHALL 不再開啟

#### Scenario: 玩家與 AI 同時可胡同一張牌
- **WHEN** 某張棄牌進入胡牌層，且玩家與至少一位 AI 都可對同一張牌胡牌
- **THEN** 系統 MUST 先提供玩家胡牌視窗；若玩家選擇胡牌，對局立即結束且不再檢查 AI 的胡牌決策

### Requirement: 合法動作判定
系統 SHALL 依目前 phase 與 claim context 計算合法動作，而不是只根據目前玩家是否輪到自己。合法動作 MUST 至少涵蓋：

- 在 `self-turn` 中：
  - 胡（`win`）：符合目前胡牌條件
  - 槓（`kong`）：符合目前可宣告的槓型
  - 棄牌（`discard`）：輪到自己時永遠合法
- 在 `discard-reaction` 中：
  - 胡（`win`）：對當前棄牌成立
  - 碰（`pon`）：對當前棄牌成立
  - 槓（`kong`）：對當前棄牌成立
  - 吃（`chi`）：僅下家可對當前棄牌成立，且 MUST 提供具體可選組合
  - 過（`pass`）：在反應窗中永遠合法

系統 MUST 只允許 phase 對應的動作。例如 `discard-reaction` 中不得執行一般棄牌，`self-turn` 中不得執行 `pass`。

#### Scenario: 吃牌提供具體選項
- **WHEN** 某位玩家在 `discard-reaction` 中可吃某張棄牌，且該牌可與手牌組成多種順子
- **THEN** 系統 MUST 將每一組合法吃牌組合作為可選 claim option 暴露，而不得只提供單一模糊的 `chi`

#### Scenario: claim window 中只能 pass 或反應
- **WHEN** 玩家收到某張棄牌的反應窗 prompt
- **THEN** 該玩家的合法動作 MUST 僅包含對該張棄牌成立的 `win`、`pon`、`kong`、`chi` 與 `pass`，不得包含 `discard`

#### Scenario: phase 不匹配的動作被拒絕
- **WHEN** TUI 傳送一個不屬於當前 phase 的 player_action
- **THEN** Zig MUST 忽略該動作，不改變遊戲狀態

### Requirement: GameState 追蹤首輪狀態
系統 SHALL 以與 phase-based 回合模型一致的方式維護 `turn_count: u32` 與 `any_claims_made: bool`，用於天胡、地胡、人胡等首輪判定。`turn_count` MUST 對真正完成的 phase 邊界遞增，而不是只在單一 loop 中以棄牌次數近似。

#### Scenario: self-turn 行為推進計數
- **WHEN** 某位玩家完成一次完整的 `self-turn` 決議並使牌局進入下一個 phase
- **THEN** 系統依新的 phase 計數規則更新 `turn_count`

#### Scenario: 任何 claim 成立即標記 any_claims_made
- **WHEN** 任一位玩家在 `discard-reaction` 中成功執行吃、碰或槓
- **THEN** `any_claims_made` MUST 設為 true，且後續不再回復為 false
