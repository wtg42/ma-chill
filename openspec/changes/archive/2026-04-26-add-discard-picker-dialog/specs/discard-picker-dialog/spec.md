## ADDED Requirements

### Requirement: 玩家可開啟棄牌 dialog
系統 SHALL 在玩家自己的回合且目前可執行 `discard` 時，提供一個本地 discard dialog 作為專用棄牌入口。玩家透過 `<leader>+d` 開啟該 dialog 後，畫面 MUST 顯示目前手牌與摸到的牌（若存在），且不得立即送出棄牌動作。

#### Scenario: 自己回合可開啟棄牌 dialog
- **WHEN** 玩家處於 `self_turn`，且 `available_actions` 包含 `discard`，然後按下 `<leader>+d`
- **THEN** 系統開啟 discard dialog，顯示目前可棄的牌，且尚未送出任何 IPC action

#### Scenario: 非棄牌時機不可開啟 dialog
- **WHEN** 玩家不在 `self_turn`，或目前 `available_actions` 不含 `discard`
- **THEN** 系統不得開啟 discard dialog，並維持既有輸入狀態

### Requirement: discard dialog 顯示牌面與短 label
discard dialog SHALL 為每張可棄牌項目顯示 ASCII 牌面與對應短 label。短 label MUST 與既有 `/discard` 指令接受的 token 規則一致，例如數牌使用 `7p`、`3m`、`5s`，風牌與三元牌使用 `east`、`north`、`red`、`green`、`white` 等既有表示。

若玩家有摸牌，該牌 MUST 在 dialog 中以可辨識方式與一般手牌區分，但仍屬可聚焦、可棄牌項目。

#### Scenario: 數牌顯示短 label
- **WHEN** discard dialog 顯示一張七筒
- **THEN** 該項目在 ASCII 牌面下方顯示 `7p` 作為短 label

#### Scenario: 字牌顯示短 label
- **WHEN** discard dialog 顯示一張東風
- **THEN** 該項目在 ASCII 牌面下方顯示 `east` 作為短 label

#### Scenario: 摸牌在 dialog 中可辨識
- **WHEN** 玩家目前有 `drawn_tile_id`
- **THEN** discard dialog 將摸牌顯示為可聚焦的獨立項目，且玩家能清楚分辨它與一般手牌

### Requirement: discard dialog 支援方向鍵導覽
discard dialog SHALL 提供鍵盤焦點導覽。使用者按左右鍵時 MUST 在同列可棄牌項目間移動焦點；按上下鍵時 MUST 在相鄰列之間移動到最接近目前欄位的位置；若目標方向不存在下一個可聚焦項目，焦點 SHALL 保持在原位。

系統 MUST 在 dialog 中維持唯一焦點項目，並以可見樣式標示目前即將棄掉的牌。

#### Scenario: 左右鍵移動同列焦點
- **WHEN** discard dialog 已開啟，且目前焦點不在列邊界，玩家按下 Left 或 Right
- **THEN** 焦點移動到同列相鄰的可棄牌項目

#### Scenario: 上下鍵跨列移動焦點
- **WHEN** discard dialog 已開啟，且目前列的上方或下方存在其他可棄牌列
- **THEN** 焦點移動到相鄰列中最接近原欄位的位置

#### Scenario: 邊界方向鍵不移動焦點
- **WHEN** discard dialog 已開啟，且玩家在最左、最右、最上或最下邊界按向外方向鍵
- **THEN** 焦點維持在原本的牌項目上

### Requirement: discard dialog 可確認或取消
玩家在 discard dialog 中按下 Enter 時，系統 SHALL 以目前焦點項目的 tile identity 執行一次等價於既有 `discard` 命令語義的棄牌流程；按下 Esc 時，系統 SHALL 關閉 dialog，且不得改變遊戲狀態或送出棄牌 action。

確認棄牌後，系統 MUST 關閉 discard dialog、清除目前 prompt，並沿用既有 discard action 的後續 state update / turn_changed 流程。

#### Scenario: Enter 確認棄牌
- **WHEN** discard dialog 已開啟，且玩家按下 Enter
- **THEN** 系統以焦點牌執行一次合法的 discard 流程，關閉 dialog，並進入既有棄牌後續流程

#### Scenario: Esc 取消 dialog
- **WHEN** discard dialog 已開啟，且玩家按下 Esc
- **THEN** 系統關閉 dialog，不送出任何棄牌 action，且遊戲狀態保持不變
