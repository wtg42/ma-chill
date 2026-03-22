## Context

目前前端規格大多建立在「四列牌桌 + 熱鍵直接觸發動作」的模型上，但產品方向已改為類似 MUD 的回合制 shell game：玩家透過底部命令列輸入 slash 指令操作，畫面中間主要承載事件流與遊戲內容，頂部則顯示當前局況與可用動作。Zig core 仍負責牌局狀態、規則、計番與 AI，前端則負責 command UX、指令解析與顯示。

這個 change 同時跨越畫面結構、互動模型、TUI 本地狀態與 Zig/TUI 邊界，因此需要先用 design 固定幾個核心決策，避免後續一邊實作一邊重新定義產品模型。

## Goals / Non-Goals

**Goals:**
- 建立 command-driven shell 作為主要 UI 模型，讓 slash 指令成為玩家操作遊戲的主入口
- 讓通用組合鍵成為 slash 指令的快捷映射，而不是獨立於命令系統之外的第二套互動規則
- 明確切開責任：前端解析自由文字命令並正規化，Zig core 僅接受結構化 action / intent
- 讓畫面結構以「頂部狀態、中間事件流、底部命令列」為基礎，方便後續新增 slash 功能時持續擴充
- 盡量沿用既有 UDS + JSONL 與 `player_action` 協議邊界，降低 core 與 transport 的重構成本

**Non-Goals:**
- 本 change 不重寫 Zig turn engine、計番規則或 AI 決策邏輯
- 本 change 不在 Zig core 引入自由文字 slash parser
- 本 change 不一次定義所有未來 slash 指令，只先建立命令系統骨架與核心遊戲指令集合
- 本 change 不追求保留舊的四列牌桌視覺模型作為主要畫面

## Decisions

### 決定 1：互動模型以 slash command 為主，快捷鍵只是 command accelerator

**選擇**：所有玩家可執行的互動都先抽象為命令；底部輸入列可直接輸入 slash 指令，常用快捷鍵則映射成同一組命令語義，例如快速棄牌、確認、副露或查詢資訊。

**理由**：這讓產品保持單一操作心智模型。當我們新增遊戲功能時，只要新增 slash 指令與其對應的 normalized action，不需要同時設計一套獨立的 UI widget 與另一套直連核心的快捷鍵流程。

**替代方案**：維持 hotkey-first，slash 指令只做輔助。這會讓新功能仍偏向綁死在特定按鍵與版面配置，與你想要的 MUD 風格不一致。

### 決定 2：前端解析 slash 指令，Zig core 只接受結構化 action / intent

**選擇**：前端負責把 `/discard 7m`、`/pon`、`/status` 等命令解析為本地 command 物件；其中屬於遊戲動作的命令，再轉成既有結構化 `player_action` 或等價 intent 送給 Zig core。Zig 不解析自由文字 slash 原文。

**理由**：這維持 Zig core 的邊界乾淨，讓它專注在規則驗證與狀態演算。未來若 UI 從 OpenTUI 換成其他 shell、GUI 或遠端客戶端，只要重做前端 parser，不需讓 core 背負命令語言相容性。

**替代方案**：讓 Zig 直接接收 slash 原文。這會把命令語言版本管理、錯誤訊息與輸入容錯綁進核心，增加後續演進成本。

### 決定 3：主畫面採三段式 shell，而不是四列牌桌

**選擇**：主畫面固定為三區：
- 頂部狀態列：局況、分數、輪到誰、合法命令摘要
- 中間事件流：摸牌、棄牌、吃碰槓胡、系統提示、命令執行回饋
- 底部命令列：當前輸入、placeholder、錯誤提示與最近一次命令結果

**理由**：這最貼近 MUD / terminal shell 的操作感，也讓中間區域自然成為可回溯的文字敘事空間，方便玩家理解回合節奏與事件順序。

**替代方案**：保留四列牌桌，只在下方補一個 input。這會讓畫面同時服務兩種主要心智模型，最終很容易兩邊都不夠清楚。

### 決定 4：合法命令來源以 Zig `turn_changed.available_actions` 為準，前端負責翻譯成可執行命令

**選擇**：前端不自行推導規則合法性，而是以 Zig 推送的 `available_actions` 為唯一權威來源，再把它映射為目前命令列中可用的 slash 命令與快捷操作。

**理由**：規則只維持一份真相來源，避免前端和 core 對合法動作理解不一致。前端只需處理 UX：哪些命令顯示為可用、哪些要顯示錯誤、哪些快捷鍵應暫時失效。

**替代方案**：前端用本地 state 預判可執行命令。這會導致規則重複實作，與現在 Zig core 中已抽出的 turn engine 邊界相衝突。

### 決定 5：事件流由 IPC 訊息與本地 command feedback 共同組成

**選擇**：中間事件流不是單純把 `state_update` 原樣展開，而是混合兩種來源：
- 來自 Zig 的遊戲事件與狀態變化（摸牌、棄牌、claim、勝負）
- 來自前端 command 系統的輸入回饋（未知命令、缺參數、當前不可用）

**理由**：shell 介面需要讓玩家看見「世界發生了什麼」和「我剛剛輸入了什麼、系統怎麼回應」，兩者在使用者感知上屬於同一條時間線。

**替代方案**：把錯誤或回饋只顯示在 input 附近。這會讓命令互動缺乏可回溯性，也削弱 shell 體驗。

## Risks / Trade-offs

- [舊規格仍以牌桌與熱鍵為主，文件可能互相衝突] → 先用 delta specs 明確覆寫關鍵 requirement，再逐步讓實作與 README 同步收斂
- [前端 parser 與 Zig action 名稱脫節] → 以單一 command-to-intent 映射表集中管理，避免各元件各自拼字串
- [事件流若資訊過多，玩家會難以掃描] → 將頂部狀態列承擔摘要，中間事件流只保留時間順序與重要結果
- [快捷鍵與 slash 命令並存可能形成雙軌 UX] → 規定所有快捷鍵都必須映射到同一個 command registry，不能繞過命令層直接送 IPC
- [舊的 table-oriented 元件可能難以直接重用] → 接受這是產品方向收斂的成本，優先抽出可重用的資料映射與連線邏輯，版面元件視需要重做

## Migration Plan

1. 先更新 specs 與 README，固定產品目標與邊界
2. 在前端建立 command registry、slash parser 與 command feedback 管線
3. 將既有 `sendAction` 入口保留，改由 command layer 統一呼叫
4. 以 shell 版面取代現有主桌面組織，保留必要的 game state 資料映射
5. 將常用快捷鍵逐步改為 command accelerator，移除對舊 hotkey-first 設計的依賴

## Open Questions

- 第一版 slash 指令集合是否只涵蓋核心遊戲動作與查詢（如 `/discard`、`/chi`、`/pon`、`/kong`、`/win`、`/status`），還是要同時納入 popup 類資訊命令
- 中間事件流是否需要保留簡易牌面符號／牌名格式化規則，方便玩家快速掃讀
- `player_action` 之外是否需要新增純查詢型 intent；若查詢完全由前端本地 state 支援，則可延後擴充 IPC
