## Why

目前 `session.zig` 的 `receivePlayerAction` 在帶 timeout 呼叫時，完全不讀取 socket 就直接回傳 pass。這導致玩家在副露詢問（claim phase）與含 pass 的出牌回合中，任何鍵盤輸入都被跳過，遊戲變成自動 pass。同時 OpenTUI 預設啟用滑鼠追蹤（`useMouse: true`），攔截終端機的滑鼠事件，使用者無法用滑鼠選取複製文字。

## What Changes

- **移除 Zig core 的 timeout 分支**：`session.zig` 的 `receivePlayerAction` 移除 `timeout_ms` 參數與整個 timeout 分支，改為永遠 blocking read。pass timeout 完全由 TUI 端 timer 負責。
- **調整 `main.zig` 呼叫端**：`turnDecide` / `claimDecide` 不再傳 timeout 給 session，改為無條件呼叫 `receivePlayerAction()`。
- **關閉 OpenTUI 滑鼠追蹤**：`render()` 設定 `useMouse: false`，讓終端機原生處理滑鼠選取。

## Capabilities

### New Capabilities

（無新增 capability）

### Modified Capabilities

- `zig-uds-session`：移除 `receivePlayerAction` 的 timeout 機制，改為純 blocking read
- `keyboard-interaction`：pass timeout 全權由 TUI auto-pass timer 負責（已實作，但需確認為唯一來源）
- `tui-uds-connection`：關閉 `useMouse`，啟用終端機原生滑鼠選取

## Impact

- **Zig core**：`core/src/ipc/session.zig`、`core/src/main.zig` — 簡化 API，移除未完成的 timeout 邏輯
- **TUI**：`tui/src/index.tsx` — 新增 `useMouse: false` 設定
- **測試**：`session.zig` 中的 timeout 測試需更新或移除
- **行為變化**：auto-pass 時機完全取決於 TUI 端 5 秒 timer，Zig core 不再有獨立的超時控制
