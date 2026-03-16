## Purpose

定義 TUI 在收到 init 訊息後、進入遊戲桌面前的 Lobby 畫面，顯示骰子結果與座位風分配，並等待玩家確認開始。

## Requirements

### Requirement: 骰子畫面顯示座位分配
系統 SHALL 在收到 `init` 訊息後、進入遊戲桌面前，顯示一個 Lobby 畫面，包含骰子結果與四位玩家的座位風分配。

#### Scenario: Lobby 畫面內容
- **WHEN** TUI 收到 `init` 訊息
- **THEN** 顯示 Lobby 畫面，包含：骰子數字展示、四位玩家的座位風對應表（標示哪位是莊家）、「按任意鍵開始」提示

#### Scenario: 玩家位置標示
- **WHEN** Lobby 畫面顯示
- **THEN** 玩家（player_id=0）的座位風以醒目方式標示（如「你」或特殊顏色）

### Requirement: 按鍵開始遊戲
系統 SHALL 在 Lobby 畫面等待玩家按任意鍵，按下後切換至遊戲桌面並通知 Zig core 開始遊戲迴圈。

#### Scenario: 按鍵觸發
- **WHEN** 玩家在 Lobby 畫面按下任意鍵
- **THEN** TUI 送出 `{ type: "player_ready" }` 訊息給 Zig，並切換至 GameTable 畫面

#### Scenario: Lobby 期間不接受遊戲操作
- **WHEN** Lobby 畫面顯示中
- **THEN** 遊戲熱鍵（a/s/d/... 等打牌鍵）不產生任何遊戲動作

### Requirement: App 狀態切換
TUI 的 App component SHALL 管理 `lobby` → `playing` 的畫面狀態切換，Lobby 畫面與 GameTable 互斥顯示。

#### Scenario: 初始狀態
- **WHEN** TUI 啟動並收到 init
- **THEN** App 狀態為 `lobby`，顯示 DiceLobby component

#### Scenario: 切換至遊戲
- **WHEN** 玩家在 Lobby 按下任意鍵
- **THEN** App 狀態切換為 `playing`，顯示 GameTable component
