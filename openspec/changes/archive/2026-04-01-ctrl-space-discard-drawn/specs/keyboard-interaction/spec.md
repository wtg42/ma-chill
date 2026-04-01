## ADDED Requirements

### Requirement: 切摸牌快捷鍵
系統 SHALL 提供 `Ctrl+Space` 作為 `/discard drawn` 的預設快捷鍵 accelerator。此快捷鍵 MUST 經由與命令列輸入相同的 command registry、normalization 與 execute path，不得直接繞過命令層送出 IPC。`Space` 鍵因命令列 `<input>` 焦點問題無法作為快捷鍵，`Ctrl+Space` 為其替代方案。

#### Scenario: 玩家按下切摸牌快捷鍵
- **WHEN** 輪到玩家棄牌且有摸牌（`drawn_tile_id != null`），玩家按下 `Ctrl+Space`
- **THEN** 系統執行與輸入 `/discard drawn` 相同的命令流程，打出目前摸牌

#### Scenario: 無摸牌時快捷鍵被命令層拒絕
- **WHEN** 玩家按下 `Ctrl+Space` 但目前 `discard` 不在 `available_actions` 或無 `drawn_tile_id`
- **THEN** 系統經由命令層回傳錯誤回饋，不送出任何 IPC 訊息

#### Scenario: 快捷鍵仍走命令系統
- **WHEN** `Ctrl+Space` 觸發切摸牌
- **THEN** 系統重用既有 command system，而不是新增一條獨立的 hotkey-only discard 路徑
