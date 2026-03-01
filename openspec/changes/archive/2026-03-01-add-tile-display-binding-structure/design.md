## Context

目前程式已有 canonical Taiwan Mahjong catalog，可提供 `tile_id`、`kind_id`、`category`、`suit`、`rank` 等語意資料，但終端牌面仍以單一硬編碼字串展示。需求是把牌面顯示規則獨立成可重用資料結構，並可由底層牌資料直接查得對應模板，避免 UI 直接耦合在 if/else 或散落常數。這次先涵蓋數牌（筒/條/萬）與字牌（東南西北中發白），四季牌與四君子保留掛點、先不填模板。

## Goals / Non-Goals

**Goals:**
- 定義可程式化管理的牌面文字模板結構（牌框、上行文字、下行符號/留白）。
- 定義 canonical tile 到模板 key 的映射規則，讓 TUI 可直接綁定顯示。
- 清楚定義白板（白）為空白內容模板。
- 對四季牌與四君子提供明確占位策略，避免後續擴充破壞結構。

**Non-Goals:**
- 不在本變更導入完整花牌（四季、四君子）實際圖樣。
- 不更動 canonical tile catalog 的既有語意與身份欄位。
- 不討論字型、顏色、動畫等視覺風格細節。

## Decisions

- 以「模板資料」與「綁定邏輯」分層：
  - 模板層只描述可渲染內容（例如 rank、符號、字牌字元、留白）。
  - 綁定層只根據 tile metadata 產生模板 key，避免混雜責任。
  - 這樣可同時維持 display-agnostic catalog 與 UI 需求解耦。
- 數牌採通用規則，符號由花色決定：
  - 筒子下行符號使用 `●`。
  - 條子下行符號使用 `█`。
  - 萬子下行內容使用 `萬`。
  - rank 使用 `1..9`，以單一模板生成路徑覆蓋三種花色。
- 字牌採固定模板集：
  - 東南西北中發使用字牌字元。
  - 白使用空白內容（白板）。
- 花牌（四季、四君子）先保留空模板狀態：
  - 綁定可回傳「已保留但未實作」類型，供 UI 採預設占位或略過。
  - 避免回傳不存在 key 造成執行期錯誤。

## Risks / Trade-offs

- [Risk] 模板 key 命名若與 canonical taxonomy 不一致，會造成綁定失敗 → Mitigation：鍵名直接由 canonical 欄位組合並集中定義對照表。
- [Risk] 先留空花牌可能導致使用者誤解為缺漏 bug → Mitigation：在資料結構提供明確狀態欄位（placeholder/unimplemented）。
- [Risk] 字元寬度在不同終端可能不一致 → Mitigation：模板以固定牌框為主，內容欄位保留可調整空白策略。
