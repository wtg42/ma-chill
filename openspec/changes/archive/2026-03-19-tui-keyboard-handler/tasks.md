## 1. Store 擴充

- [x] 1.1 在 `tui/src/game-state/index.ts` 新增 `passTimeoutSeconds` signal（預設 5），在 `applyInit` 中從 `msg.pass_timeout_seconds` 設值，並加入回傳物件

## 2. useGameKeys hook

- [x] 2.1 建立 `tui/src/game-table/useGameKeys.ts`，定義 hook 簽名：接收 `GameStateStore` 和 popup 控制物件
- [x] 2.2 實作 `useKeyboard` 監聽：棄牌階段按鍵（a~b → `sendAction("discard", tileId)`、space → `sendAction("discard", drawnTileId)`）
- [x] 2.3 實作 `useKeyboard` 監聽：副露動作按鍵（c/p/k/h → `sendAction(action)`），僅在 `availableActions` 含對應動作時生效
- [x] 2.4 實作 `useKeyboard` 監聯：tab 切換 DiscardHistoryPopup（僅玩家回合）、`\` 切換 GameInfoPopup（任何時機）
- [x] 2.5 實作 pass 倒數 timer：`createEffect` 監聽 `availableActions`，含 claim + pass 時啟動 `setTimeout`，到期呼叫 `sendAction("pass")`；使用者操作或 actions 變化時 `clearTimeout`；`onCleanup` 確保清除

## 3. GameTable 整合

- [x] 3.1 在 `GameTable.tsx` 中 import 並呼叫 `useGameKeys`，傳入 store 和 popup signal
- [x] 3.2 移除 `GameTable.tsx` 的 `handleKeyDown` 函式和 `<box>` 上的 `onKeyDown` prop

## 4. DiceLobby 修正

- [x] 4.1 將 `DiceLobby.tsx` 的 `process.stdin` 操作替換為 `useKeyboard`，過濾 `eventType === "press"`，呼叫 `props.onStart()`
- [x] 4.2 移除 `onMount`/`onCleanup` 中的 stdin raw mode 和 pause 邏輯

## 5. 驗證

- [x] 5.1 啟動遊戲，確認 DiceLobby 按任意鍵可進入遊戲
- [x] 5.2 確認棄牌階段按 a~b / space 可打出對應手牌
- [x] 5.3 確認副露階段按 c/p/k/h 可執行對應動作
- [x] 5.4 確認 tab / `\` 可切換 popup
- [x] 5.5 確認副露詢問倒數到期後自動 pass
