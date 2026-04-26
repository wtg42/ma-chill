## 1. 棄牌 dialog 狀態與資料準備

- [x] 1.1 先寫 `useCommandKeys` / `GameTable` failing test，定義 `<leader>+d` 在可棄牌時開啟 discard dialog、不可棄牌時不開啟的行為
- [x] 1.2 以最小實作讓 1.1 測試通過：在 TUI 本地 UI state 中新增 discard dialog 開關、焦點索引與關閉流程，且不把該狀態混入既有 `UiMode`
- [x] 1.3 抽出 discard dialog 需要的可棄牌資料模型，統一提供手牌、摸牌與對應 tile id / 短 label
- [x] 1.4 重構 discard dialog 本地 state 與資料 helper，去除與既有命令列模式管理的責任混淆

## 2. discard dialog 畫面與方向鍵導覽

- [x] 2.1 先寫 discard dialog 元件 failing test，覆蓋牌面顯示、短 label 顯示、焦點高亮與空狀態保護
- [x] 2.2 以最小實作讓 2.1 測試通過，完成 discard dialog UI，顯示玩家手牌、摸牌與 `7p` / `east` 這類短 label
- [x] 2.3 先寫方向鍵導覽 failing test，覆蓋左右同列移動、上下跨列移動與邊界停留
- [x] 2.4 以最小實作讓 2.3 測試通過，補上 dialog 焦點移動規則與底部操作提示
- [x] 2.5 先寫 Esc 取消 failing test，確認關閉 dialog 時不送出任何 action
- [x] 2.6 以最小實作讓 2.5 測試通過，完成 Esc 關閉行為
- [x] 2.7 重構 discard dialog 元件與導航邏輯，收斂重複條件判斷與焦點計算

## 3. 棄牌確認與命令層整合

- [x] 3.1 先寫整合 failing test，覆蓋 Enter 確認後會沿用既有 discard 執行路徑，而不是直接繞過 command system 送 IPC
- [x] 3.2 以最小實作讓 3.1 測試通過，將 dialog 確認動作接回既有 discard command / execute path，重用合法性檢查、prompt 清理與送出流程
- [x] 3.3 先寫 fallback 一致性 failing test，確認 command mode 與 discard dialog 兩條入口的 discard 結果一致
- [x] 3.4 以最小實作讓 3.3 測試通過，保留 `/discard <tile|drawn|tile_id>` fallback 並收斂共用執行 helper
- [x] 3.5 更新 leader registry 與 which-key 文案，將 `d` 從「棄摸牌」改為「棄牌」
- [x] 3.6 重構 discard 執行共用路徑，避免 dialog 與 command mode 各自維護不同邏輯

## 4. 驗證與收尾

- [x] 4.1 補強手牌相關顯示測試，確認短 label 規則與 `/discard` parser 接受的 token 一致
- [x] 4.2 執行 TUI 測試，驗證 leader mode、discard dialog、方向鍵導覽與棄牌確認流程都通過
- [x] 4.3 進行一次實機互動檢查，確認 `<leader>+d`、方向鍵、Enter、Esc 與既有 claim / command mode 不互相干擾
- [x] 4.4 檢查本 change 的實作順序與提交內容是否符合最小覆蓋 TDD 原則，避免遺留未被核心測試覆蓋的主流程
