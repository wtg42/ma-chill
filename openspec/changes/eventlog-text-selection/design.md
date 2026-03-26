## Context

目前 TUI 使用 OpenTUI 的 `useMouse: true` 搭配 ScrollBox 做事件流滾動，但未啟用文字選取功能。OpenTUI 已內建完整的 selection 系統（`TextBufferRenderable.selectable`、`useSelectionHandler`、`Clipboard.copyToClipboardOSC52`），只需接上即可。

EventLog 內的 `<text>` 元件基於 `TextRenderable`（繼承 `TextBufferRenderable`），天然支援 selectable。

## Goals / Non-Goals

**Goals:**
- 讓 EventLog 文字可被滑鼠拖選並自動複製到系統剪貼簿
- 支援 SSH / tmux / remote session 場景（OSC 52 優先）
- 支援主流平台的 OS 層級剪貼簿 fallback
- 選取操作不干擾既有的 ScrollBox 滾動與遊戲互動

**Non-Goals:**
- 不全域開啟 selectable（僅 EventLog）
- 不自訂 selection 顏色（使用 OpenTUI 預設反白）
- 不實作鍵盤驅動的 selection（如 Shift+方向鍵選取）
- 不實作從剪貼簿貼入的功能

## Decisions

### D1: Copy-on-select 為預設觸發方式

**選擇**: 滑鼠放開且有 selection 時自動複製到剪貼簿，Ctrl+C 作為備援。

**替代方案**: 僅支援 Ctrl+C 手動複製。

**理由**: EventLog 為唯讀區域，copy-on-select 最符合終端機使用者的直覺。OpenCode 也採用相同預設。Ctrl+C 保留給鍵盤族與 OSC 52 失敗時的備援路徑。

### D2: 雙層 Clipboard 策略，OSC 52 優先

**選擇**: 先嘗試 OSC 52，失敗再 fallback 到 OS 工具。

**替代方案 A**: 只用 OSC 52。
**替代方案 B**: 只用 OS 工具。
**替代方案 C**: 兩者都送（並行）。

**理由**: OSC 52 是唯一能在 SSH/tmux remote session 中正確複製到本地終端機剪貼簿的方式。但部分舊終端不支援 OSC 52，需要 OS 工具 fallback。不採用並行方式，因為 remote session 下 OS 工具會錯誤複製到遠端機器。

### D3: OS Fallback 偵測順序

```
isTTY?
  ├─ yes → OSC 52
  └─ (fallback)
       ├─ $WAYLAND_DISPLAY → wl-copy
       ├─ $DISPLAY → xclip -selection clipboard (fallback: xsel -bi)
       ├─ darwin → pbcopy
       └─ WSL/Windows → clip.exe
```

**理由**: 先判斷 TTY 確保 remote session 走 OSC 52。Linux 下先查 Wayland 再查 X11，避免在 Wayland session 下錯誤使用 X11 工具。

### D4: Selection 期間吞掉 click action

**選擇**: 當 `selection.isActive` 且有選取文字時，mouseUp 不觸發 row click 或遊戲 action。

**理由**: 拖選文字結束的 mouseUp 與 row click 是同一個事件。若不攔截，每次拖選都會附帶觸發非預期操作。

### D5: Clipboard utility 為獨立模組

**選擇**: 新建 `tui/src/clipboard.ts`，封裝 OSC 52 + OS fallback 邏輯。

**理由**: Clipboard 策略與 EventLog 無關，獨立模組方便未來其他元件（如 GameInfoPopup）複用，也方便單獨測試。

### D6: Selection handler 掛在 App 層級

**選擇**: 在 App 或 GameTable 層級使用 `useSelectionHandler`，而不是 EventLog 內部。

**理由**: `useSelectionHandler` 監聽 renderer 全域的 selection 事件。即使目前只有 EventLog 是 selectable，handler 放在上層可以自然擴展到未來其他 selectable 區域，不需要每個元件各自註冊。

## Risks / Trade-offs

- **OSC 52 支援度不一致** → 先嘗試 OSC 52，失敗不 throw，靜默 fallback 到 OS 工具。如果兩者都失敗，在 EventLog 顯示一次性提示。
- **OS 工具不存在** → spawn 失敗時 catch error，繼續嘗試下一個工具。所有工具都失敗時靜默忽略（不阻塞使用者操作）。
- **ScrollBox auto-scroll 與 selection 拖曳衝突** → OpenTUI ScrollBox 已內建 selection 拖曳時的 auto-scroll 邊緣偵測，無需額外處理。
- **大量文字選取的效能** → `getSelectedText()` 需遍歷選取範圍內的 renderable。EventLog 條目數量有限，不預期成為瓶頸。
