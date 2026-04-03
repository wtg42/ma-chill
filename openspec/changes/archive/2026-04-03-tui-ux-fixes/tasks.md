## 1. AI 回合指令提示濾除

- [x] 1.1 修改 `tui/src/game-state/index.ts` `applyTurnChanged`：將 `appendEvent` 呼叫包在 `if (msg.player_id === 0)` 條件內
- [x] 1.2 確認 `setAvailableActions`、`setCurrentPlayerId`、`setAvailableCommandHints` 仍對所有玩家執行（不受條件限制）
- [x] 1.3 執行現有 `index.test.ts` 確認無回歸

## 2. NORMAL 模式按鍵提示修正

- [x] 2.1 修改 `tui/src/game-table/CommandInput.tsx` 第 77 行：將 `{"<SPC>"}` 改為 `[SPC]`

## 3. 複製成功 Toast 提示

- [x] 3.1 在 `tui/src/game-table/GameTable.tsx` 加入 `createSignal<boolean>(false)` 作為 toast 顯示狀態
- [x] 3.2 宣告 `let toastTimer` 並在 `onCleanup` 中清除，防止元件卸載後的 timer 洩漏
- [x] 3.3 新增 `showToast()` 函式：清除舊 timer → `setToast(true)` → `setTimeout(1500, () => setToast(false))`
- [x] 3.4 修改 `useSelectionHandler` callback：改為 `copyToClipboard(...).then((ok) => { if (ok) showToast() })`
- [x] 3.5 在 JSX return 中加入 `<Show when={toast()}>` 包裹的 toast overlay（`position="absolute"`、`zIndex={100}`、右下角定位、`borderStyle="rounded"`）
- [x] 3.6 確認 toast 的 `bottom` 值不與 CommandInput 重疊
