## MODIFIED Requirements

### Requirement: 鍵盤驅動設計原則

所有需要玩家快速反應的動作 SHALL 透過快捷鍵執行。UI 元件僅用於顯示遊戲狀態，不作為互動入口（不使用滑鼠點擊、不使用選單導航）。鍵盤事件 SHALL 使用 OpenTUI `useKeyboard()` 全域 hook 監聽，不依賴元素 focus 狀態。

#### Scenario: 快捷鍵執行動作
- **WHEN** 玩家按下對應快捷鍵
- **THEN** 動作立即執行，無需額外確認步驟

#### Scenario: useKeyboard 全域監聽
- **WHEN** GameTable 元件掛載
- **THEN** `useGameKeys` hook 透過 `useKeyboard()` 註冊全域鍵盤 handler，所有按鍵事件均可收到，不需元素 focus

### Requirement: 打牌快捷鍵

玩家 SHALL 能透過位置對應按鍵打出手中任意一張牌。手牌由左至右依序對應鍵盤字母（如 a/s/d/f/g/h/j/k/l/;/'）。按下對應按鍵後，TUI SHALL 呼叫 `sendAction("discard", tileId)` 將動作傳送至 Zig core。

#### Scenario: 打出手牌
- **WHEN** `available_actions` 含 `"discard"`，玩家按下對應手牌位置的按鍵
- **THEN** TUI 呼叫 `sendAction("discard", hand[index].id)` 傳送棄牌動作

#### Scenario: 按鍵超出手牌範圍
- **WHEN** `available_actions` 含 `"discard"`，玩家按下的位置按鍵超出目前手牌數量
- **THEN** 不執行任何動作

### Requirement: 吃碰槓胡快捷鍵

當有可執行的動作時，對應快捷鍵 SHALL 生效：吃（c）、碰（p）、槓（k）、胡（h）。不可用的動作 SHALL 在 StatusBar 以灰化樣式顯示，按下時不執行任何動作。Pass（放棄）改為背景靜默倒數，不設顯式按鍵。按下有效動作鍵後，TUI SHALL 呼叫 `sendAction(action)` 並清除 pass 倒數 timer。

#### Scenario: 可碰時按碰鍵
- **WHEN** `available_actions` 含 `"pon"`，且玩家按下 p 鍵
- **THEN** TUI 呼叫 `sendAction("pon")` 並清除 pass 倒數 timer

#### Scenario: 無對應動作時按鍵無效
- **WHEN** 當前 `available_actions` 不含該動作，玩家按下對應鍵
- **THEN** 不執行任何動作，StatusBar 該動作顯示為灰化

#### Scenario: 倒數時間到自動 pass
- **WHEN** `available_actions` 含副露動作且含 `"pass"`，玩家在倒數期間未按任何動作鍵，倒數結束
- **THEN** TUI 呼叫 `sendAction("pass")`

#### Scenario: pass 倒數秒數來源
- **WHEN** TUI 收到 init 訊息
- **THEN** TUI 從 `pass_timeout_seconds` 欄位讀取秒數並存入 game-state store 的 `passTimeoutSeconds` signal；後續 pass 倒數均使用此值

#### Scenario: 新的 turn_changed 重置 timer
- **WHEN** 倒數進行中，收到新的 `turn_changed` 訊息
- **THEN** 清除舊 timer，依新的 `available_actions` 決定是否重新啟動

### Requirement: 摸牌固定按鍵（space）

玩家摸牌後若需打出摸牌，SHALL 使用 `space` 鍵，該鍵固定對應摸牌，與手牌位置按鍵（a/s/d/...）視覺上以 gap 分隔。

#### Scenario: 摸牌後按 space
- **WHEN** `available_actions` 含 `"discard"`，且 `drawn_tile_id` 不為 null，玩家按下 space
- **THEN** TUI 呼叫 `sendAction("discard", drawnTileId)` 打出摸牌

### Requirement: 棄牌歷史快捷鍵（tab）

`tab` 鍵 SHALL 切換 `DiscardHistoryPopup` 的開關，僅在玩家回合有效。詳見 `discard-history-popup` 規格。

#### Scenario: 玩家回合按 tab
- **WHEN** `currentPlayerId` 為 0，按下 tab
- **THEN** DiscardHistoryPopup 切換開關狀態，GameInfoPopup 關閉

### Requirement: 遊戲資訊快捷鍵（反斜線）

`\`（反斜線）鍵 SHALL 切換 `GameInfoPopup` 的開關，任何時機均可使用。詳見 `game-info-popup` 規格。

#### Scenario: 任意時機按反斜線
- **WHEN** 玩家按下 `\`
- **THEN** GameInfoPopup 切換開關狀態，DiscardHistoryPopup 關閉

## ADDED Requirements

### Requirement: DiceLobby 使用 OpenTUI 鍵盤 API

DiceLobby SHALL 使用 `useKeyboard()` hook 監聽按鍵，不直接操作 `process.stdin`。

#### Scenario: 任意鍵開始遊戲
- **WHEN** DiceLobby 畫面顯示中，玩家按下任意鍵（`eventType === "press"`）
- **THEN** 呼叫 `onStart()` 進入遊戲畫面

#### Scenario: stdin 狀態不受影響
- **WHEN** DiceLobby unmount 後 GameTable 掛載
- **THEN** `useKeyboard()` 在 GameTable 中正常運作，不受 DiceLobby 影響
