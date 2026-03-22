## Why

目前專案的 TUI 規格仍以四列牌桌與熱鍵優先互動為中心，但我們已經釐清最終產品方向其實是類似 MUD 的回合制 shell game：頂部顯示局況、中間顯示事件流與遊戲內容、底部以輸入框執行 slash 指令。若不先把這個互動模型正式寫進 OpenSpec，後續前端與 Zig core 的邊界會持續漂移，新增功能也難以用一致方式落地。

## What Changes

- 將前端互動模型明確改為 command-first shell：底部 input 為主要入口，slash 指令為主要操作方式，通用組合鍵僅作為常用步驟加速器
- 新增 shell command 介面規格，定義 slash 指令、指令回饋、常用快捷鍵映射與回合中合法命令提示
- 將主畫面從四列牌桌導向布局調整為三段式 shell：頂部狀態列、中間事件流、底部命令輸入列
- 明確規範前端先解析 slash 指令並轉為結構化 action / intent，再透過既有 IPC 協議送給 Zig core；Zig 不直接解析自由文字命令
- 調整現有鍵盤互動與 TUI 狀態管理規格，使其符合 command-driven shell 的產品方向

## Capabilities

### New Capabilities
- `shell-command-interface`: 定義 slash 指令輸入、命令解析、指令執行回饋、快捷鍵映射，以及前端將命令正規化為結構化 action / intent 的邊界

### Modified Capabilities
- `game-table-layout`: 將主畫面要求由四列式牌桌改為 shell 版面（頂部狀態、中間事件流、底部命令列）
- `keyboard-interaction`: 將互動模式由 hotkey-first 調整為 command-first，保留通用快捷鍵作為常用命令捷徑
- `tui-uds-connection`: 明確要求 TUI 送出的永遠是結構化 `player_action` / intent，而不是 slash 原文
- `tui-game-state`: 增加 shell UI 所需的本地狀態，例如命令列內容、命令執行回饋、事件流與合法命令提示來源

## Impact

- `tui/src/`：主畫面組成、鍵盤處理、輸入列、命令解析與事件呈現都會調整
- `core/src/`：Zig core 保持規則與狀態引擎定位，但後續新增遊戲功能時需對應新的結構化 action 入口
- `openspec/specs/`：現有 TUI 相關 specs 需收斂到 command-driven shell 方向，避免與舊的牌桌導向規格並存
- `README.md`：需同步更新專案目標與最終架構描述，方便後續快速理解
