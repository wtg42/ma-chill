## Why

目前主規格同時存在兩套互相衝突的鍵盤哲學：一方面已改採以 `Space` 為 Leader 鍵的 which-key 模式，另一方面仍殘留 `Ctrl+C` 與 `Ctrl+Space` 等 `Ctrl` 組合的產品互動定義。這會讓後續實作與規格判讀出現歧義，也違反「不要與 terminal / system 控制鍵衝突」的設計原則。

## What Changes

- 修正 `keyboard-interaction` 主規格，明確宣告產品互動不得使用 `Ctrl+...` 組合作為遊戲命令或複製操作入口
- 移除 `Ctrl+Space` 作為 `/discard drawn` 快捷鍵的 requirement，改回 Leader 模式下的綁定語義
- 移除 `Ctrl+C` 作為 selection copy 例外的 requirement，將 `Ctrl+C` 保留為 terminal / system 的中斷語義
- 補充鍵盤互動與文字選取的責任邊界：遊戲命令由 Leader / command mode 承載，複製體驗由 copy-on-select 承載

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities
- `keyboard-interaction`: 收斂為純 Leader / command-mode 鍵盤模型，移除殘留的 `Ctrl` 組合 requirement

## Impact

- `openspec/specs/keyboard-interaction/spec.md`
- `tui/src/game-table/GameTable.tsx`
- `tui/src/game-table/useCommandKeys.ts`
- 相關測試與任何仍假設 `Ctrl` 組合可作為產品互動鍵的文件
