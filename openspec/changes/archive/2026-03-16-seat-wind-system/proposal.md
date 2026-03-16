## Why

目前遊戲中莊家固定為 player 0、座位風硬編碼為東，無法反映真實台灣麻將的風位分配機制。座位風（門風）影響計番（座風刻、花牌歸屬），必須在遊戲初始化時透過骰子隨機決定，才能正確計算台數。

## What Changes

- Zig core 新增骰子擲骰邏輯，隨機決定莊家（dealer），並依此計算四位玩家的座位風
- `GameState` 新增 `seat_winds: [4]RoundWind` 欄位，記錄每位玩家的門風
- `init` 訊息新增 `seat_winds` 與 `dice_result` 欄位，傳送給 TUI
- TUI 新增骰子畫面（Lobby），顯示骰子結果與座位分配，玩家按任意鍵開始
- TUI PlayerRow 與 AiPlayerRow 顯示各自的座位風標示
- 玩家永遠固定在畫面底部（固定佈局），座位風僅以文字標示

## Capabilities

### New Capabilities
- `seat-wind-assignment`: 骰子擲骰與座位風分配邏輯（Zig core）
- `dice-lobby-screen`: 骰子結果畫面，顯示座位分配後按鍵開始（TUI）

### Modified Capabilities
- `game-state`: 新增 `seat_winds` 欄位至 GameState
- `ipc-protocol`: `init` 訊息新增 `seat_winds` 與 `dice_result` 欄位
- `game-table-layout`: PlayerRow / AiPlayerRow 加入座位風標示
- `zig-game-entrypoint`: 初始化流程加入骰子擲骰步驟

## Impact

- **Zig core**: `game/state.zig`（GameState 結構）、`game/round.zig`（初始化流程）、`ipc/protocol.zig`（init 訊息格式）、`main.zig`（啟動流程）
- **TUI**: `game-state/index.ts`（解析 seat_winds）、`game-table/GameTable.tsx`（Lobby 畫面、風位標示）、`game-table/PlayerRow.tsx`、`game-table/AiPlayerRow.tsx`
- **協議**: init 訊息格式變更（新增欄位，向後相容——舊 TUI 忽略新欄位即可）
