## ADDED Requirements

### Requirement: 最小視窗尺寸限制

系統 SHALL 在遊戲啟動後持續監控 terminal 視窗尺寸。寬度小於 140 字元或高度小於 40 行時，SHALL 以全畫面警告取代遊戲畫面，禁止任何遊戲操作。

#### Scenario: 視窗過小時啟動

- **WHEN** 遊戲啟動時 terminal 寬度 < 140 或高度 < 40
- **THEN** 顯示全畫面警告，內容包含最小需求（140×40）與目前尺寸，不顯示遊戲桌面

#### Scenario: 遊玩中縮小視窗

- **WHEN** 玩家在遊玩中將 terminal 縮小至寬度 < 140 或高度 < 40
- **THEN** 立即以全畫面警告覆蓋，遊戲暫停（不處理任何輸入）

#### Scenario: 視窗恢復達標尺寸

- **WHEN** terminal 視窗尺寸恢復至寬度 ≥ 140 且高度 ≥ 40
- **THEN** 警告畫面消失，遊戲畫面自動恢復
