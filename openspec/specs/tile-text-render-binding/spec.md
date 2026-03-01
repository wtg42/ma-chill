# tile-text-render-binding Specification

## Purpose
TBD - created by archiving change add-tile-display-binding-structure. Update Purpose after archive.
## Requirements
### Requirement: 牌面模板資料結構可覆蓋數牌與字牌
系統 MUST 提供可序列化的牌面模板資料結構，用於表示終端牌框與內容，且 SHALL 覆蓋數牌（筒、條、萬）與字牌（東南西北中發白）。

#### Scenario: 建立可渲染模板集合
- **WHEN** 載入牌面模板資料
- **THEN** 系統可取得數牌與字牌所需模板，且每個模板可獨立渲染為完整牌框字串

### Requirement: 數牌模板依花色套用符號規則
系統 SHALL 以 rank `1..9` 搭配花色規則產生數牌顯示內容：筒使用 `●`、條使用 `█`、萬使用 `萬`，並維持與 canonical tile 花色語意一致。

#### Scenario: 條子顯示使用方塊符號
- **WHEN** 綁定目標 tile 為條子且 rank 為任意 `1..9`
- **THEN** 回傳模板下行內容使用 `█`，上行顯示對應 rank

### Requirement: 白板模板內容為留白
系統 MUST 提供白板（白）模板，且其內容區 SHALL 為空白，不放置任何符號或文字。

#### Scenario: 綁定白牌時顯示空內容
- **WHEN** 綁定目標 tile 為白牌
- **THEN** 回傳模板內容區為空白，並可正常輸出完整牌框

### Requirement: canonical tile 與模板綁定需可直接查找
系統 MUST 提供從 canonical tile metadata（至少包含 category、suit、rank 或 honor 類型）到模板識別值的決定性映射，且相同語意輸入 SHALL 回傳相同模板結果。

#### Scenario: 相同語意 tile 回傳一致模板
- **WHEN** 兩張 tile 屬於相同牌面語意（例如同 suit 與 rank 的不同 copy）
- **THEN** 綁定結果指向同一模板定義

### Requirement: 四季牌與四君子先以占位狀態輸出
系統 SHALL 為四季牌與四君子保留模板綁定入口；在未提供實際內容前，MUST 回傳可識別的占位狀態，而非無效鍵值或拋出未處理錯誤。

#### Scenario: 綁定花牌但尚未定義圖樣
- **WHEN** 綁定目標 tile 為四季牌或四君子
- **THEN** 系統回傳「已保留未實作」狀態供上層決定顯示策略

