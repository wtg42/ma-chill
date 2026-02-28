# ma-chill 麻將終端遊戲

麻將終端機遊戲 - 採用現代技術棧實現的快速、高效能麻將 AI 對戰遊戲。

## 特色

- 🎮 **1 玩家 vs 3 AI** - 與 AI 對手進行麻將對戰
- ⚡ **高效能核心** - 使用 Zig 實現無 GC 停頓的核心邏輯
- 🖥️ **終端遊戲** - 在 Linux/macOS 終端機上暢玩
- 🤖 **智慧 AI** - 開發中的 AI 對手策略

## 技術棧

- **UI** - OpenTUI (Bun)
- **核心邏輯** - Zig
- **橋接** - Bun FFI / Unix Domain Socket
- **包管理** - Bun

## 開發狀態

本專案目前處於活躍開發階段。麻將規則、UI 細節與 AI 策略持續完善中。

## 快速開始

詳細的架構設計與開發指引請見 [ARCHITECTURE.md](./ARCHITECTURE.md)

```bash
# 開發依賴
bun install

# 構建與運行（待實裝）
bun run dev
```

## 授權

本專案採用 MIT 授權。詳見 [LICENSE](./LICENSE) 檔案。

---

