## Purpose

定義麻將遊戲中玩家與 UI 的互動方式，強調 command-first 的設計原則、命令列編輯與通用快捷映射。

## Requirements

### Requirement: 鍵盤驅動設計原則

所有玩家互動 SHALL 經由 command system 統一處理。底部命令列為主要互動入口，slash 指令為主要操作方式；通用快捷鍵僅作為常用命令的 accelerator。鍵盤事件 SHALL 先進入命令層，再決定是本地命令、查詢命令或送往 Zig core 的遊戲動作。

#### Scenario: 玩家以命令列執行動作
- **WHEN** 玩家在底部命令列輸入 slash 指令並送出
- **THEN** 系統透過 command system 解析與執行該操作

#### Scenario: 快捷鍵仍走命令層
- **WHEN** 玩家按下某個通用快捷鍵
- **THEN** 系統將該快捷鍵映射為相同命令語義，而不是直接繞過命令層送出 IPC

### Requirement: 命令列支援基本編輯操作

系統 SHALL 支援在底部命令列輸入文字、刪除字元、移動游標與送出命令，讓玩家可在同一個輸入入口完成所有 slash 操作。

#### Scenario: 玩家編輯命令內容
- **WHEN** 玩家在命令列輸入文字並使用基本編輯按鍵
- **THEN** 畫面中的命令列內容與游標位置正確更新

#### Scenario: 玩家送出命令
- **WHEN** 玩家在命令列按下送出鍵
- **THEN** 系統以目前輸入內容執行命令解析流程

### Requirement: 可用命令提示取代固定熱鍵提示

系統 SHALL 依當前局面顯示可用命令提示，而不是要求玩家記憶每張手牌位置鍵或固定動作熱鍵。提示內容 SHALL 反映目前可執行的遊戲動作與常用查詢命令。

#### Scenario: 輪到玩家棄牌
- **WHEN** 當前回合允許玩家棄牌
- **THEN** 狀態列或命令提示顯示對應的棄牌命令格式與可用參數提示

#### Scenario: 玩家處於 claim 視窗
- **WHEN** 當前 `available_actions` 含 `chi`、`pon` 或 `win`
- **THEN** 狀態列或命令提示顯示可直接執行的對應命令

### Requirement: 自動 pass 仍由本地計時觸發

當前可用動作包含 `pass` 時，系統 SHALL 依 `pass_timeout_seconds` 啟動本地倒數；若玩家在時限內未執行其他合法命令，前端 SHALL 透過命令系統送出 `pass` 動作。

#### Scenario: 倒數結束自動 pass
- **WHEN** 玩家處於可 pass 的回應視窗且倒數到期
- **THEN** 前端經由命令層送出結構化 `pass` 動作

#### Scenario: 玩家先送出其他合法命令
- **WHEN** 倒數尚未結束前，玩家已成功執行其他合法命令
- **THEN** 系統取消目前的 pass 倒數

### Requirement: 事件流捲動快捷鍵

系統 SHALL 提供事件流歷史導覽快捷鍵，讓玩家在底部命令列維持主要輸入入口的前提下，仍可直接控制中間事件流。`PageUp` MUST 將事件流往較早內容捲動、`PageDown` MUST 將事件流往較新內容捲動、`Home` MUST 跳到最早可見內容、`End` MUST 跳回最新內容並恢復自動跟隨；這些操作 MUST 為前端本地行為，不得送出 IPC，也不得改寫目前命令列文字。

#### Scenario: 玩家以導覽鍵回看較早事件
- **WHEN** 玩家按下 `PageUp` 或 `Home`
- **THEN** 系統在本地捲動中間事件流，且不送出任何遊戲 action 或改變命令列內容

#### Scenario: 玩家回到最新事件並恢復跟隨
- **WHEN** 玩家按下 `End`
- **THEN** 系統將事件流跳到最新內容，並在後續新事件追加時自動跟隨到底部

#### Scenario: 玩家向較新內容逐步前進
- **WHEN** 玩家按下 `PageDown`
- **THEN** 系統在本地將事件流往較新內容捲動；若已無更晚內容，畫面保持在目前位置

### Requirement: DiceLobby 使用 OpenTUI 鍵盤 API

DiceLobby SHALL 使用 `useKeyboard()` hook 監聽按鍵，不直接操作 `process.stdin`。

#### Scenario: 任意鍵開始遊戲
- **WHEN** DiceLobby 畫面顯示中，玩家按下任意鍵（`eventType === "press"`）
- **THEN** 呼叫 `onStart()` 進入遊戲畫面

#### Scenario: stdin 狀態不受影響
- **WHEN** DiceLobby unmount 後 GameTable 掛載
- **THEN** `useKeyboard()` 在 GameTable 中正常運作，不受 DiceLobby 影響

### Requirement: 手牌查詢快捷鍵
系統 SHALL 提供 `Ctrl+o` 作為 `/hand` 的預設快捷鍵 accelerator。此快捷鍵 MUST 經由與命令列輸入相同的 command registry、normalization 與 execute path，不得直接繞過命令層操作事件流或 state。

#### Scenario: 玩家按下手牌查詢快捷鍵
- **WHEN** 玩家在對局主畫面按下 `Ctrl+o`
- **THEN** 系統執行與輸入 `/hand` 相同的命令流程，並在事件流顯示相同的手牌摘要結果

#### Scenario: 快捷鍵仍走命令系統
- **WHEN** `Ctrl+o` 觸發手牌查詢
- **THEN** 系統重用既有 command system，而不是新增一條獨立的 hotkey-only hand display 路徑
