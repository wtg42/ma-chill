## MODIFIED Requirements

### Requirement: Zig → TUI 訊息型別定義
系統 SHALL 支援以下 Zig → TUI 訊息：

- `init`：tile catalog（144 張）+ 初始遊戲狀態（各玩家手牌、牌山剩餘、局風、局數、莊家、座位風）+ `pass_timeout_seconds`
- `state_update`：全量遊戲狀態 + events[]
- `turn_changed`：輪到誰（player_id）+ 可用動作列表
- `game_over`：勝者 player_id + 最終分數列表 + 計番明細（scoring_detail）

#### Scenario: game_over 包含計番明細
- **WHEN** 有玩家胡牌，Zig 推送 game_over
- **THEN** 訊息包含 `scoring_detail` 物件：`{ total_fan: number, lines: [{ pattern: string, fan: number }] }`

#### Scenario: 流局 game_over
- **WHEN** 流局（無人胡牌）
- **THEN** `game_over` 的 `scoring_detail` 為 `null`，`winner_id` 為 `null`

#### Scenario: scoring_detail 牌型名稱
- **WHEN** game_over 包含 scoring_detail
- **THEN** lines 中的 pattern 為英文識別符（如 `"self_draw"`、`"all_triplets"`、`"flush"` 等），TUI 負責翻譯為中文顯示
