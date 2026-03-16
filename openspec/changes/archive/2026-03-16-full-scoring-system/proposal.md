## Why

目前計番系統只有 `self_draw` 和 `pinfu`（平胡，台灣規則不適用），無法反映台灣麻將的完整台數計算。玩家需要知道自己贏了幾台、哪些牌型成立，這是麻將遊戲的核心體驗。需移除平胡、新增所有台灣麻將常見牌型、並整合花牌與特殊胡法的計番。

## What Changes

- **BREAKING** 移除 `pinfu`（平胡）scoring pattern，台灣規則不適用
- 擴充 `ScoringPattern` 為完整台灣麻將台數列表（17 種牌型）
- 重寫 `WinContext`，納入座位風、圈風、花牌、門清狀態、首輪資訊等
- `ScoreResult` 改為動態 line 數量（最多可同時命中多種牌型）
- 新增牌型判定函數：對對胡、三元、四喜、清一色、字一色等
- 新增特殊胡法判定：天胡、地胡、人胡
- 新增花牌計番：自己的花 1 台/張、八仙過海 8 台
- `game_over` 訊息包含計番明細（ScoreResult），TUI 可顯示贏牌資訊

## Capabilities

### New Capabilities
- `taiwan-scoring-rules`: 台灣麻將完整計番規則定義與牌型判定邏輯
- `game-over-display`: 遊戲結束時顯示胡牌資訊與台數明細（TUI）

### Modified Capabilities
- `game-round`: playRound 結束時呼叫計番並產生含 ScoreResult 的 game_over 訊息
- `ipc-protocol`: `game_over` 訊息新增計番明細欄位

## Impact

- **Zig core**: `rules/scoring.zig`（重寫）、`game/round.zig`（胡牌時呼叫計番）、`ipc/protocol.zig`（game_over 格式）
- **TUI**: 新增 game-over 畫面顯示台數明細
- **依賴**: 需先完成 `seat-wind-system` change（提供座位風資料）
