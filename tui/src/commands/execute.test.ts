import { describe, expect, it, mock } from "bun:test";
import type { GameStateStore } from "../game-state";
import type { CanonicalTile } from "../tiles/types";
import { buildTaiwanMahjongCatalog, formatTileShort } from "../tiles";
import { executeCommand, executeDiscardByTileId } from "./execute";

const catalog = buildTaiwanMahjongCatalog();

describe("executeCommand", () => {
  it("renders /hand locally without sending IPC", () => {
    const sendAction = mock(() => {});
    const store = createStoreStub({
      handWithIds: mock(() => [
        { id: 1, tile: findSuited("characters", 1) },
        { id: 2, tile: findSuited("circles", 3) },
        { id: 20, tile: findSuited("bamboos", 5) },
      ]),
      gameState: mock(() => createGameState([1, 2], 20)),
      tileCatalog: mock(() => new Map([[20, findSuited("bamboos", 5)]])),
    });

    const result = executeCommand("/hand", store, {}, { sendAction });

    expect(result.ok).toBe(true);
    expect(sendAction).not.toHaveBeenCalled();
    expect(store.setCommandFeedback).toHaveBeenCalledWith("info", "已顯示目前手牌。");
    expect(store.appendEvent.mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ["command", "$ /hand"],
      ["system", "你的手牌："],
      ["system", "萬："],
      ["system", "┌─────┐"],
      ["system", "│  1  │"],
      ["system", "│ 萬  │"],
      ["system", "└─────┘"],
      ["system", "筒："],
      ["system", "┌─────┐"],
      ["system", "│  3  │"],
      ["system", "│  ●  │"],
      ["system", "└─────┘"],
      ["system", "摸牌："],
      ["system", "┌─────┐"],
      ["system", "│  5  │"],
      ["system", "│  █  │"],
      ["system", "└─────┘"],
    ]);
  });

  it("reports an error when /hand is used before state is available", () => {
    const sendAction = mock(() => {});
    const store = createStoreStub();

    const result = executeCommand("/hand", store, {}, { sendAction });

    expect(result).toEqual({ ok: false, message: "目前尚未收到遊戲狀態。" });
    expect(sendAction).not.toHaveBeenCalled();
    expect(store.setCommandFeedback).toHaveBeenCalledWith("error", "目前尚未收到遊戲狀態。");
  });

  it("includes /hand in /help output", () => {
    const store = createStoreStub();

    const result = executeCommand("/help", store);

    expect(result.ok).toBe(true);
    expect(result.message).toContain("/hand - 顯示目前手牌摘要");
  });

  it("requires explicit chi option when multiple choices exist", () => {
    const sendAction = mock(() => {});
    const store = createStoreStub({
      availableActions: mock(() => ["chi", "pass"]),
      phaseKind: mock(() => "discard_reaction"),
      claimContext: mock(() => ({
        discardedTileId: 10,
        discarderPlayerId: 1,
        priorityGroup: "chi",
        chiOptions: [
          { claim_tile_ids: [1, 2] },
          { claim_tile_ids: [2, 4] },
        ],
      })),
    });

    const result = executeCommand("/chi", store, {}, { sendAction });

    expect(result).toEqual({ ok: false, message: "此刻可吃 2 組，請輸入 /chi <index>。" });
    expect(sendAction).not.toHaveBeenCalled();
  });

  it("sends selected chi option ids", () => {
    const sendAction = mock(() => {});
    const store = createStoreStub({
      availableActions: mock(() => ["chi", "pass"]),
      phaseKind: mock(() => "discard_reaction"),
      claimContext: mock(() => ({
        discardedTileId: 10,
        discarderPlayerId: 1,
        priorityGroup: "chi",
        chiOptions: [
          { claim_tile_ids: [1, 2] },
          { claim_tile_ids: [2, 4] },
        ],
      })),
    });

    const result = executeCommand("/chi 2", store, {}, { sendAction });

    expect(result.ok).toBe(true);
    expect(sendAction).toHaveBeenCalledWith("chi", undefined, [2, 4]);
  });

  it("rejects /pass outside discard reaction phase", () => {
    const sendAction = mock(() => {});
    const store = createStoreStub({
      availableActions: mock(() => ["pass"]),
      phaseKind: mock(() => "self_turn"),
    });

    const result = executeCommand("/pass", store, {}, { sendAction });

    expect(result).toEqual({ ok: false, message: "/pass 只能在回應視窗使用。" });
    expect(sendAction).not.toHaveBeenCalled();
  });

  it("keeps discard fallback and tile-id helper consistent", () => {
    const sendFromCommand = mock(() => {});
    const sendFromHelper = mock(() => {});
    const sharedStore = {
      availableActions: mock(() => ["discard"]),
      phaseKind: mock(() => "self_turn"),
      handWithIds: mock(() => [
        { id: 11, tile: findSuited("characters", 1) },
        { id: 22, tile: findSuited("circles", 3) },
      ]),
      gameState: mock(() => createGameState([11, 22], null)),
      tileCatalog: mock(() => new Map([
        [11, findSuited("characters", 1)],
        [22, findSuited("circles", 3)],
      ])),
    };
    const commandStore = createStoreStub(sharedStore);
    const helperStore = createStoreStub(sharedStore);

    const commandResult = executeCommand("/discard 22", commandStore, { echo: false }, { sendAction: sendFromCommand });
    const helperResult = executeDiscardByTileId(22, helperStore, { sendAction: sendFromHelper });

    expect(commandResult).toEqual(helperResult);
    expect(commandResult.message).toBe("已送出 /discard 3p（三筒）");
    expect(sendFromCommand).toHaveBeenCalledWith("discard", 22);
    expect(sendFromHelper).toHaveBeenCalledWith("discard", 22);
  });

  it("accepts the same short labels used by discard picker rows", () => {
    const sendAction = mock(() => {});
    const east = findWind("east");
    const store = createStoreStub({
      availableActions: mock(() => ["discard"]),
      phaseKind: mock(() => "self_turn"),
      handWithIds: mock(() => [
        { id: 11, tile: findSuited("circles", 3) },
        { id: 22, tile: east },
      ]),
      gameState: mock(() => createGameState([11, 22], null)),
      tileCatalog: mock(() => new Map([
        [11, findSuited("circles", 3)],
        [22, east],
      ])),
    });

    const suitedResult = executeCommand(`/discard ${formatTileShort(findSuited("circles", 3))}`, store, { echo: false }, { sendAction });
    const honorResult = executeCommand(`/discard ${formatTileShort(east)}`, store, { echo: false }, { sendAction });

    expect(suitedResult.ok).toBe(true);
    expect(honorResult.ok).toBe(true);
    expect(suitedResult.message).toBe("已送出 /discard 3p（三筒）");
    expect(honorResult.message).toBe("已送出 /discard east（東）");
    expect(sendAction.mock.calls[0]).toEqual(["discard", 11]);
    expect(sendAction.mock.calls[1]).toEqual(["discard", 22]);
  });

  it("formats dragon discard success message with short label and chinese label", () => {
    const sendAction = mock(() => {});
    const red = findDragon("red");
    const store = createStoreStub({
      availableActions: mock(() => ["discard"]),
      phaseKind: mock(() => "self_turn"),
      handWithIds: mock(() => [
        { id: 31, tile: red },
      ]),
      gameState: mock(() => createGameState([31], null)),
      tileCatalog: mock(() => new Map([
        [31, red],
      ])),
    });

    const result = executeCommand("/discard red", store, { echo: false }, { sendAction });

    expect(result).toEqual({ ok: true, message: "已送出 /discard red（中）" });
    expect(sendAction).toHaveBeenCalledWith("discard", 31);
  });
});

