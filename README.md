# ma-chill 麻將終端遊戲

麻將終端機遊戲 - 採用現代技術棧實現的快速、高效能麻將 AI 對戰遊戲。

## 特色

- 1 玩家 vs 3 AI - 與 AI 對手進行麻將對戰
- 高效能核心 - 使用 Zig 實現無 GC 停頓的核心邏輯
- 終端遊戲 - 在 Linux/macOS 終端機上暢玩
- 智慧 AI - 開發中的 AI 對手策略

## 技術棧

- **UI** - OpenTUI (Bun + SolidJS reconciler)
- **核心邏輯** - Zig（牌局狀態、規則判定、AI 決策）
- **橋接** - Unix Domain Socket（優先）/ Bun FFI（備選）
- **包管理** - Bun

## 開發狀態

```
tui/        ← UI 層（OpenTUI）- 進行中
  牌面渲染系統已完成，game-table 基礎佈局已完成
  副露、Popup、AiPlayerRow 重構規格已完成（待實作）
  目前以 fake-data 驅動畫面，尚未串接 Zig core

core/       ← Zig 核心 - 尚未開始
  下一個探索主題：設計 Zig core 架構（牌局狀態、規則、AI、橋接協議）
```

## 開發路線

1. **UI 層** - OpenTUI game-table 元件（進行中）
2. **Zig core** - 牌局狀態機、規則判定、AI 決策（下一步）
3. **橋接** - UDS 協議設計，串接 UI ↔ core
4. **整合** - 以真實 game state 取代 fake-data

## 快速開始

```bash
cd tui
bun install
bun run dev
```

## 授權

本專案採用 MIT 授權。詳見 [LICENSE](./LICENSE) 檔案。
