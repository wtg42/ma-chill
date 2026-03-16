## Purpose

定義台灣麻將計番規則：WinContext 結構、calculateFan 函數介面、以及各牌型的台數判定邏輯。

## Requirements

### Requirement: 計番函數介面
系統 SHALL 提供 `calculateFan(ctx: WinContext) -> ScoreResult` 函數，輸入胡牌上下文，回傳台數明細。ScoreResult 包含 `total_fan`（總台數）與各牌型明細列表。台數無上限，所有符合的牌型全部疊加。

#### Scenario: 多牌型疊加
- **WHEN** 玩家門清自摸對對胡
- **THEN** ScoreResult 包含 concealed(1) + self_draw(1) + all_triplets(4) = total_fan 6

#### Scenario: 無特殊牌型
- **WHEN** 玩家食胡（非自摸）且無任何特殊牌型
- **THEN** ScoreResult 的 total_fan 為 0，lines 為空

### Requirement: WinContext 包含完整胡牌資訊
系統 SHALL 定義 WinContext 結構，包含：hand（手牌，不含副露）、melds（副露列表）、bonus_tiles（花牌）、winning_tile（胡的牌）、seat_wind（門風）、round_wind（圈風）、self_draw（是否自摸）、is_concealed（是否門清）、is_dealer（是否莊家）、is_first_draw（是否第一次摸牌）、is_first_round_no_claims（第一輪且無人吃碰）。

#### Scenario: WinContext 由 playRound 組裝
- **WHEN** 有玩家胡牌
- **THEN** playRound 從 GameState 收集所有必要資訊組裝 WinContext，傳給 calculateFan

### Requirement: 自摸 1 台
系統 SHALL 在玩家自摸胡牌時計 1 台。

#### Scenario: 自摸
- **WHEN** `self_draw = true`
- **THEN** 計番結果包含 `self_draw: 1台`

### Requirement: 門清 1 台
系統 SHALL 在玩家無任何副露（吃/碰/明槓）時計 1 台。暗槓不破壞門清。

#### Scenario: 門清手牌
- **WHEN** `is_concealed = true`（無副露或僅有暗槓）
- **THEN** 計番結果包含 `concealed: 1台`

#### Scenario: 有副露則非門清
- **WHEN** 玩家有吃或碰副露
- **THEN** 不計門清

### Requirement: 單吊 1 台
系統 SHALL 在胡牌時只等一張牌（winning_tile 作為將的一部分）時計 1 台。判定方式：從手牌移除 winning_tile 後，剩餘牌可完全拆成面子（無需選將），表示 winning_tile 完成了唯一的將。

#### Scenario: 單吊將牌
- **WHEN** 手牌除去 winning_tile 後可完全拆為面子
- **THEN** 計番結果包含 `single_wait: 1台`

#### Scenario: 非單吊
- **WHEN** winning_tile 可作為順子或刻子的一部分完成胡牌
- **THEN** 不計單吊

### Requirement: 圈風刻 1 台
系統 SHALL 在手牌或副露中有圈風（round_wind）的刻子時計 1 台。

#### Scenario: 圈風為東且有東刻
- **WHEN** `round_wind = East` 且手牌或副露含三張以上東風
- **THEN** 計番結果包含 `round_wind_triplet: 1台`

### Requirement: 座風刻 1 台
系統 SHALL 在手牌或副露中有座位風（seat_wind）的刻子時計 1 台。

#### Scenario: 座風為南且有南刻
- **WHEN** `seat_wind = South` 且手牌或副露含三張以上南風
- **THEN** 計番結果包含 `seat_wind_triplet: 1台`

#### Scenario: 圈風與座風相同
- **WHEN** 圈風和座風皆為東，且有東刻
- **THEN** 同時計圈風刻 1 台 + 座風刻 1 台 = 共 2 台

### Requirement: 對對胡 4 台
系統 SHALL 在所有面子皆為刻子（無順子）時計 4 台。副露的碰/槓也算刻子。

#### Scenario: 全刻子
- **WHEN** 手牌 + 副露的所有面子皆為刻子或槓
- **THEN** 計番結果包含 `all_triplets: 4台`

### Requirement: 小三元 4 台
系統 SHALL 在手牌或副露中有兩組三元牌（中/發/白）刻子且第三組為將時計 4 台。

