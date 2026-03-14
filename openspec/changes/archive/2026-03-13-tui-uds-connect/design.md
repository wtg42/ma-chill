## Context

TUI 目前以 `fake-data.ts` 靜態資料驅動，`GameTable` 直接 import 並渲染。Zig core 已完成 UDS server 端（`zig-uds-server` change），可以接受連線、推送 `init`/`state_update`/`turn_changed` 訊息，並等待 `player_action` 回應。

此 change 的目標是讓 TUI 從 UDS 接收真實遊戲狀態，並將玩家操作送回 Zig。

## Goals / Non-Goals

**Goals:**
- TUI 連上 UDS，正確解析 `init`、`state_update`、`turn_changed`
- 以 SolidJS signal 管理遊戲狀態，UI 響應式更新
- 玩家操作（棄牌等）透過 UDS 送出 `player_action`
- 連線失敗時顯示錯誤提示

**Non-Goals:**
- pass 倒數計時 UI（後續 change）
- 副露選牌 UI（chi 時選哪張）
- game_over 結局畫面

## Decisions

### 1. UDS 連線位置：獨立的 `connection.ts`

連線邏輯獨立於 UI 元件之外，在 `index.tsx` 啟動時初始化，透過 props/context 傳入元件。

**理由**：連線是 side effect，不屬於任何 UI 元件的職責；獨立後也方便測試與替換。

### 2. 狀態管理：`useGameState()` hook + SolidJS signal

抽出 `tui/src/game-state/index.ts`，內含：
- `gameState` signal（儲存最新 GameState）
- `availableActions` signal
- `tileCatalog` Map（id → CanonicalTile，收到 `init` 後建立）
- `sendAction(action)` 函式（送 player_action 給 Zig）

**理由**：集中管理狀態，GameTable 只負責渲染，不處理 UDS 邏輯。

### 3. tile_id ↔ CanonicalTile 對應：前端自建 Map

收到 `init` 的 `tile_catalog`（含 id/suit/rank）後，建立 `Map<number, CanonicalTile>`，查本地 `buildTaiwanMahjongCatalog()` 取得渲染用型別。`copy_index` 忽略不用。

**理由**：渲染不需要區分同種牌的不同張，本地 catalog 已有完整型別定義。

### 4. 手牌資料結構：`{ id: number, tile: CanonicalTile }[]`

不能只存 CanonicalTile，因為打牌時需要送正確的 tile_id 回 Zig（同種牌有 4 張，id 不同）。

### 5. 連線失敗處理：顯示靜態錯誤畫面

若 UDS 連線失敗（socket 不存在、被拒絕），TUI 顯示「無法連線至遊戲核心」並退出。不做重試。

**理由**：Zig core 應在 TUI spawn 前就已監聽；若連線失敗代表系統狀態異常，重試無意義。

## Risks / Trade-offs

- **Zig rank 格式為 string（`"three"`）**，本地 catalog 用 number（`3`）→ 需要轉換 map。建一個 `RANK_MAP: Record<string, number>` 即可。
- **連線中斷後 UI 凍結** → 目前不處理，遊戲結束由 `game_over` 訊息觸發正常退出。
