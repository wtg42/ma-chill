import { createSignal, createEffect, onCleanup } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { GameStateStore } from "../game-state";
import { executeCommand } from "../commands";
import {
  handleEventLogNavigationKey,
  type EventLogNavigationControls,
} from "./event-log-controls";
import {
  buildDiscardPickerRows,
  canOpenDiscardPicker,
  discardPickerItemAtIndex,
  moveDiscardPickerFocus,
} from "./discard-picker";

export type UiMode = "normal" | "leader" | "command";

export interface LeaderBinding {
  key: string;
  label: string;
  command: string;
  action?: string;
}

export const LEADER_BINDINGS: LeaderBinding[] = [
  { key: "d", label: "棄牌",   command: "/discard",       action: "discard" },
  { key: "j", label: "吃",     command: "/chi",           action: "chi"     },
  { key: "p", label: "碰",     command: "/pon",           action: "pon"     },
  { key: "k", label: "槓",     command: "/kong",          action: "kong"    },
  { key: "w", label: "胡",     command: "/win",           action: "win"     },
  { key: "f", label: "過",     command: "/pass",          action: "pass"    },
  { key: "h", label: "說明",   command: "/help"                             },
  { key: "o", label: "手牌",   command: "/hand"                             },
  { key: "s", label: "狀態",   command: "/status"                           },
];

interface KeyEvent {
  eventType: string;
  name: string;
  ctrl?: boolean;
  preventDefault: () => void;
}

type CommandExecutor = typeof executeCommand;

// 判斷按鍵是否帶有 Ctrl 修飾，避免 Ctrl 組合誤入產品快捷鍵空間。
function isCtrlModifiedKey(key: KeyEvent): boolean {
  return key.ctrl === true;
}

// 判斷目前是否正在操作 discard dialog，讓其輸入優先於底部命令列模式。
function isDiscardPickerOpen(store: GameStateStore): boolean {
  return store.activeDialog() === "discard_picker";
}

// 在 discard dialog 開啟時處理本地鍵盤導覽與關閉行為。
function handleDiscardPickerKey(
  key: KeyEvent,
  store: GameStateStore,
  execute: CommandExecutor,
): boolean {
  if (key.name === "escape") {
    key.preventDefault();
    store.closeDiscardPicker();
    return true;
  }

  const rows = buildDiscardPickerRows(
    store.handWithIds(),
    store.gameState()?.drawn_tile_id ?? null,
    store.tileCatalog(),
  );

  if (key.name === "return" || key.name === "enter") {
    const focusedItem = discardPickerItemAtIndex(rows, store.discardPickerFocusIndex());
    if (!focusedItem) {
      return false;
    }
    key.preventDefault();
    execute(`/discard ${focusedItem.tileId}`, store, { echo: false });
    return true;
  }

  const direction = key.name === "left" || key.name === "right" || key.name === "up" || key.name === "down"
    ? key.name
    : null;
  if (!direction) {
    return false;
  }

  const nextIndex = moveDiscardPickerFocus(rows, store.discardPickerFocusIndex(), direction);
  key.preventDefault();
  store.setDiscardPickerFocusIndex(nextIndex);
  return true;
}

// 處理 Leader 模式下的單鍵綁定，僅接受未帶 Ctrl 的產品鍵位。
export function handleLeaderKey(
  key: KeyEvent,
  bindings: LeaderBinding[],
  store: GameStateStore,
  execute: CommandExecutor = executeCommand,
): boolean {
  if (isCtrlModifiedKey(key)) {
    return false;
  }

  const binding = bindings.find((b) => b.key === key.name);
  if (!binding) {
    return false;
  }
  key.preventDefault();
  if (binding.key === "d") {
    if (!canOpenDiscardPicker(store.availableActions())) {
      return false;
    }
    store.openDiscardPicker();
    return true;
  }
  execute(binding.command, store);
  return true;
}

// 依目前 UI 模式分派按鍵行為，確保遊戲命令只來自 Leader 與命令列。
export function createModeKeyHandler(
  getMode: () => UiMode,
  setMode: (m: UiMode) => void,
  clearCommandInput: () => void,
  store: GameStateStore,
  eventLogControls?: EventLogNavigationControls,
  execute: CommandExecutor = executeCommand,
): (key: KeyEvent) => void {
  return (key: KeyEvent) => {
    if (key.eventType !== "press") return;

    if (isDiscardPickerOpen(store)) {
      handleDiscardPickerKey(key, store, execute);
      return;
    }

    const mode = getMode();

    if (mode === "normal") {
      if (!isCtrlModifiedKey(key) && key.name === "space") {
        key.preventDefault();
        setMode("leader");
        return;
      }
      if (!isCtrlModifiedKey(key) && key.name === ":") {
        key.preventDefault();
        setMode("command");
        return;
      }
      if (eventLogControls && handleEventLogNavigationKey(key, eventLogControls)) return;
    } else if (mode === "leader") {
      if (key.name === "escape") {
        setMode("normal");
        return;
      }
      if (eventLogControls) handleEventLogNavigationKey(key, eventLogControls);
      handleLeaderKey(key, LEADER_BINDINGS, store, execute);
      setMode("normal");
      return;
    } else if (mode === "command") {
      if (key.name === "escape") {
        clearCommandInput();
        setMode("normal");
        return;
      }
      if (eventLogControls && handleEventLogNavigationKey(key, eventLogControls)) return;
    }
  };
}

// 綁定全域鍵盤處理與本地 pass 計時器，維持 shell 式輸入節奏。
export function useCommandKeys(
  store: GameStateStore,
  eventLogControls?: EventLogNavigationControls,
): { uiMode: Accessor<UiMode>; setUiMode: Setter<UiMode> } {
  const [uiMode, setUiMode] = createSignal<UiMode>("normal");
  let passTimer: ReturnType<typeof setTimeout> | null = null;

  // 清除既有 pass 計時器，避免狀態切換後殘留自動送出。
  function clearPassTimer(): void {
    if (passTimer !== null) {
      clearTimeout(passTimer);
      passTimer = null;
    }
  }

  const handler = createModeKeyHandler(
    uiMode,
    setUiMode,
    () => store.setCommandInput(""),
    store,
    eventLogControls,
  );

  useKeyboard(handler);

  createEffect(() => {
    if (store.phaseKind() !== "discard_reaction") {
      clearPassTimer();
      return;
    }

    const actions = store.availableActions();
    clearPassTimer();

    const hasPass = actions.includes("pass");
    const hasClaim = actions.some(
      (action) =>
        action === "chi" ||
        action === "pon" ||
        action === "kong" ||
        action === "win",
    );
    if (!hasPass || !hasClaim) {
      return;
    }

    passTimer = setTimeout(() => {
      executeCommand("/pass", store, { echo: false });
      passTimer = null;
    }, store.passTimeoutSeconds() * 1000);
  });

  onCleanup(clearPassTimer);

  return { uiMode, setUiMode };
}
