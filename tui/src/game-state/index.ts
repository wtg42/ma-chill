import { createSignal, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { buildTileCatalogMap, type ZigTileEntry } from "../tiles/catalog-map";
import { formatTileLabel } from "../tiles";
import { formatHandSummaryLines } from "./hand-summary";
import { getAlwaysAvailableCommandHints, getAvailableCommandHints } from "../commands/registry";

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
  seat_winds: string[];
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

export type ZigPhaseKind = "self_turn" | "discard_reaction";
export type ZigPriorityGroup = "none" | "win" | "meld" | "chi";

export interface ZigChiOption {
  claim_tile_ids: number[];
}

export interface ZigTurnChangedMessage {
  type: "turn_changed";
  player_id: number;
  phase_kind: ZigPhaseKind;
  available_actions: string[];
  discarded_tile_id?: number | null;
  discarder_player_id?: number | null;
  priority_group?: ZigPriorityGroup;
  chi_options?: ZigChiOption[];
}

export interface ClaimPromptContext {
  discardedTileId: number | null;
  discarderPlayerId: number | null;
  priorityGroup: ZigPriorityGroup;
  chiOptions: ZigChiOption[];
}

export interface ZigScoringLine {
  pattern: string;
  fan: number;
}

export interface ZigScoringDetail {
  total_fan: number;
  lines: ZigScoringLine[];
}

export interface ZigGameOverMessage {
  type: "game_over";
  winner_id: number | null;
  scores: number[];
  scoring_detail: ZigScoringDetail | null;
}

// ---- Hand entry ----

export interface HandEntry {
  id: number;
  tile: CanonicalTile;
}

export interface EventLogEntry {
  id: number;
  kind: "system" | "command" | "game" | "error";
  message: string;
}

export interface CommandFeedback {
  kind: "info" | "success" | "error";
  message: string;
}

export type ActiveDialog = "none" | "discard_picker";

const PLAYER_NAMES = ["你", "玩家 2", "玩家 3", "玩家 4"];

function playerLabel(playerId: number): string {
  return PLAYER_NAMES[playerId] ?? `玩家 ${playerId + 1}`;
}

function describeMeld(type: ZigMeld["type"]): string {
  switch (type) {
    case "chi":
      return "吃牌";
    case "pon":
      return "碰牌";
    case "open_kong":
    case "closed_kong":
      return "槓牌";
  }
}

function diffStateMessages(
  previous: ZigGameState | null,
  next: ZigGameState,
  tileCatalog: Map<number, CanonicalTile>,
): string[] {
  if (!previous) {
    return [];
  }

  const messages: string[] = [];

  for (let playerId = 0; playerId < next.players.length; playerId += 1) {
    const prevPlayer = previous.players[playerId];
    const nextPlayer = next.players[playerId];
    if (!prevPlayer || !nextPlayer) continue;

    if (nextPlayer.discards.length > prevPlayer.discards.length) {
      const tileId = nextPlayer.discards[nextPlayer.discards.length - 1];
      const tile = tileCatalog.get(tileId);
      messages.push(`${playerLabel(playerId)}打出 ${tile ? formatTileLabel(tile) : `tile ${tileId}`}`);
    }

    if (nextPlayer.melds.length > prevPlayer.melds.length) {
      const meld = nextPlayer.melds[nextPlayer.melds.length - 1];
      if (meld) {
        messages.push(`${playerLabel(playerId)}${describeMeld(meld.type)}`);
      }
    }
  }

  if (next.drawn_tile_id !== null && next.drawn_tile_id !== previous.drawn_tile_id) {
    const tile = tileCatalog.get(next.drawn_tile_id);
    if (next.current_player_id === 0 && tile) {
      messages.push(`你摸到 ${formatTileLabel(tile)}`);
    } else {
      messages.push(`${playerLabel(next.current_player_id)}摸牌`);
    }
  }

  for (const event of next.events) {
    if (typeof event !== "object" || event === null) continue;
    const typedEvent = event as { type?: string; player_id?: number; tile_id?: number };
    if (typedEvent.type === "bonus_tile" && typeof typedEvent.player_id === "number" && typeof typedEvent.tile_id === "number") {
      const tile = tileCatalog.get(typedEvent.tile_id);
      messages.push(`${playerLabel(typedEvent.player_id)}補花 ${tile ? formatTileLabel(tile) : `tile ${typedEvent.tile_id}`}`);
    }
  }

  return messages;
}

function viewerDrewTile(previous: ZigGameState | null, next: ZigGameState): boolean {
  return previous !== null
    && next.current_player_id === 0
    && next.drawn_tile_id !== null
    && next.drawn_tile_id !== previous.drawn_tile_id;
}

function buildHandEntries(
  state: ZigGameState | null,
  tileCatalog: Map<number, CanonicalTile>,
): HandEntry[] {
  if (!state) return [];

  const player0 = state.players[0];
  if (!player0 || !player0.hand) return [];

  const entries: HandEntry[] = [];
  for (const id of player0.hand) {
    const tile = tileCatalog.get(id);
    if (tile) {
      entries.push({ id, tile });
    }
  }
  return entries;
}

function describeTurnPrompt(
  msg: ZigTurnChangedMessage,
  hints: string[],
  tileCatalog: Map<number, CanonicalTile>,
): string {
  if (msg.phase_kind === "discard_reaction") {
    const tile = msg.discarded_tile_id != null ? tileCatalog.get(msg.discarded_tile_id) : undefined;
    const tileLabel = tile ? formatTileLabel(tile) : `tile ${msg.discarded_tile_id ?? "?"}`;
    return `${playerLabel(msg.discarder_player_id ?? -1)}打出 ${tileLabel}，你可用：${hints.join(" ")}`;
  }
  return `${playerLabel(msg.player_id)}可用：${hints.join(" ")}`;
}

// ---- useGameState hook ----

export function useGameState() {
  const [gameState, setGameState] = createSignal<ZigGameState | null>(null);
  const [availableActions, setAvailableActions] = createSignal<string[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = createSignal<number>(0);
  const [tileCatalog, setTileCatalog] = createSignal<Map<number, CanonicalTile>>(new Map());
  const [gameOverMsg, setGameOverMsg] = createSignal<ZigGameOverMessage | null>(null);
  const [passTimeoutSeconds, setPassTimeoutSeconds] = createSignal(5);
  const [commandInput, setCommandInput] = createSignal("");
  const [commandFeedback, setCommandFeedbackState] = createSignal<CommandFeedback | null>(null);
  const [eventLog, setEventLog] = createSignal<EventLogEntry[]>([]);
  const [availableCommandHints, setAvailableCommandHints] = createSignal<string[]>(getAlwaysAvailableCommandHints());
  const [phaseKind, setPhaseKind] = createSignal<ZigPhaseKind>("self_turn");
  const [activeDialog, setActiveDialog] = createSignal<ActiveDialog>("none");
  const [discardPickerFocusIndex, setDiscardPickerFocusIndexState] = createSignal(0);
  const [claimContext, setClaimContext] = createSignal<ClaimPromptContext>({
    discardedTileId: null,
    discarderPlayerId: null,
    priorityGroup: "none",
    chiOptions: [],
  });
  let nextEventId = 1;

  function appendEvent(kind: EventLogEntry["kind"], message: string): void {
    setEventLog((entries) => [
      ...entries,
      {
        id: nextEventId,
        kind,
        message,
      },
    ]);
    nextEventId += 1;
  }

  function setCommandFeedback(kind: CommandFeedback["kind"], message: string): void {
    setCommandFeedbackState({ kind, message });
  }

  // 將棄牌 dialog 相關本地 state 重設為初始值，避免散落多處重複清理。
  function resetDiscardPickerState(): void {
    setActiveDialog("none");
    setDiscardPickerFocusIndexState(0);
  }

  // 開啟棄牌 dialog，並將焦點重設到第一個可選項。
  function openDiscardPicker(): void {
    setActiveDialog("discard_picker");
    setDiscardPickerFocusIndexState(0);
  }

  // 關閉棄牌 dialog，避免舊焦點殘留到下一次開啟。
  function closeDiscardPicker(): void {
    resetDiscardPickerState();
  }

  // 更新棄牌 dialog 的焦點索引，供方向鍵導覽使用。
  function setDiscardPickerFocusIndex(index: number): void {
    setDiscardPickerFocusIndexState(index);
  }

  function applyInit(msg: ZigInitMessage): void {
    const catalog = buildTileCatalogMap(msg.tile_catalog);
    setTileCatalog(catalog);
    setGameState(msg.state);
    setAvailableActions([]);
    setCurrentPlayerId(msg.state.current_player_id);
    setPassTimeoutSeconds(msg.pass_timeout_seconds);
    setAvailableCommandHints(getAlwaysAvailableCommandHints());
    setPhaseKind("self_turn");
    resetDiscardPickerState();
    setClaimContext({
      discardedTileId: null,
      discarderPlayerId: null,
      priorityGroup: "none",
      chiOptions: [],
    });
    appendEvent("system", "已連線至 Zig core。輸入 /help 查看可用指令。");
  }

  function applyStateUpdate(msg: ZigStateUpdateMessage): void {
    const previousState = gameState();
    const catalog = tileCatalog();
    setGameState(msg.state);
    setAvailableActions([]);
    setCurrentPlayerId(msg.state.current_player_id);
    setAvailableCommandHints(getAlwaysAvailableCommandHints());
    setPhaseKind("self_turn");
    resetDiscardPickerState();
    setClaimContext({
      discardedTileId: null,
      discarderPlayerId: null,
      priorityGroup: "none",
      chiOptions: [],
    });

    const messages = diffStateMessages(previousState, msg.state, catalog);
    for (const message of messages) {
      appendEvent("game", message);
    }

    if (viewerDrewTile(previousState, msg.state)) {
      const lines = formatHandSummaryLines(
        buildHandEntries(msg.state, catalog),
        msg.state.drawn_tile_id,
        catalog.get(msg.state.drawn_tile_id!) ?? null,
      );
      for (const line of lines) {
        appendEvent("system", line);
      }
    }
  }

  function applyTurnChanged(msg: ZigTurnChangedMessage): void {
    setAvailableActions(msg.available_actions);
    setCurrentPlayerId(msg.player_id);
    setPhaseKind(msg.phase_kind);
    resetDiscardPickerState();
    setClaimContext({
      discardedTileId: msg.discarded_tile_id ?? null,
      discarderPlayerId: msg.discarder_player_id ?? null,
      priorityGroup: msg.priority_group ?? "none",
      chiOptions: msg.chi_options ?? [],
    });
    const hints = getAvailableCommandHints(msg.available_actions);
    setAvailableCommandHints(hints);
    if (msg.player_id === 0) {
      appendEvent("system", describeTurnPrompt(msg, hints, tileCatalog()));
    }
  }

  function applyGameOver(msg: ZigGameOverMessage): void {
    setGameOverMsg(msg);
    setAvailableActions([]);
    setAvailableCommandHints(getAlwaysAvailableCommandHints());
    setPhaseKind("self_turn");
    resetDiscardPickerState();
    setClaimContext({
      discardedTileId: null,
      discarderPlayerId: null,
      priorityGroup: "none",
      chiOptions: [],
    });
    if (msg.winner_id === null) {
      appendEvent("game", "本局流局。" );
    } else {
      appendEvent("game", `${playerLabel(msg.winner_id)}胡牌，對局結束。`);
    }
  }

  function clearTurnPrompt(): void {
    setAvailableActions([]);
    setAvailableCommandHints(getAlwaysAvailableCommandHints());
    setPhaseKind("self_turn");
    resetDiscardPickerState();
    setClaimContext({
      discardedTileId: null,
      discarderPlayerId: null,
      priorityGroup: "none",
      chiOptions: [],
    });
  }

  const handWithIds = createMemo<HandEntry[]>(() => {
    return buildHandEntries(gameState(), tileCatalog());
  });

  const seatWinds = createMemo<string[]>(() => {
    const state = gameState();
    return state?.seat_winds ?? ["east", "east", "east", "east"];
  });

  return {
    gameState,
    availableActions,
    currentPlayerId,
    tileCatalog,
    gameOverMsg,
    commandInput,
    commandFeedback,
    eventLog,
    availableCommandHints,
    phaseKind,
    activeDialog,
    discardPickerFocusIndex,
    claimContext,
    applyInit,
    applyStateUpdate,
    applyTurnChanged,
    applyGameOver,
    clearTurnPrompt,
    appendEvent,
    setCommandInput,
    setCommandFeedback,
    openDiscardPicker,
    closeDiscardPicker,
    setDiscardPickerFocusIndex,
    handWithIds,
    seatWinds,
    passTimeoutSeconds,
  };
}

export type GameStateStore = ReturnType<typeof useGameState>;
