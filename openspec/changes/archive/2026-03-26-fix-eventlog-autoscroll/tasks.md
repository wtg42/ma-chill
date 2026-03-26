## 1. 啟用原生 stickyScroll

- [x] 1.1 在 `EventLog.tsx` 的 `<scrollbox>` 加上 `stickyScroll` 和 `stickyStart="bottom"` props
- [x] 1.2 移除 entries `createEffect`（第 79–93 行）中手動呼叫 `scrollToBottom()` 的邏輯

## 2. 清理 isFollowingLatest 相關程式碼

- [x] 2.1 移除 `event-log-controls.ts` 中 `isFollowingLatest` 的推算（`toEventLogViewportState` 內的 `isEventLogAtBottom` 呼叫與 `EventLogViewportState.isFollowingLatest` 欄位）
- [x] 2.2 移除 `applyEventLogScrollRequest` 回傳值中的 `isFollowingLatest` 欄位
- [x] 2.3 移除 `GameTable.tsx` 中 `eventLogViewport` signal 的宣告與 `onViewportChange={setEventLogViewport}` 傳入（目前從未被讀取）
- [x] 2.4 清理 `EventLog.tsx` 中 `viewportState` signal 及 `onViewportChange` prop——若確認無其他使用者則一併移除，否則保留型別但移除 `isFollowingLatest`

## 3. 驗證

- [x] 3.1 手動測試：啟動遊戲，持續產生事件，確認事件流自動捲到底部
- [x] 3.2 手動測試：用 PageUp 捲離後，新事件不強制捲回底部
- [x] 3.3 手動測試：按 End 或滾輪捲回底部後，新事件再次自動跟隨
- [x] 3.4 確認 bun test 通過（event-log-controls.test.ts）
