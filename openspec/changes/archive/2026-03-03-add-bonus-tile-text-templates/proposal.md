## Why

目前系統已可建立台麻 144 張 canonical catalog，但四季牌與四君子仍只回傳 placeholder 牌面，導致展示層在遇到花牌時缺少可讀內容。現在補齊花牌文字模板，可讓牌面綁定規則在數牌、字牌、花牌三大類上保持一致，降低後續 UI 與規則整合時的分支複雜度。

## What Changes

- 將四季牌（春夏秋冬）與四君子（梅蘭菊竹）從 placeholder 狀態改為可渲染的 ready 文字模板。
- 新增花牌模板映射規則，採用 ordinal `1..4` 與名稱字元對應，與既有文字鍵值（`bonus.<type>.<ordinal>`）相容。
- 明確定義花牌模板的顯示語意：上行呈現序數、下行呈現對應花牌字元，維持與現有牌框渲染結構一致。
- 更新示範與驗證期望，確保花牌不再僅回傳占位狀態。

## Capabilities

### New Capabilities
- （無）

### Modified Capabilities
- `tile-text-render-binding`: 調整花牌需求，將「四季牌與四君子以占位輸出」改為「四季牌與四君子提供正式可渲染模板」。

## Impact

- 影響 `tui/src/tiles/text-render.ts` 的花牌模板解析與狀態輸出。
- 影響 `tui/src/index.tsx` 的示範輸出內容與狀態展示。
- 影響 `openspec/specs/tile-text-render-binding/spec.md` 的 requirement 與 scenario 定義。
