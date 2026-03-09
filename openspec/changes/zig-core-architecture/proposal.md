## Why

UI 層（TUI）已完成基礎佈局，但 Zig core 目前完全空白。沒有 core 就無法驅動真實遊戲邏輯，目前所有畫面都靠 fake-data 支撐。現在是確立 Zig core 架構的時機，讓後續開發有明確的模組邊界與協議規範。

## What Changes

- 新增 Zig core 模組架構（`core/src/` 下的多個子模組）
- 定義 UDS（Unix Domain Socket）+ JSONL 雙向通訊協議
- 定義 144 張牌的唯一 ID 系統與 tile catalog
- 實作遊戲主循環：Zig server 啟動 → spawn TUI → 全量狀態推送
- 設計 AI 決策系統，支援個性參數與情境感知
- 定義安全牌分析模組（`rules/safety`），供 AI 查詢危險牌

## Capabilities

### New Capabilities

- `tile-system`：144 張牌的唯一 ID 編碼、tile catalog 資料結構，以及 suit/rank 解碼規則
- `game-state`：完整牌局狀態結構（玩家手牌、副露、棄牌堆、牌山、局風）與全量 snapshot 序列化
- `ipc-protocol`：UDS + JSONL 通訊協議，定義所有 Zig↔TUI 訊息型別（init、state_update、turn_changed、player_action 等）
- `game-round`：局的生命週期（發牌、回合推進、換局、結算）與台灣麻將規則（吃/碰/槓/胡合法性判定、計番）
- `ai-agent`：AI 決策系統，支援個性參數（aggression、meld_tendency、defense、score_sensitive、wall_sensitive）與情境感知策略

### Modified Capabilities

（無，core 為全新開發）

## Impact

- `core/src/`：全新建立，從空白 scaffold 開始
- `tui/src/`：後續需配合 IPC 協議接收真實 game state，取代目前 fake-data
- 橋接方式確定為 UDS 優先（已記錄於記憶），此 change 將協議細節正式規格化
