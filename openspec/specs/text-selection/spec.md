## Purpose

定義 EventLog 的文字選取功能，包含滑鼠拖選互動、copy-on-select 自動複製行為，以及確保選取期間不誤觸遊戲動作的保護機制。

## Requirements

### Requirement: EventLog 文字可被滑鼠拖選
EventLog 內的 `<text>` 元件 SHALL 設為 selectable，讓玩家可以用滑鼠拖曳選取事件流中的文字。選取時 SHALL 顯示 OpenTUI 預設的反白視覺回饋。

#### Scenario: 玩家拖選 EventLog 文字
- **WHEN** 玩家在 EventLog 區域按住滑鼠左鍵並拖曳
- **THEN** 被拖過的文字 SHALL 以反白樣式標示為已選取

#### Scenario: 選取跨越多行
- **WHEN** 玩家從一行 EventLog 條目拖選到另一行
- **THEN** 選取範圍 SHALL 包含所有經過行的文字內容

#### Scenario: 選取範圍超出可見區域
- **WHEN** 玩家拖選至 ScrollBox 邊緣
- **THEN** ScrollBox SHALL 自動捲動以擴展選取範圍（由 OpenTUI 內建 auto-scroll 處理）

### Requirement: Copy-on-select 自動複製
當玩家完成文字拖選（mouseUp）且有選取內容時，系統 SHALL 自動將選取文字複製到系統剪貼簿。此為預設行為，不需額外按鍵。

#### Scenario: 拖選結束自動複製
- **WHEN** 玩家在 EventLog 拖選文字後放開滑鼠
- **THEN** 選取的文字 SHALL 自動送入 clipboard pipeline 複製到系統剪貼簿

#### Scenario: 無選取內容不觸發複製
- **WHEN** 玩家在 EventLog 點擊但未拖曳（無 selection）
- **THEN** 系統 SHALL 不觸發任何 clipboard 操作

### Requirement: 選取期間吞掉 click action
當玩家正在拖選文字時，mouseUp 事件 SHALL 不觸發 row click 或遊戲 action。系統 MUST 在 selection 完成後檢查是否有活躍的選取，若有則抑制後續的 click 處理。

#### Scenario: 拖選結束不觸發 row action
- **WHEN** 玩家拖選 EventLog 文字後放開滑鼠
- **THEN** 系統 SHALL 僅執行 copy-on-select，不觸發任何 row click 或遊戲動作

#### Scenario: 單純點擊維持原行為
- **WHEN** 玩家在 EventLog 單純點擊（無拖選、無 selection）
- **THEN** 系統 SHALL 維持既有的 click 行為（若有的話）

### Requirement: Selection handler 掛載於 App 層級
系統 SHALL 在 App 或 GameTable 層級使用 `useSelectionHandler` 監聽全域 selection 事件，而不是在 EventLog 元件內部註冊。

#### Scenario: Selection handler 接收 EventLog 的選取事件
- **WHEN** 玩家在 EventLog 完成文字拖選
- **THEN** App 層級的 `useSelectionHandler` callback SHALL 被呼叫，並收到包含選取文字的 `Selection` 物件

#### Scenario: 僅 EventLog 為 selectable
- **WHEN** 玩家嘗試在 EventLog 以外的 UI 區域拖選文字
- **THEN** 系統 SHALL 不啟動 selection（因其他元件未設為 selectable）
