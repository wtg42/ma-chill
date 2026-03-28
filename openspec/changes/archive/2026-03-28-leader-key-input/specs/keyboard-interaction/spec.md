## MODIFIED Requirements

### Requirement: 鍵盤驅動設計原則

所有玩家互動 SHALL 經由 command system 統一處理。底部命令列為主要互動入口，分為三態：NORMAL（靜態提示）、LEADER（which-key 面板）、COMMAND（slash 指令輸入）。Leader 鍵（`Space`）開啟 which-key 面板，所有遊戲快捷鍵以 `<leader>+<key>` 形式觸發命令；`:`（shift+;）進入命令輸入模式。不再使用 `Ctrl+<letter>` accelerator 組合。

唯一例外：當畫面有活躍的文字選取（selection）時，`Ctrl+C` SHALL 優先執行「複製選取文字到剪貼簿」，而不是進入命令層。無 selection 時 `Ctrl+C` SHALL 維持既有行為。

#### Scenario: 玩家以命令列執行動作
- **WHEN** 玩家進入 COMMAND MODE（按 `:`）後輸入 slash 指令並送出
- **THEN** 系統透過 command system 解析與執行該操作，並返回 NORMAL MODE

#### Scenario: leader binding 仍走命令層
- **WHEN** 玩家在 LEADER MODE 按下某個有效的 leader binding 鍵
- **THEN** 系統將該 binding 映射為相同命令語義，經由 executeCommand 執行，而不是直接繞過命令層送出 IPC

#### Scenario: Ctrl+C 有 selection 時複製文字
- **WHEN** 畫面有活躍的文字選取且玩家按下 `Ctrl+C`
- **THEN** 系統 SHALL 將選取文字送入 clipboard pipeline，並清除 selection，不進入命令層

#### Scenario: Ctrl+C 無 selection 時維持原行為
- **WHEN** 畫面無活躍的文字選取且玩家按下 `Ctrl+C`
- **THEN** 系統 SHALL 維持 `Ctrl+C` 的既有行為（如退出程式或其他已定義的動作）

### Requirement: 手牌查詢快捷鍵

系統 SHALL 提供 `<leader>+o` 作為 `/hand` 的預設快捷鍵 binding。此快捷鍵 MUST 經由與命令列輸入相同的 command registry、normalization 與 execute path，不得直接繞過命令層操作事件流或 state。

#### Scenario: 玩家按下手牌查詢快捷鍵
- **WHEN** 玩家在 LEADER MODE 按下 `o`
- **THEN** 系統執行與輸入 `/hand` 相同的命令流程，並在事件流顯示相同的手牌摘要結果

#### Scenario: 快捷鍵仍走命令系統
- **WHEN** `<leader>+o` 觸發手牌查詢
- **THEN** 系統重用既有 command system，而不是新增一條獨立的 hotkey-only hand display 路徑

## REMOVED Requirements

### Requirement: 命令列支援基本編輯操作

**Reason**: 此 requirement 的語境（「底部命令列」永遠是 input）已被三態模式取代。COMMAND MODE 下的 input 行為由 `leader-key-mode` spec 定義，OpenTUI `<input>` 元件本身提供基本編輯支援（刪除、游標移動、送出）。
**Migration**: 查閱 `leader-key-mode` spec 的 COMMAND MODE 相關 requirement。

### Requirement: 可用命令提示取代固定熱鍵提示

**Reason**: 此 requirement 已被 which-key 面板設計取代。LEADER MODE 下的 which-key 面板即時顯示所有可用 binding，依 `availableActions` dimmed，比靜態 placeholder 提示更豐富。
**Migration**: 查閱 `leader-key-mode` spec 的 which-key 面板相關 requirement。
