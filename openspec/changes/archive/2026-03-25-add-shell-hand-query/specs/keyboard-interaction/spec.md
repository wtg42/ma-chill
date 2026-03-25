## ADDED Requirements

### Requirement: 手牌查詢快捷鍵
系統 SHALL 提供 `Ctrl+o` 作為 `/hand` 的預設快捷鍵 accelerator。此快捷鍵 MUST 經由與命令列輸入相同的 command registry、normalization 與 execute path，不得直接繞過命令層操作事件流或 state。

#### Scenario: 玩家按下手牌查詢快捷鍵
- **WHEN** 玩家在對局主畫面按下 `Ctrl+o`
- **THEN** 系統執行與輸入 `/hand` 相同的命令流程，並在事件流顯示相同的手牌摘要結果

#### Scenario: 快捷鍵仍走命令系統
- **WHEN** `Ctrl+o` 觸發手牌查詢
- **THEN** 系統重用既有 command system，而不是新增一條獨立的 hotkey-only hand display 路徑
