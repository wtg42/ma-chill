## 1. Zig Core：移除平胡與重構基礎結構

- [x] 1.1 移除 `ScoringPattern.pinfu` 與 `WinContext.pinfu`，刪除相關測試
- [x] 1.2 重新設計 `WinContext` 結構：hand, melds, bonus_tiles, winning_tile, seat_wind, round_wind, self_draw, is_concealed, is_dealer, is_first_draw, is_first_round_no_claims
- [x] 1.3 `ScoreResult.lines` 改為 `[16]?ScoreLine`，`line_count` 上限調整為 16
- [x] 1.4 重新命名 `calculateBasicFan` → `calculateFan`，改為接收新的 `WinContext`

## 2. Zig Core：基本牌型判定

- [x] 2.1 實作 `checkSelfDraw`（自摸 1 台）
- [x] 2.2 實作 `checkConcealed`（門清 1 台，暗槓不破壞門清）
- [x] 2.3 實作 `checkSingleWait`（單吊 1 台）
- [x] 2.4 實作 `checkRoundWindTriplet`（圈風刻 1 台）
- [x] 2.5 實作 `checkSeatWindTriplet`（座風刻 1 台）
- [x] 2.6 為上述 5 個判定函數撰寫單元測試

## 3. Zig Core：進階牌型判定

- [x] 3.1 實作 `checkAllTriplets`（對對胡 4 台）
- [x] 3.2 實作 `checkSmallThreeDragons`（小三元 4 台，大三元成立時不計）
- [x] 3.3 實作 `checkBigThreeDragons`（大三元 8 台）
- [x] 3.4 實作 `checkFlush`（清一色 8 台）
- [x] 3.5 實作 `checkAllHonors`（字一色 8 台）
- [x] 3.6 實作 `checkSmallFourWinds`（小四喜 8 台，大四喜成立時不計）
- [x] 3.7 實作 `checkBigFourWinds`（大四喜 16 台）
- [x] 3.8 為上述 7 個判定函數撰寫單元測試

## 4. Zig Core：花牌與特殊胡法

- [x] 4.1 實作 `checkOwnFlowers`（花牌計番版本 B：僅自己的花，每張 1 台）
- [x] 4.2 實作 `checkEightImmortals`（八仙過海 8 台：集齊 8 張花）
- [x] 4.3 實作 `checkHumanWin`（人胡 8 台）
- [x] 4.4 實作 `checkEarthWin`（地胡 16 台）
- [x] 4.5 實作 `checkHeavenWin`（天胡 24 台）
- [x] 4.6 為上述 5 個判定函數撰寫單元測試

## 5. Zig Core：GameState 首輪狀態追蹤

- [x] 5.1 `GameState` 新增 `turn_count: u32` 與 `any_claims_made: bool` 欄位
- [x] 5.2 `playRound` 在每次行動後遞增 `turn_count`，吃/碰/槓時設定 `any_claims_made = true`

## 6. Zig Core：game_over 計番整合

- [x] 6.1 `playRound` 在胡牌時組裝 `WinContext` 並呼叫 `calculateFan`
- [x] 6.2 `protocol.zig` 新增 `ScoringDetail` 訊息結構（total_fan + lines 陣列）
- [x] 6.3 `game_over` 訊息格式新增 `scoring_detail` 欄位（胡牌時為 ScoringDetail，流局時為 null）
- [x] 6.4 `ScoringDetail` JSON 序列化：pattern 以英文字串輸出（如 `"self_draw"`、`"all_triplets"`）

## 7. TUI：game_over 處理與顯示

- [x] 7.1 `game-state/index.ts` 新增 `ZigGameOverMessage` 型別（含 scoring_detail）與 `applyGameOver` 方法
- [x] 7.2 `connection.ts` 新增 `game_over` 訊息處理，呼叫 `store.applyGameOver`
- [x] 7.3 新增 `game-table/GameOverScreen.tsx` component，顯示贏家、台數明細、按鍵結束提示
- [x] 7.4 pattern 英文→中文對照表（如 `self_draw` → `自摸`、`all_triplets` → `對對胡`）
- [x] 7.5 App component 新增 `game_over` 狀態，收到 game_over 後顯示 GameOverScreen
- [x] 7.6 GameOverScreen 監聽任意鍵按下，觸發程式結束
