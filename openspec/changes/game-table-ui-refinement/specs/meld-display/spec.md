## ADDED Requirements

### Requirement: 吃牌（chi）排列規則

吃牌 SHALL 顯示三張牌，來源牌（從上家吃入的牌）強制置於中間位置，其餘兩張按數字大小分列兩側（左小右大）。

#### Scenario: 吃中間張
- **WHEN** 玩家吃入的牌數值介於手牌兩張之間（如手有 3、4，吃了 5 → 吃 4-5-6 中的 5）
- **THEN** 顯示順序為 [小][來源牌][大]

#### Scenario: 吃頭張
- **WHEN** 玩家吃入的牌數值最小（如手有 4、5，吃了 3）
- **THEN** 顯示順序為 [4][3][5]，來源牌置中，其餘按大小分兩側

#### Scenario: 吃尾張
- **WHEN** 玩家吃入的牌數值最大（如手有 3、4，吃了 5）
- **THEN** 顯示順序為 [3][5][4]，來源牌置中，其餘按大小分兩側

---

### Requirement: 碰牌（pon）顯示

碰牌 SHALL 顯示三張相同的牌，全部正面朝上排列。

#### Scenario: 碰牌顯示
- **WHEN** 副露類型為 pon
- **THEN** 顯示三張完整牌面，左至右排列

---

### Requirement: 明槓（open_kong）顯示

明槓 SHALL 顯示四張相同的牌，全部正面朝上排列。

#### Scenario: 明槓顯示
- **WHEN** 副露類型為 open_kong
- **THEN** 顯示四張完整牌面，左至右排列

---

### Requirement: 玩家暗槓（closed_kong）顯示

玩家自己的暗槓 SHALL 顯示四張牌，牌面正常渲染但以 dimmed 樣式表示，讓玩家知道牌面內容，但視覺上區別於正常手牌。

#### Scenario: 玩家暗槓顯示
- **WHEN** 副露類型為 closed_kong 且觀看者為牌組擁有者
- **THEN** 顯示四張完整牌面，套用 dimmed 樣式

---

### Requirement: AI 暗槓（closed_kong）顯示

AI 的暗槓 SHALL 全部顯示背面牌，對玩家不透明。

#### Scenario: AI 暗槓顯示
- **WHEN** 副露類型為 closed_kong 且觀看者非牌組擁有者
- **THEN** 顯示四張背面牌（使用 tile-back-design 規格的樣式）

---

### Requirement: MeldRow 固定高度佔位

`MeldRow` SHALL 永遠佔據固定高度（等同完整牌面高度 4 行 + 邊距），無論是否有副露存在。

#### Scenario: 無副露時
- **WHEN** 玩家尚未吃碰槓
- **THEN** MeldRow 顯示空白，但高度不變，不影響下方手牌區位置

#### Scenario: 有副露時
- **WHEN** 玩家有一組或多組副露
- **THEN** MeldRow 顯示對應的 MeldGroup 元件，由左至右排列
