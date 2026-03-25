## ADDED Requirements

### Requirement: 手牌摘要由本地 state 派生
系統 SHALL 由玩家目前的 `handWithIds()` 與 `drawn_tile_id` 派生手牌摘要。摘要 MUST 依固定組序顯示萬、筒、條、風、三元、四季、四君子；各組內 MUST 依 canonical tile sort order 做升冪排序，並依實際持有數量重複顯示同種牌；各組輸出 MUST 使用既有 ASCII 牌面模板組成，不得退回為純文字牌名；空組別 MUST 不輸出；目前摸到的牌 MUST 另列為 `摸牌` 區塊；摘要 MUST 不包含 `tile_id`。

#### Scenario: 混合手牌被整理成分組摘要
- **WHEN** 玩家手牌同時含萬、筒、條、風牌、三元牌與 bonus 牌
- **THEN** 系統輸出多行摘要，且各行依固定組序與升冪排序呈現

#### Scenario: 缺少的分類不顯示空行
- **WHEN** 玩家手牌中沒有四季或四君子
- **THEN** 摘要中不產生對應的空白分類行

### Requirement: 玩家自摸後自動寫入手牌摘要
系統 SHALL 在 viewer 玩家於 `state_update` 中摸到新牌時，自動將與 `/hand` 相同格式的手牌摘要寫入事件流，且該摘要 SHALL 緊接在摸牌敘事之後。其他玩家摸牌或非摸牌更新 MUST 不自動重印玩家手牌摘要。

#### Scenario: 玩家自摸後自動顯示摘要
- **WHEN** `state_update` 讓 viewer 的 `drawn_tile_id` 變為新的非空值
- **THEN** 事件流先追加摸牌訊息，再追加同格式的手牌摘要

#### Scenario: 非 viewer 自摸或一般更新不重印手牌
- **WHEN** `state_update` 只反映其他玩家摸牌、棄牌或一般局面變化
- **THEN** 系統不自動追加 viewer 的手牌摘要
