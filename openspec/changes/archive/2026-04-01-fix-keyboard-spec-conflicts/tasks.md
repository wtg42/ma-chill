## 1. 對齊主規格與文件

- [x] 1.1 更新 `openspec/specs/keyboard-interaction/spec.md`，移除 `Ctrl+C` 與 `Ctrl+Space` 的產品互動承諾
- [x] 1.2 確認相關說明文件與介面提示不再宣稱任何 `Ctrl+...` 產品快捷鍵

## 2. 清除殘留的 Ctrl 行為

- [x] 2.1 移除 `tui/src/game-table/GameTable.tsx` 中對 `Ctrl+C` 複製 selection 的攔截邏輯
- [x] 2.2 確認 `useCommandKeys` 與其他鍵盤處理路徑不再把 `Ctrl` 組合作為產品命令入口

## 3. 更新測試

- [x] 3.1 更新或移除假設 `Ctrl+C` 可作為產品複製鍵的測試
- [x] 3.2 更新或補充測試，確認遊戲命令仍由 Leader bindings 與 command mode 承載
