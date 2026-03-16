## MODIFIED Requirements

### Requirement: AI 家列內容（最低揭露原則）

AI 玩家的列 SHALL 顯示：手牌張數（背面表示）、副露牌組（正面）、座位風標示（門風）。不得顯示 AI 手牌的實際牌面。座位風標示取自 `seat_winds` 對應的實際門風，而非畫面位置。

#### Scenario: AI 風位標示
- **WHEN** AI 玩家的座位風為 East（東）
- **THEN** 該列顯示「東」作為風位標示，無論該列在畫面的哪個位置

#### Scenario: AI 持有副露時顯示
- **WHEN** AI 玩家完成吃/碰/槓
- **THEN** 副露牌組以正面顯示於該列

### Requirement: 玩家列內容

玩家（畫面底部）列 SHALL 固定高度 20 行，包含：手牌正面（16 張，摸牌後 17 張）、右側固定資訊欄、熱鍵提示列。StatusBar 顯示玩家自己的座位風。

#### Scenario: StatusBar 顯示座位風
- **WHEN** 玩家的座位風為 West（西）
- **THEN** StatusBar 顯示「西風」而非硬編碼的「東風三局」

#### Scenario: 手牌顯示
- **WHEN** 玩家手中有牌
- **THEN** 每張牌以自訂牌面（7×4 字元）正面顯示，下方對應打牌快捷鍵標示
