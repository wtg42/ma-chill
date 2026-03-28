## 1. 新增 Ctrl+Space accelerator

- [x] 1.1 在 `tui/src/game-table/useCommandKeys.ts` 的 `ACCELERATORS` 新增 `space: "/discard drawn"`
- [x] 1.2 確認 `handleCommandKey` 的 `ctrl` 判斷涵蓋 `space` key name（與現有 letter keys 邏輯一致）

## 2. 清除 dead code

- [x] 2.1 移除 `tui/src/game-table/useGameKeys.ts` 中 Space 相關的處理邏輯（`name === "space"` 分支）

## 3. 更新 UI 提示

- [x] 3.1 更新 `tui/src/game-table/PlayerRow.tsx` StatusBar：`{ key: "space", ... }` → `{ key: "Ctrl+Space", ... }`
- [x] 3.2 更新 hotkeys 列底部的 `<text>space</text>` → `<text>C+Sp</text>`（寬度 7 字元限制）

## 4. 測試

- [x] 4.1 更新 `tui/src/game-table/useCommandKeys.test.ts`：新增 `Ctrl+Space` 映射到 `/discard drawn` 的測試案例
- [x] 4.2 確認無 `drawn_tile_id` 時 `Ctrl+Space` 回傳錯誤回饋（透過 `/discard drawn` 的既有錯誤路徑）
