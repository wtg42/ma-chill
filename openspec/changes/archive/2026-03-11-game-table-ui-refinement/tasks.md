## 1. 背面牌 Template

- [x] 1.1 在 `text-render.ts` 的 `resolveTileTextTemplateByKey()` 新增 `"tile-back"` key，top/bottom 皆為 `░░░░░`

## 2. LatestTileBox 元件

- [x] 2.1 建立 `tui/src/game-table/LatestTileBox.tsx`，接受 `tile: CanonicalTile | null` prop
- [x] 2.2 有牌時顯示完整牌面（7×4），無牌時空白佔位（固定寬度）
- [x] 2.3 無任何 label 文字

## 3. MeldGroup 元件

- [x] 3.1 建立 `tui/src/game-table/MeldGroup.tsx`，接受 `tiles[]`、`type`、`sourceTileIndex`、`viewerIsOwner` props
- [x] 3.2 實作吃牌（chi）排列：依 `sourceTileIndex` 強制置中，其餘按數字順序分兩側
- [x] 3.3 實作碰牌（pon）：三張正面排列
- [x] 3.4 實作明槓（open_kong）：四張正面排列
- [x] 3.5 實作玩家暗槓（closed_kong，viewerIsOwner=true）：四張正面 + dimmed 樣式
- [x] 3.6 實作 AI 暗槓（closed_kong，viewerIsOwner=false）：四張背面牌（使用 tile-back template）

## 4. MeldRow 元件

- [x] 4.1 建立 `tui/src/game-table/MeldRow.tsx`，接受 `melds[]` prop
- [x] 4.2 固定高度佔位（完整牌面高度 4 行 + 邊距），無副露時顯示空白
- [x] 4.3 有副露時由左至右排列 MeldGroup

## 5. PlayerRow 更新

- [x] 5.1 在 `PlayerRow` 頂部加入 `MeldRow`（副露在上方）
- [x] 5.2 手牌末端加入 `LatestTileBox`（有 gap 區隔）
- [x] 5.3 摸牌改用 `space` 鍵打出（固定鍵），更新 hotkeys 列標示
- [x] 5.4 移除舊的 `renderInfoPanel()`（已由 LatestTileBox 取代）
- [x] 5.5 更新 props 介面，加入 `melds[]`

## 6. AiPlayerRow 重構

- [x] 6.1 重構 `AiPlayerRow.tsx`：副露列（MeldGroup inline）+ `🀫×N` + LatestTileBox
- [x] 6.2 固定高度與完整牌面對齊
- [x] 6.3 LatestTileBox 只在 AI 棄牌後顯示，其他時機空白
- [x] 6.4 移除舊的 `DiscardPanel` 引用

## 7. StatusBar 更新

- [x] 7.1 熱鍵列依當前可用動作動態灰化（c/p/k/h/r）
- [x] 7.2 移除放棄鍵提示（pass 改為背景倒數）
- [x] 7.3 `space` 鍵提示加入手牌 hotkeys 列末端（視覺 gap 後）

## 8. DiscardHistoryPopup

- [x] 8.1 建立 `tui/src/game-table/DiscardHistoryPopup.tsx`
- [x] 8.2 全場棄牌分組顯示（同牌合併，顯示牌圖示 + 數量）
- [x] 8.3 `tab` 鍵 toggle 開關，僅在玩家回合有效
- [x] 8.4 與 GameInfoPopup 互斥（開一個時關閉另一個）

## 9. GameInfoPopup

- [x] 9.1 建立 `tui/src/game-table/GameInfoPopup.tsx`
- [x] 9.2 顯示局風、局數、牌山剩餘張數
- [x] 9.3 `\`（反斜線）鍵 toggle 開關，任何時機均可使用
- [x] 9.4 與 DiscardHistoryPopup 互斥

## 10. Fake Data 更新與整合測試

- [x] 10.1 更新 `fake-data.ts`，加入副露範例資料（含各種類型）
- [x] 10.2 確認 GameTable 畫面在各 fake data 情境下正常顯示
- [x] 10.3 確認兩個 Popup 的互斥邏輯正常運作
