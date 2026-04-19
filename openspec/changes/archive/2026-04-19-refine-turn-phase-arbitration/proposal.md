## Why

目前麻將回合流程雖然可運作，但仍偏向 MVP 時期的線性 action loop：當前玩家摸牌、出牌後，再逐家詢問是否吃碰槓胡。這種模型不足以表達麻將中「自己回合」與「棄牌反應窗」的不同語義，也無法清楚承載玩家優先處理競爭動作、但胡牌永遠最高優先的產品規則。

隨著後續要補強吃牌選項、倒數自動 pass、AI 反應節奏與更完整的規則仲裁，現在需要先把回合 phase 與 claim arbitration 模型收斂，避免之後每增加一種互動都只能硬塞進既有 loop。

## What Changes

- 將單一線性回合流程重構為兩類 phase family：玩家自己的回合處理，以及棄牌後的反應窗處理。
- 明確定義棄牌後的產品仲裁規則：胡牌永遠最高優先；在同一個優先層內，玩家先於 AI 做決策；玩家放棄後才交由 AI 處理。
- 補強 claim 相關資料模型，讓吃牌不再只是單一 `chi` 動作，而能表示具體可選組合與反應上下文。
- 擴充 IPC / TUI 所需的 prompt context，讓前端能分辨目前是自己回合還是棄牌反應窗，並正確顯示可用操作與倒數。
- 調整回合計數與反應事件語義，讓首輪狀態、反應窗與後續規則擴充有一致基礎。

## Capabilities

### New Capabilities

- 無

### Modified Capabilities

- `game-round`: 回合推進模型改為 phase-based，並新增玩家優先的棄牌反應仲裁規則。
- `ipc-protocol`: `turn_changed` 與 `player_action` 需攜帶更完整的 phase / claim context。
- `tui-game-state`: TUI state 需辨識不同 prompt phase，並根據 claim context 派生可用提示與事件流敘事。
- `shell-command-interface`: 命令層需支援 claim window 中的具體選項，特別是可選吃牌組合與 pass 決策。
- `ai-turn-pacing`: AI 在棄牌反應鏈中的節奏需配合新的 phase 模型與玩家優先視窗。

## Impact

- 受影響 Zig core：`core/src/game/round.zig`、`claims.zig`、`transitions.zig`、`action_availability.zig`、AI 決策與 pacing 相關模組。
- 受影響 IPC：`core/src/ipc/protocol.zig` 與 TUI 對應訊息型別。
- 受影響 TUI：`tui/src/game-state/index.ts`、commands registry / parser、claim 相關提示與倒數流程。
- 這是行為層級變更，會改動現有測試假設與前後端對 `turn_changed`、`player_action` 的資料契約。
