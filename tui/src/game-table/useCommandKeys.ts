import { createSignal, createEffect, onCleanup } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { GameStateStore } from "../game-state";
import { executeCommand } from "../commands";
import {
  handleEventLogNavigationKey,
  type EventLogNavigationControls,
} from "./event-log-controls";

export type UiMode = "normal" | "leader" | "command";

export interface LeaderBinding {
  key: string;
  label: string;
  command: string;
  action?: string;
}

export const LEADER_BINDINGS: LeaderBinding[] = [
  { key: "d", label: "棄摸牌", command: "/discard drawn", action: "discard" },
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
