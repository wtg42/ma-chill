## ADDED Requirements

### Requirement: 複製成功後顯示暫時 toast 提示
系統 SHALL 在滑鼠選取複製成功後，於畫面右下角顯示一個短暫的 overlay 提示框，告知玩家文字已複製至剪貼簿。提示框 SHALL 在顯示約 1.5 秒後自動消失，不需玩家操作。複製失敗時 MUST 不顯示提示。

#### Scenario: 選取文字複製成功
- **WHEN** 玩家滑鼠選取事件流文字，且 `copyToClipboard` 回傳 `true`
- **THEN** 畫面右下角出現「已複製至剪貼簿」提示框，約 1.5 秒後自動消失

#### Scenario: 複製失敗不顯示提示
- **WHEN** 玩家滑鼠選取文字，但 `copyToClipboard` 回傳 `false`
- **THEN** 畫面不顯示任何提示框

#### Scenario: 連續快速選取複製
- **WHEN** 玩家在 toast 顯示期間再次選取複製
- **THEN** toast 計時器重置，重新倒數 1.5 秒後消失（不重複疊加）

#### Scenario: 元件卸載時計時器清除
- **WHEN** GameTable 元件在 toast 顯示期間被卸載
- **THEN** setTimeout 計時器被清除，不產生非同步副作用
