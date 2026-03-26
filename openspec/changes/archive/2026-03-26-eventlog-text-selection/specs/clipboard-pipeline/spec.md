## ADDED Requirements

### Requirement: 雙層剪貼簿策略
系統 SHALL 提供 `copyToClipboard(text)` 函式，依序嘗試 OSC 52 與 OS 工具將文字複製到系統剪貼簿。此函式 SHALL 封裝於獨立模組 `tui/src/clipboard.ts`。

#### Scenario: OSC 52 成功
- **WHEN** 終端機支援 OSC 52 且 `copyToClipboard` 被呼叫
- **THEN** 系統 SHALL 透過 OSC 52 escape sequence 將文字寫入系統剪貼簿，不再嘗試 OS 工具

#### Scenario: OSC 52 失敗，OS 工具接手
- **WHEN** OSC 52 嘗試失敗或不可用
- **THEN** 系統 SHALL fallback 到 OS 工具複製文字

#### Scenario: 所有方式都失敗
- **WHEN** OSC 52 與所有 OS 工具都失敗
- **THEN** 系統 SHALL 靜默忽略，不 throw 錯誤，不阻塞使用者操作

### Requirement: OSC 52 優先於 OS 工具
系統 SHALL 優先使用 OSC 52，因為它是唯一能在 SSH / tmux / remote session 中正確複製到本地終端機剪貼簿的方式。系統 MUST 不先嘗試 OS 工具，以避免在遠端環境下錯誤複製到遠端機器的剪貼簿。

#### Scenario: SSH session 中複製
- **WHEN** 玩家透過 SSH 連線遊玩且選取文字
- **THEN** 系統 SHALL 透過 OSC 52 將文字送到本地終端機的剪貼簿，而非遠端機器

#### Scenario: 本地環境下 OSC 52 不支援
- **WHEN** 玩家在本地終端機遊玩但終端機不支援 OSC 52
- **THEN** 系統 SHALL fallback 到對應平台的 OS 工具

### Requirement: OS 工具偵測順序
當需要 fallback 到 OS 工具時，系統 SHALL 依以下順序偵測並使用第一個可用的工具：

1. Linux + `$WAYLAND_DISPLAY` 存在 → `wl-copy`
2. Linux + `$DISPLAY` 存在 → `xclip -selection clipboard`（fallback: `xsel -bi`）
3. macOS → `pbcopy`
4. WSL / Windows → `clip.exe`

#### Scenario: Wayland 環境
- **WHEN** `$WAYLAND_DISPLAY` 環境變數存在
- **THEN** 系統 SHALL 使用 `wl-copy` 寫入剪貼簿

#### Scenario: X11 環境
- **WHEN** `$WAYLAND_DISPLAY` 不存在但 `$DISPLAY` 存在
- **THEN** 系統 SHALL 優先嘗試 `xclip -selection clipboard`，若 xclip 不可用則嘗試 `xsel -bi`

#### Scenario: macOS 環境
- **WHEN** 執行平台為 darwin
- **THEN** 系統 SHALL 使用 `pbcopy` 寫入剪貼簿

#### Scenario: WSL 環境
- **WHEN** 執行平台為 WSL 或 Windows
- **THEN** 系統 SHALL 使用 `clip.exe` 寫入剪貼簿

#### Scenario: OS 工具不存在
- **WHEN** 偵測到的 OS 工具在系統中不存在（spawn 失敗）
- **THEN** 系統 SHALL catch error 並嘗試下一個工具，所有工具都失敗時靜默忽略
