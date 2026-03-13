import { createSignal, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { buildTileCatalogMap, type ZigTileEntry } from "../tiles/catalog-map";

// ---- Types from Zig protocol ----

export interface ZigMeld {
  type: "chi" | "pon" | "open_kong" | "closed_kong";
  tiles: number[];
  source_index: number | null;
}

export interface ZigPlayerState {
  player_id: number;
  // Player 0 (viewer) has `hand`; AI players have `hand_count`
  hand?: number[];
  hand_count?: number;
  melds: ZigMeld[];
  discards: number[];
}

export interface ZigGameState {
  players: ZigPlayerState[];
  wall_count: number;
  round_wind: string;
  round_number: number;
  dealer_player_id: number;
  current_player_id: number;
  drawn_tile_id: number | null;
  scores: number[];
  events: unknown[];
}

export interface ZigInitMessage {
  type: "init";
  tile_catalog: ZigTileEntry[];
  state: ZigGameState;
  pass_timeout_seconds: number;
}

export interface ZigStateUpdateMessage {
  type: "state_update";
  state: ZigGameState;
}

export interface ZigTurnChangedMessage {
  type: "turn_changed";
  player_id: number;
  available_actions: string[];
}

// ---- Hand entry ----

export interface HandEntry {
  id: number;
  tile: CanonicalTile;
}

// ---- useGameState hook ----

export function useGameState() {
  const [gameState, setGameState] = createSignal<ZigGameState | null>(null);
  const [availableActions, setAvailableActions] = createSignal<string[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = createSignal<number>(0);
  const [tileCatalog, setTileCatalog] = createSignal<Map<number, CanonicalTile>>(new Map());

  function applyInit(msg: ZigInitMessage): void {
    const catalog = buildTileCatalogMap(msg.tile_catalog);
    setTileCatalog(catalog);
    setGameState(msg.state);
    setAvailableActions([]);
  }

  function applyStateUpdate(msg: ZigStateUpdateMessage): void {
    setGameState(msg.state);
  }

  function applyTurnChanged(msg: ZigTurnChangedMessage): void {
    setAvailableActions(msg.available_actions);
    setCurrentPlayerId(msg.player_id);
  }

  const handWithIds = createMemo<HandEntry[]>(() => {
    const state = gameState();
    const catalog = tileCatalog();
    if (!state) return [];

    const player0 = state.players[0];
    if (!player0 || !player0.hand) return [];

    const entries: HandEntry[] = [];
    for (const id of player0.hand) {
      const tile = catalog.get(id);
      if (tile) {
        entries.push({ id, tile });
      }
    }
    return entries;
  });

  return {
    gameState,
    availableActions,
    currentPlayerId,
    tileCatalog,
    applyInit,
    applyStateUpdate,
    applyTurnChanged,
    handWithIds,
  };
}

export type GameStateStore = ReturnType<typeof useGameState>;
