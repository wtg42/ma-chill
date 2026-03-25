## 1. 手牌摘要 formatter

- [x] 1.1 新增 unit test，覆蓋手牌摘要的分組順序、組內升冪排序、空分類省略與 `摸牌` 獨立輸出
- [x] 1.2 實作共用 hand summary formatter，讓 `/hand` 與自摸後自動顯示可共用同一份逐行摘要結果

## 2. `/hand` 命令整合

- [x] 2.1 新增 unit test，覆蓋 `/hand` 為本地命令、不送 IPC、無 state 時提供錯誤回饋，以及 `/help` 內容更新
- [x] 2.2 擴充 command registry 與 execute path，註冊 `/hand` 並把摘要結果逐行追加到事件流

## 3. 自摸後自動顯示手牌

- [x] 3.1 新增 unit test，覆蓋 viewer 自摸後自動追加手牌摘要，以及其他 `state_update` 不重印手牌
- [x] 3.2 在 `useGameState` 的 `state_update` 流程重用 formatter，讓「你摸到牌」後自動補上手牌摘要

## 4. 快捷鍵與驗證

- [x] 4.1 新增 unit test，覆蓋 `Ctrl+o` 透過 command system 觸發 `/hand`，而不是走獨立 hotkey-only 路徑
- [x] 4.2 更新快捷鍵映射並執行 TUI 單元測試，確認 hand query 相關測試全部通過
