## 1. Revert ctrl-space-discard-drawn 實作

- [x] 1.1 移除 `useCommandKeys.ts` ACCELERATORS 中的 `space: "/discard drawn"` 條目
- [x] 1.2 移除 `useCommandKeys.test.ts` 中的 `"maps Ctrl+Space to /discard drawn"` 測試案例
- [x] 1.3 還原 `PlayerRow.tsx` StatusBar 的 `Ctrl+Space` 條目（後續將整個移除）
- [x] 1.4 還原 `PlayerRow.tsx` hotkeys 列的 `C+Sp` 文字（後續將整個移除）

## 2. 定義 leader binding registry

- [x] 2.1 在 `useCommandKeys.ts`（或新的 `leaderBindings.ts`）定義 `LEADER_BINDINGS` 陣列：`{ key, label, command, action? }` 結構
- [x] 2.2 包含所有遊戲動作 binding：`d`=棄摸牌、`j`=吃、`p`=碰、`k`=槓、`w`=胡、`f`=過
- [x] 2.3 包含工具查詢 binding：`h`=說明、`o`=手牌、`s`=狀態
- [x] 2.4 移除舊的 `ACCELERATORS` 物件

## 3. 實作模式狀態機

- [x] 3.1 建立 `useInputMode` hook（或在 `useCommandKeys` 中新增），持有 `uiMode` signal：`"normal" | "leader" | "command"`
- [x] 3.2 NORMAL MODE：按 Space → 切換為 `"leader"`
- [x] 3.3 NORMAL MODE：按 `:` → 切換為 `"command"`
- [x] 3.4 LEADER MODE：按 Esc → 返回 `"normal"`
- [x] 3.5 LEADER MODE：按有效 binding 鍵 → 執行命令 → 返回 `"normal"`
- [x] 3.6 LEADER MODE：按無對應 binding 的鍵 → 返回 `"normal"`（不執行任何命令）
- [x] 3.7 COMMAND MODE：按 Esc → 清空 input，返回 `"normal"`
- [x] 3.8 COMMAND MODE：Enter 送出命令 → 執行 executeCommand → 返回 `"normal"`

## 4. 重構底部列元件

- [x] 4.1 修改 `CommandInput.tsx`（或重命名為 `BottomBar.tsx`），接收 `uiMode` prop
- [x] 4.2 NORMAL MODE 渲染：顯示靜態文字 `NORMAL  <SPC>=選單  :=命令列`，不含 `<input>`
- [x] 4.3 LEADER MODE 渲染：顯示 which-key 面板，遍歷 `LEADER_BINDINGS`，依 `availableActions` 決定 dimmed
- [x] 4.4 COMMAND MODE 渲染：顯示 `:` 前綴 + `focused={true}` 的 `<input>`（等同現有 CommandInput 行為）
- [x] 4.5 確認 feedback 訊息（error/success/info）在 NORMAL 和 COMMAND MODE 下正常顯示

## 5. 移除 PlayerRow StatusBar

- [x] 5.1 移除 `PlayerRow.tsx` 的 `renderStatusBar()` 函數與其 JSX
- [x] 5.2 移除 `PlayerRow.tsx` 的 `renderHand()` 內 hotkeys 列（`<text>C+Sp</text>` 那行及整個 hotkeys row）
- [x] 5.3 移除 `PlayerRowProps` 的 `availableActions` 和 `seatWind` props（如已無其他用途）
- [x] 5.4 更新所有使用 `PlayerRow` 的地方，移除 `availableActions` 和 `seatWind` 傳遞（如有）

## 6. 整合到 GameTable

- [x] 6.1 在 `GameTable.tsx` 建立 `uiMode` signal 並傳遞給底部列元件
- [x] 6.2 確認 `useCommandKeys` 的 handleCommandKey 邏輯被新的模式狀態機取代（不再有 ctrl 判斷）
- [x] 6.3 確認 Ctrl+C 文字複製（`useKeyboard` 在 GameTable 中的處理）在所有模式下仍有效
- [x] 6.4 確認 PageUp/Down/Home/End 事件流導覽在所有模式下仍有效

## 7. 測試

- [x] 7.1 更新 `useCommandKeys.test.ts`：新增 `handleLeaderKey` 相關測試（leader binding 執行、無效鍵不執行）
- [x] 7.2 新增模式切換測試：NORMAL→LEADER（Space）、LEADER→NORMAL（Esc）、NORMAL→COMMAND（:）、COMMAND→NORMAL（Esc）
- [x] 7.3 確認舊的 Ctrl+letter 測試已全部移除或更新
- [x] 7.4 執行 `bun test` 確認全部通過
