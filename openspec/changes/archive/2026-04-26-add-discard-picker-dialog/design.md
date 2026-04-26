## Context

目前 TUI 的主要互動模型偏向 shell：玩家在 NORMAL / LEADER / COMMAND 三態之間切換，遊戲動作大多透過 slash 指令或 leader binding 觸發。這種設計對吃、碰、胡等低參數動作已足夠，但對「從整副手牌中精準選出一張要棄掉的牌」並不理想。

現況存在三個限制：

- `<leader>+d` 目前只適合綁定固定命令，無法承接「先進入選牌，再確認」的互動。
- `/discard 7p` 這類流程要求玩家把看到的牌面轉成 token，對主遊戲操作來說過於命令列導向。
- 專案雖然已有 popup / 本地 UI state / 手牌資料來源，但尚未有一個正式的「選牌型 dialog」作為遊戲主互動元件。

此外，本專案目前已將「最小覆蓋 TDD」納入 OpenSpec 全域設定，因此這次 change 在實作時也應遵循相同原則：先為 leader 開關、discard dialog 導覽與 discard 執行路徑建立最小必要測試，再補上最小可行實作，最後整理重構。

這次 change 的重點不是取代 command system，而是在保留 command fallback 的前提下，為自己回合的棄牌操作提供更直接的 UI。

## Goals / Non-Goals

**Goals:**

- 讓 `<leader>+d` 成為玩家自己回合的棄牌入口，而不是單一固定捷徑。
- 提供一個專用 discard dialog，集中顯示手牌、摸牌與可辨識的短 label。
- 讓玩家可用方向鍵移動焦點，並以 Enter / Esc 完成或取消棄牌。
- 維持既有 command system 為最終執行路徑，避免新增繞過命令層的第二套送出協議。

**Non-Goals:**

- 不在這次 change 中重做整個常駐牌桌 UI 或正式接上完整 `PlayerRow` 版面。
- 不變更 Zig IPC 契約，也不新增新的 `player_action` 類型。
- 不處理 AI 手牌顯示、拖曳選牌、滑鼠選牌或多步預覽互動。
- 不移除 `/discard <tile|drawn|tile_id>` 指令。

## Decisions

### 決定 1：新增 overlay/dialog 狀態，而不是把 discard picker 硬塞進既有 `UiMode`

**選擇**：維持 `UiMode = normal | leader | command` 專注描述底部命令列狀態，另行新增本地 overlay/dialog 狀態（例如 `activeDialog: "none" | "discard_picker"`），並讓 discard picker 擁有自己的焦點索引與輸入處理。

**理由**：現有 `UiMode` 的責任是底部列與命令列焦點；棄牌 dialog 是畫面層的覆蓋互動，不應與 command bar 混成同一個枚舉。分開後可避免 `discard_picker` 與 `leader` / `command` 的責任混亂，也讓之後新增其他 dialog 時有一致模式。

**替代方案**：將 `discard_picker` 直接加入 `UiMode`。拒絕原因是會讓底部列狀態與 overlay 狀態綁死，之後擴充其他 popup 時更容易相互耦合。

### 決定 2：`<leader>+d` 改為開啟 discard dialog，而不再直接等於 `/discard drawn`

**選擇**：在 `availableActions` 包含 `discard` 時，`<leader>+d` 進入 discard dialog；若目前不是自己回合或不可棄牌，則維持 dimmed / 不可用語義。

**理由**：`d` 的語義應該是「進入棄牌流程」，而不是「打摸牌」這個特例。這樣可以把最常用、最核心的玩家操作升格成專用互動，與 `chi` / `pon` / `win` 這類單鍵即時行為做出明確區隔。

**替代方案**：保留 `<leader>+d = /discard drawn`，另找其他鍵位開 discard dialog。拒絕原因是會讓 `d` 同時代表兩種棄牌心智模型，增加學習與記憶負擔。

### 決定 3：discard dialog 以「分組列 + 焦點格」呈現，而不是純文字 token 輸入

**選擇**：dialog 中依牌種分列顯示玩家目前可棄的牌，至少區分：

- 手牌主區（依排序後的牌列）
- 摸牌區（若存在）

每張牌除了 ASCII 牌面外，底下再顯示對應短 label，例如 `7p`、`east`、`red`。方向鍵移動焦點時，左右在同列移動；上下在相鄰列之間跳到最接近欄位的牌；摸牌區視為可聚焦的獨立格。

**理由**：玩家需要的是「看牌後選牌」，不是「先記 token 再輸入 token」。保留 label 則可讓 dialog、事件流手牌摘要與命令列 token 使用同一套語言，降低轉譯成本。

