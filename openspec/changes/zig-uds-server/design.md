## Context

Zig core 現有模組：
- `ipc/protocol.zig`：完整的 JSONL 訊息序列化/反序列化，含測試
- `ipc/server.zig`：UDS `listen()` + `acceptLoop()`（只接收，無送出）
- `game/round.zig`：`playRound(turn_decider, claim_decider, sink)` 完整遊戲迴圈
- `ai/agent.zig`：AI 決策介面
- `main.zig`：目前只 spawn TUI 子程序 + `child.wait()`，完全沒有 socket 通訊

需要將以上模組接線成一個可執行的遊戲主程式。

## Goals / Non-Goals

**Goals:**
- `main.zig` 能完整執行一局麻將：開 socket → spawn TUI → 接受連線 → init → playRound → game_over
- 新增 `ipc/session.zig`，封裝雙向連線（sendMessage + receivePlayerAction），讓 `main.zig` 邏輯乾淨
- `turn_decider` / `claim_decider`：player 0 向 TUI 讀取 `player_action`，AI 玩家呼叫 `agent.decide()`
- pass timeout：player 0 等待 `player_action` 時，若超過 `pass_timeout_seconds` 自動送出 `pass`

**Non-Goals:**
- TUI 端 IPC client（後續 change）
- 多局循環（此 change 只處理單局）
- 設定檔讀取（`pass_timeout_seconds` 先 hardcode 為 5 秒）
- 錯誤後自動重連

## Decisions

### Decision 1：新增 `ipc/session.zig` 封裝雙向連線

**選擇**：新增 `Session` struct，持有 `stream`，提供：
- `sendMessage(msg)` → `protocol.sendMessage`
- `receivePlayerAction(timeout_ms)` → 讀一行 → `protocol.parseMessage` → 確認是 `player_action`

**捨棄方案**：直接在 `main.zig` 操作 raw stream。
**理由**：`turn_decider` / `claim_decider` 是 closure 或 fn pointer，需要捕獲 stream；封裝成 `Session` 讓依賴關係明確，也方便之後替換（e.g. pipe）。

### Decision 2：`turn_decider` 與 `claim_decider` 以 struct + comptime 方式實作

**選擇**：定義 `GameDriver` struct，持有 `*Session`、`pass_timeout_ms`，提供 `turnDecide` / `claimDecide` 方法，傳入 `playRound` 作為 comptime callback。

**理由**：`playRound` 的 `turn_decider`/`claim_decider` 是 comptime anytype，直接用 struct method 是最自然的 Zig 方式，不需要 function pointer 或 closure hack。

### Decision 3：pass timeout 實作方式

**選擇**：`receivePlayerAction` 接受 `timeout_ms: ?u64`；`null` 表示無限等待（discard turn 沒有 timeout），非 null 在超時後自動回傳 `{ action: .pass, tile_id: null }`。

**理由**：只有 `turn_changed` 含 `pass` 的情況才需要 timeout（副露詢問），棄牌回合不需要。`GameDriver` 根據 `available_actions` 是否含 `.pass` 來決定是否傳入 timeout。

### Decision 4：UDS 啟動順序

```
main()
  │
  ├─ server.listen(socket_path)     ← 開監聽（先開，避免 TUI 連不上）
  ├─ spawnTui(socket_path)          ← spawn TUI
  ├─ server.accept()                ← 等 TUI 連進來
  ├─ Session.init(stream)
  ├─ 初始化牌局（initGameState + shuffle）
  ├─ session.sendMessage(init_msg)
  ├─ playRound(driver, driver, session.sink)
  └─ child.wait()
```

**理由**：先 listen 再 spawn，確保 socket 存在時 TUI 才啟動，避免 race condition。

## Risks / Trade-offs

- **[Risk] Zig master std.Io API 不穩定** → 緊跟現有 `server.zig` 與 `main.zig` 的 API 用法，不自行猜測介面
- **[Risk] pass timeout 在不同 OS 上精度差異** → 此 change 優先讓邏輯正確，精度問題後續處理
- **[Risk] TUI 還沒實作 IPC，無法端對端測試** → `main.zig` 的測試用 mock stream 或 shell script echo 驗證
