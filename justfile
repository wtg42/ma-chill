# ma-chill justfile
# 使用方式：just --list

# 預設：列出所有指令
default:
    @just --list

# ── 依賴安裝 ──────────────────────────────────────────

# 安裝 TUI 依賴
install:
    cd tui && bun install

# ── 測試 ──────────────────────────────────────────────

# 執行 Zig core 測試
test-core:
    cd core && zig build test --summary all

# 執行所有測試
test: test-core

# ── 編譯 ──────────────────────────────────────────────

# 編譯 Zig core
build-core:
    cd core && zig build

# 編譯 TUI（production bundle）
build-tui:
    cd tui && bun build src/index.tsx --outdir dist --target bun

# 編譯全部
build: build-core build-tui

# ── 執行 ──────────────────────────────────────────────

# 開發模式：編譯 core 後啟動，TUI 以 bun run 執行（不需預先 build-tui）
dev: build-core
    MA_CHILL_TUI_DEV=1 ./core/zig-out/bin/core

# 直接跑 TUI（不啟動 Zig，使用 fake-data）
dev-tui:
    cd tui && bun run dev

# production 模式執行
run: build
    ./core/zig-out/bin/core

# ── 清除 ──────────────────────────────────────────────

# 清除所有編譯產物
clean:
    rm -rf core/.zig-cache core/zig-out
    rm -rf tui/dist
