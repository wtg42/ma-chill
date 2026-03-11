## Purpose

定義麻將遊戲中玩家與 UI 的互動方式，強調快捷鍵驅動的設計原則，以及各類動作的對應快捷鍵配置。

## Requirements

### Requirement: 鍵盤驅動設計原則

所有需要玩家快速反應的動作 SHALL 透過快捷鍵執行。UI 元件僅用於顯示遊戲狀態，不作為互動入口（不使用滑鼠點擊、不使用選單導航）。

#### Scenario: 快捷鍵執行動作
- **WHEN** 玩家按下對應快捷鍵
- **THEN** 動作立即執行，無需額外確認步驟

### Requirement: 打牌快捷鍵

玩家 SHALL 能透過位置對應按鍵打出手中任意一張牌。手牌由左至右依序對應鍵盤字母（如 a/s/d/f/g/h/j/k/l/;/'）。

#### Scenario: 打出手牌
- **WHEN** 玩家按下對應手牌位置的按鍵
- **THEN** 該張牌被打出，顯示於玩家列右側，並從手牌中移除

### Requirement: 吃碰槓胡快捷鍵

當有可執行的動作時，對應快捷鍵 SHALL 生效：吃（c）、碰（p）、槓（k）、胡（h）。不可用的動作 SHALL 在 StatusBar 以灰化樣式顯示，按下時不執行任何動作。Pass（放棄）改為背景靜默倒數，不設顯式按鍵。

#### Scenario: 可碰時按碰鍵
- **WHEN** 最新棄牌可碰，且玩家按下 p 鍵
- **THEN** 執行碰牌動作

#### Scenario: 無對應動作時按鍵無效
- **WHEN** 當前狀態不允許某動作，玩家按下對應鍵
- **THEN** 不執行任何動作，StatusBar 該動作顯示為灰化

#### Scenario: 倒數時間到自動 pass
- **WHEN** 玩家在可執行吃/碰/槓/胡的等待期間內未按任何動作鍵，且背景倒數結束
- **THEN** TUI 傳送 `{ type: "player_action", action: "pass" }` 給 Zig，遊戲繼續

#### Scenario: pass 倒數秒數來源
- **WHEN** TUI 收到 init 訊息
- **THEN** TUI 從 `pass_timeout_seconds` 欄位讀取秒數；後續 pass 倒數均使用此值，不在 TUI 側硬編碼

### Requirement: StatusBar 可用動作來源

`StatusBar` SHALL 依 Zig `turn_changed` 訊息中的 `available_actions` 陣列決定哪些熱鍵可用；不在陣列中的動作以灰化樣式顯示，按下時不執行任何動作。TUI 收到 `turn_changed` 後更新本地狀態並傳遞給 StatusBar。

#### Scenario: turn_changed 包含部分動作
- **WHEN** Zig 推送 `{ "available_actions": ["chi", "win"] }`
- **THEN** StatusBar 的 c（吃）與 h（胡）正常顯示，p（碰）、k（槓）灰化

### Requirement: 狀態列快捷鍵提示

狀態列 SHALL 常態顯示當前可用的快捷鍵，讓玩家無需記憶全部按鍵。不可用的動作以灰化樣式顯示；不再顯示 pass/放棄 的按鍵提示。

#### Scenario: 輪到玩家打牌
- **WHEN** 玩家需要打牌
- **THEN** 狀態列顯示打牌說明與可用動作鍵

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
