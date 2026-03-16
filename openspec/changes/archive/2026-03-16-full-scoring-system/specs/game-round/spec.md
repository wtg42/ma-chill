## MODIFIED Requirements

### Requirement: 計番介面
系統 SHALL 提供計番函數介面，輸入胡牌玩家的完整 WinContext（手牌、副露、花牌、座位風、圈風、胡牌上下文），輸出包含所有符合牌型的 ScoreResult。台數無上限，所有符合牌型全部疊加。

#### Scenario: 胡牌時呼叫計番
- **WHEN** 有玩家胡牌
- **THEN** playRound 組裝 WinContext（從 GameState 收集手牌、副露、花牌、座位風、圈風、首輪狀態等），呼叫 calculateFan，將 ScoreResult 納入 game_over 訊息

#### Scenario: 流局不計番
- **WHEN** 牌山摸盡無人胡牌
- **THEN** game_over 訊息的 scoring_detail 為 null

## ADDED Requirements

### Requirement: GameState 追蹤首輪狀態
系統 SHALL 在 GameState 新增 `turn_count: u32` 與 `any_claims_made: bool` 欄位，用於天胡/地胡/人胡判定。

#### Scenario: turn_count 遞增
- **WHEN** 每位玩家完成一次行動（摸牌/棄牌/副露）
- **THEN** `turn_count` 加 1

#### Scenario: any_claims_made 標記
- **WHEN** 任何玩家執行吃/碰/槓
- **THEN** `any_claims_made` 設為 true，後續不再變回 false
