## ADDED Requirements

### Requirement: 三態輸入模式

系統 SHALL 維護一個純 UI 的輸入模式狀態，共三態：NORMAL、LEADER、COMMAND。預設狀態為 NORMAL。模式狀態 SHALL 為前端本地狀態，不進入遊戲狀態或 IPC 協議。

#### Scenario: 初始狀態為 NORMAL
- **WHEN** 遊戲畫面掛載完成
- **THEN** 輸入模式為 NORMAL，底部列顯示靜態提示文字（不含可輸入的 input 元素）

#### Scenario: 從 NORMAL 切換到 LEADER
- **WHEN** 使用者在 NORMAL MODE 按下 Space
- **THEN** 輸入模式切換為 LEADER，底部列即時顯示 which-key 面板

#### Scenario: 從 LEADER 返回 NORMAL（Esc）
- **WHEN** 使用者在 LEADER MODE 按下 Esc
- **THEN** 輸入模式返回 NORMAL，which-key 面板消失

#### Scenario: 從 LEADER 執行動作後返回 NORMAL
- **WHEN** 使用者在 LEADER MODE 按下有效的 binding 鍵（如 `j`）
- **THEN** 系統執行對應命令，輸入模式立即返回 NORMAL

#### Scenario: 從 NORMAL 切換到 COMMAND
- **WHEN** 使用者在 NORMAL MODE 按下 `:`（shift+;）
- **THEN** 輸入模式切換為 COMMAND，底部列顯示 `:` 前綴的 input 輸入框並取得焦點

#### Scenario: 從 COMMAND 返回 NORMAL（Esc）
- **WHEN** 使用者在 COMMAND MODE 按下 Esc
- **THEN** 輸入模式返回 NORMAL，input 清空，底部列回到靜態提示

#### Scenario: 從 COMMAND 送出命令後返回 NORMAL
- **WHEN** 使用者在 COMMAND MODE 按下 Enter 送出命令
- **THEN** 系統執行命令（無論成功或失敗），輸入模式返回 NORMAL

### Requirement: NORMAL MODE 底部列顯示

在 NORMAL MODE 下，底部列 SHALL 顯示靜態提示文字，告知使用者進入各模式的方式。底部列 SHALL NOT 包含可輸入的 input 元素。

#### Scenario: NORMAL MODE 底部靜態提示
- **WHEN** 輸入模式為 NORMAL
- **THEN** 底部列顯示類似 `NORMAL  <SPC>=選單  :=命令列` 的固定提示，不含 input 元素

### Requirement: LEADER MODE which-key 面板

在 LEADER MODE 下，底部列 SHALL 顯示 which-key 面板，列出所有 leader binding 的鍵位與說明。遊戲動作類 binding SHALL 依當前 `availableActions` 決定是否 dimmed；工具查詢類 binding SHALL 永遠亮顯。

#### Scenario: which-key 面板顯示所有 binding
- **WHEN** 輸入模式為 LEADER
- **THEN** 底部列顯示所有已定義的 leader binding，格式為 `<key>  <label>`

#### Scenario: 不可用的遊戲動作 binding 顯示為 dimmed
- **WHEN** 輸入模式為 LEADER，且某遊戲動作不在當前 `availableActions` 中
- **THEN** 該 binding 項目以 dimmed 樣式顯示

#### Scenario: 可用的遊戲動作 binding 亮顯
- **WHEN** 輸入模式為 LEADER，且某遊戲動作在當前 `availableActions` 中
- **THEN** 該 binding 項目以正常（非 dimmed）樣式顯示

#### Scenario: 工具查詢 binding 永遠亮顯
- **WHEN** 輸入模式為 LEADER
- **THEN** `h`（說明）、`o`（手牌）、`s`（狀態）等工具查詢 binding 永遠以正常樣式顯示

### Requirement: LEADER binding registry

系統 SHALL 定義一個 leader binding registry，包含所有 `<leader>+<key>` 映射。每個 binding SHALL 包含：鍵位（`key`）、說明文字（`label`）、映射命令（`command`）、可選的遊戲動作識別（`action`，用於 dimmed 判斷）。

#### Scenario: leader binding 觸發命令
- **WHEN** 使用者在 LEADER MODE 按下 registry 中的某個鍵
- **THEN** 系統執行對應 `command`，流程與在命令列輸入該命令相同（經由 executeCommand）

#### Scenario: 無對應 binding 的鍵按下
- **WHEN** 使用者在 LEADER MODE 按下 registry 中不存在的鍵
- **THEN** 系統維持 LEADER MODE，不執行任何動作（或可選擇返回 NORMAL）

### Requirement: COMMAND MODE 底部列顯示

在 COMMAND MODE 下，底部列 SHALL 顯示 `:` 前綴與可輸入的 input 元素，讓使用者輸入 slash 命令。

#### Scenario: COMMAND MODE 顯示輸入框
- **WHEN** 輸入模式為 COMMAND
- **THEN** 底部列顯示 `:` 前綴與 focused 的 input 元素，placeholder 顯示可用命令提示

#### Scenario: COMMAND MODE 送出命令
- **WHEN** 使用者在 COMMAND MODE 的 input 輸入命令並按 Enter
- **THEN** 系統呼叫 executeCommand 執行命令，輸入框清空，模式返回 NORMAL
