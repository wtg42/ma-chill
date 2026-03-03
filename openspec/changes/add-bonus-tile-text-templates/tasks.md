## 1. 花牌模板映射與輸出

- [x] 1.1 擴充花牌 `text_key` 解析邏輯，將 `bonus.season.<ordinal>` 與 `bonus.flower.<ordinal>` 由 placeholder 改為 `ready` 模板。
- [x] 1.2 實作花牌下行字元映射規則（四季：春夏秋冬；四君子：梅蘭菊竹），並以上行顯示 ordinal `1..4`。
- [x] 1.3 保持非法 key 與異常 ordinal 的錯誤處理行為，避免靜默回退為 placeholder。

## 2. 顯示層示範與驗證

- [x] 2.1 更新 `tui/src/index.tsx` 示範資料，加入至少一張四季牌與一張四君子牌的 `ready` 輸出展示。
- [x] 2.2 新增或更新最小驗證案例，確認花牌綁定狀態為 `ready`，且內容符合 ordinal 與字元映射。
- [x] 2.3 檢查現有數牌與字牌行為未被回歸影響（包含白板留白與同語意 copy 的 key 一致性）。
