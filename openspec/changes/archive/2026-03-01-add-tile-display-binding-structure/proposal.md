## Why

目前終端介面只示範單張牌，且牌面字元（例如筒子用 `●`、條子用 `█`）尚未形成可重用的資料結構，導致後續要把完整牌組與底層 catalog 綁定顯示時，擴充與維護成本偏高。現在先建立一致的顯示資料模型，可降低後續接 UI 與規則流程時的重工風險。

## What Changes

- 新增一套「牌面文字模板資料結構」，可表示數牌（筒/條/萬）與字牌（東南西北中發白）的終端顯示內容。
- 定義 canonical tile（`tile_id` / `kind_id` / suit / rank 等）到文字模板的綁定欄位與查找方式。
- 明確定義白板（白）為空白內容模板；四季牌與四君子先保留欄位但暫不填入模板內容。
- 提供可被 TUI 消費的輸出形狀，讓畫面層可直接依底層牌資料渲染。

## Capabilities

### New Capabilities
- `tile-text-render-binding`: 定義終端牌面模板與 canonical tile 資料的綁定規格，涵蓋數牌、字牌、白板留白與花牌保留占位。

### Modified Capabilities
- （無）

## Impact

- 影響 `tui` 顯示層與 `tiles` 轉換層之間的介面契約。
- 不改動既有 canonical tile identity 規則，但新增一層 display binding 資料供 UI 使用。
- 後續可在不破壞底層 catalog 的前提下，逐步補齊四季牌與四君子模板。
