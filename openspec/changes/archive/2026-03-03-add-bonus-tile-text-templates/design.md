## Context

目前 `tile-text-render-binding` 已完成數牌與字牌模板，並以 `bonus.<type>.<ordinal>` 為花牌保留鍵值，但花牌內容仍是 placeholder。這使 UI 能識別花牌存在，卻無法直接展示可讀牌面，造成展示層需要額外判斷分支。

本次變更聚焦在既有終端文字牌框內，補齊四季牌與四君子的可渲染模板，且不改動 canonical catalog 與 `text_key` 規則，確保向後相容。

## Goals / Non-Goals

**Goals:**
- 讓四季牌與四君子由 placeholder 改為 `ready` 模板，直接可渲染。
- 維持既有 `bonus.<type>.<ordinal>` 鍵值格式，避免上層介面契約破壞。
- 定義一致的花牌顯示語意：上行顯示序數 `1..4`，下行顯示對應字元（春夏秋冬、梅蘭菊竹）。

**Non-Goals:**
- 不變更牌框樣式、寬度與置中演算法。
- 不引入圖像資產或多行美術字面。
- 不調整 canonical tile catalog 的身份欄位與排序規則。

## Decisions

- **Decision 1：花牌模板狀態改為 ready**  
  以 `text_key` 解析花牌時直接回傳可渲染模板，而非 placeholder。  
  **Rationale**：上層可用同一條渲染路徑處理全部牌類，降低特殊分支。  
  **Alternative considered**：保留 placeholder，交由 UI 補字。此方案會讓資料層與顯示責任混雜，故不採用。

- **Decision 2：沿用 ordinal 作為花牌上行語意**  
  四季與四君子皆使用 `bonus_ordinal (1..4)` 作為上行內容。  
  **Rationale**：與數牌的「數值可識別」心智模型一致，便於快速辨識。  
  **Alternative considered**：上行顯示空白、下行僅顯示字元。此方案資訊密度較低，且不利未來比對排序。

- **Decision 3：下行使用固定中文字元映射**  
  `season: 1..4 => 春夏秋冬`，`flower: 1..4 => 梅蘭菊竹`。  
  **Rationale**：映射規則明確、可測試，且與 catalog 既有中文語意一致。  
  **Alternative considered**：下行使用英文名（spring/plum）。此方案在終端牌面辨識性與文化語意較弱，故不採用。

## Risks / Trade-offs

- [Risk] 全形中文在部分終端寬度處理不一致，可能造成視覺偏移 → Mitigation：維持既有寬度限制並在示範中保留已知限制說明。
- [Trade-off] 使用固定映射提升一致性，但降低美術彈性 → Mitigation：後續若需換字形，僅調整模板映射層，不動鍵值契約。
- [Risk] 若 `bonus_ordinal` 缺失或異常值流入，模板解析可能失敗 → Mitigation：沿用現有 key 解析防呆，對非法 key 明確拋錯。
