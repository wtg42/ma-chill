## 1. ipc/session.zig 實作

- [x] 1.1 建立 `core/src/ipc/session.zig`，定義 `Session` struct（持有 stream + write buffer + read buffer）
- [x] 1.2 實作 `Session.sendMessage(msg: protocol.Message)`：呼叫 `protocol.sendMessage` 寫入 stream
- [x] 1.3 實作 `Session.receivePlayerAction(timeout_ms: ?u64)`：讀一行 JSONL → `protocol.parseMessage` → 確認型別；非 `player_action` 繼續讀；timeout 到期回傳 `{ action: .pass, tile_id: null }`
- [x] 1.4 為 `Session.sendMessage` 撰寫測試（mock stream，驗證 JSONL 格式）
- [x] 1.5 為 `Session.receivePlayerAction` 撰寫測試（含 timeout 自動 pass、忽略非 player_action 訊息）

## 2. GameDriver struct 實作

- [x] 2.1 在 `core/src/main.zig` 定義 `GameDriver` struct，持有 `*Session` 與 `pass_timeout_ms: u64`
- [x] 2.2 實作 `GameDriver.turnDecide(gs, turn_changed)`：player 0 → `session.receivePlayerAction`，AI → `ai.agent.decide()`
- [x] 2.3 實作 `GameDriver.claimDecide(gs, discarded_tile_id, turn_changed)`：同上邏輯
- [x] 2.4 實作 `GameDriver.sink(msg)`：呼叫 `session.sendMessage(msg)`

## 3. main.zig 遊戲主流程接線

- [x] 3.1 重寫 `main()` 啟動順序：`server.listen` → `spawnTui` → `server.accept` → `Session.init`
- [x] 3.2 加入牌局初始化：shuffle + `round.initGameState()`
- [x] 3.3 建立 `init` 訊息並 `session.sendMessage(init_msg)`
- [x] 3.4 建立 `GameDriver`，呼叫 `round.playRound(driver.turnDecide, driver.claimDecide, driver.sink)`
- [x] 3.5 `playRound` 結束後 `child.wait()` 並 log 結果

## 4. 整合驗證

- [x] 4.1 `zig build test` 全部通過（含新增測試）
- [ ] 4.2 手動測試：用 `nc -U /tmp/ma-chill.sock` 模擬 TUI，確認收到 `init` 訊息格式正確
