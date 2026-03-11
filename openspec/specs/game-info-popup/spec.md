## Purpose

定義遊戲資訊 Popup 的顯示內容與開關機制，讓玩家可隨時查閱局風、局數、牌山剩餘等遊戲狀態資訊。

## Requirements

### Requirement: 反斜線鍵切換遊戲資訊 Popup

`GameInfoPopup` SHALL 透過 `\`（反斜線）鍵開啟與關閉，採用 toggle 方式。

#### Scenario: 按下反斜線開啟
- **WHEN** 玩家按下 `\`
- **THEN** GameInfoPopup 開啟，顯示遊戲狀態資訊

#### Scenario: Popup 開啟時再按反斜線
- **WHEN** GameInfoPopup 已開啟，玩家再按 `\`
- **THEN** Popup 關閉

---

### Requirement: 遊戲資訊顯示內容

`GameInfoPopup` SHALL 顯示以下資訊：局風、當前局數、牌山剩餘張數。

#### Scenario: 開啟 Popup
- **WHEN** GameInfoPopup 開啟
- **THEN** 顯示局風（東/南/西/北風）、局數（第幾局）、牌山剩餘張數

---

### Requirement: 同一時間只開一個 Popup

`GameInfoPopup` 與 `DiscardHistoryPopup` SHALL 不同時開啟。開啟其中一個時，另一個若已開啟則自動關閉。

#### Scenario: 開啟 GameInfoPopup 時 DiscardHistoryPopup 已開啟
- **WHEN** DiscardHistoryPopup 已開啟，玩家按下 `\`
- **THEN** DiscardHistoryPopup 關閉，GameInfoPopup 開啟