#### Scenario: 兩龍刻一龍對
- **WHEN** 中刻 + 發刻 + 白對
- **THEN** 計番結果包含 `small_three_dragons: 4台`

#### Scenario: 大三元成立時不計小三元
- **WHEN** 三組三元牌皆為刻子
- **THEN** 只計大三元，不計小三元

### Requirement: 大三元 8 台
系統 SHALL 在手牌或副露中有三組三元牌（中/發/白）刻子時計 8 台。

#### Scenario: 三龍刻
- **WHEN** 中刻 + 發刻 + 白刻
- **THEN** 計番結果包含 `big_three_dragons: 8台`

### Requirement: 清一色 8 台
系統 SHALL 在手牌與副露的所有牌皆為同一花色（萬/筒/條）且不含字牌時計 8 台。花牌不計入判定。

#### Scenario: 全萬子
- **WHEN** 手牌 + 副露全部為萬子
- **THEN** 計番結果包含 `flush: 8台`

#### Scenario: 含字牌則非清一色
- **WHEN** 手牌中含有風牌或三元牌
- **THEN** 不計清一色

### Requirement: 字一色 8 台
系統 SHALL 在手牌與副露的所有牌皆為字牌（風牌 + 三元牌）時計 8 台。

#### Scenario: 全字牌
- **WHEN** 手牌 + 副露全部為風牌或三元牌
- **THEN** 計番結果包含 `all_honors: 8台`

### Requirement: 小四喜 8 台
系統 SHALL 在手牌或副露中有三組風牌刻子且第四組風牌為將時計 8 台。

#### Scenario: 三風刻一風對
- **WHEN** 東刻 + 南刻 + 西刻 + 北對
- **THEN** 計番結果包含 `small_four_winds: 8台`

#### Scenario: 大四喜成立時不計小四喜
- **WHEN** 四組風牌皆為刻子
- **THEN** 只計大四喜，不計小四喜

### Requirement: 八仙過海 8 台
系統 SHALL 在玩家集齊全部 8 張花牌（春夏秋冬梅蘭菊竹）時計 8 台。

#### Scenario: 集齊八花
- **WHEN** 玩家的 bonus_tiles 包含全部 8 張花牌
- **THEN** 計番結果包含 `eight_immortals: 8台`

### Requirement: 人胡 8 台
系統 SHALL 在閒家於第一輪（無人吃碰前）胡別人的棄牌時計 8 台。

#### Scenario: 第一輪放槍胡
- **WHEN** `!is_dealer && !self_draw && is_first_round_no_claims`
- **THEN** 計番結果包含 `human_win: 8台`

### Requirement: 大四喜 16 台
系統 SHALL 在手牌或副露中有四組風牌（東南西北）刻子時計 16 台。

#### Scenario: 四風刻
- **WHEN** 東刻 + 南刻 + 西刻 + 北刻
- **THEN** 計番結果包含 `big_four_winds: 16台`

### Requirement: 地胡 16 台
系統 SHALL 在閒家第一次摸牌即自摸胡牌時計 16 台。

#### Scenario: 閒家首摸自摸
- **WHEN** `!is_dealer && self_draw && is_first_draw`
- **THEN** 計番結果包含 `earth_win: 16台`

### Requirement: 天胡 24 台
系統 SHALL 在莊家起手牌即為胡牌牌型時計 24 台。

#### Scenario: 莊家起手胡
- **WHEN** `is_dealer && self_draw && is_first_draw`
- **THEN** 計番結果包含 `heaven_win: 24台`

### Requirement: 花牌計番（版本 B）
系統 SHALL 僅計算「自己的花」的台數，每張 1 台。花牌與座位風對應：春/梅→East、夏/蘭→South、秋/菊→West、冬/竹→North。非自己的花不計台。

#### Scenario: 東家拿到春和梅
- **WHEN** `seat_wind = East` 且 bonus_tiles 含春與梅
- **THEN** 計番結果包含 `own_flower: 2台`

#### Scenario: 東家拿到夏
- **WHEN** `seat_wind = East` 且 bonus_tiles 含夏（South 的花）
- **THEN** 夏不算台

### Requirement: 移除平胡
系統 SHALL 移除 `pinfu` scoring pattern，台灣麻將規則不適用此牌型。

#### Scenario: 平胡不存在
- **WHEN** 計番時
- **THEN** 不存在 pinfu pattern，原有 pinfu 相關程式碼與測試全部移除
