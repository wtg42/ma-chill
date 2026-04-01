## MODIFIED Requirements

### Requirement: 鍵盤驅動設計原則

所有玩家互動 SHALL 經由 command system 統一處理。底部命令列為主要互動入口，分為三態：NORMAL（靜態提示）、LEADER（which-key 面板）、COMMAND（slash 指令輸入）。Leader 鍵（`Space`）開啟 which-key 面板，所有遊戲快捷鍵以 `<leader>+<key>` 形式觸發命令；`:`（shift+;）進入命令輸入模式。

產品互動 MUST NOT 使用任何 `Ctrl+...` 組合作為遊戲命令、複製操作或其他 UI 功能的入口。`Ctrl` 組合保留給 terminal / system 原生語義，系統不對其提供產品層承諾。文字複製行為由 `text-selection` capability 定義的 copy-on-select 承擔，而不是由鍵盤例外規則承擔。

#### Scenario: 玩家以命令列執行動作
- **WHEN** 玩家進入 COMMAND MODE（按 `:`）後輸入 slash 指令並送出
- **THEN** 系統透過 command system 解析與執行該操作，並返回 NORMAL MODE

#### Scenario: leader binding 仍走命令層
- **WHEN** 玩家在 LEADER MODE 按下某個有效的 leader binding 鍵
- **THEN** 系統將該 binding 映射為相同命令語義，經由 executeCommand 執行，而不是直接繞過命令層送出 IPC

#### Scenario: `Ctrl` 組合不屬於產品快捷鍵空間
- **WHEN** 規格定義遊戲命令或 UI 操作的鍵盤入口
- **THEN** 該入口 MUST 使用 Leader binding、command mode 或既有導覽鍵，而不得定義為任何 `Ctrl+...` 組合

## REMOVED Requirements

### Requirement: 切摸牌快捷鍵

**Reason**: `Ctrl+Space` 與目前的 Leader-key 產品方向衝突，且 `Ctrl` 組合不再屬於產品快捷鍵空間。`/discard drawn` 應由既有 Leader binding 承載，而不是保留 `Ctrl` 特例。

**Migration**: 將切摸牌操作統一視為 Leader 模式中的一個 binding，由 `<leader>+d`（或實際 registry 定義的對應鍵位）觸發；移除任何對 `Ctrl+Space` 的規格、提示與測試假設。
