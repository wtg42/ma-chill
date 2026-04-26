## MODIFIED Requirements

### Requirement: 三態輸入模式

系統 SHALL 維護一個純 UI 的輸入模式狀態，共三態：NORMAL、LEADER、COMMAND。預設狀態為 NORMAL。模式狀態 SHALL 為前端本地狀態，不進入遊戲狀態或 IPC 協議。若某個 leader binding 會開啟額外 dialog，該 dialog SHALL 以獨立的本地 overlay 狀態存在，而不得把 discard picker 直接併入這三態枚舉。

#### Scenario: 初始狀態為 NORMAL
- **WHEN** 遊戲畫面掛載完成
- **THEN** 輸入模式為 NORMAL，底部列顯示靜態提示文字（不含可輸入的 input 元素）

#### Scenario: 從 NORMAL 切換到 LEADER
- **WHEN** 使用者在 NORMAL MODE 按下 Space
- **THEN** 輸入模式切換為 LEADER，底部列即時顯示 which-key 面板

#### Scenario: 從 LEADER 返回 NORMAL（Esc）
- **WHEN** 使用者在 LEADER MODE 按下 Esc
- **THEN** 輸入模式返回 NORMAL，which-key 面板消失

#### Scenario: 從 LEADER 執行即時命令後返回 NORMAL
- **WHEN** 使用者在 LEADER MODE 按下有效的即時 binding 鍵（如 `j`）
- **THEN** 系統執行對應命令，輸入模式立即返回 NORMAL

#### Scenario: 從 LEADER 開啟 discard dialog
- **WHEN** 使用者在 LEADER MODE 按下 `d`，且目前可執行 `discard`
- **THEN** 系統關閉 which-key 面板、將輸入模式返回 NORMAL，並額外開啟 discard dialog overlay

#### Scenario: 從 NORMAL 切換到 COMMAND
- **WHEN** 使用者在 NORMAL MODE 按下 `:`（shift+;）
- **THEN** 輸入模式切換為 COMMAND，底部列顯示 `:` 前綴的 input 輸入框並取得焦點

#### Scenario: 從 COMMAND 返回 NORMAL（Esc）
- **WHEN** 使用者在 COMMAND MODE 按下 Esc
- **THEN** 輸入模式返回 NORMAL，input 清空，底部列回到靜態提示

#### Scenario: 從 COMMAND 送出命令後返回 NORMAL
- **WHEN** 使用者在 COMMAND MODE 按下 Enter 送出命令
- **THEN** 系統執行命令（無論成功或失敗），輸入模式返回 NORMAL

### Requirement: LEADER binding registry

系統 SHALL 定義一個 leader binding registry，包含所有 `<leader>+<key>` 映射。每個 binding SHALL 包含：鍵位（`key`）、說明文字（`label`）、一種執行語義（即直接映射命令，或開啟特定本地 dialog）、以及可選的遊戲動作識別（`action`，用於 dimmed 判斷）。

#### Scenario: leader binding 觸發命令
- **WHEN** 使用者在 LEADER MODE 按下 registry 中定義為命令型的某個鍵
- **THEN** 系統執行對應命令，流程與在命令列輸入該命令相同（經由 executeCommand）

#### Scenario: `d` binding 開啟 discard dialog
- **WHEN** 使用者在 LEADER MODE 按下 `d`，且目前 `availableActions` 包含 `discard`
- **THEN** 系統不直接執行 `/discard drawn`，而是開啟 discard dialog 作為棄牌選擇入口

#### Scenario: 無對應 binding 的鍵按下
- **WHEN** 使用者在 LEADER MODE 按下 registry 中不存在的鍵
- **THEN** 系統維持 LEADER MODE，不執行任何動作（或可選擇返回 NORMAL）
