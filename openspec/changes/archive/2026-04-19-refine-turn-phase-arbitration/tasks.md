## 1. 協定與資料模型

- [x] 1.1 更新 `core/src/ipc/protocol.zig` 與 TUI 對應型別，讓 `turn_changed` 攜帶 `phase_kind`、棄牌上下文與吃牌選項資料
- [x] 1.2 更新 `player_action` 資料模型，讓 `chi` 可回傳被選擇的具體組合，並限制 `pass` 僅在棄牌反應窗使用
- [x] 1.3 補齊協定序列化 / 反序列化測試，覆蓋 `self_turn`、`discard_reaction` 與多組吃牌選項情境

## 2. Zig 回合引擎與仲裁流程

- [x] 2.1 重構 `core/src/game/round.zig`，將主流程拆成 `self-turn` 與 `discard-reaction` 兩類 phase family
- [x] 2.2 重寫 claim resolution 流程，實作「胡牌最高優先、同層玩家先於 AI、玩家 pass 後 AI 補位」的產品仲裁規則
- [x] 2.3 調整 `action_availability.zig`、`claims.zig` 與 `transitions.zig`，讓吃牌可產生具體可選組合並依 phase 計算合法動作
- [x] 2.4 修正 `turn_count` / `any_claims_made` 更新時機，並補齊對應單元測試

## 3. TUI state 與命令層

- [x] 3.1 更新 `tui/src/game-state/index.ts`，保存 `phase_kind`、claim context 與吃牌選項，並調整事件流敘事
- [x] 3.2 更新 command registry / parser，讓 `/chi` 可處理具體選項、`/pass` 僅在 claim window 可用、`/discard` 僅在 `self_turn` 可用
- [x] 3.3 更新狀態列、提示與倒數邏輯，讓玩家可分辨自己回合 prompt 與棄牌反應窗 prompt
- [x] 3.4 補齊 TUI 測試，覆蓋 claim prompt 顯示、玩家 pass 後 AI 補位與多組吃牌指令回饋

## 4. AI pacing 與整體驗證

- [x] 4.1 調整 AI pacing phase，確保玩家反應窗不受 AI delay 阻塞，而 AI-only reaction 仍保留可感知節奏
- [x] 4.2 補齊整合測試，覆蓋玩家與 AI 同時可胡、玩家與 AI 同時可碰、玩家可吃但他家可碰等關鍵仲裁情境
- [x] 4.3 執行 core 與 TUI 測試，確認新 phase-based 流程與 IPC 契約一致
