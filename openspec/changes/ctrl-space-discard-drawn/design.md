## Context

目前 `useGameKeys.ts` 定義了 `Space` 作為「切摸牌」快捷鍵，但此檔案從未被任何元件 import 或呼叫（dead code）。即使被呼叫，`CommandInput` 的 `<input focused={true}>` 會在所有 `useKeyboard` hook 之前捕捉 Space 事件，導致快捷鍵永遠無效。

實際的快捷鍵入口在 `useCommandKeys.ts`，它定義了 `ACCELERATORS: Record<string, string>` 映射 `Ctrl+<key>` 到 slash 指令，並透過 `executeCommand()` 走完整的命令層流程。

## Goals / Non-Goals

**Goals:**
- 新增 `Ctrl+Space` → `/discard drawn` 至 `ACCELERATORS`
- 清除 `useGameKeys.ts` 中已死的 Space 邏輯
- 更新 `PlayerRow` StatusBar hint 顯示正確按鍵
- 更新 keyboard-interaction spec

**Non-Goals:**
- 不重構 `useGameKeys.ts` 其他部分（tile position hotkeys 為獨立問題）
- 不改變命令列焦點邏輯
- 不新增 `/discard drawn` 指令本身（已存在）

## Decisions

### 決定：使用 `Ctrl+Space` 而非 `Ctrl+d`

`Ctrl+d` 語義上是 "discard"，但在部分 terminal 設定下是 EOF 訊號，存在副作用風險。`Ctrl+Space` 語義直覺（原本就是 Space，加 Ctrl 規避輸入衝突），且 terminal raw mode 下可安全捕捉。

### 決定：加在 `useCommandKeys.ts` 而非新增處理路徑

現有 `ACCELERATORS` 的 `Ctrl+<key>` 模式天然支援 `Ctrl+Space`（key name 為 `space`）。沿用此路徑可確保 `Ctrl+Space` 走完整 command registry → normalization → execute 流程，符合 keyboard-interaction spec 的要求。

### 決定：移除 `useGameKeys.ts` 的 Space dead code

保留 dead code 會造成誤導（PlayerRow StatusBar 還在顯示 `space=切摸牌`）。此次一併清除，避免未來混淆。`useGameKeys.ts` 的其他 tile hotkey 邏輯同樣是 dead code，但屬於另一個問題，不在本次範圍內。

## Risks / Trade-offs

- **`Ctrl+Space` 在某些 terminal 無法捕捉** → 啟動時若 OpenTUI 無法接收此事件會靜默失效，可在 `/help` 輸出中標注
- **移除 dead code 可能掩蓋未來計畫** → `useGameKeys.ts` 的 tile hotkey 系統若有重啟計畫應先確認，本次僅移除 Space 相關片段
