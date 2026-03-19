## Context

TUI 的鍵盤互動規格（`keyboard-interaction` spec）已完整定義，但實作層面完全斷路：

1. `GameTable.tsx` 用 `onKeyDown` 掛在未設 focus 的 `<box>` 上 → 事件永遠不觸發
2. `sendAction()` 已定義但從未被任何元件 import 或呼叫
3. `DiceLobby.tsx` 直接操作 `process.stdin`，cleanup 時 `pause()` 可能汙染後續 stdin 狀態
4. `pass_timeout_seconds` 從 init 訊息收到但未存入 store，無法實作倒數

OpenTUI 提供 `useKeyboard()` hook（`@opentui/solid`），是全域鍵盤監聽，不依賴元素 focus。

## Goals / Non-Goals

**Goals:**
- 所有 keyboard-interaction spec 中定義的熱鍵可實際運作
- 背景靜默倒數在副露詢問時自動 pass
- DiceLobby 改用 OpenTUI API，消除 stdin 汙染風險

**Non-Goals:**
- 修改任何 Zig core 邏輯
- 修改 IPC protocol
- 重構 UI 佈局或視覺樣式

## Decisions

### D1：使用 `useKeyboard()` 全域 hook，不用元素級 `onKeyDown`

`useKeyboard()` 不需要 focus，所有事件全域可收。麻將遊戲沒有 input/textarea 元件，不會有 focus 衝突。

備選方案：修正 `<box focusable={true} focused={true}>` + `onKeyDown` — 較脆弱，需管理 focus 狀態，且 popup 開關時 focus 可能跑掉。

### D2：獨立 `useGameKeys` hook 檔案

將所有鍵盤邏輯集中在 `tui/src/game-table/useGameKeys.ts`，GameTable 只負責呼叫。

理由：職責分離，GameTable 已 200 行，鍵盤邏輯含 timer 管理再加入會過於肥大。

### D3：鍵盤路由以 `availableActions` 為唯一依據

`c`/`k`/`h` 同時出現在 tile hotkeys 和 action hotkeys，但 Zig 不會同時送 `"discard"` 和 `"chi"` 在同一個 `available_actions`。路由邏輯：

```
if actions 含 claim → c/p/k/h 對應副露動作
if actions 含 discard → a~b 對應手牌棄牌、space 對應摸牌棄牌
```

不需額外模式狀態機。

### D4：pass timer 用 `createEffect` 監聽 `availableActions` 變化

```
createEffect:
  actions 含 claim + pass 且 player_id === 0
    → 啟動 setTimeout(passTimeoutMs)
  actions 變化 / 使用者操作
    → clearTimeout
```

timer 在 hook 內部管理，`onCleanup` 確保元件卸載時清除。

### D5：`passTimeoutSeconds` 存入 game-state store

`applyInit` 時從 `ZigInitMessage.pass_timeout_seconds` 讀取，存為 signal。`useGameKeys` 透過 store 存取。

### D6：DiceLobby 改用 `useKeyboard`

移除 `process.stdin.setRawMode` / `process.stdin.once` / `process.stdin.pause`，改為 `useKeyboard((key) => props.onStart())`。

由於 `useKeyboard` 在元件存活期間持續監聽，且 DiceLobby 收到第一個按鍵後就會被 unmount（phase 切換到 "playing"），行為上等同 `once`。

## Risks / Trade-offs

**[DiceLobby useKeyboard 行為差異]** → DiceLobby 在 lobby 階段，任意按鍵（包含 modifier）都會觸發 onStart。useKeyboard 在 repeat 和 release 事件也會觸發。緩解：過濾只處理 `eventType === "press"`。

**[反斜線 key.name 不確定]** → OpenTUI 文件未明確列出 `\` 的 key.name。需在實作時實測確認，可能是 `"\\"` 或其他值。緩解：實作時先 log key.name，確認後寫死。

**[多個 useKeyboard handler 共存]** → 若 DiceLobby 和 GameTable 同時掛載（不應發生，因為 Show 互斥），兩個 handler 都會收到事件。目前架構用 phase signal 控制 Show，不會共存。
