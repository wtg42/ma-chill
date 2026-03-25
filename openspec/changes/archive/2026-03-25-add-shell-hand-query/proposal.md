## Why

目前 shell 版主畫面已收斂為「狀態列 / 事件流 / 命令列」三段式，但玩家在不常駐顯示手牌的前提下，缺少一個能快速確認自己手牌內容的查詢入口。這讓 `/discard` 與摸牌後的決策體驗不夠順，尤其在事件流持續往上滾動時，玩家很難用同一套 shell 心智模型完成「查看手牌 -> 決定出牌」的循環。

## What Changes

- 新增本地 `/hand` 查詢命令，讓玩家可隨時將目前手牌以多行摘要寫入事件流，而不需開啟常駐手牌區塊
- 規範 `/hand` 的輸出格式：依牌型分行顯示萬、筒、條、風、三元、四季、四君子，並在各行內做穩定排序
- 將目前摸到的牌獨立顯示，避免與手牌摘要混淆，並支援在玩家摸牌後自動補一筆手牌摘要供對照
- 新增 `/hand` 的快捷鍵映射，且必須與其他 shell 命令一樣走同一套 command registry / normalization 流程
- 補齊對應的單元測試，並以 TDD 方式推進前端 hand summary 格式化與命令行為

## Capabilities

### New Capabilities
- （無）

### Modified Capabilities
- `shell-command-interface`: 新增 `/hand` 本地查詢命令、事件流輸出格式，以及摸牌後可自動顯示手牌摘要的行為
- `keyboard-interaction`: 新增 `/hand` 的快捷鍵加速器，並要求其與命令列輸入共用同一條命令處理路徑
- `tui-game-state`: 補充由現有手牌狀態派生分組摘要並寫入事件流的需求

## Impact

- `tui/src/commands/`：需擴充 command registry、`/hand` 執行邏輯與 help 內容
- `tui/src/game-state/`：需提供手牌分組摘要與自動追加事件流的支援
- `tui/src/game-table/`：事件流將承載手牌摘要輸出；快捷鍵映射也需要同步更新
- `tui/src/tiles/`：沿用既有 canonical tile metadata 做分組與排序，不預期新增 IPC 或 Zig core 協議欄位
- `tui/src/**/*.test.*`：新增或擴充 unit test，覆蓋 hand summary 格式化、命令執行與快捷鍵映射
