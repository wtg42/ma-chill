## Why

Zig core 的遊戲邏輯與 IPC 協定已完成，但 `main.zig` 目前只會 spawn TUI 子程序然後等待其結束，沒有建立 UDS 連線、沒有執行遊戲迴圈、無法與 TUI 交換任何訊息。需要將所有已完成的模組接線，讓一場完整的麻將局可以從啟動到結束正常運行。

## What Changes

- **Zig `main.zig`**：重寫為完整遊戲主程式，負責 UDS 監聽 → 接受 TUI 連線 → 推送 `init` → 執行 `playRound` → 結束
- **Zig `ipc/session.zig`（新增）**：封裝與單一 TUI client 的雙向連線（send + receive），供 `main.zig` 與 `turn_decider`/`claim_decider` 使用
- **Zig `main.zig` 中的 `turn_decider`**：player 0 → 從 UDS 讀取 `player_action`；AI 玩家 → 呼叫 `ai.agent.decide()`
- **Zig `main.zig` 中的 `claim_decider`**：同上邏輯，額外處理 pass timeout（倒數到期自動 pass）
- **Zig `main.zig` 中的 `sink`**：將 `playRound` 產生的所有 `Message` 序列化後送給 TUI

## Capabilities

### New Capabilities

- `zig-uds-session`：Zig 側 UDS 雙向連線管理，封裝 sendMessage / receivePlayerAction，供遊戲主迴圈使用
- `zig-game-entrypoint`：Zig `main.zig` 的完整遊戲啟動流程，包含 server 監聽、TUI spawn、遊戲迴圈接線、pass timeout 處理

### Modified Capabilities

（無）

## Impact

- **修改**：`core/src/main.zig`
- **新增**：`core/src/ipc/session.zig`
- **依賴**（已存在，不修改）：`ipc/protocol.zig`、`ipc/server.zig`、`game/round.zig`、`ai/agent.zig`
- TUI 端不在此 change 範圍，仍使用 fake-data；UDS 串接由後續 TUI change 處理
