## 1. Zig Core：座位風分配

- [x] 1.1 `GameState` 新增 `seat_winds: [4]RoundWind` 欄位，初始化為全 `.east`，`init()` 與 `deinit()` 對應更新
- [x] 1.2 `GameState.toJson()` 序列化 `seat_winds` 為 `["east","south","west","north"]` 格式
- [x] 1.3 新增 `game/seat_wind.zig` 模組：`assignSeatWinds(dealer_player_id: u8) -> [4]RoundWind` 函數，實作 `(player_id - dealer + 4) % 4` 公式
- [x] 1.4 新增花牌與座位風對應函數 `bonusWindForTile(tile: Tile) -> ?RoundWind`（春/梅→East, 夏/蘭→South, 秋/菊→West, 冬/竹→North）
- [x] 1.5 為 `assignSeatWinds` 與 `bonusWindForTile` 撰寫單元測試

## 2. Zig Core：初始化流程修改

- [x] 2.1 `initGameState` 新增 `dealer_player_id` 參數，用以設定 `game_state.dealer_player_id` 與 `game_state.seat_winds`
- [x] 2.2 `main.zig` 在初始化牌局前以 PRNG 隨機產生 `dealer_player_id`（0-3）
- [x] 2.3 更新 `buildInitMessage` 確保 init 訊息包含 `seat_winds`

## 3. Zig Core：player_ready 協議

- [x] 3.1 `ipc/protocol.zig` 新增 `player_ready` 訊息型別的解析支援
- [x] 3.2 `Session` 新增 `waitForPlayerReady()` 方法，讀取並驗證 `{ type: "player_ready" }` 訊息
- [x] 3.3 `main.zig` 在 `sendMessage(init)` 之後、`playRound()` 之前呼叫 `session.waitForPlayerReady()`

## 4. TUI：game-state 解析座位風

- [x] 4.1 `ZigGameState` 型別新增 `seat_winds: string[]` 欄位
- [x] 4.2 `GameStateStore` 新增 `seatWinds()` accessor，回傳四位玩家的座位風陣列

## 5. TUI：DiceLobby 畫面

- [x] 5.1 新增 `game-table/DiceLobby.tsx` component，顯示骰子結果與座位分配表
- [x] 5.2 DiceLobby 接收 `seatWinds`、`dealerPlayerId` props，標示莊家與玩家自己的風位
- [x] 5.3 DiceLobby 監聽任意鍵按下，觸發 `onStart` callback
- [x] 5.4 `connection.ts` 新增 `sendPlayerReady()` 函數，送出 `{ type: "player_ready" }`

## 6. TUI：App 狀態切換

- [x] 6.1 `index.tsx` 的 App component 新增 `lobby` / `playing` 狀態，初始為 `lobby`
- [x] 6.2 `lobby` 狀態顯示 DiceLobby，按鍵後呼叫 `sendPlayerReady()` 並切換至 `playing`
- [x] 6.3 `playing` 狀態顯示 GameTable（現有邏輯）

## 7. TUI：風位標示更新

- [x] 7.1 GameTable 的 AiPlayerRow `windZh` prop 改為從 `seatWinds` 動態取得，而非硬編碼
- [x] 7.2 PlayerRow StatusBar 的風位顯示改為從 `seatWinds[0]` 動態取得
