## Why

遊戲可以啟動但熱鍵完全沒有作用。GameTable 使用 `onKeyDown` 在未設 focus 的 `<box>` 上，導致事件不觸發；`sendAction` 雖然定義在 `connection.ts` 但從未被任何元件呼叫；DiceLobby 直接操作 `process.stdin` 並在 cleanup 時 pause，可能影響後續 OpenTUI 鍵盤輸入。此外 `pass_timeout_seconds` 未被存入 store，無法實作背景倒數自動 pass。

## What Changes

- 新增 `useGameKeys` hook，使用 OpenTUI 的 `useKeyboard()` 全域監聽鍵盤事件
- 在 hook 內根據 `availableActions` 路由按鍵至 `sendAction()`：
  - 棄牌階段：`a/s/d/f/g/h/j/k/l/;/'/z/x/c/v/b` 打出手牌、`space` 打出摸牌
  - 副露階段：`c`=吃、`p`=碰、`k`=槓、`h`=胡
  - `tab` 切換 DiscardHistoryPopup、`\` 切換 GameInfoPopup
- 實作背景靜默倒數：副露詢問時啟動 timer，到期自動送 `pass`
- `game-state/index.ts` 新增 `passTimeoutSeconds` signal，由 `applyInit` 設值
- GameTable 移除無效的 `onKeyDown`，改用 `useGameKeys`
- DiceLobby 從 raw stdin 改為 `useKeyboard()`，避免 stdin 狀態污染

## Capabilities

### New Capabilities

### Modified Capabilities
- `keyboard-interaction`: 從「規格已定義但未實作」變為「完整實作」——新增 useGameKeys hook 串接所有熱鍵與 pass 倒數邏輯

## Impact

- `tui/src/game-table/useGameKeys.ts`（新檔案）
- `tui/src/game-state/index.ts`（新增 passTimeoutSeconds signal）
- `tui/src/game-table/GameTable.tsx`（移除 onKeyDown，引入 useGameKeys）
- `tui/src/game-table/DiceLobby.tsx`（改用 useKeyboard）
- 依賴 `@opentui/solid` 的 `useKeyboard` hook
