## Purpose

定義台灣麻將座位風（門風）的分配邏輯：隨機決定莊家、依莊家推算各玩家座位風、花牌與座位風的對應關係。

## Requirements

### Requirement: 隨機決定莊家
系統 SHALL 在遊戲初始化時隨機選擇一位玩家作為莊家（dealer_player_id），範圍為 0-3，使用均勻分布。

#### Scenario: 莊家隨機產生
- **WHEN** 遊戲初始化
- **THEN** `dealer_player_id` 為 0-3 中的隨機值，每個值機率相等（25%）

### Requirement: 座位風由莊家推算
系統 SHALL 依據 `dealer_player_id` 計算四位玩家的座位風（門風），公式為 `seat_winds[player_id] = RoundWind((player_id - dealer_player_id + 4) % 4)`，其中 0=East、1=South、2=West、3=North。

#### Scenario: 莊家為 East
- **WHEN** `dealer_player_id = 0`
- **THEN** seat_winds = [East, South, West, North]

#### Scenario: 莊家為 player 2
- **WHEN** `dealer_player_id = 2`
- **THEN** seat_winds = [West, North, East, South]（player 2 為 East）

### Requirement: 座位風儲存於 GameState
系統 SHALL 在 `GameState` 中維護 `seat_winds: [4]RoundWind` 欄位，於 `initGameState` 時計算填入，並在 JSON 序列化時輸出為字串陣列。

#### Scenario: GameState 包含 seat_winds
- **WHEN** GameState 初始化完成
- **THEN** `seat_winds` 包含四個 RoundWind 值，莊家對應 East

#### Scenario: JSON 序列化
- **WHEN** GameState 序列化為 JSON
- **THEN** 輸出 `"seat_winds": ["east", "south", "west", "north"]` 格式

### Requirement: 花牌與座位風對應
系統 SHALL 定義花牌與座位風的對應關係，供計番系統使用：
- 春(spring) / 梅(plum) → East
- 夏(summer) / 蘭(orchid) → South
- 秋(autumn) / 菊(chrysanthemum) → West
- 冬(winter) / 竹(bamboo) → North

#### Scenario: 東家的花牌
- **WHEN** 座位風為 East 的玩家持有春或梅
- **THEN** 該花牌為「自己的花」，計番時算 1 台

#### Scenario: 非自己的花
- **WHEN** 座位風為 East 的玩家持有夏（South 的花）
- **THEN** 該花牌不算台
