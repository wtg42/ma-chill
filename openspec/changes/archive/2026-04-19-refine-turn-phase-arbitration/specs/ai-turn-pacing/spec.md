## MODIFIED Requirements

### Requirement: AI 之間的反應鏈也必須遵守節奏控制
系統 SHALL 在新的 phase-based 回合模型中，僅對 AI 自己主導的 phase 套用 pacing；凡是需要玩家輸入的棄牌反應窗，系統 MUST 立即把 prompt 交給玩家，不得被 AI delay 阻塞。

對於 `discard-reaction` family，系統 SHALL 依優先層級逐層推進：

- 若目前層級存在玩家決策視窗，立即交由玩家處理
- 若玩家不可行、pass 或逾時後才輪到 AI 補位，則 AI 的自動反應流程可套用 pacing
- 若某個層級已產生結果，較低層不得再繼續播放 pacing 鏈

#### Scenario: 真人胡牌視窗不被 AI 延遲
- **WHEN** 某位 AI 棄牌後，玩家在胡牌層具備合法 `win`
- **THEN** 系統 MUST 立即送出玩家的 `turn_changed`，而不得先播放任何 AI 的反應延遲

#### Scenario: 玩家放棄後 AI 反應仍具可感知節奏
- **WHEN** 玩家在某個反應層 pass，且後續由 AI 在同層補位決策
- **THEN** 系統 MAY 對 AI 的自動反應套用 pacing，使玩家可感知 AI 正在接手處理該層競爭

#### Scenario: 無玩家參與的 AI 反應鏈逐步推進
- **WHEN** 某張棄牌的胡牌層與碰 / 槓層都只有 AI 可反應
- **THEN** 系統 MUST 依 phase 邊界逐步推進 AI 的反應鏈，而不是在同一瞬間完成所有 AI 判定與下一家摸牌
