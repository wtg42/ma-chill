## ADDED Requirements

### Requirement: AI 決策介面
系統 SHALL 提供 `ai.decide(game_state, player_id, personality) → Action` 函數，供三位 AI 對手各自呼叫。三位 AI 共用同一套決策邏輯，以不同個性參數區分行為。

#### Scenario: AI 回合決策
- **WHEN** 輪到 AI 玩家（player_id 1–3）
- **THEN** Zig core 呼叫 `ai.decide()`，取得 Action 後執行，並推送 state_update

#### Scenario: AI 只看自己視角
- **WHEN** `ai.decide()` 被呼叫
- **THEN** 傳入的 game_state 視角已過濾：AI 只能看到自己的手牌、所有人的副露與棄牌堆、牌山剩餘張數，看不到其他玩家的手牌

---

### Requirement: AI 個性參數系統
系統 SHALL 支援 `AiPersonality` 結構，包含以下靜態傾向與情境感知參數：

- `aggression`（f32, 0–1）：0 = 有牌就胡，1 = 追求大台
- `meld_tendency`（f32, 0–1）：0 = 純手胡，1 = 積極吃碰
- `defense`（f32, 0–1）：0 = 無視放槍風險，1 = 高防守意識
- `score_sensitive`（f32, 0–1）：0 = 無視分數差距，1 = 落後/領先時改變策略
- `wall_sensitive`（f32, 0–1）：0 = 無視牌山剩餘，1 = 快流局時降低胡牌標準

#### Scenario: 保守型 AI
- **WHEN** AI 個性 aggression=0.1、defense=0.8
- **THEN** AI 傾向盡早胡牌，遇到危險牌時打安全牌而非追大台

#### Scenario: 激進型 AI
- **WHEN** AI 個性 aggression=0.9、defense=0.1
- **THEN** AI 追求大台，對放槍風險容忍度高

#### Scenario: 情境感知（score_sensitive）
- **WHEN** AI 分數遠低於其他玩家且 score_sensitive=0.8
- **THEN** AI 降低胡牌標準，優先求胡而非追大台

---

### Requirement: 安全牌分析
系統 SHALL 提供 `safety.analyzeTile(tile_id, public_state) → DangerLevel` 函數，從全場棄牌堆與副露推導某張牌的危險程度。DangerLevel 為枚舉值（safe / low / medium / high）。

#### Scenario: 已大量出現的牌較安全
- **WHEN** 一張牌在棄牌堆中已出現 3 張（共 4 張同種牌）
- **THEN** analyzeTile 回傳 safe，因為只剩 1 張在場上流通

#### Scenario: 可能成為他人等待的牌危險
- **WHEN** 某花色的中段牌（如 5）在場上棄牌少，且有玩家副露該花色順子
- **THEN** analyzeTile 回傳 medium 或 high

---

### Requirement: AI 預設個性 preset
系統 SHALL 提供三個預設個性：`conservative`、`aggressive`、`balanced`，作為三位 AI 對手的預設配置。

#### Scenario: 預設對局配置
- **WHEN** 開始新對局
- **THEN** 三位 AI 各套用不同 preset，讓玩家面對多樣化的對手風格
