## MODIFIED Requirements

### Requirement: 鍵盤驅動設計原則

所有玩家互動的最終遊戲動作 SHALL 經由 command system 統一處理。底部命令列仍為主要文字輸入入口，分為三態：NORMAL（靜態提示）、LEADER（which-key 面板）、COMMAND（slash 指令輸入）。Leader 鍵（`Space`）開啟 which-key 面板，所有遊戲快捷鍵以 `<leader>+<key>` 形式觸發命令或開啟對應的本地互動；若某本地互動最終會送出遊戲 action，該送出流程 MUST 重用既有命令執行路徑，而不得自行繞過 command system。`:`（shift+;）進入命令輸入模式。

產品互動 MUST NOT 使用任何 `Ctrl+...` 組合作為遊戲命令、複製操作或其他 UI 功能的入口。`Ctrl` 組合保留給 terminal / system 原生語義，系統不對其提供產品層承諾。文字複製行為由 `text-selection` capability 定義的 copy-on-select 承擔，而不是由鍵盤例外規則承擔。

#### Scenario: 玩家以命令列執行動作
- **WHEN** 玩家進入 COMMAND MODE（按 `:`）後輸入 slash 指令並送出
- **THEN** 系統透過 command system 解析與執行該操作，並返回 NORMAL MODE

#### Scenario: leader binding 執行即時命令仍走命令層
- **WHEN** 玩家在 LEADER MODE 按下某個有效的即時 leader binding 鍵
- **THEN** 系統將該 binding 映射為相同命令語義，經由 executeCommand 執行，而不是直接繞過命令層送出 IPC

#### Scenario: leader binding 可開啟本地 discard dialog
- **WHEN** 玩家在 LEADER MODE 按下 `d`，且目前可執行 `discard`
- **THEN** 系統開啟本地 discard dialog，後續若玩家在 dialog 內確認棄牌，該棄牌仍 MUST 經由既有 discard 命令執行路徑送出

#### Scenario: `Ctrl` 組合不屬於產品快捷鍵空間
- **WHEN** 規格定義遊戲命令或 UI 操作的鍵盤入口
- **THEN** 該入口 MUST 使用 Leader binding、command mode、dialog 導覽鍵或既有導覽鍵，而不得定義為任何 `Ctrl+...` 組合