function createStoreStub(overrides: Partial<GameStateStoreStub> = {}): GameStateStoreStub {
  return {
    gameState: mock(() => null),
    availableActions: mock(() => []),
    currentPlayerId: mock(() => 0),
    tileCatalog: mock(() => new Map()),
    commandFeedback: mock(() => null),
    eventLog: mock(() => []),
    availableCommandHints: mock(() => ["/help", "/status", "/hand"]),
    phaseKind: mock(() => "self_turn"),
    claimContext: mock(() => ({
      discardedTileId: null,
      discarderPlayerId: null,
      priorityGroup: "none",
      chiOptions: [],
    })),
    gameOverMsg: mock(() => null),
    commandInput: mock(() => ""),
    passTimeoutSeconds: mock(() => 5),
    handWithIds: mock(() => []),
    seatWinds: mock(() => ["east", "south", "west", "north"]),
    applyInit: mock(() => {}),
    applyStateUpdate: mock(() => {}),
    applyTurnChanged: mock(() => {}),
    applyGameOver: mock(() => {}),
    clearTurnPrompt: mock(() => {}),
    appendEvent: mock(() => {}),
    setCommandInput: mock(() => {}),
    setCommandFeedback: mock(() => {}),
    ...overrides,
  };
}

function createGameState(hand: number[], drawnTileId: number | null) {
  return {
    players: [
      { player_id: 0, hand, melds: [], discards: [] },
      { player_id: 1, hand_count: 16, melds: [], discards: [] },
      { player_id: 2, hand_count: 16, melds: [], discards: [] },
      { player_id: 3, hand_count: 16, melds: [], discards: [] },
    ],
    wall_count: 60,
    round_wind: "east",
    round_number: 1,
    dealer_player_id: 0,
    seat_winds: ["east", "south", "west", "north"],
    current_player_id: 0,
    drawn_tile_id: drawnTileId,
    scores: [0, 0, 0, 0],
    events: [],
  };
}

function findSuited(suit: "characters" | "circles" | "bamboos", rank: number): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === suit && entry.rank === rank);
  if (!tile) {
    throw new Error(`missing suited tile: ${suit} ${rank}`);
  }
  return tile;
}

function findWind(wind: "east" | "south" | "west" | "north"): CanonicalTile {
  const tile = catalog.find((entry) => entry.wind === wind);
  if (!tile) {
    throw new Error(`missing wind tile: ${wind}`);
  }
  return tile;
}

// 取得測試用三元牌，驗證成功訊息的中英牌名對照。
function findDragon(dragon: "red" | "green" | "white"): CanonicalTile {
  const tile = catalog.find((entry) => entry.dragon === dragon);
  if (!tile) {
    throw new Error(`missing dragon tile: ${dragon}`);
  }
  return tile;
}

type GameStateStoreStub = Pick<
  GameStateStore,
  | "gameState"
  | "availableActions"
  | "currentPlayerId"
  | "tileCatalog"
  | "gameOverMsg"
  | "commandInput"
  | "commandFeedback"
  | "eventLog"
  | "availableCommandHints"
  | "phaseKind"
  | "claimContext"
  | "applyInit"
  | "applyStateUpdate"
  | "applyTurnChanged"
  | "applyGameOver"
  | "clearTurnPrompt"
  | "appendEvent"
  | "setCommandInput"
  | "setCommandFeedback"
  | "handWithIds"
  | "seatWinds"
  | "passTimeoutSeconds"
>;
