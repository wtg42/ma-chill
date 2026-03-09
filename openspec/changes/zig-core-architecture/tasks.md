## 1. Tile System

- [ ] 1.1 在 `game/tile.zig` 定義 `Suit`、`Rank`、`Tile` 型別（含 id、suit、rank、copy_index）
- [ ] 1.2 實作 `generateCatalog()` 產生 144 張唯一 ID 的 tile catalog
- [ ] 1.3 撰寫 tile catalog 單元測試（ID 唯一性、張數正確性）

## 2. Deck & Shuffle

- [ ] 2.1 在 `game/deck.zig` 實作 Fisher-Yates 洗牌
- [ ] 2.2 實作發牌：四位玩家各 16 張，剩餘為牌山
- [ ] 2.3 實作花牌自動補牌邏輯（摸到花牌時循環補牌直到非花牌）
- [ ] 2.4 撰寫發牌單元測試（總張數不變、各玩家 16 張）

## 3. Game State

- [ ] 3.1 在 `game/state.zig` 定義 `GameState` 結構（四玩家手牌、副露、棄牌堆、牌山、局風、局數）
- [ ] 3.2 實作 `GameState` 全量序列化為 JSON（玩家手牌 tile_id 陣列，AI 玩家只輸出 hand_count）
- [ ] 3.3 實作 `events[]` 欄位（記錄本回合發生的事，如補花）

## 4. IPC Protocol

- [ ] 4.1 在 `ipc/protocol.zig` 定義 `Message` union（init、state_update、turn_changed、game_over、player_action）
- [ ] 4.2 實作 `sendMessage()` JSONL 序列化
- [ ] 4.3 實作 `parseMessage()` JSONL 反序列化
- [ ] 4.4 撰寫 IPC 訊息 roundtrip 單元測試

## 5. UDS Server

- [ ] 5.1 在 `ipc/server.zig` 實作 UDS socket 建立與監聽
- [ ] 5.2 實作 accept loop + 訊息分派（接收 player_action 並路由到遊戲邏輯）
- [ ] 5.3 Socket path 從環境變數 `MA_CHILL_SOCKET` 讀取（預設 `/tmp/ma-chill.sock`）

## 6. TUI Spawn

- [ ] 6.1 在 `main.zig` 實作 `std.process.Child` spawn TUI（`bun tui/dist/index.js`）
- [ ] 6.2 透過環境變數傳入 socket path 給 TUI
- [ ] 6.3 支援 dev 模式（環境變數 `MA_CHILL_TUI_DEV=1` 時改 spawn `bun run tui/src/index.tsx`）

## 7. Rules – Actions

- [ ] 7.1 在 `rules/actions.zig` 實作吃牌合法性判定（下家、手牌能組順子）
- [ ] 7.2 實作碰牌合法性判定（手牌有兩張相同）
- [ ] 7.3 實作槓牌合法性判定（明槓/暗槓）
- [ ] 7.4 實作碰/槓優先於吃的仲裁邏輯
- [ ] 7.5 撰寫各動作合法性單元測試

## 8. Rules – Safety

- [ ] 8.1 在 `rules/safety.zig` 定義 `DangerLevel` 枚舉（safe / low / medium / high）
- [ ] 8.2 實作 `analyzeTile(tile_id, public_state) → DangerLevel`（從棄牌堆與副露推導）
- [ ] 8.3 撰寫安全牌分析單元測試（已出現多次的牌應回傳 safe）

## 9. Rules – Scoring

- [ ] 9.1 在 `rules/scoring.zig` 定義計番函數介面
- [ ] 9.2 實作基本台數計算（自摸、平胡等基礎台數，詳細計番另行規格化）

## 10. Game Round

- [ ] 10.1 在 `game/round.zig` 實作回合推進主循環（摸牌 → 棄牌 → 下家動作 → 循環）
- [ ] 10.2 實作流局判定（牌山剩餘 0 張時結束）
- [ ] 10.3 整合 actions.zig 判定可用動作，推送 turn_changed

## 11. AI Agent

- [ ] 11.1 在 `ai/agent.zig` 定義 `AiPersonality` 結構（aggression、meld_tendency、defense、score_sensitive、wall_sensitive）
- [ ] 11.2 定義三個預設 preset（conservative、aggressive、balanced）
- [ ] 11.3 實作 `decide(game_state, player_id, personality) → Action`（基礎啟發式決策）
- [ ] 11.4 整合 `safety.analyzeTile()` 到 AI 棄牌決策（依 defense 參數決定是否打安全牌）
- [ ] 11.5 實作情境感知（score_sensitive：落後時降低胡牌標準；wall_sensitive：快流局時降低標準）

## 12. 整合測試

- [ ] 12.1 Zig 啟動 → spawn TUI（mock）→ 確認 init 訊息送達且格式正確
- [ ] 12.2 模擬一局完整流程：發牌 → 回合推進 → AI 決策 → 胡牌/流局
- [ ] 12.3 確認 state_update 全量序列化在各情境下正確（含副露、花牌補牌 events）
