## Why

MVP 的 `PlayerRow` 和 `AiPlayerRow` 尚未實作副露（吃/碰/槓）顯示，各子元件（`MeldGroup`、`HandTiles`、`LatestTileBox`、`StatusBar`、Popup 系列）的設計規格也尚未定義。在進入完整遊戲邏輯前，需要將這些 UI 元件的視覺規則與互動行為明確規格化。

## What Changes

- **新增** `MeldGroup` 元件：依副露類型（吃/碰/明槓/暗槓）渲染副露牌組，吃牌強制置中，暗槓依身份顯示不同牌面
- **新增** `MeldRow`：固定高度佔位容器，排列多組副露，放置於手牌上方
- **新增** 自定義背面牌樣式：使用 `░` 填充，與現有牌面框格式一致（7×4）
- **新增** `LatestTileBox`：單張牌顯示元件，inline 放在手牌/副露後方，以 gap 區隔
- **修改** `HandTiles`：摸牌改用方案 C（gap 分離 + 固定鍵 `space`），無 label
- **修改** `AiPlayerRow`：重構為副露為主體，手牌改用 `🀫×N` 緊湊顯示，固定高度
- **修改** `StatusBar`：熱鍵依當前可用動作灰化，pass 改為背景倒數（5 秒，可設定），不顯示計時
- **新增** `DiscardHistoryPopup`：`tab` 切換開關，輪到玩家時才能開，全場棄牌分組顯示（同牌合併 + 數量）
- **新增** `GameInfoPopup`：`\` 切換開關，顯示局風、局數、剩餘牌山等遊戲狀態

## Capabilities

### New Capabilities

- `meld-display`: 副露牌組渲染規則，含吃/碰/明槓/暗槓四種類型的視覺排版及來源牌位置規則
- `tile-back-design`: 自定義背面牌樣式（`░` 填充，7×4 框），用於暗槓（AI）及手牌背面
- `latest-tile-box`: 最新摸/棄牌的單張顯示元件規格
- `discard-history-popup`: 全場棄牌歷史 Popup 的觸發、顯示、關閉規則
- `game-info-popup`: 遊戲狀態 Popup 的觸發與顯示規格

### Modified Capabilities

- `keyboard-interaction`: 新增 `space`（棄摸牌）、`tab`（切換棄牌歷史）、`\`（切換遊戲資訊）；pass 改為背景倒數，移除顯式 pass 鍵
- `player-info-panel`: HandTiles 摸牌方案更新（方案 C）；AiPlayerRow 重構為副露主導；StatusBar 動作灰化邏輯

## Impact

- `tui/src/game-table/PlayerRow.tsx`：加入 MeldRow、更新 HandTiles 摸牌邏輯
- `tui/src/game-table/AiPlayerRow.tsx`：完整重構
- `tui/src/game-table/DiscardPanel.tsx`：釐清職責（最新棄牌 inline → `LatestTileBox`，歷史棄牌 → Popup）
- `tui/src/tiles/text-render.ts`：新增背面牌 template
- 新增 `MeldGroup.tsx`、`MeldRow.tsx`、`LatestTileBox.tsx`、`DiscardHistoryPopup.tsx`、`GameInfoPopup.tsx`
