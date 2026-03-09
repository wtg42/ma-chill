## MODIFIED Requirements

### Requirement: 吃碰槓胡快捷鍵

當有可執行的動作時，對應快捷鍵 SHALL 生效：吃（c）、碰（p）、槓（k）、胡（h）。不可用的動作 SHALL 在 StatusBar 以灰化樣式顯示，按下時不執行任何動作。Pass（放棄）改為背景靜默倒數，不設顯式按鍵。

#### Scenario: 可碰時按碰鍵
- **WHEN** 最新棄牌可碰，且玩家按下 p 鍵
- **THEN** 執行碰牌動作

#### Scenario: 無對應動作時按鍵無效
- **WHEN** 當前狀態不允許某動作，玩家按下對應鍵
- **THEN** 不執行任何動作，StatusBar 該動作顯示為灰化

#### Scenario: 倒數時間到自動 pass
- **WHEN** 玩家在可執行吃/碰/槓/胡的等待期間內未按任何動作鍵，且背景倒數（預設 5 秒）結束
- **THEN** 系統自動執行 pass，遊戲繼續

## ADDED Requirements

### Requirement: 摸牌固定按鍵（space）

玩家摸牌後若需打出摸牌，SHALL 使用 `space` 鍵，該鍵固定對應摸牌，與手牌位置按鍵（a/s/d/...）視覺上以 gap 分隔。

#### Scenario: 摸牌後按 space
- **WHEN** 玩家已摸牌，按下 space
- **THEN** 打出摸牌，從 LatestTileBox 移除，進入下一個玩家回合

### Requirement: 棄牌歷史快捷鍵（tab）

`tab` 鍵 SHALL 切換 `DiscardHistoryPopup` 的開關，僅在玩家回合有效。詳見 `discard-history-popup` 規格。

#### Scenario: 玩家回合按 tab
- **WHEN** 輪到玩家回合，按下 tab
- **THEN** DiscardHistoryPopup 切換開關狀態

### Requirement: 遊戲資訊快捷鍵（反斜線）

`\`（反斜線）鍵 SHALL 切換 `GameInfoPopup` 的開關，任何時機均可使用。詳見 `game-info-popup` 規格。

#### Scenario: 任意時機按反斜線
- **WHEN** 玩家按下 `\`
- **THEN** GameInfoPopup 切換開關狀態

## REMOVED Requirements

### Requirement: 狀態列快捷鍵提示（放棄鍵）

**Reason**: Pass 改為背景倒數，不再設顯式放棄鍵（原規格提及「放棄鍵如 Enter 或 Space」）
**Migration**: StatusBar 不再顯示 pass/放棄 的按鍵提示；Space 改為打出摸牌的固定鍵
