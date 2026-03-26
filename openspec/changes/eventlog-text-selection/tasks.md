## 1. Clipboard 模組

- [ ] 1.1 建立 `tui/src/clipboard.ts`，實作 `copyToClipboard(text): Promise<boolean>` 函式
- [ ] 1.2 實作 OSC 52 路徑：呼叫 renderer 的 `copyToClipboardOSC52`，失敗時回傳 false
- [ ] 1.3 實作 OS 工具 fallback：依 Wayland → X11 (xclip/xsel) → macOS (pbcopy) → WSL (clip.exe) 順序嘗試 spawn
- [ ] 1.4 確保所有失敗路徑靜默處理（catch error、不 throw、不阻塞 UI）

## 2. EventLog 文字選取

- [ ] 2.1 在 EventLog 的 `<text>` 元件加入 `selectable` 屬性
- [ ] 2.2 在 App 或 GameTable 層級接 `useSelectionHandler`，selection 完成時呼叫 `copyToClipboard`

## 3. Ctrl+C 備援複製

- [ ] 3.1 在鍵盤處理邏輯中加入 Ctrl+C 攔截：有 selection 時複製文字並清除 selection，無 selection 時維持原行為

## 4. Selection 與 click 衝突處理

- [ ] 4.1 確認拖選結束的 mouseUp 不觸發 row click 或遊戲 action（若 EventLog 目前無 click handler 則記錄為不需處理）

## 5. 驗證

- [ ] 5.1 手動測試：在 EventLog 拖選文字，確認反白顯示且放開後剪貼簿有內容
- [ ] 5.2 手動測試：Ctrl+C 在有/無 selection 時行為正確
- [ ] 5.3 手動測試：ScrollBox 滾輪滾動不受影響
- [ ] 5.4 手動測試：拖選至 ScrollBox 邊緣時自動捲動正常
