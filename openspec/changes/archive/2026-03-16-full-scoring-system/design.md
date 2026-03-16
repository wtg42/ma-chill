## Context

目前 `rules/scoring.zig` 只有 `self_draw` 和 `pinfu` 兩個 pattern，`ScoreResult.lines` 硬編碼為 2 個 slot。需要擴充為完整台灣麻將計番系統，支援 17 種牌型，且多種牌型可疊加（如字一色 + 對對胡 = 12 台）。

此 change 依賴 `seat-wind-system` 提供的 `seat_winds` 資料（座風刻、花牌歸屬判定需要）。

## Goals / Non-Goals

**Goals:**
- 實作完整台灣麻將計番邏輯（17 種牌型，台數無上限）
- 移除平胡（pinfu）
- 牌型判定基於手牌 + 副露 + 花牌 + 胡牌上下文
- `game_over` 訊息傳送計番明細給 TUI
- TUI 顯示胡牌結果與台數明細

**Non-Goals:**
- 連莊加台、拉莊等多局計分規則
- 特殊地方規則（如各地變體）
- 底台 / 基本台數設定
- 金額結算

## Decisions

### Decision 1：ScoreResult 改為動態陣列

現有 `ScoreResult.lines: [2]?ScoreLine` 最多只容納 2 個 pattern。台灣麻將可能同時命中多個牌型（如門清 + 自摸 + 對對胡 + 字一色 = 4 個 pattern），改為 `ArrayList(ScoreLine)` 或固定上限陣列。

**選擇**：使用固定 `[16]?ScoreLine` 陣列。17 種牌型不可能全部同時命中（互斥的如清一色/字一色），16 slot 足夠。避免 allocator 依賴。

### Decision 2：WinContext 重新設計

現有 `WinContext` 只有 `self_draw` 和 `pinfu` 兩個 bool。新設計需包含所有計番所需資訊：

```
WinContext {
    hand: []const Tile,           // 手牌（不含副露）
    melds: []const Meld,          // 副露列表
    bonus_tiles: []const Tile,    // 花牌
    winning_tile: Tile,           // 胡的那張牌
    seat_wind: RoundWind,         // 座位風（門風）
    round_wind: RoundWind,        // 圈風
    self_draw: bool,              // 是否自摸
    is_concealed: bool,           // 是否門清（無副露）
    is_dealer: bool,              // 是否莊家（天胡判定用）
    is_first_draw: bool,          // 是否第一次摸牌（地胡判定用）
    is_first_round_no_claims: bool, // 第一輪且無人吃碰（人胡判定用）
}
```

### Decision 3：牌型判定架構

每個牌型一個判定函數，簽名統一為 `fn(ctx: *const WinContext) ?ScoreLine`，回傳 `null` 表示不符合。主函數 `calculateFan` 依序呼叫所有判定函數，收集非 null 結果。

```
calculateFan(ctx) → ScoreResult
  ├── checkSelfDraw(ctx)         →  1台
  ├── checkConcealed(ctx)        →  1台
  ├── checkSingleWait(ctx)       →  1台
  ├── checkSeatWind(ctx)         →  1台
  ├── checkRoundWind(ctx)        →  1台
  ├── checkAllTriplets(ctx)      →  4台
  ├── checkSmallThreeDragons(ctx)→  4台
  ├── checkBigThreeDragons(ctx)  →  8台
  ├── checkFlush(ctx)            →  8台
  ├── checkAllHonors(ctx)        →  8台
  ├── checkSmallFourWinds(ctx)   →  8台
  ├── checkEightImmortals(ctx)   →  8台
  ├── checkHumanWin(ctx)         →  8台
  ├── checkBigFourWinds(ctx)     → 16台
  ├── checkEarthWin(ctx)         → 16台
  ├── checkHeavenWin(ctx)        → 24台
  └── checkOwnFlowers(ctx)       →  N台
```

**疊加規則**：所有牌型獨立判定，全部疊加。互斥的牌型（如大三元成立時小三元不成立）由各自的判定邏輯自然排除，不需額外處理。

### Decision 4：單吊（單騎）判定

單吊指聽牌時只等一張牌。判定方式：從完成的胡牌中移除 winning_tile，檢查剩餘牌是否只有一種合法拆法且 winning_tile 位於將（pair）中。

**簡化方案**：只檢查 winning_tile 是否作為 pair 的一部分完成胡牌。如果移除 winning_tile 後，剩餘手牌可以完全拆成面子（無需再選 pair），則為單吊。

### Decision 5：GameState 追蹤首輪狀態

為了判定天胡/地胡/人胡，`GameState` 需追蹤：
- `turn_count: u32`：回合數（0 為起始）
- `any_claims_made: bool`：是否有任何吃/碰/槓發生

天胡：`turn_count == 0 && is_dealer && self_draw`
地胡：`turn_count == player_first_draw && !is_dealer && self_draw`
人胡：第一輪放槍，且 `!any_claims_made`

### Decision 6：game_over 訊息格式

```json
{
  "type": "game_over",
  "winner_id": 0,
  "scores": [24, -8, -8, -8],
  "scoring_detail": {
    "total_fan": 5,
    "lines": [
      { "pattern": "self_draw", "fan": 1 },
      { "pattern": "concealed", "fan": 1 },
      { "pattern": "all_triplets", "fan": 4 }
    ]
  }
}
```

`scoring_detail` 為 `null` 時表示流局。

### Decision 7：TUI GameOver 畫面

新增 `GameOverScreen` component，在 `game_over` 訊息後顯示：
- 贏家資訊（或流局）
- 台數明細列表
- 「按任意鍵結束」

App 狀態新增 `game_over` 階段：`lobby` → `playing` → `game_over`。

## Risks / Trade-offs

- **[牌型判定正確性]** 台灣麻將規則細節多，特別是邊界案例（如大三元自動包含小三元嗎？不，大三元成立時小三元判定自然為 false） → 用大量單元測試覆蓋每種牌型
- **[ScoreResult 固定陣列]** 16 slot 可能不夠（理論最大同時命中數） → 實際上不可能超過 10 個同時成立，16 很安全
- **[首輪狀態追蹤]** 天胡/地胡/人胡需要 GameState 新增欄位，增加複雜度 → 只加兩個欄位（turn_count + any_claims_made），影響小
