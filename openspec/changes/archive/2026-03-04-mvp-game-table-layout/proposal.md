## Why

目前 `game-table-layout` 規格已定義桌面結構，但尚無任何 UI 實作。需要以假資料渲染驗證視覺設計與尺寸計算是否可行，作為後續接入真實遊戲邏輯的基礎。

## What Changes

- 實作四列式主桌面 layout（方案 A：垂直堆疊）
- AI 玩家列使用 Unicode 背面（🀫）顯示手牌、自訂牌面顯示副露與最新棄牌
- 玩家列固定高度 20 行，含手牌（自訂牌面）、固定資訊欄（右側）、熱鍵提示
- 最小視窗守衛：寬度 < 140 或高度 < 40 時顯示警告畫面，阻止遊戲啟動
- 以假資料（hardcode 手牌陣列）驗證渲染，不接入遊戲邏輯

## Capabilities

### New Capabilities

- `minimum-window-guard`：偵測 terminal 視窗尺寸，未達最小需求時全畫面顯示警告，達標後自動恢復
- `player-info-panel`：玩家列右側固定欄位，顯示摸牌或剛棄牌的牌面資訊，常駐但內容依狀態更新

### Modified Capabilities

- `game-table-layout`：補充最小視窗尺寸限制（MIN_WIDTH=140, MIN_HEIGHT=40）、玩家列固定高度 20 行、台灣規則 16 張手牌（摸牌後 17 張）

## Impact

- 新增 `tui/src/game-table/` 目錄，包含主桌面 React 元件
- 依賴 `tui/src/tiles/text-render.ts` 的 `renderTileTextTemplate` 渲染自訂牌面
- 使用 OpenTUI React reconciler、`useTerminalDimensions` hook
- 不影響現有 `tui/src/tiles/` 邏輯，純 UI 層新增
