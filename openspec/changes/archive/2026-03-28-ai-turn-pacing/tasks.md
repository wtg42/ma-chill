## 1. 先建立 TDD 測試邊界

- [x] 1.1 在 `core/src/game/round.zig` 或對應測試檔新增 pacing phase 順序測試，先驗證 AI 摸牌後、`turn_changed` 後、AI action 生效後都會觸發預期的 phase hook
- [x] 1.2 新增真人玩家 turn / claim prompt 不受 pacing 延遲的測試，確認 `player_id == 0` 時仍會立即進入可操作狀態
- [x] 1.3 新增 disabled / zero-delay mode 測試，確認 phase 仍會被走到，但不依賴真實等待時間

## 2. 實作 pacing policy 與注入點

- [x] 2.1 在 `core/src/ai/` 或合適模組新增 pacing controller / policy 抽象，集中定義 phase 類型、profile 與等待介面
- [x] 2.2 將 AI turn 決策路徑接入 pacing：在 AI 摸牌後、AI `turn_changed` 後與 AI action resolve 後套用對應 phase 延遲
- [x] 2.3 將 AI claim 反應鏈接入 pacing，確保 AI 對 AI 的 claim / pass / next-turn 交接具備可感知節奏，同時保留真人 claim prompt 即時性

## 3. 收斂預設行為並完成驗證

- [x] 3.1 加入預設 profile 與 off profile 的組態入口，讓正式遊玩使用 pacing、測試與開發可停用 pacing
- [x] 3.2 補上回歸測試，確認 pacing 不改變合法動作判定、AI 決策結果或既有 auto-pass 規則
- [x] 3.3 執行相關 Zig / TUI 測試並調整預設延遲區間，確認三家 AI 連續行動時節奏可感知但不拖沓
