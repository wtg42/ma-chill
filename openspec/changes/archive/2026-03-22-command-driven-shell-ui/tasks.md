## 1. 建立命令系統骨架

- [x] 1.1 建立前端 command registry，定義第一版核心 slash 指令與其參數格式
- [x] 1.2 實作 slash parser，將命令列輸入轉為結構化 command 物件
- [x] 1.3 實作 command normalization，將遊戲動作命令轉為既有 `sendAction` 可接受的結構化 action
- [x] 1.4 區分本地命令與 core 命令，確保非遊戲命令不觸發 IPC 寫入

## 2. 擴充 shell 狀態與回饋管線

- [x] 2.1 擴充 TUI state，加入命令列內容、最近命令結果、事件流與可用命令提示
- [x] 2.2 將 `turn_changed.available_actions` 映射為目前可執行的 slash 命令與提示資訊
- [x] 2.3 實作命令錯誤與成功回饋，讓未知命令、缺參數與不可用動作可寫入事件流
- [x] 2.4 保留既有 `pass_timeout_seconds` 流程，改由命令層統一送出 `pass`

## 3. 以 shell 版面取代舊主畫面

- [x] 3.1 重構主畫面為三段式 shell：頂部狀態列、中間事件流、底部命令列
- [x] 3.2 將局況摘要、分數、目前玩家與可用命令提示集中顯示在頂部狀態列
- [x] 3.3 建立中間事件流元件，串接 Zig 訊息與本地命令回饋
- [x] 3.4 建立底部命令列元件，支援基本文字編輯、送出與 placeholder 顯示

## 4. 收斂舊互動模型並驗證

- [x] 4.1 將現有快捷鍵改為 command accelerator，移除直接送 IPC 的 hotkey-first 路徑
- [x] 4.2 移除或封存四列牌桌導向的主互動邏輯，避免與 shell 主畫面並存衝突
- [x] 4.3 驗證核心遊戲命令流程（如 discard、chi、pon、kong、win、pass）可透過命令層正常運作
- [x] 4.4 更新相關文件與開發說明，讓 README 與新架構描述一致
