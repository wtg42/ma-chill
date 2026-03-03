## MODIFIED Requirements

### Requirement: 牌面模板資料結構可覆蓋數牌、字牌與花牌
系統 MUST 提供可序列化的牌面模板資料結構，用於表示終端牌框與內容，且 SHALL 覆蓋數牌（筒、條、萬）、字牌（東南西北中發白）與花牌（四季、四君子）。

#### Scenario: 建立可渲染模板集合
- **WHEN** 載入牌面模板資料
- **THEN** 系統可取得數牌、字牌與花牌所需模板，且每個模板可獨立渲染為完整牌框字串

### Requirement: 四季牌與四君子提供可渲染模板
系統 MUST 為四季牌與四君子提供正式模板內容；綁定結果 SHALL 回傳 `ready` 狀態，並維持與既有 `bonus.<type>.<ordinal>` 鍵值規則相容。

#### Scenario: 綁定四季牌回傳 ready 模板
- **WHEN** 綁定目標 tile 為 `bonus.season.<ordinal>` 且 ordinal 為 `1..4`
- **THEN** 系統回傳 `ready` 模板，並可輸出完整牌框字串

#### Scenario: 綁定四君子回傳 ready 模板
- **WHEN** 綁定目標 tile 為 `bonus.flower.<ordinal>` 且 ordinal 為 `1..4`
- **THEN** 系統回傳 `ready` 模板，並可輸出完整牌框字串

## ADDED Requirements

### Requirement: 花牌模板使用序數與名稱字元映射
系統 SHALL 以 `bonus_ordinal` 作為花牌上行內容，並依花牌類型映射下行內容：四季 `1..4` 對應 `春夏秋冬`，四君子 `1..4` 對應 `梅蘭菊竹`。

#### Scenario: 四季模板顯示序數與季節字元
- **WHEN** 綁定目標 tile 為 `bonus.season.3`
- **THEN** 模板上行顯示 `3`，下行顯示 `秋`

#### Scenario: 四君子模板顯示序數與花名字符
- **WHEN** 綁定目標 tile 為 `bonus.flower.2`
- **THEN** 模板上行顯示 `2`，下行顯示 `蘭`
