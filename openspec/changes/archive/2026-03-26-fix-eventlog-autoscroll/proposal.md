## Why

事件流（EventLog）在有新事件加入時不會自動捲動到底部，且當使用者手動捲動後，視窗應停在使用者的位置——但目前兩種行為都因 race condition 而失效。這個問題在遊戲進行中持續干擾使用者體驗，需修正。

## What Changes

- 改用 OpenTUI 原生 `stickyScroll` + `stickyStart="bottom"` 機制取代手動的 `isFollowingLatest` 邏輯
- 移除 `EventLog.tsx` 中因競速條件（race condition）而失效的 entries `createEffect` 自動捲動邏輯
- 原生機制自動處理：新內容到來時捲到底部、使用者手動捲動時停住、使用者捲回底部時恢復自動捲動

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `keyboard-interaction`：事件流捲動行為增加 sticky scroll 語義——預設跟隨最新、手動捲動後定住、捲回底部恢復跟隨

## Impact

- `tui/src/game-table/EventLog.tsx`：移除 entries effect 中的手動捲底邏輯，加上 `stickyScroll stickyStart="bottom"` props
- `tui/src/game-table/event-log-controls.ts`：`isFollowingLatest` 相關邏輯可大幅簡化（不再需要從 scroll metrics 推算）
- `tui/src/game-table/GameTable.tsx`：`eventLogViewport` signal 若確認不再使用可一併清理
