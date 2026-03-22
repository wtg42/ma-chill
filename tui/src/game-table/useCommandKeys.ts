import { createEffect, onCleanup } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { GameStateStore } from "../game-state";
import { executeCommand } from "../commands";

const ACCELERATORS: Record<string, string> = {
  h: "/help",
  s: "/status",
  j: "/chi",
  p: "/pon",
  k: "/kong",
  w: "/win",
  f: "/pass",
};

export function useCommandKeys(store: GameStateStore): void {
  let passTimer: ReturnType<typeof setTimeout> | null = null;

  function clearPassTimer(): void {
    if (passTimer !== null) {
      clearTimeout(passTimer);
      passTimer = null;
    }
  }

  useKeyboard((key) => {
    if (key.eventType !== "press" || !key.ctrl) {
      return;
    }

    const command = ACCELERATORS[key.name];
    if (!command) {
      return;
    }

    key.preventDefault();
    executeCommand(command, store);
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
