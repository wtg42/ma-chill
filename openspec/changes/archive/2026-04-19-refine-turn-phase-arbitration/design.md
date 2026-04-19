## Context

目前 `playRound` 以單一線性 loop 驅動整局：摸牌、送出 `turn_changed`、取得 action、若棄牌則逐家詢問 claim，最後再做仲裁。這個做法足以支撐基本遊戲流程，但有三個核心限制：

- 它沒有把「自己回合」與「棄牌反應窗」視為不同 phase，導致同一個 `turn_changed` 同時承載主動回合與被動反應兩種語義。
- claim 互動目前偏向技術實作順序，而不是產品仲裁規則；玩家優先與 AI 補位只存在口頭共識，尚未進入明確模型。
- `chi`、`kong`、`pass` 等動作缺少足夠上下文，導致 IPC 契約難以擴充，也讓 TUI 無法精準提示玩家現在正在回應哪一張棄牌、有哪些具體可選組合。

這次 change 需要先把 phase 與 arbitration 模型釐清，後續實作才能在不反覆翻修協定的前提下補上吃牌選項、倒數自動 pass、AI 反應與更完整規則。

## Goals / Non-Goals

**Goals:**

- 將回合模型拆成 `self-turn` 與 `discard-reaction` 兩類 phase family，讓規格與實作可以明確知道目前在處理哪一種互動。
- 明確定義產品仲裁規則：胡牌永遠最高優先；在同一優先層級內，玩家先於 AI 決策；玩家放棄後，AI 才能補上決策。
- 擴充 IPC / command / TUI state 所需的上下文資料，讓 claim prompt 可攜帶棄牌來源、phase 類型與具體可選吃牌組合。
- 讓 AI pacing 規則與新的 phase family 對齊，保留玩家 prompt 的即時性，同時維持 AI 回應的可感知節奏。

**Non-Goals:**

- 本 change 不直接定義完整台麻桌規，例如多家同胡、海底撈月、搶槓胡等全部細節。
- 本 change 不重新設計 UI 排版，只調整 UI 可依賴的 state / protocol 語義。
- 本 change 不引入網路多人同步或真人對真人仲裁。

## Decisions

### 決定 1：回合模型拆成兩類 phase family，而不是延續單一 action loop

**選擇**：規格層將回合分為兩大類：

- `self-turn` family：摸牌、檢查自摸 / 暗槓 / 加槓、選擇棄牌。
- `discard-reaction` family：某張棄牌出現後，依優先層級開啟反應窗、處理玩家決策、再處理 AI 補位與仲裁。

這樣可讓主動回合與被動 claim 各自有清楚的上下文與合法動作來源。

**替代方案**：維持單一 loop，僅在註解或文件中補述「現在其實是 claim 階段」。拒絕原因是資料契約與測試仍然無法區分兩種 prompt，問題只會延後爆發。

### 決定 2：棄牌反應採「優先層級」加「玩家先視窗」的產品仲裁

**選擇**：當某張棄牌出現時，系統依下列層級處理：

1. 胡牌層
2. 碰 / 槓層
3. 吃牌層

在每一層內，若玩家具備可行動作，必須先給玩家決策；玩家 pass、逾時或不可行後，AI 才可在該層內做決策。只要任一層已產生結果，後續較低層就不再繼續。

**替代方案**：完全依牌桌規則做同步仲裁，不給玩家優先視窗。拒絕原因是目前產品定位偏單機體驗，若 AI 與玩家完全同時競爭，玩家會經常感到「我還沒反應就被 AI 搶走」。

### 決定 3：胡牌層永遠最高優先，且玩家胡牌可覆蓋 AI 的同張聽牌機會

**選擇**：只要玩家對同一張棄牌可胡，必須先給玩家胡牌視窗；若玩家胡牌，遊戲立即結束，不再詢問 AI。若玩家不胡，才檢查 AI 是否胡牌。

這是一條產品規則，不等同於傳統桌規的多家同胡或座次比較；規格需要明白標記它是單機體驗導向的仲裁。

**替代方案**：實作多家同胡或座次優先。拒絕原因是會顯著擴大本次 scope，且與目前「玩家優先體驗」方向衝突。

### 決定 4：claim prompt 必須攜帶具體上下文，而不是只有 action 名稱

**選擇**：`turn_changed` 需能表達目前是哪一種 phase，若屬於棄牌反應窗，還必須帶出：

- 觸發棄牌的 `discarded_tile_id`
- 棄牌者 `discarder_player_id`
- claim priority layer 或 phase kind
- 若可吃，具體可選吃牌組合

對應地，`player_action` 也必須能回傳被選擇的 claim option，而不是只傳一個模糊的 `chi`。

**替代方案**：維持現在的 `available_actions` 陣列，讓前端自行推導上下文。拒絕原因是前端無法從本地 state 穩定推回所有合法吃牌組合，會造成規則重複實作。

### 決定 5：AI pacing 只作用在 AI 自己的 phase，不得阻塞玩家反應窗

**選擇**：AI 在 `self-turn` 與 AI-only reaction resolution 中保留 pacing；一旦某個 phase 需要玩家輸入，系統必須立刻送出玩家 prompt，不額外插入 AI delay。

**替代方案**：在所有 phase 統一加延遲。拒絕原因是會讓玩家 claim 視窗有不必要等待，體感變差，也讓倒數邏輯難以解釋。

## Risks / Trade-offs

- [產品規則與真實桌規存在落差] → 在 spec 中明確標示「玩家先視窗」是單機產品規則，避免未來誤以為它代表標準桌規。
- [IPC 契約變更面廣] → 先在 spec 定清楚 phase / claim context，讓 Zig 與 TUI 可同步調整，不採局部兼容補丁。
- [吃牌選項資料模型變複雜] → 將 `chi` 視為帶選項的 claim，而不是一般按鈕；複雜度集中在 protocol 與 parser，避免散落在 UI。
- [回合計數與首輪判定可能被既有測試假設綁住] → 直接在 game-round spec 修正 `turn_count` 語義，讓後續測試依 phase 事件更新，而不是依舊 loop 副作用。

## Migration Plan

1. 先更新 OpenSpec delta specs，鎖定 phase、arbitration 與 IPC 契約。
2. Zig core 重構 `playRound` 與 claim resolution，讓 phase family 成為顯式流程。
3. 同步調整 protocol 與 TUI state / command parser，讓新 prompt context 可被完整消化。
4. 以測試覆蓋關鍵情境：玩家與 AI 同層競爭、玩家可胡優先、玩家 pass 後 AI 補位、可選吃牌組合。

## Open Questions

- 是否需要在這一版就區分 `open_kong`、`closed_kong`、`added_kong` 三種 player_action，還是先保留單一 `kong` 並僅在 claim context 補充來源。
- 玩家 claim 視窗的逾時行為是否一律視為 `pass`，以及倒數顯示是否要進一步暴露剩餘秒數到事件流。
