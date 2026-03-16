## ADDED Requirements

### Requirement: 遊戲結束畫面顯示胡牌資訊
系統 SHALL 在收到 `game_over` 訊息後顯示 GameOverScreen，包含贏家資訊與台數明細。

#### Scenario: 有人胡牌
- **WHEN** TUI 收到 `game_over` 且 `winner_id` 不為 null
- **THEN** 顯示贏家（玩家或 AI）、胡牌方式、台數明細列表（每行一個 pattern + 台數）、總台數

#### Scenario: 流局
- **WHEN** TUI 收到 `game_over` 且 `winner_id` 為 null
- **THEN** 顯示「流局」訊息，不顯示台數明細

#### Scenario: 玩家胡牌
- **WHEN** `winner_id = 0`
- **THEN** 顯示「你贏了！」與完整台數明細

#### Scenario: AI 胡牌
- **WHEN** `winner_id` 為 1-3
- **THEN** 顯示「AI-N 胡牌」與台數明細

### Requirement: 按鍵結束遊戲
系統 SHALL 在 GameOverScreen 等待玩家按任意鍵，按下後結束程式。

#### Scenario: 按鍵退出
- **WHEN** 玩家在 GameOverScreen 按任意鍵
- **THEN** TUI 結束程式

### Requirement: App 狀態新增 game_over 階段
TUI 的 App component SHALL 支援三階段狀態切換：`lobby` → `playing` → `game_over`。

#### Scenario: 收到 game_over 訊息
- **WHEN** store 收到 game_over 訊息
- **THEN** App 狀態切換至 `game_over`，顯示 GameOverScreen
