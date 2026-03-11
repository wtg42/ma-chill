## Purpose

在玩家列右側提供常駐的資訊欄，顯示當前玩家摸到的牌（LatestTileBox），使玩家能快速確認最新牌面狀態。

## Requirements

### Requirement: 玩家列右側資訊欄常駐顯示

玩家列的摸牌 SHALL 以 `LatestTileBox` 元件 inline 顯示於手牌列末端，以 gap 視覺區隔，不使用 label 文字，不顯示打出的牌。固定寬度佔位維持不變。

#### Scenario: 玩家摸牌後

- **WHEN** 玩家摸到一張牌
- **THEN** LatestTileBox 顯示該牌完整牌面（7×4 字元），無 label

#### Scenario: 等待他家出牌（無摸牌事件）

- **WHEN** 非玩家回合，LatestTileBox 無需顯示特定牌
- **THEN** LatestTileBox 顯示空白，保留固定寬度佔位

### Requirement: AiPlayerRow 以副露為主體

`AiPlayerRow` SHALL 將副露牌組（`MeldGroup` 列）作為主要顯示內容，手牌改為 `🀫×N` 緊湊文字表示，N 為剩餘手牌張數。元件整體高度固定，與完整牌面高度對齊。

#### Scenario: AI 有副露
- **WHEN** AI 玩家有一組或多組副露
- **THEN** 從左顯示所有 MeldGroup（完整牌面），其後顯示 `🀫×N` 手牌數

#### Scenario: AI 無副露
- **WHEN** AI 玩家尚未吃碰槓
- **THEN** 只顯示 `🀫×N` 手牌數，副露區空白佔位

### Requirement: AiPlayerRow 的 LatestTileBox

`AiPlayerRow` SHALL 在副露/手牌列末端顯示 `LatestTileBox`，以 gap 區隔。AI 摸牌不顯示，僅棄牌後顯示。

#### Scenario: AI 棄牌後
- **WHEN** AI 打出一張牌
- **THEN** LatestTileBox 顯示該牌完整牌面

#### Scenario: AI 非棄牌狀態
- **WHEN** AI 尚未棄牌或輪到其他玩家
- **THEN** LatestTileBox 顯示空白，保留固定寬度佔位
