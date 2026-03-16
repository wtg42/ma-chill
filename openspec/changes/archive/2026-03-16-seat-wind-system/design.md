## Context

目前 `GameState` 的 `dealer_player_id` 硬編碼為 0，`round_wind` 硬編碼為 `.east`。四位玩家的座位風無法動態分配，TUI 上顯示的北/西/東也只是畫面位置標示，與實際門風無關。

台灣麻將的計番需要座位風（門風刻、花牌歸屬），因此必須在遊戲初始化時隨機決定莊家並推算四人門風。

## Goals / Non-Goals

**Goals:**
- 遊戲開始時隨機擲骰決定莊家，計算四位玩家的座位風
- `GameState` 紀錄座位風資訊，`init` 訊息傳送給 TUI
- TUI 顯示骰子畫面（Lobby），讓玩家確認座位分配後按鍵開始
- PlayerRow / AiPlayerRow 顯示各自的座位風標示
- 固定佈局：玩家永遠在畫面底部

**Non-Goals:**
- 多局連莊 / 莊家輪替（未來另行規劃）
- 骰子動畫效果
- 計番邏輯（屬於 full-scoring-system change）
- 動態佈局（座位風改變畫面位置）

## Decisions

### Decision 1：骰子與莊家決定方式

隨機產生 `dealer_player_id`（0-3），不模擬 2d6 骰子。TUI 顯示時可視覺化為兩顆骰子，但 Zig 只需 `prng.random().intRangeAtMost(u8, 0, 3)`。

**理由**：2d6 → mod 4 的分布不均勻（2-12 中某些 mod 值較多），直接隨機 0-3 更公平。TUI 可從 dealer 反推出一組合理的骰面數字供展示用。

### Decision 2：座位風計算公式

```
seat_winds[player_id] = (player_id - dealer_player_id + 4) % 4
  0 → East, 1 → South, 2 → West, 3 → North
```

例：`dealer_player_id = 2` 時：
- player 0 → (0-2+4)%4 = 2 → West
- player 1 → (1-2+4)%4 = 3 → North
- player 2 → (2-2+4)%4 = 0 → East（莊家）
- player 3 → (3-2+4)%4 = 1 → South

### Decision 3：GameState 新增 seat_winds 欄位

在 `GameState` 新增 `seat_winds: [4]RoundWind`，於 `initGameState` 時根據 `dealer_player_id` 計算填入。JSON 序列化時輸出 `"seat_winds": ["west", "north", "east", "south"]`。

### Decision 4：init 訊息擴充

`init` 訊息新增：
- `seat_winds: string[4]`（四位玩家的座位風）
- `dealer_player_id` 已存在於 `state` 中，不需重複

TUI 從 `init.state.seat_winds` 讀取。

### Decision 5：TUI Lobby 畫面

新增 `DiceLobby` component，在收到 `init` 訊息後、進入 GameTable 前顯示：
- 骰子結果（展示用，從 dealer_player_id 反推合理骰面）
- 四位玩家的座位風分配表
- 「按任意鍵開始」提示

玩家按任意鍵後切換至 GameTable。此畫面由 `App` component 控制狀態切換（`lobby` → `playing`）。

### Decision 6：風位標示在固定佈局中的呈現

TUI 畫面位置不變（玩家在底部），但每列的風位標示改為顯示實際座位風而非畫面位置：
- 原本 AiPlayerRow 的 `windZh` prop 從硬編碼的「北/西/東」改為從 `seat_winds` 對應
- PlayerRow StatusBar 顯示玩家自己的座位風

## Risks / Trade-offs

- **[風位混淆]** 玩家可能混淆畫面位置（上方=北側）和座位風（如北家實際是東風），但台灣麻將玩家普遍理解這個概念 → 在 Lobby 畫面清楚標示即可
- **[Lobby 阻塞遊戲迴圈]** Lobby 顯示期間 Zig core 的 `playRound` 尚未開始，需確保 Zig 端在送出 init 後等待 TUI 的「ready」信號再進入遊戲迴圈 → 改用 TUI 按鍵後送 `{ type: "player_ready" }` 訊號，Zig 收到後才呼叫 `playRound`
