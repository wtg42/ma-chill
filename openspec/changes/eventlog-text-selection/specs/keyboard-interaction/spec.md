## MODIFIED Requirements

### Requirement: 鍵盤驅動設計原則

所有玩家互動 SHALL 經由 command system 統一處理。底部命令列為主要互動入口，slash 指令為主要操作方式；通用快捷鍵僅作為常用命令的 accelerator。鍵盤事件 SHALL 先進入命令層，再決定是本地命令、查詢命令或送往 Zig core 的遊戲動作。

唯一例外：當畫面有活躍的文字選取（selection）時，`Ctrl+C` SHALL 優先執行「複製選取文字到剪貼簿」，而不是進入命令層。無 selection 時 `Ctrl+C` SHALL 維持既有行為。

#### Scenario: 玩家以命令列執行動作
- **WHEN** 玩家在底部命令列輸入 slash 指令並送出
- **THEN** 系統透過 command system 解析與執行該操作

#### Scenario: 快捷鍵仍走命令層
- **WHEN** 玩家按下某個通用快捷鍵
- **THEN** 系統將該快捷鍵映射為相同命令語義，而不是直接繞過命令層送出 IPC

#### Scenario: Ctrl+C 有 selection 時複製文字
- **WHEN** 畫面有活躍的文字選取且玩家按下 `Ctrl+C`
- **THEN** 系統 SHALL 將選取文字送入 clipboard pipeline，並清除 selection，不進入命令層

#### Scenario: Ctrl+C 無 selection 時維持原行為
- **WHEN** 畫面無活躍的文字選取且玩家按下 `Ctrl+C`
- **THEN** 系統 SHALL 維持 `Ctrl+C` 的既有行為（如退出程式或其他已定義的動作）
