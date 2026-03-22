## Purpose

定義 shell 主畫面中的命令列互動模型，包含 slash 指令、快捷映射、命令正規化與使用者回饋。

## Requirements

### Requirement: Slash 指令為主要操作入口
系統 SHALL 在主畫面底部提供常駐命令列，玩家可輸入 slash 指令作為主要操作方式。命令列 SHALL 支援顯示 placeholder、目前輸入內容與送出後的執行結果。

#### Scenario: 玩家輸入 slash 指令
- **WHEN** 玩家在命令列輸入 `/discard 5m` 並送出
- **THEN** 前端進入命令解析流程，而不是直接將原始文字寫入 IPC

#### Scenario: 空白輸入不執行
- **WHEN** 玩家送出空字串或僅含空白的內容
- **THEN** 系統不送出任何 IPC 訊息，並在本地提供可理解的回饋

### Requirement: 前端將命令正規化為結構化 action / intent
系統 SHALL 由前端解析 slash 指令並產生結構化 command 物件；若命令屬於遊戲動作，前端 SHALL 再將其轉為結構化 action / intent 後送往 Zig core。Zig core MUST 不需要解析 slash 原文。

#### Scenario: slash 指令轉為 player_action
- **WHEN** 玩家輸入 `/pon`
- **THEN** 前端解析為本地 command，並送出結構化 `player_action`，而不是送出字串 `"/pon"`

#### Scenario: 純本地命令不送往 core
- **WHEN** 玩家輸入僅查詢或僅影響前端顯示的命令
- **THEN** 前端在本地執行該命令，不送出任何遊戲動作 IPC 訊息

### Requirement: 快捷鍵映射到同一套命令系統
系統 SHALL 將通用組合鍵視為 slash 指令的快捷映射。所有快捷鍵執行前 MUST 經過與命令列相同的 command registry / normalization 流程，不得繞過命令層直接送出 IPC。

#### Scenario: 快捷鍵觸發常用命令
- **WHEN** 玩家按下某個已定義的常用組合鍵
- **THEN** 系統將其映射成對應命令語義，再走相同的命令解析與合法性檢查流程

#### Scenario: 不可用動作的快捷鍵被拒絕
- **WHEN** 快捷鍵對應的命令在當前回合不可用
- **THEN** 系統不送出任何動作，並提供本地回饋說明該命令目前不可執行

### Requirement: 命令系統提供可理解的回饋
系統 SHALL 對未知命令、缺少參數、格式錯誤與當前不可執行命令提供清楚回饋，並將回饋寫入 shell 事件流或命令列狀態，而不是靜默失敗。

#### Scenario: 未知命令
- **WHEN** 玩家輸入不存在的 slash 指令
- **THEN** 系統顯示命令不存在的回饋，且不送出任何 IPC 訊息

#### Scenario: 缺少必要參數
- **WHEN** 玩家輸入需要參數但未提供完整參數的命令
- **THEN** 系統顯示該命令的使用方式或缺少的參數資訊

### Requirement: 合法命令提示來源於 Zig 可用動作
系統 SHALL 以 Zig `turn_changed.available_actions` 作為可執行遊戲命令的權威來源，並在 shell 狀態列或命令提示中反映目前可用的 slash 指令集合。

#### Scenario: 目前可用動作更新為碰與胡
- **WHEN** TUI 收到 `turn_changed.available_actions = ["pon", "win"]`
- **THEN** shell 狀態列僅將對應的遊戲命令顯示為可執行，其餘遊戲動作顯示為不可用或不提示
