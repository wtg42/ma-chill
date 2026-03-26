## Context

目前系統有兩層 pass timeout 機制：
1. **Zig core 端**：`session.zig` 的 `receivePlayerAction(timeout_ms)` — 但實作只是立即回傳 pass，完全不讀 socket
2. **TUI 端**：`useGameKeys.ts` 的 `createEffect` — 偵測到 claim + pass 可用時啟動 JS timer，到期送出 pass action

Zig core 的 timeout 路徑會讓所有帶 timeout 的呼叫（副露詢問、含 pass 的出牌回合）直接跳過玩家輸入，導致玩家操作無效。

另外 OpenTUI 預設 `useMouse: true`，攔截終端機滑鼠事件，使用者無法選取複製文字。

## Goals / Non-Goals

**Goals:**
- 修復玩家在 claim phase 與含 pass 的回合中無法操作的問題
- 讓 TUI 端的 auto-pass timer 成為 pass timeout 的唯一來源
- 恢復終端機原生滑鼠選取功能

**Non-Goals:**
- 不在 Zig core 實作 `std.Io.Timeout` 等非阻塞超時（未來如有需要再加）
- 不改變 pass timeout 秒數或其他遊戲邏輯
- 不加入 OpenTUI 的 `<text selectable>` 機制

## Decisions

### Decision 1：移除 Zig core timeout，改為純 blocking read

**選擇**：`receivePlayerAction` 移除 `timeout_ms` 參數，永遠 blocking read。

**替代方案**：用 `std.Io.Batch` + `Timeout` 實作真正的 read-with-timeout 競賽。

**理由**：
- TUI 端已有完整的 auto-pass timer 實作（`useGameKeys.ts:108-127`）
- 回合制遊戲中，TUI 保證會在時限內送出 action（手動操作 or auto-pass）
- Batch timeout 需要降到 raw stream.read 層級管理 buffer/delimiter，複雜度高且目前無額外收益
- 簡化 API 降低維護成本

### Decision 2：`main.zig` 呼叫端統一為無 timeout

**選擇**：`turnDecide` 與 `claimDecide` 呼叫 `session.receivePlayerAction()` 不帶 timeout。

**理由**：timeout 已不在 session 層處理，呼叫端不需要判斷是否帶 timeout。GameDriver 的 `pass_timeout_ms` 欄位也可移除。

### Decision 3：`useMouse: false` 關閉滑鼠追蹤

**選擇**：在 `render()` options 加 `useMouse: false`。

**理由**：遊戲是純鍵盤操作，不使用任何 `onMouseDown` 等事件。關閉後終端機恢復原生滑鼠選取，無副作用。

## Risks / Trade-offs

- **[Risk] TUI 未送出 action 導致 Zig core 永久阻塞** → TUI auto-pass timer 保證 5 秒內一定送出；若 TUI crash，child process 結束會觸發 stream EOF，Zig core 收到 `error.ConnectionClosed` 並結束
- **[Risk] 移除 timeout_ms 參數是 breaking change** → 這是內部 API，只有 `main.zig` 呼叫，同步修改即可
- **[Trade-off] Zig core 失去獨立超時控制** → 可接受，因為回合制遊戲的 timeout 語義本就屬於 UI 層；未來如需 server-side timeout 可再加回
