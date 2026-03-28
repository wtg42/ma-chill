## Context

目前 AI 節奏問題出在 Zig core 的回合驅動是同步一路執行：`playRound()` 送出 `state_update` 與 `turn_changed` 後，`GameDriver.turnDecide()` / `claimDecide()` 會立刻呼叫 `ai.agent.decide()`，因此 TUI 看到的是多個 state change 幾乎同時抵達。若只在 TUI 端延後事件流顯示，局面狀態會先跳、文字才慢慢補上，造成畫面與敘事不同步。

這個改動橫跨 `core/src/main.zig`、`core/src/game/round.zig` 與 AI 邊界，屬於流程編排層的 cross-cutting change。它也需要保留測試與開發時的快速回合，因此設計上必須把「節奏策略」和「實際 sleep 行為」拆開，才能用 TDD 先驗證 phase 順序，再接上真實延遲。

## Goals / Non-Goals

**Goals:**
- 讓 AI 摸牌、思考、打牌與 AI 對 AI claim 反應之間具備可感知節奏，而不是瞬間跑完
- 只在 core 流程上控制 pacing，確保 TUI 收到的狀態與事件敘事保持一致
- 將 pacing 抽象成 phase-based policy，讓不同階段可配置不同延遲區間與 jitter
- 提供 disabled / zero-delay 模式，讓單元測試、整合測試與開發流程可維持快速
- 讓實作能以 TDD 進行：先測 phase 順序與套用條件，再補 pacing 實作

**Non-Goals:**
- 不改變 AI 的出牌策略、胡牌策略或 personality 參數
- 不新增 TUI 假動畫、事件流慢播或額外 IPC 訊息來模擬思考
- 不調整真人玩家輸入流程、命令列互動或既有 auto-pass timeout 規則
- 不引入外部排程框架或背景執行緒

## Decisions

### 決定：在 Zig core 的回合邊界套用 pacing，而不是在 TUI 端延後顯示

AI 節奏的問題源自 core 同步流程過快，因此 pacing 必須發生在 `state_update` / `turn_changed` / action resolve 的實際推進點。這樣可以保證玩家看到的局面切換本身就放慢，而不是只讓事件流晚到。

替代方案是只在 TUI 對 event log 或 turn prompt 做延遲播放，但這會讓局況先更新、敘事後補，造成感知分裂，因此不採用。

### 決定：使用可注入的 pacing controller，讓 phase policy 與 sleep 機制分離

設計上以一個小型 pacing controller / helper 代表「進入某個 phase 時要不要等待」，`playRound()` 與 `GameDriver` 只宣告 phase 邊界，不直接硬寫散落的 `sleep`。實際等待可由 production 實作使用真實時間，測試則用 no-op 或 recording double 驗證呼叫順序。

替代方案是直接在 `turnDecide()`、`claimDecide()` 或 `playRound()` 內嵌固定 sleep；這雖然最快，但很難做 deterministic test，也不利於後續微調不同 phase 的節奏，因此不採用。

### 決定：以 phase-based policy 定義節奏，而不是單一固定延遲

至少拆成以下幾類 phase：AI 摸牌揭露後、AI 可行動提示後、AI action 生效後、AI claim 反應前後。每個 phase 使用獨立延遲區間，並允許少量 jitter，避免三家 AI 連續行動時像固定節拍器。

替代方案是只在 AI 出牌前加一個固定延遲；這只能放慢其中一段，仍無法解決 AI 摸牌、AI 連續 claim 與下一家瞬間接手的問題，因此不採用。

### 決定：只對 AI 驅動的等待點套用 pacing，真人 prompt 維持即時

當 `turn_changed.player_id == 0` 或 claim phase 需要真人玩家回應時，不額外插入人工延遲，避免玩家在可操作前被迫等待。AI 與 AI 之間的 discard / claim / next-turn 交接則依 phase policy 套用 pacing。

替代方案是無差別對所有 turn prompt 都加 delay；這會直接增加真人操作延遲，與需求相反，因此不採用。

### 決定：預設提供可關閉的 pacing profile，測試以 TDD 先建立 phase 驗證

預設 profile 服務正式遊玩體驗；測試與開發可使用 off profile 或 zero-delay implementation。TDD 順序上先建立 phase hook 與 profile 套用條件的測試，再補 production pacing 實作與實際時間等待。

## Risks / Trade-offs

- **延遲累積造成對局變慢** → 將預設延遲維持在短區間，並允許 off profile 供測試與開發使用
- **blocking sleep 讓測試不穩定或過慢** → 將等待抽象化，測試使用 no-op / recording controller，不依賴真實時間
- **claim phase 節奏不一致** → 在 spec 中明確要求 AI 對 AI claim 也需 pacing，避免只放慢一般出牌流程
- **phase 散落於多個函式造成維護負擔** → 以集中 helper 管理 phase 名稱與 policy，避免魔法數字分散在流程中
