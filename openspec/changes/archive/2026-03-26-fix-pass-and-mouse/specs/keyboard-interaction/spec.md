## MODIFIED Requirements

### Requirement: 自動 pass 仍由本地計時觸發

當前可用動作包含 `pass` 時，系統 SHALL 依 `pass_timeout_seconds` 啟動本地倒數；若玩家在時限內未執行其他合法命令，前端 SHALL 透過命令系統送出 `pass` 動作。TUI auto-pass timer SHALL 為 pass timeout 的唯一來源，Zig core 不再有獨立超時機制。

#### Scenario: 倒數結束自動 pass
- **WHEN** 玩家處於可 pass 的回應視窗且倒數到期
- **THEN** 前端經由命令層送出結構化 `pass` 動作，Zig core 透過 blocking read 接收

#### Scenario: 玩家先送出其他合法命令
- **WHEN** 倒數尚未結束前，玩家已成功執行其他合法命令
- **THEN** 系統取消目前的 pass 倒數

#### Scenario: Zig core 等待 TUI 回應
- **WHEN** Zig core 進入 claim phase 等待玩家回應
- **THEN** Zig core 以 blocking read 等待 TUI 送出 action，不設獨立 timeout
