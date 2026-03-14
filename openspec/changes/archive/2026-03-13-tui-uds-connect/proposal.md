## Why

TUI 目前以 fake-data 驅動，與 Zig core 完全脫離。需要透過 UDS 連線讓 TUI 接收真實遊戲狀態、渲染畫面，並將玩家操作回傳給 Zig。

## What Changes

- **新增 `tui/src/connection.ts`**：負責 UDS 連線管理，連線失敗時顯示錯誤畫面
- **新增 `tui/src/game-state/`**：抽出 `useGameState()` hook，以 SolidJS signal 管理遊戲狀態，取代 fake-data
- **修改 `tui/src/index.tsx`**：啟動時初始化 UDS 連線，將 gameState 傳入 App
- **修改 `tui/src/game-table/GameTable.tsx`**：改由 gameState signal 驅動，移除 fake-data 依賴

## Capabilities

### New Capabilities

- `tui-uds-connection`：TUI 端 UDS 連線管理，含連線建立、JSONL 訊息收發、斷線處理
- `tui-game-state`：TUI 端遊戲狀態管理，以 SolidJS signal 儲存並更新 gameState，供 UI 響應式驅動

### Modified Capabilities

（無）

## Impact

- **修改**：`tui/src/index.tsx`、`tui/src/game-table/GameTable.tsx`
- **新增**：`tui/src/connection.ts`、`tui/src/game-state/index.ts`
- **移除依賴**：`fake-data.ts`（由 gameState signal 取代）
- **依賴**（已存在）：`zig-uds-session`（Zig 端）、`ipc-protocol`（訊息格式）
