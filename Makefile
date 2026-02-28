.PHONY: all install build run clean help

# UI 目錄
UI_DIR := ui
# Core 目錄
CORE_DIR := core

help:
	@echo "ma-chill - 麻將終端遊戲 Makefile"
	@echo ""
	@echo "使用方式:"
	@echo "  make install      - 安裝所有依賴 (bun + zig)"
	@echo "  make build        - 編譯 UI 和 Core"
	@echo "  make run-ui       - 執行 UI"
	@echo "  make run-core     - 執行 Core (遊戲伺服器)"
	@echo "  make clean        - 清除編譯產物"
	@echo "  make all          - install + build"

install:
	@echo "📦 安裝 UI 依賴..."
	cd $(UI_DIR) && bun install
	@echo "✅ UI 依賴安裝完成"

build: build-ui build-core

build-ui:
	@echo "🔨 編譯 UI..."
	cd $(UI_DIR) && bun build src/main.ts --outdir dist
	@echo "✅ UI 編譯完成"

build-core:
	@echo "🔨 編譯 Core..."
	cd $(CORE_DIR) && zig build
	@echo "✅ Core 編譯完成"

run-ui:
	@echo "▶️  執行 UI..."
	cd $(UI_DIR) && bun run src/main.ts

run-core:
	@echo "▶️  執行 Core (遊戲伺服器)..."
	cd $(CORE_DIR) && zig build run

clean:
	@echo "🧹 清除編譯產物..."
	rm -rf $(UI_DIR)/dist $(UI_DIR)/node_modules
	rm -rf $(CORE_DIR)/zig-cache $(CORE_DIR)/zig-out
	@echo "✅ 清除完成"

all: install build
