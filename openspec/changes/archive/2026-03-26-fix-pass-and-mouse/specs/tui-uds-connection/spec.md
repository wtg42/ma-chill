## ADDED Requirements

### Requirement: 關閉 OpenTUI 滑鼠追蹤
TUI SHALL 在 `render()` 初始化時設定 `useMouse: false`，停止向終端機發送滑鼠追蹤 escape sequence，讓終端機原生處理滑鼠選取與複製。

#### Scenario: 使用者以滑鼠選取畫面文字
- **WHEN** 使用者在終端機中拖曳滑鼠選取文字
- **THEN** 終端機原生選取功能正常運作，可複製文字到剪貼簿

#### Scenario: 遊戲互動不受影響
- **WHEN** 關閉滑鼠追蹤後玩家進行遊戲
- **THEN** 所有鍵盤操作與命令輸入功能不受影響，遊戲流程正常運行
