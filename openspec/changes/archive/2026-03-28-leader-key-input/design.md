## Context

目前底部命令列元件 `CommandInput.tsx` 包含一個永遠 focused 的 `<input>`，導致所有遊戲快捷鍵必須加 Ctrl 修飾鍵（在 `useCommandKeys.ts` 的 `ACCELERATORS` 定義）才能繞過 input 捕捉。這造成：

1. `Ctrl+Space`（切摸牌）與 Linux IME 熱鍵衝突
2. 所有動作需記憶 Ctrl 組合，學習曲線高
3. 介面分散：快捷鍵提示在 `PlayerRow` StatusBar，命令提示在 CommandInput placeholder

設計靈感來自 LazyVim 的 Leader 鍵模式（`<Space>` 開啟 which-key 面板）。

## Goals / Non-Goals

**Goals:**
- 底部列改為模式驅動：NORMAL / LEADER / COMMAND 三態
- Space 作為 Leader 鍵，按下後即時顯示 which-key 面板
- `:` 進入命令輸入模式（等同現在的 CommandInput 行為）
- 所有快捷鍵統一為 `<leader>+<key>`，移除所有 `Ctrl+` 組合
- 移除 PlayerRow StatusBar 快捷鍵提示列（which-key 面板取代）
- 取代 `ctrl-space-discard-drawn` change 的實作

**Non-Goals:**
- 不實作 which-key 層級選單（多層 leader prefix，如 `<leader>g` 開啟 git 子選單）
- 不改變命令解析流程（executeCommand 路徑不動）
- 不改變事件流捲動行為（PageUp/Down/Home/End 維持）
- 不改變 Ctrl+C 文字複製行為（仍在所有模式下有效）
- 不改變 DiceLobby 鍵盤邏輯
- 不改變自動 pass 計時機制

## Decisions

### 決定：三態模式以 local signal 管理

`uiMode: "normal" | "leader" | "command"` 為純 UI 狀態，不進入 `GameStateStore`。由 `GameTable` 或新的 `useInputMode` hook 持有。

理由：模式切換不影響遊戲邏輯，不需跨元件共用，也不需要 Zig core 知曉。

### 決定：Leader 鍵為 Space

Space 在 terminal raw mode 可安全捕捉，與 LazyVim 的直覺一致。在 NORMAL MODE 下沒有 input 焦點，Space 不會被 `<input>` 吃掉。

### 決定：`:` 進入 COMMAND MODE，輸入框加 `/` 前綴提示

`:` 是 vim ex mode 的語義，玩家容易記憶。進入 COMMAND MODE 時底部顯示 `:`+input，Esc 退出並清空輸入（同 vim 行為）。Enter 送出後無論成功失敗都回到 NORMAL MODE。

### 決定：which-key 面板顯示所有 binding，遊戲動作依 availableActions dimmed

顯示所有 binding 提高可探索性（玩家知道未來能做什麼）。用 dimmed 而非隱藏，避免面板佈局跳動。

分兩類：
- **遊戲動作**（d/j/p/k/w/f）：依 `availableActions` 決定是否 dimmed
- **工具查詢**（h/o/s）：永遠亮顯（不依賴遊戲狀態）

### 決定：移除 ACCELERATORS，改為 leaderBindings registry

現有 `ACCELERATORS: Record<string, string>` 只有 key→command 映射，不含 label 和 action。新的 registry 需要 `{ key, label, command, action? }` 結構，action 用於判斷 dimmed 狀態。

### 決定：Ctrl+letter accelerators 全部移除

不保留任何 Ctrl 組合作為 fallback，確保介面行為一致。唯二例外（`Ctrl+C` 文字複製、`PageUp/Down` 事件流導覽）維持不變，因為它們不在 ACCELERATORS 管理範圍內。

### 決定：PlayerRow StatusBar 移除

which-key 面板已統一顯示快捷鍵資訊，PlayerRow 底部的重複提示移除，手牌區佈局更乾淨。

## Risks / Trade-offs

- **Space 在某些情境有特殊語義** → 目前 NORMAL MODE 下沒有任何其他 Space 使用情境，風險極低；若未來加入手牌捲動等功能需重新評估
- **Leader pending 無超時** → 玩家按下 Space 後若不繼續按鍵，系統停在 LEADER MODE；需 Esc 返回。簡單直觀，不設計超時避免意外取消
- **which-key 面板高度** → 目前設計為單列（依終端機寬度）或雙列（若 binding 數量超出），需實測
- **ctrl-space-discard-drawn 的測試需 revert** → 新 change 的 tasks 須包含移除對應測試案例，避免測試衝突
