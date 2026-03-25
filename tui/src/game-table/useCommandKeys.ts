import { createEffect, onCleanup } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { GameStateStore } from "../game-state";
import { executeCommand } from "../commands";
import {
  handleEventLogNavigationKey,
  type EventLogNavigationControls,
} from "./event-log-controls";

const ACCELERATORS: Record<string, string> = {
  h: "/help",
  o: "/hand",
  s: "/status",
  j: "/chi",
  p: "/pon",
  k: "/kong",
  w: "/win",
  f: "/pass",
};

interface CommandKeyEvent {
  eventType: string;
  ctrl: boolean;
  name: string;
  preventDefault: () => void;
}

type CommandExecutor = typeof executeCommand;

export function handleCommandKey(
  key: CommandKeyEvent,
  store: GameStateStore,
  execute: CommandExecutor = executeCommand,
): boolean {
  if (key.eventType !== "press" || !key.ctrl) {
    return false;
  }

  const command = ACCELERATORS[key.name];
  if (!command) {
    return false;
  }

  key.preventDefault();
  execute(command, store);
  return true;
}

export function useCommandKeys(
  store: GameStateStore,
  eventLogControls?: EventLogNavigationControls,
): void {
  let passTimer: ReturnType<typeof setTimeout> | null = null;

  function clearPassTimer(): void {
    if (passTimer !== null) {
      clearTimeout(passTimer);
      passTimer = null;
    }
  }

  useKeyboard((key) => {
    if (handleCommandKey(key, store)) {
      return;
    }

    if (eventLogControls) {
      handleEventLogNavigationKey(key, eventLogControls);
    }
  });

  createEffect(() => {
    const actions = store.availableActions();
    clearPassTimer();

    const hasPass = actions.includes("pass");
    const hasClaim = actions.some((action) => action === "chi" || action === "pon" || action === "kong" || action === "win");
    if (!hasPass || !hasClaim) {
      return;
    }

    passTimer = setTimeout(() => {
      executeCommand("/pass", store, { echo: false });
      passTimer = null;
    }, store.passTimeoutSeconds() * 1000);
  });

  onCleanup(clearPassTimer);
}
