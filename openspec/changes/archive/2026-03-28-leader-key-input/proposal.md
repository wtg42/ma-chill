## Why

目前底部命令列永遠處於 input 狀態（`<input focused={true}>`），導致所有遊戲快捷鍵必須加 Ctrl 修飾鍵才能避開輸入框的優先捕捉，同時 Ctrl+Space 與 Linux 輸入法切換熱鍵衝突、整體互動分散不統一。引入 Leader 鍵模式（仿 LazyVim 設計），將輸入系統改為模式驅動，解決衝突並提供自我說明的操作介面。

## What Changes

- **BREAKING** 移除所有 `Ctrl+<letter>` 快捷鍵（ACCELERATORS 整個概念替換）
- 底部命令列改為三態設計：NORMAL / LEADER / COMMAND，預設為靜態提示列而非輸入框
- 新增 Leader 鍵（`Space`）：按下後即時顯示 which-key 面板，列出可用的 `<leader>+<key>` 組合
- 新增 Command Mode（按 `:`）：進入後底部出現 `/` 前綴輸入框，Esc 退出
- 移除 `PlayerRow` 底部的快捷鍵提示列（StatusBar），統一由 which-key 面板負責
- `ctrl-space-discard-drawn` change 的實作被此 change 取代（revert Ctrl+Space 相關程式碼）
- 更新 `keyboard-interaction` spec（現有規格需要全面修訂）

## Capabilities

### New Capabilities

- `leader-key-mode`：三態輸入模式（NORMAL / LEADER / COMMAND）、Leader 鍵狀態機、which-key 面板渲染

### Modified Capabilities

- `keyboard-interaction`：所有快捷鍵定義從 `Ctrl+<letter>` 改為 `<leader>+<letter>`；新增 `:` 進入 command mode；移除 Ctrl 組合快捷鍵規格

## Impact

- `tui/src/game-table/useCommandKeys.ts`：ACCELERATORS 替換為 leader binding registry，新增模式狀態機
- `tui/src/game-table/CommandInput.tsx`：重構為多態 BottomBar 元件（或拆分為三個子元件）
- `tui/src/game-table/PlayerRow.tsx`：移除 StatusBar 快捷鍵列
- `tui/src/game-table/useCommandKeys.test.ts`：全面更新測試
- `openspec/changes/ctrl-space-discard-drawn/`：此 change 的實作（Ctrl+Space ACCELERATOR、PlayerRow StatusBar 文字）需 revert
