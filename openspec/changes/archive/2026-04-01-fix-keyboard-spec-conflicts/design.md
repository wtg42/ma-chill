## Context

目前專案的鍵盤互動主軸已經收斂到 `Space` 開啟 Leader、which-key 顯示可用綁定、`:` 進入 command mode 的三態模型，但主規格仍殘留兩段過渡期定義：`Ctrl+C` 作為 selection copy 例外，以及 `Ctrl+Space` 作為 `/discard drawn` 快捷鍵。這兩段會讓規格讀者誤以為 `Ctrl` 組合仍屬於產品互動空間，與「避免和 terminal / system 控制鍵衝突」的現行方向不一致。

此變更需要同時對齊規格語義與後續實作期待，但不引入新的互動模式，也不重做文字選取或剪貼簿管線本身。

## Goals / Non-Goals

**Goals:**
- 明確宣告 `Ctrl` 組合不屬於產品快捷鍵空間
- 將遊戲命令輸入收斂為 Leader bindings 與 command mode
- 移除主規格中對 `Ctrl+C` 與 `Ctrl+Space` 的產品互動承諾
- 讓文字複製責任回到既有的 copy-on-select 規格，而非鍵盤例外規則

**Non-Goals:**
- 不新增新的 Leader bindings 群組或多層 which-key 結構
- 不修改 `text-selection` 或 `clipboard-pipeline` 的核心能力定義
- 不重新設計 terminal 原生中斷、shell 控制鍵或作業系統層熱鍵

## Decisions

### 決定：`Ctrl` 組合全面退出產品互動規格

主規格將明確寫成：遊戲命令只能由 Leader bindings 與 command mode 觸發；`Ctrl` 組合保留在 terminal / system 語義空間，不再作為遊戲命令、複製或 UI 操作的產品入口。

這樣可以避免規格再度混入「少數 `Ctrl` 例外」的灰色地帶，也和 LazyVim 式 which-key 心智模型一致。

### 決定：`Ctrl+C` 不再作為 selection copy 例外

文字複製的產品保證維持在 `text-selection` 定義的 copy-on-select。`Ctrl+C` 不再被規格視為產品功能，而是保留給 terminal / system 的中斷語義。

這讓規格與使用者預期對齊：在終端機中，`Ctrl+C` 的第一語義是中斷，而不是應用程式快捷鍵。

### 決定：移除 `Ctrl+Space` requirement，而非改寫成新的 `Ctrl` 特例

`/discard drawn` 已有 Leader binding 可以承載，不需要再保留任何 `Ctrl+...` fallback。保留 `Ctrl+Space` 只會重新打開與 IME、terminal 事件處理衝突的風險。

## Risks / Trade-offs

- `Ctrl+C` 複製捷徑移除後，鍵盤使用者少一條備援路徑 → 以 copy-on-select 作為正式保證，若未來仍需鍵盤複製，再以非 `Ctrl` 的產品鍵位另開 change 討論
- 規格修正後可能暴露現有實作尚未完全對齊 → 在 tasks 中明確要求清除 `GameTable` 的 `Ctrl+C` 攔截與相關測試
- 某些歷史文件仍可能提到 `Ctrl+...` 快捷鍵 → 本 change 一併清理受影響文件與測試敘述
