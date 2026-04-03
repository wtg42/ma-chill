## Why

TUI 在幾個細節上有明顯的視覺/邏輯問題，導致遊戲畫面顯示不正確：AI 玩家回合會印出對人類玩家才有意義的指令提示、狀態列中的 `<SPC>` 被 HTML 跳脫成 `&lt;SPC&gt;`、以及滑鼠選取複製後完全沒有任何視覺回饋。

## What Changes

- **AI 回合指令提示**：`applyTurnChanged` 不再對 AI 玩家（`player_id !== 0`）印出「可用：/help /status /hand...」，只有人類玩家回合才顯示。
- **`<SPC>` 跳脫問題**：`CommandInput` NORMAL 模式提示列中的 `{"<SPC>"}` 改用不含角括號的表示方式，避免 OpenTUI text 節點將其轉為 HTML entity。
- **複製成功提示**：滑鼠選取複製成功後，顯示短暫的 toast overlay（約 1.5 秒後自動消失），告知使用者已複製至剪貼簿。

## Capabilities

### New Capabilities

- `clipboard-copy-toast`：複製成功後的暫時性 overlay 提示，使用 `position="absolute"` + Solid signal + setTimeout 實作。

### Modified Capabilities

- `shell-command-interface`：NORMAL 模式的提示文字顯示規則調整（避免跳脫字元）。
- `tui-game-state`：`applyTurnChanged` 的事件記錄行為依玩家身份區分。

## Impact

- `tui/src/game-state/index.ts`：`applyTurnChanged` 函式加上 `player_id === 0` 判斷
- `tui/src/game-table/CommandInput.tsx`：NORMAL 提示列的 `<SPC>` 表示方式
- `tui/src/game-table/GameTable.tsx`：加入 toast signal、修改 `useSelectionHandler` 以觸發 toast
