## MODIFIED Requirements

### Requirement: 鍵盤驅動設計原則
所有玩家互動 SHALL 經由 command system 統一處理。底部命令列為主要互動入口，slash 指令為主要操作方式；通用快捷鍵僅作為常用命令的 accelerator。鍵盤事件 SHALL 先進入命令層，再決定是本地命令、查詢命令或送往 Zig core 的遊戲動作。

#### Scenario: 玩家以命令列執行動作
- **WHEN** 玩家在底部命令列輸入 slash 指令並送出
- **THEN** 系統透過 command system 解析與執行該操作

#### Scenario: 快捷鍵仍走命令層
- **WHEN** 玩家按下某個通用快捷鍵
- **THEN** 系統將該快捷鍵映射為相同命令語義，而不是直接繞過命令層送出 IPC

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: 打牌快捷鍵
**Reason**: 產品互動模型改為 command-first，不再以手牌位置鍵作為主要操作方式。
**Migration**: 以 `/discard ...` 等 slash 指令與其快捷映射取代位置鍵棄牌。

### Requirement: 吃碰槓胡快捷鍵
**Reason**: claim 類動作改以命令系統統一處理，避免形成另一套獨立的熱鍵規則。
**Migration**: 以 `/chi`、`/pon`、`/kong`、`/win` 或其 accelerator 取代固定單鍵。

### Requirement: StatusBar 可用動作來源
**Reason**: 舊 requirement 聚焦於固定熱鍵顯示，已不足以描述新的可用命令提示模型。
**Migration**: 以 shell 狀態列顯示可用命令摘要，來源仍為 Zig 的 `available_actions`。

### Requirement: 狀態列快捷鍵提示
**Reason**: 主畫面不再以熱鍵提示作為主要引導，而改為命令提示與命令格式提示。
**Migration**: 改在頂部狀態列或命令列 placeholder 提示目前可用命令。

### Requirement: 摸牌固定按鍵（space）
**Reason**: 固定單鍵操作不再是主要互動模式。
**Migration**: 以命令系統中的棄牌語義與可選 accelerator 取代。

### Requirement: 棄牌歷史快捷鍵（tab）
**Reason**: 歷史資訊改由 shell 事件流與後續查詢命令承載。
**Migration**: 以事件流與 slash 查詢命令取代固定 popup 快捷鍵。

### Requirement: 遊戲資訊快捷鍵（反斜線）
**Reason**: 遊戲資訊改由 shell 指令與狀態摘要呈現，不再依賴固定 popup 切換鍵。
**Migration**: 以 slash 查詢命令或狀態列摘要取代。
