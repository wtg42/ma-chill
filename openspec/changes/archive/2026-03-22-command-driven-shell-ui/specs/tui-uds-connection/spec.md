## MODIFIED Requirements

### Requirement: 送出 player_action
系統 SHALL 由前端命令層統一送出遊戲動作。TUI 可以提供 `sendAction(action, tileId?)` 或等價函式，但其輸入 MUST 已經是前端完成解析與正規化後的結構化 action；TUI MUST 不將 slash 原文直接寫入 UDS 連線。

#### Scenario: slash 指令轉為 discard 動作
- **WHEN** 玩家在命令列輸入 `/discard 3p` 並完成解析
- **THEN** TUI 送出 `{"type":"player_action","action":"discard","tile_id":<id>}\n`，而不是送出命令字串

#### Scenario: 非遊戲命令不送 player_action
- **WHEN** 玩家執行僅影響本地顯示或查詢的命令
- **THEN** TUI 不寫入任何 `player_action` IPC 訊息

## ADDED Requirements

### Requirement: 命令層與 IPC 層分離
系統 SHALL 將 command parsing 與 IPC transport 視為兩個獨立階段：命令層負責解析 slash 指令與快捷映射，IPC 層只負責傳送已正規化的遊戲動作。

#### Scenario: 命令格式錯誤時不觸發 IPC
- **WHEN** 玩家輸入格式錯誤或缺參數的命令
- **THEN** 系統在命令層回報錯誤，且不建立任何 IPC 寫入