**替代方案**：`<leader>+d` 後進入子模式，要求玩家手打 `7p` / `east`。拒絕原因是仍然把主要棄牌操作維持在 CLI 思維，改善有限。

### 決定 4：dialog 的確認動作仍走既有 command / execute path

**選擇**：玩家在 discard dialog 按下 Enter 時，不直接手寫 IPC，而是重用現有命令層，送出等價的 discard 命令語義。實作上可以透過既有 `executeCommand` 共用路徑，或抽出一個由 command 與 dialog 共用的 discard 執行 helper；最終仍以既有 `discard` action 送往 Zig。

**理由**：這可保留「命令層是權威入口」的架構，避免 UI dialog 與命令列各自維護一套合法動作檢查、清 prompt、送 IPC 的重複流程。

**替代方案**：dialog 直接呼叫 `sendAction("discard", tileId)`。拒絕原因是會繞過既有 command normalization 與錯誤回饋邏輯，增加兩條棄牌路徑漂移的風險。

### 決定 5：實作順序採最小覆蓋 TDD，而不是先堆完整 UI 再補測試

**選擇**：此 change 的實作順序應固定為：

1. 先寫最小必要 failing test
2. 再補足剛好讓測試通過的最小實作
3. 最後整理命名、抽共用 helper 與收斂重複邏輯

測試切面至少涵蓋：

- `<leader>+d` 開啟 / 拒絕開啟 discard dialog
- dialog 焦點移動與邊界行為
- Enter 確認後仍走既有 discard 執行路徑
- Esc 取消時不送出 action

**理由**：discard dialog 同時碰到輸入模式、畫面層 overlay、命令執行路徑與棄牌後 prompt 清理，若先做整體 UI 再回頭補測試，容易把問題埋成多模組回歸。最小覆蓋 TDD 可先鎖住核心互動，再逐步擴充視覺呈現。

**替代方案**：先做完整 dialog UI，最後一次補測試。拒絕原因是錯誤會集中爆在整合階段，定位成本較高，也不符合本專案新納入的開發規則。

### 決定 5：短 label 由既有 tile label helper 統一產生

**選擇**：沿用 `formatTileShort()` 作為 dialog 內與手牌相關顯示的短 label 來源，確保萬 / 筒 / 條 / 風牌 / 三元牌的文字表示與 `/discard` parser 對齊。

**理由**：這樣可避免 UI 顯示一套、命令列接受另一套，並降低後續維護成本。

**替代方案**：為 dialog 另外定義新的顯示縮寫。拒絕原因是會把「玩家看到的 label」與「命令列接受的 token」分裂成兩套規則。

## Risks / Trade-offs

- [方向鍵導航跨列規則容易讓人困惑] → 先以測試鎖定固定導航規則，並在 dialog 底部明示 `方向鍵移動 / Enter 棄牌 / Esc 取消`。
- [overlay 狀態與既有 leader / command 模式可能互相干擾] → 明確規定 dialog 開啟時暫停 leader / command 的輸入處理，關閉後再回到 NORMAL。
- [如果同時保留命令列與 dialog，可能出現兩條棄牌入口的行為差異] → 將棄牌合法性檢查與送出行為集中到共用執行 helper。
- [牌列加上 label 會增加畫面高度與寬度壓力] → label 先限制在 discard dialog 與玩家手牌相關顯示，不擴散到所有牌桌元件；必要時沿用既有最小視窗保護。
- [現在尚未正式接上完整常駐牌桌 UI] → 本次設計讓 discard dialog 可獨立存在，不依賴先完成 `PlayerRow` 整合。

## Migration Plan

1. 先新增 discard dialog 的本地 UI state 與開關邏輯，讓 `<leader>+d` 可開啟 / 關閉 dialog。
2. 接上 dialog 畫面、手牌資料與短 label 顯示。
3. 補上方向鍵導航與 Enter / Esc 互動。
4. 將確認棄牌接回既有 command / action 路徑。
5. 調整 leader 文案、提示與測試，確認舊的 `<leader>+d = /discard drawn` 已被新語義取代。

回滾策略：若 discard dialog 造成重大互動問題，可先恢復 `<leader>+d` 為固定 discard shortcut，保留底層命令系統不變。

## Open Questions

- dialog 內的手牌是否需要依萬 / 筒 / 條 / 字牌分成多列，還是先以單列 + 摸牌獨立格實作即可。
- 是否要在 `/hand` 事件流摘要中同步補上相同短 label，強化玩家從摘要過渡到 dialog / 命令列的辨識一致性。
- dialog 開啟時，底部命令列應顯示專用提示文案，還是維持原本 NORMAL 提示並只靠 overlay 自身說明。
