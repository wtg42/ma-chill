## Purpose

定義背面牌的視覺樣式與渲染方式，確保背面牌與正面牌框尺寸一致，並納入現有 template 系統管理。

## Requirements

### Requirement: 自定義背面牌樣式

背面牌 SHALL 使用與正面牌相同的 7×4 字元框格式，內容以 `░` 填充，視覺上傳達「不可見」的語意。

```
┌─────┐
│░░░░░│
│░░░░░│
└─────┘
```

#### Scenario: 背面牌渲染
- **WHEN** 需要顯示背面牌
- **THEN** 渲染結果為上述固定樣式，寬度 7 字元、高度 4 行，與正面牌框尺寸完全一致

---

### Requirement: 背面牌納入現有 template 系統

背面牌 SHALL 透過 `text-render.ts` 的 `TileTextTemplate` 系統渲染，而非 hardcode 字串，以保持一致性。

#### Scenario: 使用 tile-back key 取得 template
- **WHEN** 以 `"tile-back"` 為 key 呼叫 `resolveTileTextTemplateByKey()`
- **THEN** 回傳 top 與 bottom 皆為 `░░░░░` 的 template，status 為 `"ready"`
