## 1. tileCatalog Map 工具

- [x] 1.1 建立 `tui/src/tiles/rank-map.ts`，定義 `RANK_STRING_TO_NUMBER: Record<string, number>`（`"one"→1` ... `"nine"→9`）
- [x] 1.2 建立 `buildTileCatalogMap(initCatalog): Map<number, CanonicalTile>`，接收 Zig `init.tile_catalog`，查本地 catalog 建立 `Map<id, CanonicalTile>`
- [x] 1.3 為 `buildTileCatalogMap` 撰寫 unit test（驗證 id 對應正確、copy_index 不影響結果）

## 2. useGameState hook

- [x] 2.1 建立 `tui/src/game-state/index.ts`，定義 `useGameState()` hook，包含 signals：`gameState`、`availableActions`、`currentPlayerId`、`tileCatalog`（Map）
- [x] 2.2 實作 `applyInit(msg)`：建立 tileCatalog Map，設定初始 gameState signal
- [x] 2.3 實作 `applyStateUpdate(msg)`：更新 gameState signal
- [x] 2.4 實作 `applyTurnChanged(msg)`：更新 availableActions 與 currentPlayerId signals
- [x] 2.5 實作 `handWithIds()`：derived signal，將 player 0 手牌 id 陣列轉為 `{ id, tile }[]`

## 3. connection.ts

- [x] 3.1 建立 `tui/src/connection.ts`，使用 `Bun.connect()` 連線至 `MA_CHILL_SOCKET`（預設 `/tmp/ma-chill.sock`）
- [x] 3.2 實作 JSONL 行讀取（處理 buffer 分段問題），每行呼叫對應 `applyXxx` 函式
- [x] 3.3 實作 `sendAction(action: string, tileId?: number)`：序列化為 JSONL 寫入 socket
- [x] 3.4 連線失敗時 render 錯誤畫面並呼叫 `process.exit(1)`

## 4. GameTable 串接

- [x] 4.1 修改 `tui/src/index.tsx`：啟動時呼叫 `connection.connect()`，將 `useGameState` 提供給 App
- [x] 4.2 修改 `GameTable.tsx`：接收 gameState props，改用 `handWithIds()`、`availableActions`、AI 玩家資料（替換 fakeData）
- [x] 4.3 確認 `fake-data.ts` 不再被任何檔案 import（可保留檔案但移除所有 import）

## 5. 整合驗證

- [x] 5.1 `bun test` 全部通過
- [ ] 5.2 手動測試：啟動 Zig core，TUI 連線後確認畫面顯示真實初始狀態（非 fake-data）  ← 需手動驗證
