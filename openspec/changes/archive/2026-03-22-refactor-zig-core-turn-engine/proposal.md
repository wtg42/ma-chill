## Why

`core/src/game/round.zig` 目前同時承擔回合編排、合法動作判定、狀態轉移、搶牌仲裁與訊息推送，導致 Zig core 難以用單元測試穩定驗證。接下來要先重構 core、後續才重構畫面，因此需要先把 turn engine 拆成可測、可推理的模組邊界。

## What Changes

- 將 Zig turn engine 從單一大型回合流程拆成獨立的合法動作判定、狀態轉移與搶牌仲裁模組
- 保留既有外部行為與 IPC 協定，不在此 change 內重做 TUI 或改變互動模式
- 以 TDD 補齊 turn engine 關鍵單元測試，驗證規則與狀態轉移，而非新增整局 feature test
- 讓 `playRound` 收斂為 orchestrator，主要負責 driver 互動、訊息推送與流程串接

## Capabilities

### New Capabilities

- `turn-engine-modularity`: 定義 Zig core turn engine 的模組邊界、可測試入口與 orchestration 責任分離

### Modified Capabilities

（無，本 change 以內部重構與測試性提升為主，不改變既有玩家可觀察規格）

## Impact

- `core/src/game/round.zig`：從混合職責的主流程重構為 orchestrator
- `core/src/game/`：預期新增或拆出 turn engine 相關模組（如合法動作判定、狀態轉移、搶牌仲裁）
- `core/src/ai/agent.zig` 與 `core/src/main.zig`：需配合新的 turn engine 邊界，但不改變對外行為
- `core` 測試：新增與擴充 Zig unit tests，採用標準函式庫與 master 版本 Zig 開發
