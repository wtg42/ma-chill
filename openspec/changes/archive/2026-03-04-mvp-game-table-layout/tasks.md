## 1. 專案結構建立

- [x] 1.1 建立 `tui/src/game-table/` 目錄與入口檔案 `index.tsx`
- [x] 1.2 確認 OpenTUI React reconciler 與 `useTerminalDimensions` 可正常 import

## 2. 最小視窗守衛

- [x] 2.1 實作 `<TooSmallWarning>` 元件，顯示最小需求（140×40）與目前尺寸
- [x] 2.2 在 App root 以 `useTerminalDimensions` 判斷尺寸，低於閾值時渲染 `<TooSmallWarning>`
- [x] 2.3 驗證：縮小 terminal 視窗觸發警告，放大後自動恢復

## 3. 假資料準備

- [x] 3.1 建立 `tui/src/game-table/fake-data.ts`，hardcode 16 張玩家手牌、3 個 AI 各 13 張背面、各家最新棄牌

## 4. AI 玩家列元件

- [x] 4.1 實作 `<AiPlayerRow>` 元件，接受名稱/風位、手牌張數、最新棄牌 props
- [x] 4.2 手牌區以 🀫 Unicode 背面顯示（張數對應）
- [x] 4.3 最新棄牌欄位右側顯示自訂牌面（使用 `renderTileTextTemplate`）
- [x] 4.4 以假資料渲染三個 AI 列，目視確認比例與對齊

## 5. 玩家列元件

- [x] 5.1 實作 `<PlayerRow>` 元件框架，固定 `height={20}`
- [x] 5.2 手牌區：以 `renderTileTextTemplate` 渲染 16 張牌面，下方對應熱鍵標示
- [x] 5.3 右側資訊欄：常駐固定寬度，顯示摸牌/棄牌牌面（假資料：預設顯示一張摸到的牌）
- [x] 5.4 底部熱鍵提示列：顯示可用操作（假資料：固定顯示打牌/吃/碰/槓/胡）
- [x] 5.5 以假資料渲染玩家列，目視確認 17 張牌（16+1）可在 140 寬度內顯示

## 6. 主桌面組合

- [x] 6.1 實作 `<GameTable>` 元件，組合三個 `<AiPlayerRow>` + 一個 `<PlayerRow>`
- [x] 6.2 根容器設定 `flexDirection="column" width="100%" height="100%"`
- [x] 6.3 整合 `<TooSmallWarning>` 守衛於 App root

## 7. 視覺驗證

- [x] 7.1 在正常尺寸（≥140×40）下確認四列比例正確、各區域資訊可讀
- [x] 7.2 縮小視窗至寬 139 或高 39，確認警告畫面出現
- [x] 7.3 在不同終端機字體下確認牌面對齊無偏移
