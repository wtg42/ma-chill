## Why

目前 `Space` 鍵原本設計為「切摸牌」快捷鍵，但命令列 `<input focused={true}>` 會優先捕捉 Space，導致快捷鍵完全失效。玩家摸到不需要的牌時，無法快速打出，只能手動輸入 `/discard drawn`。

## What Changes

- 以 `Ctrl+Space` 取代原本的 `Space`，作為「切摸牌」加速鍵
- 將 `Ctrl+Space` 加入 `useCommandKeys` 的 ACCELERATORS，映射到 `/discard drawn`
- 移除 `useGameKeys.ts` 中已失效的 `Space` 處理邏輯（dead code）
- 更新 `PlayerRow` StatusBar 的提示文字：`space=切摸牌` → `Ctrl+Space=切摸牌`
- 更新 keyboard-interaction spec 正式記錄此快捷鍵

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities

- `keyboard-interaction`：新增 `Ctrl+Space` 作為 `/discard drawn` 的快捷鍵，並記錄 Space 鍵因命令列焦點衝突不可用的設計決定

## Impact

- `tui/src/game-table/useCommandKeys.ts`：新增 `Ctrl+Space` accelerator
- `tui/src/game-table/useGameKeys.ts`：移除 dead code（Space 相關邏輯）
- `tui/src/game-table/PlayerRow.tsx`：更新 StatusBar 提示
- `openspec/specs/keyboard-interaction/spec.md`：補充 Ctrl+Space 規格
