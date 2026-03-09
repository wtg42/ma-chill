## ADDED Requirements

### Requirement: 台灣麻將牌局初始化
系統 SHALL 在開局時洗牌並發牌，每位玩家各得 16 張手牌（台灣規則），剩餘 80 張為牌山。花牌摸到後自動補牌。

#### Scenario: 發牌完成
- **WHEN** 開局初始化
- **THEN** 四位玩家各有 16 張手牌（含花牌補牌後），牌山剩餘 = 144 - 64 - 補花數量

#### Scenario: 花牌自動補牌
- **WHEN** 發牌或摸牌時玩家取得花牌
- **THEN** 系統自動從牌山補一張，持續直到非花牌為止

---

### Requirement: 回合推進邏輯
系統 SHALL 按順序推進回合：莊家先摸牌 → 棄牌 → 下家可吃/碰/槓/胡 → 依序循環。

#### Scenario: 正常回合
- **WHEN** 當前玩家完成棄牌且無人要求副露
- **THEN** 輪到下一位玩家摸牌，推送 turn_changed

#### Scenario: 碰/槓優先於吃
- **WHEN** 有玩家可吃且另一玩家可碰/槓同一張牌
- **THEN** 碰/槓優先，吃的機會取消

---

### Requirement: 合法動作判定
系統 SHALL 在每次輪到玩家前計算可用動作列表，只允許合法動作：
- 吃（chi）：需為下家，且手牌能組成順子
- 碰（pon）：手牌有兩張相同牌
- 明槓（open_kong）：手牌有三張相同牌
- 暗槓（closed_kong）：手牌有四張相同牌
- 胡（win）：符合台灣麻將胡牌條件
- 棄牌（discard）：永遠合法（輪到自己時）

#### Scenario: 不合法動作被拒絕
- **WHEN** TUI 傳送不在可用動作列表內的 player_action
- **THEN** Zig 忽略該動作，不改變遊戲狀態

---

### Requirement: 流局判定
系統 SHALL 在牌山摸盡（剩 0 張）且無人胡牌時判定流局，結束本局。

#### Scenario: 流局
- **WHEN** 牌山剩餘張數為 0
- **THEN** 推送 game_over 訊息，winner_id 為 null，表示流局

---

### Requirement: 計番介面
系統 SHALL 提供計番函數介面，輸入胡牌玩家的手牌與副露，輸出台數。此 change 實作基本台數計算，詳細計番規則另行規格化。

#### Scenario: 基本自摸
- **WHEN** 玩家自摸胡牌
- **THEN** 計番結果至少包含自摸台數
