## Purpose

定義麻將遊戲中玩家與 UI 的互動方式，強調 command-first 的設計原則、命令列編輯與通用快捷映射。

## Requirements

### Requirement: 鍵盤驅動設計原則

所有玩家互動 SHALL 經由 command system 統一處理。底部命令列為主要互動入口，分為三態：NORMAL（靜態提示）、LEADER（which-key 面板）、COMMAND（slash 指令輸入）。Leader 鍵（`Space`）開啟 which-key 面板，所有遊戲快捷鍵以 `<leader>+<key>` 形式觸發命令；`:`（shift+;）進入命令輸入模式。

產品互動 MUST NOT 使用任何 `Ctrl+...` 組合作為遊戲命令、複製操作或其他 UI 功能的入口。`Ctrl` 組合保留給 terminal / system 原生語義，系統不對其提供產品層承諾。文字複製行為由 `text-selection` capability 定義的 copy-on-select 承擔，而不是由鍵盤例外規則承擔。

#### Scenario: 玩家以命令列執行動作
- **WHEN** 玩家進入 COMMAND MODE（按 `:`）後輸入 slash 指令並送出
- **THEN** 系統透過 command system 解析與執行該操作，並返回 NORMAL MODE

#### Scenario: leader binding 仍走命令層
- **WHEN** 玩家在 LEADER MODE 按下某個有效的 leader binding 鍵
- **THEN** 系統將該 binding 映射為相同命令語義，經由 executeCommand 執行，而不是直接繞過命令層送出 IPC

#### Scenario: `Ctrl` 組合不屬於產品快捷鍵空間
- **WHEN** 規格定義遊戲命令或 UI 操作的鍵盤入口
- **THEN** 該入口 MUST 使用 Leader binding、command mode 或既有導覽鍵，而不得定義為任何 `Ctrl+...` 組合

### Requirement: 自動 pass 仍由本地計時觸發

當前可用動作包含 `pass` 時，系統 SHALL 依 `pass_timeout_seconds` 啟動本地倒數；若玩家在時限內未執行其他合法命令，前端 SHALL 透過命令系統送出 `pass` 動作。TUI auto-pass timer SHALL 為 pass timeout 的唯一來源，Zig core 不再有獨立超時機制。

#### Scenario: 倒數結束自動 pass
- **WHEN** 玩家處於可 pass 的回應視窗且倒數到期
- **THEN** 前端經由命令層送出結構化 `pass` 動作，Zig core 透過 blocking read 接收

#### Scenario: 玩家先送出其他合法命令
- **WHEN** 倒數尚未結束前，玩家已成功執行其他合法命令
- **THEN** 系統取消目前的 pass 倒數

#### Scenario: Zig core 等待 TUI 回應
- **WHEN** Zig core 進入 claim phase 等待玩家回應
- **THEN** Zig core 以 blocking read 等待 TUI 送出 action，不設獨立 timeout

### Requirement: 事件流捲動快捷鍵

系統 SHALL 提供事件流歷史導覽快捷鍵，讓玩家在底部命令列維持主要輸入入口的前提下，仍可直接控制中間事件流。`PageUp` MUST 將事件流往較早內容捲動、`PageDown` MUST 將事件流往較新內容捲動、`Home` MUST 跳到最早可見內容、`End` MUST 跳回最新內容並恢復自動跟隨；這些操作 MUST 為前端本地行為，不得送出 IPC，也不得改寫目前命令列文字。

事件流 SHALL 預設處於「跟隨最新」模式：新事件加入時自動捲到底部。當使用者透過鍵盤或滑鼠滾輪手動捲離底部時，「跟隨最新」模式 SHALL 暫停，視窗停在使用者目前位置。當使用者捲回底部（包括按下 `End` 或以滑鼠滾回底部）時，「跟隨最新」模式 SHALL 自動恢復。

#### Scenario: 玩家以導覽鍵回看較早事件
- **WHEN** 玩家按下 `PageUp` 或 `Home`
- **THEN** 系統在本地捲動中間事件流，且不送出任何遊戲 action 或改變命令列內容

#### Scenario: 玩家回到最新事件並恢復跟隨
- **WHEN** 玩家按下 `End`
- **THEN** 系統將事件流跳到最新內容，並在後續新事件追加時自動跟隨到底部

#### Scenario: 玩家向較新內容逐步前進
- **WHEN** 玩家按下 `PageDown`
- **THEN** 系統在本地將事件流往較新內容捲動；若已無更晚內容，畫面保持在目前位置

#### Scenario: 新事件到來時自動捲到底部（預設跟隨模式）
- **WHEN** 事件流處於「跟隨最新」模式且有新事件加入
- **THEN** 事件流 SHALL 自動捲動到最新事件，使用者無需手動操作

#### Scenario: 使用者手動捲離後新事件不打斷閱讀
- **WHEN** 使用者透過鍵盤或滑鼠手動將事件流捲離底部，之後有新事件加入
- **THEN** 事件流 SHALL 停留在使用者目前的捲動位置，不自動捲到底部

#### Scenario: 使用者捲回底部後恢復自動跟隨
- **WHEN** 使用者透過鍵盤（`End`/`PageDown`）或滑鼠將事件流捲回底部
- **THEN** 事件流 SHALL 恢復「跟隨最新」模式，下一批新事件到來時再次自動捲動

### Requirement: DiceLobby 使用 OpenTUI 鍵盤 API

DiceLobby SHALL 使用 `useKeyboard()` hook 監聽按鍵，不直接操作 `process.stdin`。

#### Scenario: 任意鍵開始遊戲
- **WHEN** DiceLobby 畫面顯示中，玩家按下任意鍵（`eventType === "press"`）
- **THEN** 呼叫 `onStart()` 進入遊戲畫面

#### Scenario: stdin 狀態不受影響
- **WHEN** DiceLobby unmount 後 GameTable 掛載
- **THEN** `useKeyboard()` 在 GameTable 中正常運作，不受 DiceLobby 影響

### Requirement: 手牌查詢快捷鍵

系統 SHALL 提供 `<leader>+o` 作為 `/hand` 的預設快捷鍵 binding。此快捷鍵 MUST 經由與命令列輸入相同的 command registry、normalization 與 execute path，不得直接繞過命令層操作事件流或 state。

#### Scenario: 玩家按下手牌查詢快捷鍵
- **WHEN** 玩家在 LEADER MODE 按下 `o`
- **THEN** 系統執行與輸入 `/hand` 相同的命令流程，並在事件流顯示相同的手牌摘要結果

#### Scenario: 快捷鍵仍走命令系統
- **WHEN** `<leader>+o` 觸發手牌查詢
- **THEN** 系統重用既有 command system，而不是新增一條獨立的 hotkey-only hand display 路徑
