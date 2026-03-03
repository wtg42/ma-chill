# tile-text-render-binding Specification

## Purpose
TBD - created by archiving change add-tile-display-binding-structure. Update Purpose after archive.
## Requirements
### Requirement: 牌面模板資料結構可覆蓋數牌、字牌與花牌
系統 MUST 提供可序列化的牌面模板資料結構，用於表示終端牌框與內容，且 SHALL 覆蓋數牌（筒、條、萬）、字牌（東南西北中發白）與花牌（四季、四君子）。

#### Scenario: 建立可渲染模板集合
- **WHEN** 載入牌面模板資料
- **THEN** 系統可取得數牌、字牌與花牌所需模板，且每個模板可獨立渲染為完整牌框字串

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

### Requirement: 四季牌與四君子提供可渲染模板
系統 MUST 為四季牌與四君子提供正式模板內容；綁定結果 SHALL 回傳 `ready` 狀態，並維持與既有 `bonus.<type>.<ordinal>` 鍵值規則相容。

#### Scenario: 綁定四季牌回傳 ready 模板
- **WHEN** 綁定目標 tile 為 `bonus.season.<ordinal>` 且 ordinal 為 `1..4`
- **THEN** 系統回傳 `ready` 模板，並可輸出完整牌框字串

#### Scenario: 綁定四君子回傳 ready 模板
- **WHEN** 綁定目標 tile 為 `bonus.flower.<ordinal>` 且 ordinal 為 `1..4`
- **THEN** 系統回傳 `ready` 模板，並可輸出完整牌框字串

### Requirement: 花牌模板使用序數與名稱字元映射
系統 SHALL 以 `bonus_ordinal` 作為花牌上行內容，並依花牌類型映射下行內容：四季 `1..4` 對應 `春夏秋冬`，四君子 `1..4` 對應 `梅蘭菊竹`。

#### Scenario: 四季模板顯示序數與季節字元
- **WHEN** 綁定目標 tile 為 `bonus.season.3`
- **THEN** 模板上行顯示 `3`，下行顯示 `秋`

#### Scenario: 四君子模板顯示序數與花名字符
- **WHEN** 綁定目標 tile 為 `bonus.flower.2`
- **THEN** 模板上行顯示 `2`，下行顯示 `蘭`

