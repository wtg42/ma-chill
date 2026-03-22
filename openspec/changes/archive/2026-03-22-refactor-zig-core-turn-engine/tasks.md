## 1. 建立重構護欄

- [x] 1.1 盤點 `core/src/game/round.zig` 現有測試，補齊合法動作、狀態轉移與搶牌仲裁的 unit test 缺口
- [x] 1.2 讓新增測試以 `GameState` 與 `tile_id` 直接驗證行為，不依賴完整牌局或 TUI 整合流程
- [x] 1.3 確認保留最少量的 `playRound` smoke tests，作為後續 orchestrator 重構的安全網

## 2. 拆出合法動作判定模組

- [x] 2.1 新增 turn engine 合法動作判定模組，搬出 `availableActionsForPlayer` 與必要 helper
- [x] 2.2 調整 `round.zig` 使用新模組計算自摸回合與他家棄牌回應的合法動作
- [x] 2.3 將合法動作相關 unit tests 佈署到新模組旁，確認既有 `turn_changed` 行為不變

## 3. 拆出狀態轉移模組

- [x] 3.1 新增狀態轉移模組，搬出摸牌、棄牌、暗槓、吃牌、碰牌與明槓邏輯
- [x] 3.2 統一 transition API 以 `*state.GameState` 與 `tile_id` 為輸入，整理共用 helper
- [x] 3.3 補強 transition unit tests，驗證 hand、discards、melds、`drawn_tile_id` 與 `current_player_id` 更新正確

## 4. 拆出搶牌仲裁模組並收斂 orchestrator

- [x] 4.1 新增搶牌仲裁模組，搬出 claim priority、all-pass 與結構化 outcome 計算
- [x] 4.2 調整 `playRound` 只保留 driver 互動、流程排序與訊息推送，依仲裁 outcome 決定後續流程
- [x] 4.3 補齊搶牌仲裁 unit tests，並保留流局/胡牌 smoke tests 驗證 orchestrator 仍可運作

## 5. 整理相依模組與測試入口

- [x] 5.1 更新 `core/src/root.zig`、`core/src/main.zig`、`core/src/ai/agent.zig` 等呼叫點以配合新模組邊界
- [x] 5.2 移除 `round.zig` 中已過時的內嵌 helper 與重複測試，保留高階入口與必要 facade
- [x] 5.3 執行 `zig build test`，修正回歸直到所有 core unit tests 通過
