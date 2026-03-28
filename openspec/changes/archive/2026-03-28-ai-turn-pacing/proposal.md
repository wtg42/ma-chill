## Why

目前 AI 玩家在摸牌、思考、打牌與搶牌判定之間幾乎沒有停頓，三家 AI 連續行動時會在事件流與局況上瞬間跳完，讓玩家難以跟上每一步。這個改動要把 AI 回合節奏從「同步瞬間完成」調整成「可感知、可閱讀、仍維持流暢」的 pace，讓對局觀感更像在看真實對手行動。

## What Changes

- 新增 AI 回合節奏控制，讓 AI 在摸牌顯示後、出牌前、出牌後與搶牌判定前後有短暫延遲
- 只對 AI 玩家套用 pacing；真人玩家輸入與既有 auto-pass 行為維持即時
- 將 pacing 設計成 phase-based policy，而不是單一固定 sleep，讓不同回合階段可有不同延遲區間與少量隨機抖動
- 提供可關閉或降速的模式，避免測試、開發與除錯流程被人為延遲拖慢
- 補上對應規格與任務，明確要求以 TDD 方式先建立節奏邊界測試，再實作 pacing 行為

## Capabilities

### New Capabilities
- `ai-turn-pacing`: 定義 AI 回合在不同 phase 的節奏延遲、適用範圍、測試模式例外與玩家可感知的行為邊界

### Modified Capabilities
<!-- 無 -->

## Impact

- `core/src/main.zig`：AI 回合與 claim 決策入口將接入 pacing 控制
- `core/src/game/round.zig`：回合流程需在 state update、turn prompt、discard、claim resolution 等 phase 間套用節奏策略
- `core/src/ai/`：可能新增 pacing helper 或 policy 模組，集中管理延遲規則與測試覆寫
- 核心測試：需補上 phase 順序、AI-only 套用與 disabled mode 的測試案例
- OpenSpec specs：新增 `openspec/changes/ai-turn-pacing/specs/ai-turn-pacing/spec.md`
