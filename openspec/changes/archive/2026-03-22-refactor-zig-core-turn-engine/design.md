## Context

`core/src/game/round.zig` 目前同時包含 `availableActionsForPlayer`、摸牌/棄牌/副露狀態轉移、搶牌仲裁、`playRound` 編排，以及部分測試。這讓 turn engine 的規則與流程耦合在同一個檔案內：要驗證單一規則，往往需要連同 driver、訊息推送與整段回合流程一起理解。

現況的相關限制如下：
- Zig core 開發以標準函式庫為唯一依賴，並以 Zig master（目前專案環境為 `0.16.0-dev`）為基準
- 後續畫面層將改為 command-driven shell，但此 change 不重構 TUI；核心目標是先穩定 core 邊界
- 驗證策略以 TDD 為主，只新增與調整 unit test，不建立新的整局 feature test
- `ipc/protocol`、`main.zig` 的 driver 互動與 `ai/agent.zig` 仍需沿用既有外部行為

## Goals / Non-Goals

**Goals:**
- 將 turn engine 拆成可單獨測試的合法動作判定、狀態轉移與搶牌仲裁模組
- 讓 `playRound` 收斂為 orchestrator，負責 driver 互動、流程排序與訊息推送
- 保持既有 `tile_id` 為唯一操作識別，避免以牌名或位置作為核心 API 參數
- 用 `std.testing` 補齊關鍵 unit test，讓回合規則與狀態轉移可以不經完整牌局就驗證

**Non-Goals:**
- 重構 TUI 版面、指令輸入或快捷鍵互動
- 變更 IPC 訊息格式、加入新訊息型別或改寫 session/server 邏輯
- 改寫 AI 策略本身，只允許為配合新模組邊界調整呼叫方式
- 新增完整 feature test / end-to-end 測試框架

## Decisions

### 決定 1：將 turn engine 拆成三個可測模組，`round.zig` 保留 orchestrator

**選擇**：從 `core/src/game/round.zig` 抽出三類責任：
- 合法動作判定模組：計算玩家在特定上下文下可執行的動作
- 狀態轉移模組：處理摸牌、棄牌、暗槓、吃碰槓等對 `GameState` 的變更
- 搶牌仲裁模組：收集並決定多家 claim 的優先結果

`playRound` 只保留流程編排：推送 `turn_changed`、向 driver 取決策、委派模組執行、再決定是否推送 `state_update` 或 `game_over`。

**理由**：這三類責任的測試資料形狀不同；拆開後每塊都可以直接以 `GameState` 與 `tile_id` 驗證，不必經過整段遊戲流程。

**替代方案**：維持單檔案、僅以私有 helper 整理區段。這會稍微改善可讀性，但無法真正降低測試與維護成本。

### 決定 2：萃取後的核心 API 一律以 `tile_id` 與 `GameState` 為主

**選擇**：所有新模組的公開入口都以 `tile_id` 為唯一牌識別，並直接接受 `*state.GameState` 或必要的上下文參數；不在 core 引入以牌名、位置或 UI 別名為主的 API。

**理由**：`tile_id` 具有唯一性，與既有 IPC 協定一致，也最有利於 debug 與單元測試。這同時為未來 slash command / Ctrl shortcut 正規化保留清楚邊界：UI 可做便利輸入，但進 core 前必須轉成 `tile_id`。

**替代方案**：以牌名或手牌索引作為 transition API 輸入。這會讓重複牌、排序改變與測試重現變得困難。

### 決定 3：狀態轉移維持 in-place mutation，但縮小每個函式職責

**選擇**：延續 Zig core 目前的 in-place `GameState` mutation 風格，不導入 immutable snapshot 或複製整份 state 的模式；每個 transition 函式只負責一種明確動作，例如棄牌、暗槓、吃牌、碰牌、明槓。

**理由**：目前程式已大量使用 `ArrayListUnmanaged` 與 allocator 管理可變狀態。保持 mutation 模式可降低重構風險，同時避免為了測試性導入大量額外配置與複製成本。

**替代方案**：改為 pure function 回傳新 state。理論上更純，但會讓 allocator 與資料搬移成本暴增，超出此 change 範圍。

### 決定 4：搶牌仲裁模組回傳結構化結果，driver / IPC 副作用留在 orchestrator

**選擇**：搶牌仲裁邏輯只決定結果並套用必要 state mutation，回傳結構化 outcome（例如無人 claim、有人胡牌、有人副露且是否需要補摸）。實際的 `driver.sink()` 訊息推送與流程分支仍由 `playRound` 控制。

**理由**：這樣可以把「規則判定」與「I/O 副作用」分開，讓 claims 單元測試只關心 winner、selected claim 與後續輪轉，而不必 mock session 或 message sink。

**替代方案**：保留 `resolveClaims()` 直接讀寫 driver。這會延續目前的高耦合狀態，使 unit test 仍需連帶建立假的 driver。

### 決定 5：測試策略以 extracted module unit tests 為主，`round.zig` 僅保留少量 smoke tests

**選擇**：將既有 `round.zig` 測試拆分到新模組旁，集中驗證：
- 合法動作矩陣
- 棄牌與副露狀態轉移
- 搶牌優先序與結果

`playRound` 只保留少量 smoke tests，確認 orchestrator 仍能完成最基本的流局/胡牌流程。

**理由**：這符合本 change 的 TDD 目標，也能在不建立 feature test 的前提下，保留最低限度的整合保險。

**替代方案**：維持大量 `playRound` 劇本測試。這些測試對行為有保險，但失敗時難以定位責任，與本次重構目標相反。

## Risks / Trade-offs

- **[模組邊界切太碎]** 可能造成 helper 分散、命名混亂 → 先固定三個主責模組，僅在出現明顯共用邏輯時再抽共用 helper
- **[重構過程中行為回歸]** 舊有規則可能在搬移時改壞 → 先為現有行為補 unit tests，再搬動程式；保留少量 `playRound` smoke tests
- **[沒有 feature test 的編排風險]** 雖然單元測試完整，仍可能漏掉 orchestrator 接線問題 → 保留 `playRound` 的流局/胡牌 smoke tests 與 IPC roundtrip 測試
- **[AI 與 main 依賴新邊界]** 模組搬移可能造成呼叫點一起變動 → 讓 `round.zig` 維持高階入口名稱，減少外部呼叫面積變動
- **[效能不是這次優先]** 例如 `tileById()` 仍可能沿用現有 catalog 查找方式 → 此 change 以可測與可維護優先，效能微調留待後續再處理

## Migration Plan

1. 先為現有 `round.zig` 的合法動作、狀態轉移與搶牌邏輯補齊或搬移單元測試，建立重構護欄
2. 新增 turn engine 子模組，先搬出合法動作判定，再搬出狀態轉移，最後搬出搶牌仲裁
3. 讓 `round.zig` 改為呼叫新模組，保留既有公開入口與外部協定
4. 整理舊 helper 與重複測試，只保留 orchestrator 需要的最小 smoke tests

若中途發現行為回歸且無法快速修正，回退策略為保留新測試、暫時恢復 `round.zig` 舊流程，分批重新搬移模組。

## Open Questions

- `turn engine` 新模組是否採 `core/src/game/` 平鋪檔名，或建立 `core/src/game/turn/` 子目錄；實作時以最少 import churn 為優先
- `claims` outcome struct 的欄位是否需要直接表達「需補摸」與「下一位 current_player」，避免 orchestrator 重新推理
