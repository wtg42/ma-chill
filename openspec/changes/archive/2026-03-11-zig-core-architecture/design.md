## Context

TUI 層已完成牌面渲染與 game-table 基礎佈局，目前以 fake-data 驅動。Zig core 是空白 scaffold，需要從零建立完整的遊戲引擎。核心設計目標是讓 Zig 成為唯一的 truth source，TUI 純粹負責渲染與輸入轉發。

現有相關程式碼：
- `core/src/main.zig`：空白 scaffold
- `tui/src/game-table/fake-data.ts`：目前驅動 UI 的假資料
- 參考專案：`wtg42/tty-clock-timer`（JSONL + UDS + spawn TUI 的既有實作）

## Goals / Non-Goals

**Goals:**
- 定義模組邊界：tile、deck、state、round、rules、ai、ipc
- 確立 UDS + JSONL 通訊協議（訊息型別與資料結構）
- 定義 144 張牌的唯一 ID 系統（tile catalog 隨 init 訊息傳送）
- 全量 snapshot 策略（每次動作後推送完整狀態）
- AI 個性參數系統（靜態傾向 + 情境感知）
- 安全牌分析模組（從公開資訊推導危險程度）

**Non-Goals:**
- LLM 串接（保留介面，但此 change 不實作）
- TUI ↔ Zig 整合（此 change 僅建立 Zig core，fake-data 替換為另一個 change）
- 計番完整實作（台灣規則複雜，此 change 定義介面，詳細計番另行規格化）
- 動畫、音效等 UI 效果

## Decisions

### 決定 1：Zig 是 server，spawn TUI 為 child process

**選擇**：Zig 執行後先初始化遊戲狀態，建立 UDS socket 監聽，再用 `std.process.Child` spawn 已編譯的 TUI bundle（`bun tui/dist/index.js`）。Socket path 透過環境變數傳入 TUI。

**理由**：Zig 是 truth source，應先於 UI 存在。參考 tty-clock-timer 的 spawn 模式，已有可靠的前例。

**替代方案**：TUI 先啟動再連 Zig → 需要 retry 邏輯，且職責顛倒

---

### 決定 2：JSONL over UDS，type 欄位做 discriminator

**選擇**：每條訊息為一個 JSON 物件後接換行符（`\n`），固定包含 `type` 欄位。直接採用 tty-clock-timer 的 `ipc.zig` 模式（`parseMessage` / `sendMessage`）。

**理由**：人類可讀、易除錯、Zig 標準庫有完整 JSON 支援。回合制遊戲對延遲不敏感，JSONL 足夠。

**替代方案**：Binary protocol（MessagePack）→ 效能更好但除錯困難，無必要

---

### 決定 3：全量 snapshot，不做增量 delta

**選擇**：每次動作後推送完整 `state_update` 訊息，包含所有玩家手牌、副露、棄牌堆、牌山剩餘數。

**理由**：麻將狀態量有限（144 個 tile ID），回合制對頻寬無要求。全量避免 TUI/Zig 狀態不同步的風險，TUI 實作最簡單。

**替代方案**：增量 delta → TUI 需合併狀態，易出現不一致，維護成本高

---

### 決定 4：Tile catalog 隨 init 訊息傳送（方案 B）

**選擇**：`init` 訊息包含完整 144 張牌的對照表 `{ id, suit, rank, copy_index }`。TUI 建立本地 lookup map，之後的訊息只傳 `tile_id`。

**理由**：明確無歧義，TUI 不需要了解任何 ID 編碼規則，雙方解耦。

**替代方案**：方案 A，ID 即編碼（`id = suit * 36 + rank * 4 + copy`）→ 需要雙方共享隱式規則，改動時容易不同步

---

### 決定 5：AI 使用單一 decide() 函數，傳入 player_id 與個性參數

**選擇**：`ai.decide(game_state, player_id, personality) → Action`。三個 AI 對手各有不同 `AiPersonality`，但共用同一套決策邏輯。

**理由**：實作簡單，個性差異透過參數表達，未來擴充（難度、LLM）只需換參數或替換函數實作。

**個性參數設計**：
```zig
const AiPersonality = struct {
    aggression: f32,      // 0=有牌就胡, 1=追大台
    meld_tendency: f32,   // 0=純手胡, 1=積極副露
    defense: f32,         // 0=無視放槍, 1=高防守
    score_sensitive: f32, // 0=無視分數差距, 1=落後就縮手
    wall_sensitive: f32,  // 0=無視牌山, 1=快流局降標準
};
```

---

### 決定 6：安全牌分析獨立為 rules/safety 模組

**選擇**：`safety.analyzeTile(tile_id, public_state) → DangerLevel`，從全場棄牌堆與副露推導危險程度。AI 的 `decide()` 查詢後依 `personality.defense` 決定是否接受風險。

**理由**：安全牌分析是純粹的資訊分析，與 AI 決策邏輯解耦。未來 LLM 模式也可以直接使用這份分析資料。

---

### 決定 7：模組結構

```
core/src/
├── main.zig              UDS server 入口、spawn TUI、遊戲主循環
├── game/
│   ├── tile.zig          Tile 型別定義、144 張 catalog 產生
│   ├── deck.zig          洗牌、發牌、牌山管理
│   ├── state.zig         完整牌局狀態結構與序列化
│   └── round.zig         局的生命週期（開局、回合推進、換局、結算）
├── rules/
│   ├── actions.zig       合法動作判定（可吃/碰/槓/胡？）
│   ├── safety.zig        安全牌分析（從公開資訊推導危險程度）
│   └── scoring.zig       台灣計番介面（詳細計番另行規格化）
├── ai/
│   └── agent.zig         decide(state, player_id, personality) → Action
└── ipc/
    ├── protocol.zig      Message union + JSONL 序列化/反序列化
    └── server.zig        UDS accept loop + 訊息分派
```

## Risks / Trade-offs

- **台灣計番規則複雜**：scoring.zig 此 change 只定義介面，計番邏輯細節留給後續 change → 先用簡化版（只算基本台數）通過整合測試
- **胡牌判定缺少邊界**：剩餘任務需要 `win` 合法性與完整回合結束條件，因此此 change 補充一個最小可實作的胡牌判定：僅支援標準胡型（4 組面子 + 1 對將），不含七對子、十三么等特殊牌型
- **花牌補牌時機**：發牌與摸牌時遇到花牌需自動補牌，TUI 需要顯示補花事件 → 在 `state_update` 中加入 `events[]` 欄位記錄本回合發生的事
- **TUI spawn 路徑**：開發時 TUI 可能尚未編譯，需支援 dev 模式（直接 `bun run src/index.tsx`） → 透過環境變數 `MA_CHILL_TUI_DEV=1` 切換

## Clarifications Added During Implementation

- `GameState` 補充 `scores[4]` 欄位，供 `game_over` 序列化與 AI 的 `score_sensitive` 邏輯使用
- `win` 合法性在此 change 採用最小規格：只檢查一般型 17 張胡牌（含摸入牌）是否可拆成 4 組合法面子 + 1 對將
- AI 的 `score_sensitive` 不需要完整策略樹；僅需依當前分數落後/領先調整風險容忍度與胡牌門檻

## Open Questions

- [ ] Socket path 格式：固定路徑（`/tmp/ma-chill.sock`）還是含隨機後綴（避免多開衝突）？
- [ ] AI 個性 preset 名稱與預設值最終確認（conservative / aggressive / balanced）
- [ ] 花牌是否在 tile catalog 中列出（有 ID），還是由 Zig 內部直接處理不送給 TUI？
