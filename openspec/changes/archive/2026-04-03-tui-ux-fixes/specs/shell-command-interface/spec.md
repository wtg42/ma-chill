## ADDED Requirements

### Requirement: NORMAL 模式按鍵提示文字不得含 HTML 跳脫字元
系統 SHALL 在 NORMAL 模式的提示列中，使用不含 `<` 或 `>` 的按鍵標示格式，以避免 OpenTUI text 節點將其轉為 HTML entity（如 `&lt;` 和 `&gt;`）而在終端機上錯誤顯示。按鍵名稱 SHALL 以方括號表示，例如 `[SPC]`。

#### Scenario: NORMAL 模式顯示鍵盤提示
- **WHEN** TUI 處於 NORMAL 模式（非 leader、非 command 模式）
- **THEN** 底部提示列顯示 `NORMAL  [SPC]=選單  :=命令列`，不含任何 HTML entity
