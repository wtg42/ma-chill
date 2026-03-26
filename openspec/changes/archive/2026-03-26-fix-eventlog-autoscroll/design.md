## Context

`EventLog.tsx` 目前以手動方式實作「跟隨最新」（isFollowingLatest）邏輯：當 `props.entries` 變化時，若 `viewportState.isFollowingLatest` 為 true 便呼叫 `scrollToBottom()`。

**Root cause**：存在一個競速條件（race condition）。新 entry 渲染後：
1. `onSizeChange` 觸發 → `queueMicrotask(syncViewportState)`：用新的 scrollHeight 重新計算，此時 scrollTop 還沒動，所以 `isAtBottom()` 回傳 false → `isFollowingLatest` 被設為 false
2. entries `createEffect` 觸發 → `queueMicrotask(if isFollowingLatest → scrollToBottom)`：讀到已被改寫的 false → 不捲動

結果是新事件來時**無法自動捲到底部**。另一方面，滑鼠滾動時沒有 `onScroll` 更新 `isFollowingLatest`，故手動捲離底部後新事件本應保持位置，但此時仍有可能被強制捲回底部。

OpenTUI `ScrollBoxRenderable` 內建 `stickyScroll` + `stickyStart` 機制，在原生層（`onUpdate`）處理這個問題：內容變化後若 `!_hasManualScroll` 就自動捲到 stickyStart 位置；使用者透過滑鼠或鍵盤離開底部時設 `_hasManualScroll = true`；重新捲到底部時自動清除。

## Goals / Non-Goals

**Goals:**
- 修正新事件來時不自動捲到底部的 bug
- 使用者手動捲離後，新事件不強制捲回底部
- 使用者捲回底部後，自動恢復跟隨

**Non-Goals:**
- 不改變鍵盤導覽（PageUp/PageDown/Home/End）的行為語義
- 不在 UI 加入「捲回底部」按鈕或視覺指示器（此為 future work）

## Decisions

### 決策 1：改用原生 stickyScroll，移除手動邏輯

**決定**：在 `<scrollbox>` 加上 `stickyScroll stickyStart="bottom"`，並移除 `EventLog.tsx` 中 entries `createEffect` 裡的手動 `scrollToBottom` 呼叫。

**理由**：原生機制在 render loop 的 `onUpdate` 層運作，沒有 microtask 競速問題。`_hasManualScroll` flag 由 scrollbox 自身維護，涵蓋滑鼠與鍵盤兩種滾動路徑，不需要外層重新實作。

**備選方案（否決）**：保留手動邏輯並加 `onScroll` callback。OpenTUI scrollbox 目前沒有 `onScroll` prop；若要攔截滑鼠捲動事件需 monkey-patch `onMouseEvent`，侵入性高且難維護。

### 決策 2：清理 isFollowingLatest 相關程式碼

**決定**：移除 `event-log-controls.ts` 中 `isFollowingLatest` 的推算邏輯，以及 `GameTable.tsx` 中的 `eventLogViewport` signal（目前建立後從未被讀取）。

**理由**：原生 `stickyScroll` 接管後，外層的 `isFollowingLatest` 狀態已無用途。留著只會增加誤解風險。

**保留部分**：`EventLogViewportState` 型別與 `onViewportChange` prop 的骨架可暫時保留（若未來需要顯示「跟隨中」指示器），但 `isFollowingLatest` 欄位可移除或標記為 deprecated。

## Risks / Trade-offs

- **原生 stickyScroll 行為不透明** → stickyScroll 邏輯已從 bundled JS 確認，行為符合預期；風險低
- **現有 scrollRequest 系統與 stickyScroll 的互動**：鍵盤呼叫 `scrollbox.scrollTo(maxScrollTop)` 時，setter 觸發 `updateStickyState()` → 若在底部則 `_hasManualScroll = false`，行為正確。`scrollTo` 至非底部位置則 `_hasManualScroll = true`，行為正確。無需修改 scrollRequest 邏輯。
