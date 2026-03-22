import { createEffect, onCleanup } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { sendAction } from "../connection";
import type { GameStateStore } from "../game-state";

// Tile position hotkeys: left-to-right hand mapping
const TILE_HOTKEYS = [
  "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'",
  "z", "x", "c", "v", "b",
];

// Claim action hotkeys
const CLAIM_KEYS: Record<string, string> = {
  c: "chi",
  p: "pon",
  k: "kong",
  h: "win",
};

interface PopupControls {
  showDiscardHistory: () => boolean;
  setShowDiscardHistory: (v: boolean) => void;
  showGameInfo: () => boolean;
  setShowGameInfo: (v: boolean) => void;
}

export function useGameKeys(
  store: GameStateStore,
  popups: PopupControls,
): void {
  let passTimer: ReturnType<typeof setTimeout> | null = null;

  function submitAction(action: string, tileId?: number): void {
    clearPassTimer();
    store.clearTurnPrompt();
    sendAction(action, tileId);
  }

  function clearPassTimer(): void {
    if (passTimer !== null) {
      clearTimeout(passTimer);
      passTimer = null;
    }
  }

  useKeyboard((key) => {
    if (key.eventType !== "press") return;

    const actions = store.availableActions();
    const name = key.name;

    // Popup toggles
    if (name === "tab") {
      if (store.currentPlayerId() !== 0) return;
      if (popups.showDiscardHistory()) {
        popups.setShowDiscardHistory(false);
      } else {
        popups.setShowDiscardHistory(true);
        popups.setShowGameInfo(false);
      }
      return;
    }

    if (name === "\\") {
      if (popups.showGameInfo()) {
        popups.setShowGameInfo(false);
      } else {
        popups.setShowGameInfo(true);
        popups.setShowDiscardHistory(false);
      }
      return;
    }

    if (store.currentPlayerId() !== 0 || actions.length === 0) {
      return;
    }

    // Claim actions (chi/pon/kong/hu)
    const claimAction = CLAIM_KEYS[name];
    if (claimAction && actions.includes(claimAction)) {
      submitAction(claimAction);
      return;
    }

    // Discard actions
    if (actions.includes("discard")) {
      // Space = discard drawn tile
      if (name === "space") {
        const state = store.gameState();
        if (state && state.drawn_tile_id != null) {
          submitAction("discard", state.drawn_tile_id);
        }
        return;
      }

      // Tile position hotkeys
      const tileIndex = TILE_HOTKEYS.indexOf(name);
      if (tileIndex !== -1) {
        const hand = store.handWithIds();
        const entry = hand[tileIndex];
        if (entry) {
          submitAction("discard", entry.id);
        }
      }
    }
  });

  // Pass timer: auto-pass when claim actions available with pass option
  const CLAIM_ACTIONS = new Set(Object.values(CLAIM_KEYS));

  createEffect(() => {
    const actions = store.availableActions();
    clearPassTimer();

    const hasClaim = actions.some((a) => CLAIM_ACTIONS.has(a));
    const hasPass = actions.includes("pass");

    if (hasClaim && hasPass) {
      passTimer = setTimeout(() => {
        sendAction("pass");
        passTimer = null;
      }, store.passTimeoutSeconds() * 1000);
    }
  });

  onCleanup(clearPassTimer);
}
