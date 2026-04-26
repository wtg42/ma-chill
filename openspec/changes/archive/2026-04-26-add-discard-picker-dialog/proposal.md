## Why

目前玩家在自己回合若要精準棄掉某張手牌，主要仍依賴命令列輸入 `/discard 7p` 這類文字指令。這種流程雖然可用，但會要求玩家先把視覺牌面轉成 token，操作成本偏高，也讓 `<leader>+d` 只能綁成「打摸牌」這種過度狹窄的捷徑。

現在正是補上專用棄牌互動的好時機。專案已經有 leader mode、popup 元件與手牌資料模型，適合把「棄牌」升級成更直接的遊戲操作，而不是繼續把它侷限在 shell 式輸入。

## What Changes

- 新增一個由 `<leader>+d` 開啟的棄牌 dialog，專門顯示玩家自己的手牌與摸到的牌。
- 在棄牌 dialog 中提供方向鍵移動焦點、Enter 確認棄牌、Esc 取消，讓玩家直接選牌而不是手打 token。
- 將底部 leader 綁定中的 `d` 從「直接執行 `/discard drawn`」改為「開啟棄牌 dialog」。
- 在玩家手牌相關顯示中加入簡短 label（如 `7p`、`east`）作為辨識輔助，讓視覺表示與命令列 token 保持一致。
- 保留既有 `/discard <tile|drawn|tile_id>` 命令作為 fallback，不移除 command-first 操作能力。

## Capabilities

### New Capabilities
- `discard-picker-dialog`: 定義玩家在自己回合開啟棄牌 dialog、瀏覽可棄牌項目、確認或取消棄牌的互動行為與顯示規則。

### Modified Capabilities
- `keyboard-interaction`: 調整 leader 快捷鍵與方向鍵輸入規則，納入棄牌 dialog 的開啟、導覽、確認與取消行為。
- `leader-key-mode`: 調整 `<leader>+d` 的語義，從直接執行固定命令改為進入棄牌專用互動模式。

## Impact

- 受影響模組：
  - `tui/src/game-table/useCommandKeys.ts`
  - `tui/src/game-table/CommandInput.tsx`
  - `tui/src/game-table/` 內新的 discard dialog / 焦點導覽元件
  - `tui/src/commands/execute.ts`
  - `tui/src/game-state/hand-summary.ts` 或玩家手牌顯示元件
- 受影響系統：
  - TUI 本地輸入模式管理
  - 玩家自己回合的棄牌操作流程
  - leader 快捷鍵呈現與說明文字
- 不預期變更 Zig IPC 契約；棄牌送出仍沿用既有 `discard` action。
