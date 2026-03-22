# ma-chill 麻將終端遊戲

`ma-chill` 是一個以台灣麻將為主題的終端回合制遊戲。

最終產品目標不是傳統牌桌式 TUI，而是更接近 MUD / shell 的互動體驗：

- 頂部顯示局況、分數、目前輪到誰、可用動作
- 中間顯示遊戲事件流與系統回饋
- 底部提供命令列，玩家用 slash 指令操作遊戲

## 產品目標

這個專案的目標是做出一個 command-driven shell game：

- 1 位玩家對上 3 位 AI 對手
- 遊戲是回合制，依當前局面出現不同可執行 action
- 吃、碰、槓、胡、棄牌等動作都由命令系統驅動
- 常用組合鍵可以作為加速器，但不應形成另一套獨立互動模型
- 新增遊戲功能時，主要做法是新增 slash 指令，並把它對應到 Zig core 的結構化 action

## 互動模型

主要操作原則如下：

- slash 指令是主要入口，例如 `/discard ...`、`/pon`、`/win`
- 前端先解析 slash 指令，轉成結構化 command / action
- Zig core 不解析自由文字命令，只處理結構化遊戲動作
- 合法動作以 Zig core 傳來的 `available_actions` 為準
- 前端負責命令提示、輸入回饋、事件流與快捷鍵映射

## 目標畫面結構

```text
┌──────────────────────────────────────────────┐
│ 狀態列：局況 / 分數 / 當前玩家 / 可用命令       │
├──────────────────────────────────────────────┤
│ 事件流：摸牌、棄牌、吃碰槓胡、系統提示、回饋    │
│                                              │
│ - 東家打出 5 萬                               │
│ - 你可用：/pon /chi /win                      │
│ - 你輸入了 /pon                               │
├──────────────────────────────────────────────┤
│ 命令列：/discard 7p                           │
└──────────────────────────────────────────────┘
```

## 目標架構

```text
TUI shell
  ├─ top status bar
  ├─ event log
  ├─ command input
  └─ shortcut accelerators
         │
         ▼
command layer
  ├─ slash parser
  ├─ command registry
  ├─ shortcut -> command mapping
  └─ command feedback / validation
         │
         ▼
IPC boundary
  └─ structured player_action / intent
         │
         ▼
Zig core
  ├─ game state
  ├─ turn engine
  ├─ rules / scoring
  ├─ AI opponents
  └─ UDS server
```

## 技術方向

- **前端**：OpenTUI（Bun + SolidJS reconciler）
- **核心**：Zig
- **橋接**：Unix Domain Socket + JSONL
- **邊界原則**：前端解析命令，Zig core 驗證與執行遊戲動作

## 目前狀態

目前專案正在從早期的 table-oriented TUI 收斂到 command-driven shell：

- `core/` 已有牌局狀態、回合引擎、計番、AI、UDS 基礎
- `tui/` 需要逐步從牌桌導向畫面改成 shell 導向互動
- OpenSpec 已新增 `command-driven-shell-ui` change，用來描述這次方向收斂

## 專案結構

```text
core/       Zig core（規則、狀態、AI、IPC）
tui/        終端 UI（OpenTUI shell）
openspec/   規格、change artifacts、設計與任務
justfile    常用開發指令
```

## 常用指令

```bash
just install     # 安裝 TUI 依賴
just test        # 執行 Zig core 測試
just build       # 編譯 core 與 TUI
just dev         # 啟動開發模式
just clean       # 清除編譯產物
```

## OpenSpec

如果要開始實作新的產品方向，先看：

- `openspec/changes/command-driven-shell-ui/proposal.md`
- `openspec/changes/command-driven-shell-ui/design.md`
- `openspec/changes/command-driven-shell-ui/tasks.md`

## 授權

本專案採用 MIT 授權。詳見 `LICENSE`。
