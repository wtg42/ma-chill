## Why

目前 shell 主畫面的中間事件流只顯示固定最後幾筆訊息，當 `/hand` 這類多行摘要寫入時，較早的內容會立刻被裁掉，玩家無法回看完整資訊。既有規格已允許事件流可裁切或捲動，但目前缺少實際可操作的捲動能力，已開始直接影響出牌判斷與 shell 互動體驗。

## What Changes

- 將中間事件流從固定裁切改為可回捲的捲動視窗，讓玩家可以查看較早的事件與手牌摘要。
- 定義事件流在新訊息到來時的預設跟隨行為，以及使用者手動回看歷史時的行為邊界。
- 補上事件流捲動的鍵盤互動規則，讓玩家在不破壞 command-first 模型的前提下控制中間視窗。
- 保持底部命令列常駐可用，不因事件流捲動而失去主要輸入入口。

## Capabilities

### New Capabilities

- 無

### Modified Capabilities

- `game-table-layout`: 中間事件流由「可裁切」進一步明確為可回溯、可捲動，並補充新訊息追加時的顯示規則。
- `keyboard-interaction`: 新增事件流捲動相關鍵盤操作，定義其與命令列焦點、既有快捷鍵及 command-first 原則的關係。

## Impact

- 影響 `tui/src/game-table/EventLog.tsx` 與主畫面布局，需改變事件流容器與顯示策略。
- 影響 `tui/src/game-table/useCommandKeys.ts` 或相關鍵盤處理層，需加入事件流捲動控制。
- 可能需要補充本地 UI state，以記錄事件流是否位於底部與目前捲動位置。
- 不影響 Zig core、IPC schema 與遊戲規則計算。
