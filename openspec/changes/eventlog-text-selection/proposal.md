## Why

EventLog 是玩家最常需要複製文字的區域（牌譜、事件紀錄），但目前 `useMouse: true` 只用於 ScrollBox 滾動，文字無法拖選複製。需要接上 OpenTUI 內建的 selection 機制與 clipboard pipeline，讓玩家可以直接拖選 EventLog 文字並複製到系統剪貼簿。

## What Changes

- 啟用 EventLog 內 `<text>` 元件的 selectable 屬性，讓文字可被滑鼠拖選
- 實作 copy-on-select 行為：滑鼠放開時自動複製選取文字到剪貼簿
- 保留 Ctrl+C 作為手動複製備援（有 selection 時複製文字，無 selection 時維持原行為）
- 實作雙層 clipboard 策略：OSC 52 優先（支援 SSH/tmux），OS 工具 fallback（wl-copy、xclip、pbcopy、clip.exe）
- 選取進行中吞掉 row click / action，避免拖選結束同時觸發非預期操作
- 選取視覺使用 OpenTUI 預設反白樣式，不自訂顏色

## Capabilities

### New Capabilities
- `text-selection`: EventLog 文字拖選與 copy-on-select 行為，包含 selection 事件處理與 click 抑制邏輯
- `clipboard-pipeline`: 雙層剪貼簿策略（OSC 52 優先 → OS 工具 fallback），涵蓋跨平台與遠端 session 場景

### Modified Capabilities
- `keyboard-interaction`: 新增 Ctrl+C 在有 selection 時作為手動複製的行為定義

## Impact

- `tui/src/game-table/EventLog.tsx` — 加入 selectable 屬性與 selection handler
- `tui/src/` — 新增 clipboard utility 模組
- `tui/src/game-table/` 或 App 層級 — 接 `useSelectionHandler` hook
- 不影響 Zig core、IPC 協議、或其他 UI 元件
