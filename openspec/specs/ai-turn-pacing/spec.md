## Purpose

定義 AI 回合與 AI 反應鏈中的節奏控制規則，確保玩家能以可感知的步調理解局勢變化，並支援可關閉的快速模式。

## Requirements

### Requirement: AI 回合必須以可感知節奏推進
系統 SHALL 在 AI 玩家驅動的回合流程中插入人工節奏停頓，讓玩家能依序感知「摸牌結果已顯示」、「輪到該 AI 行動」、「AI 已選擇並執行動作」等階段。這些停頓 MUST 發生在 Zig core 的實際流程推進點，而不是僅在 TUI 延後顯示事件文字。

#### Scenario: AI 摸牌後不會立刻出牌
- **WHEN** AI 玩家完成摸牌，且 `state_update` 已送出到 TUI
- **THEN** 系統在進入該 AI 的下一個決策步驟前 MUST 插入一段 pacing 停頓，使玩家可先看見摸牌結果

#### Scenario: AI 出牌前保留可感知思考時間
- **WHEN** Zig core 已送出 AI 玩家的 `turn_changed`，且下一步將由 AI 自動決策
- **THEN** 系統 MUST 在真正執行 AI 決策前插入 pacing 停頓，而不得在同一瞬間完成 turn prompt 與出牌

### Requirement: AI 之間的反應鏈也必須遵守節奏控制
系統 SHALL 在 AI 對 AI 的棄牌反應鏈中維持可感知節奏，包括 AI 棄牌後到下一位 AI 摸牌前，以及 AI 可宣告吃、碰、槓、胡時的自動回應流程。若下一個可回應者是真人玩家，系統 MUST 立即提供操作機會，不得因 AI pacing 額外延遲真人 prompt。

#### Scenario: 三家 AI 連續行動時不會瞬間跳到下一家
- **WHEN** AI 玩家棄牌後無人宣告副露，且下一位玩家也是 AI
- **THEN** 系統 MUST 在進入下一位 AI 的摸牌與決策流程前保留 pacing 停頓，使事件流與局況變化可被逐步閱讀

#### Scenario: 真人 claim prompt 不受 AI pacing 阻塞
- **WHEN** 某位 AI 棄牌後，真人玩家擁有可用的 claim action
- **THEN** 系統 MUST 立即送出真人玩家的 `turn_changed`，而不得在真人可操作前再插入人工延遲

### Requirement: 節奏控制必須支援可關閉的快速模式
系統 SHALL 提供可將人工節奏停頓降為零或停用的模式，供測試、自動化與開發使用。在此模式下，流程邊界與 phase 套用規則 MUST 保持一致，但不得引入實際等待時間。

#### Scenario: 測試模式停用人工等待
- **WHEN** 系統以 disabled 或 zero-delay pacing mode 執行 AI 回合流程
- **THEN** AI 仍依相同 phase 順序推進，但所有 pacing 停頓 MUST 不產生可觀察的實際延遲

#### Scenario: 正式模式保留 phase 邊界
- **WHEN** 系統以預設 pacing mode 執行 AI 回合流程
- **THEN** 每個已定義的 AI pacing phase MUST 透過同一套 policy 被一致套用，而不得只有部分 phase 生效
