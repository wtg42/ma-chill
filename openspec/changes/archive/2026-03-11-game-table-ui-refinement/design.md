## Context

MVP 的 `PlayerRow` 和 `AiPlayerRow` 已完成基礎佈局，但尚未支援副露（吃/碰/槓）。各子元件的視覺規則與互動細節尚未正式規格化。目前 `DiscardPanel` 的職責也需要重新釐清（最新棄牌 vs. 歷史棄牌）。

現有相關元件：
- `PlayerRow.tsx`：手牌 + 摸牌 InfoPanel + StatusBar
- `AiPlayerRow.tsx`：風位 + 背面牌 × N + DiscardPanel
- `DiscardPanel.tsx`：最新棄牌 sidebar（需重新定位）
- `tiles/text-render.ts`：牌面 template 系統（7×4）

## Goals / Non-Goals

**Goals:**
- 定義副露元件（`MeldGroup`、`MeldRow`）的視覺規格與排版規則
- 定義背面牌的自訂樣式，與現有牌面系統一致
- 重構 `AiPlayerRow`：副露為主體，手牌改為緊湊顯示
- 明確 `LatestTileBox` 的職責與位置規則
- 定義兩個 Popup 元件（棄牌歷史、遊戲資訊）的觸發與顯示規則
- 更新 `StatusBar` 的熱鍵灰化邏輯與 pass 改為背景倒數

**Non-Goals:**
- 真人對打模式（pass 倒數在真人對打時關閉，但暫不設計）
- 副露後遊戲邏輯的完整狀態管理（僅 UI 規格）
- 動畫效果

## Decisions

### 決定 1：背面牌用 `░` 填充，納入現有 template 系統

**選擇**：在 `text-render.ts` 中新增 `tile-back` template，`top` 和 `bottom` 皆為 `░░░░░`

**理由**：保持一致性，所有牌面（正面/背面）都走同一條渲染路徑，`renderTileTextTemplate()` 可直接使用

**替代方案**：直接 hardcode 背面牌字串 → 缺乏一致性，維護困難

---

### 決定 2：暗槓依身份顯示不同牌面

**選擇**：`MeldGroup` 接受 `viewerIsOwner: boolean` prop

- `viewerIsOwner = true`（玩家自己的暗槓）：正常牌面 + dimmed 樣式
- `viewerIsOwner = false`（AI 的暗槓）：全部顯示背面牌

**理由**：遊戲規則需要讓玩家知道自己的暗槓是什麼牌，但對手的暗槓對玩家不透明

---

### 決定 3：吃牌來源牌強制置中，其餘按數字順序分列兩側

**排列規則**：
```
吃了 X（順子 A-X-B，A < X < B）：
  顯示：[A][X][B]  ← X 天然在中間

吃了頭張 A（順子 A-B-C）：
  顯示：[B][A][C]  ← A 置中，其餘按大小分兩側

吃了尾張 C（順子 A-B-C）：
  顯示：[A][C][B]  ← C 置中，其餘按大小分兩側
```

**理由**：吃牌規則語意清晰，無需額外顏色標記

---

### 決定 4：`DiscardPanel` 職責拆分為兩個獨立元件

| 舊元件 | 新元件 | 職責 |
|--------|--------|------|
| `DiscardPanel`（sidebar） | `LatestTileBox` | inline 最新一張摸/棄牌，無 label |
| （無） | `DiscardHistoryPopup` | 全場歷史棄牌，tab 切換 |

**理由**：兩者職責完全不同，合併在一個元件裡邏輯複雜且難以維護

---

### 決定 5：pass 改為背景倒數 5 秒，不顯示計時 UI

**理由**：省略計時 UI 可增加緊張感，UI 保持乾淨；玩家需要自己感受時間壓力。秒數可在設定中調整。

---

### 決定 6：`AiPlayerRow` 固定高度，副露使用完整牌面圖（7×4）

**理由**：完整牌面與 `PlayerRow` 的 `MeldRow` 保持一致的視覺語言，玩家易於辨認

手牌部分改為 `🀫×N` 純文字，省去不必要的高度

---

### 決定 7：`DiscardHistoryPopup` 只在輪到玩家時可開啟

**理由**：開啟時機單純，避免 AI 動作時 popup 內容跳動；輪到玩家時遊戲靜止，查看歷史最有意義

## Risks / Trade-offs

- **副露 props 尚未整合進遊戲狀態**：目前以 fake-data 驅動，後續接入真實 game state 時介面需確保相容
- **`LatestTileBox` 在 AI row 的時機控制**：AI 棄牌瞬間顯示，其他時機空白，需要明確的狀態流驅動
- **Popup 層級管理**：兩個 Popup 同時存在，需確保 z-index / 遮罩邏輯不衝突（建議同一時間只開一個）
