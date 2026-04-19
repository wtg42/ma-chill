## MODIFIED Requirements

### Requirement: Zig → TUI 訊息型別定義
系統 SHALL 支援可描述 phase 與 claim context 的 Zig → TUI 訊息。`turn_changed` 不得再只表示「輪到誰」；它 MUST 同時表達目前 prompt 屬於哪一類 phase，以及若屬於棄牌反應窗時所需的上下文。

`turn_changed` MUST 至少包含：

- `player_id`
- `available_actions`
- `phase_kind`：例如 `self_turn` 或 `discard_reaction`

當 `phase_kind = "discard_reaction"` 時，還 MUST 包含：

- `discarded_tile_id`
- `discarder_player_id`
- `priority_group`：例如 `win`、`meld`
- 若 `available_actions` 含 `chi`，則提供具體可選吃牌組合

#### Scenario: 自己回合 prompt
- **WHEN** 某位玩家摸牌後進入自己的決策階段
- **THEN** Zig 推送 `turn_changed`，其中 `phase_kind = "self_turn"`，且不包含棄牌反應窗專屬欄位

#### Scenario: 棄牌反應窗 prompt
- **WHEN** 某張棄牌開啟反應窗，且某位玩家在目前優先層具有合法動作
- **THEN** Zig 推送 `turn_changed`，其中 `phase_kind = "discard_reaction"`，並包含 `discarded_tile_id`、`discarder_player_id` 與對應 claim context

#### Scenario: 吃牌可選組合被序列化
- **WHEN** 某位玩家在棄牌反應窗中可用兩種不同順子吃同一張牌
- **THEN** `turn_changed` MUST 同時提供兩組可選吃牌組合，供 TUI 渲染與回傳選擇

### Requirement: TUI → Zig 訊息型別定義
系統 SHALL 支援可表達 phase-specific 選擇的 `player_action`。除了 `action` 與 `tile_id` 外，訊息 MUST 能在需要時攜帶 claim option 或 phase context 所需的識別資料。

`player_action` SHALL 支援以下語意：

- `discard`：自己回合棄牌，必須提供 `tile_id`
- `win`：對當前 phase 的胡牌決策
- `pon` / `kong`：對當前棄牌或自己回合槓牌決策
- `chi`：對當前棄牌的吃牌決策，MUST 指定被選擇的吃牌組合
- `pass`：只在棄牌反應窗合法

#### Scenario: 玩家選擇特定吃牌組合
- **WHEN** TUI 顯示多個合法吃牌組合，且玩家選擇其中一組
- **THEN** TUI 傳送的 `player_action` MUST 包含足以唯一識別該吃牌組合的資料，而不是僅傳送 `action: "chi"`

#### Scenario: claim timeout 轉為 pass
- **WHEN** 玩家在棄牌反應窗中倒數結束仍未輸入
- **THEN** TUI 傳送 `{ type: "player_action", action: "pass" }`，且不附帶一般棄牌欄位

#### Scenario: 非法動作被忽略
- **WHEN** TUI 傳送與目前 phase 或 claim context 不一致的 `player_action`
- **THEN** Zig 忽略該訊息，不更新狀態，可選擇推送 error 訊息給 TUI
