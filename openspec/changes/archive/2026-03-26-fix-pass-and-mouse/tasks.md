## 1. 修復 Zig core pass timeout

- [x] 1.1 移除 `session.zig` 中 `receivePlayerAction` 的 `timeout_ms` 參數與 timeout 分支，改為永遠 blocking read
- [x] 1.2 更新 `main.zig` 的 `GameDriver`：移除 `pass_timeout_ms` 欄位，`turnDecide` 與 `claimDecide` 改為呼叫 `receivePlayerAction()` 不帶 timeout
- [x] 1.3 更新或移除 `session.zig` 中的 timeout 相關測試

## 2. 關閉 OpenTUI 滑鼠追蹤

- [x] 2.1 ~~在 `tui/src/index.tsx` 的 `render()` options 加入 `useMouse: false`~~ 已還原 — `useMouse: false` 會破壞滾輪，改由新 change 以 copy-on-select 方式處理

## 3. 驗證

- [x] 3.1 執行 `zig build test` 確認 Zig core 測試通過
- [ ] 3.2 手動測試：啟動遊戲，確認 claim phase 中玩家可操作（吃碰槓），auto-pass 5 秒後正常觸發
- [ ] 3.3 手動測試：確認滑鼠可選取終端機文字
