## MODIFIED Requirements

### Requirement: 前端將命令正規化為結構化 action / intent
系統 SHALL 由前端解析 slash 指令並產生結構化 command 物件；若命令屬於遊戲動作，前端 SHALL 再將其轉為符合目前 phase 的結構化 action / intent 後送往 Zig core。Zig core MUST 不需要解析 slash 原文。

當前端處於棄牌反應窗時，命令層 MUST 以目前 claim context 做正規化，特別是：

- `/chi` 不得再被視為單一無參數動作；若存在多組合法吃牌，命令層 MUST 要求玩家明確選擇其中一組
- `/pass` 僅在棄牌反應窗中可用
- `/discard ...` 僅在 `self_turn` 中可用

#### Scenario: slash 指令轉為自己回合動作
- **WHEN** 玩家在 `self_turn` 中輸入 `/discard 5m`
- **THEN** 前端解析為本地 command，並送出符合自己回合語義的 `player_action`

#### Scenario: 多組吃牌需要明確選擇
- **WHEN** 玩家在棄牌反應窗輸入 `/chi`，但目前存在多組合法吃牌組合
- **THEN** 前端 MUST 提供清楚回饋要求玩家指定組合，而不得直接送出模糊的 `player_action`

#### Scenario: claim window 中的 pass
- **WHEN** 玩家在棄牌反應窗輸入 `/pass`
- **THEN** 前端送出結構化 `player_action`，表示放棄目前這一層的反應機會

### Requirement: 合法命令提示來源於 Zig 可用動作
系統 SHALL 以 Zig `turn_changed` 提供的 `available_actions` 與 phase / claim context 作為可執行遊戲命令的權威來源，並在 shell 狀態列或命令提示中反映目前可用的 slash 指令集合。

#### Scenario: 自己回合顯示打牌命令
- **WHEN** TUI 收到 `phase_kind = "self_turn"`，且 `available_actions` 包含 `discard`
- **THEN** shell 狀態列提示目前可執行的自己回合命令，例如 `/discard`、`/win`、`/kong`

#### Scenario: 棄牌反應窗顯示 claim 命令
- **WHEN** TUI 收到 `phase_kind = "discard_reaction"`，且 `available_actions = ["pon", "pass"]`
- **THEN** shell 狀態列僅將目前可執行的 claim 命令顯示為可用，並避免誤提示 `/discard`
