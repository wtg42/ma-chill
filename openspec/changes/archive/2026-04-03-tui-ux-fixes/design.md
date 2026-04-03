## Context

TUI 層目前有三個小型 UX 問題，均與「顯示正確性」有關，互相獨立：

1. `applyTurnChanged` 對所有玩家（含 AI）都在事件流寫入「可用：/help...」，但這段提示只對人類玩家（`player_id === 0`）有意義。
2. `CommandInput` NORMAL 模式提示列寫了 `{"<SPC>"}` JSX 表達式，OpenTUI text 節點在渲染時將 `<` 和 `>` 轉為 HTML entity，導致畫面顯示 `&lt;SPC&gt;`。
3. 滑鼠選取後 `copyToClipboard` 靜默執行，成功與否完全沒有視覺回饋。

這三個問題不涉及遊戲邏輯或 IPC 協議，改動範圍限於 TUI 層。

## Goals / Non-Goals

**Goals:**
- AI 回合不再寫入指令提示到事件流
- NORMAL 模式提示列正確顯示按鍵標示（無 HTML entity）
- 複製成功後顯示短暫 toast overlay，1.5 秒後自動消失

**Non-Goals:**
- 不修改 Zig core 或 IPC 協議
- 不改動遊戲邏輯、turn 管理或 available_actions 計算
- 不為複製失敗提供詳細診斷（靜默失敗即可）

## Decisions

### 1. AI 回合事件流濾除：以 `player_id === 0` 判斷

`applyTurnChanged` 中，`appendEvent` 的呼叫包在 `if (msg.player_id === 0)` 裡。
`setAvailableActions`、`setCurrentPlayerId`、`setAvailableCommandHints` 仍對所有玩家執行（UI 狀態仍需更新）。

替代方案：在 Zig 側僅對人類玩家送 `turn_changed`。拒絕：Zig core 不應感知 TUI 顯示邏輯，且 AI 的 `turn_changed` 用於更新 `currentPlayerId` 仍有用。

### 2. `<SPC>` 修正：改用 `[SPC]`

將 `{"<SPC>"}` 改為 `[SPC]`（方括號）。方括號在終端機渲染無跳脫問題，且視覺上清晰。
替代方案：用 Unicode `⟨SPC⟩`（數學角括號）。拒絕：部分終端機字型缺這個字符。

### 3. 複製 toast：Solid signal + `position="absolute"` overlay

在 `GameTable` 加入 `createSignal<boolean>` 控制 toast 顯示。`copyToClipboard` 回傳的 Promise resolve 後若成功則 `setToast(true)`，同時 `setTimeout(1500)` 後設回 false。

Toast 使用 `position="absolute"`、`zIndex={100}`，定位在右下角，避開 CommandInput 區域（`bottom` 設為 CommandInput 高度 + margin）。

替代方案：把 toast state 放進 `GameStateStore`。拒絕：toast 是純 UI 暫態，不屬於遊戲狀態。

## Risks / Trade-offs

- **Timer 洩漏**：若元件在 toast 顯示中途被卸載，`setTimeout` 仍會執行。→ 用 `onCleanup` 清除 timer（Solid 生命週期）
- **Toast 定位**：`bottom` 的值需對齊 CommandInput 實際高度（約 4 行）。若 UI 改版調整高度，需同步更新。→ 接受，屬於小型常數，未來調整容易。
- **複製失敗無提示**：失敗情境（`wl-copy` 不存在等）仍靜默。→ 符合 Non-Goals，日後如需錯誤提示可另開 change。
