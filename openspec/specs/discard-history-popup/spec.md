## Purpose

定義棄牌歷史 Popup 的顯示內容與開關機制，讓玩家在回合中可查閱場上所有已打出的牌。

## Requirements

### Requirement: tab 鍵切換棄牌歷史 Popup

`DiscardHistoryPopup` SHALL 透過 `tab` 鍵開啟與關閉，採用 toggle 方式。Popup 只有在輪到玩家自己的回合時才可開啟。

#### Scenario: 輪到玩家時按 tab
- **WHEN** 輪到玩家回合，玩家按下 tab
- **THEN** Popup 開啟，顯示全場棄牌歷史

#### Scenario: Popup 開啟時再按 tab
- **WHEN** DiscardHistoryPopup 已開啟，玩家再按 tab
- **THEN** Popup 關閉

#### Scenario: 非玩家回合按 tab
- **WHEN** 非玩家回合（等待 AI 或等待吃碰槓決策），玩家按 tab
- **THEN** 不開啟 Popup，無任何反應

---

### Requirement: 棄牌歷史分組顯示

Popup 內容 SHALL 將全場所有棄牌按牌面合併分組，每組顯示一張牌圖示加數量，不區分是哪個玩家打出的。

#### Scenario: 有棄牌紀錄
- **WHEN** Popup 開啟且場上已有棄牌
- **THEN** 每種牌顯示一個圖示（7×4 牌面）搭配出現次數數字，相同牌合併為一組

#### Scenario: 尚無棄牌
- **WHEN** Popup 開啟但場上尚無棄牌
- **THEN** 顯示空白或靜態提示（如「尚無棄牌」）
