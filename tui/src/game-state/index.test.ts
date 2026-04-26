import { describe, expect, it } from "bun:test";
import { useGameState, type ZigGameState, type ZigInitMessage, type ZigStateUpdateMessage, type ZigTurnChangedMessage } from "./index";
import { buildTaiwanMahjongCatalog } from "../tiles";
import type { CanonicalTile } from "../tiles/types";
import type { ZigTileEntry } from "../tiles/catalog-map";

const catalog = buildTaiwanMahjongCatalog();

describe("useGameState applyStateUpdate", () => {
  it("appends hand summary after viewer draws a tile", () => {
    const store = useGameState();

    store.applyInit(createInitMessage(createState([tileId("characters", 1), tileId("circles", 3)], null)));
    store.applyStateUpdate(createStateUpdate(createState([
      tileId("characters", 1),
      tileId("circles", 3),
      tileId("bamboos", 5),
    ], tileId("bamboos", 5))));

    expect(store.eventLog().map((entry) => `${entry.kind}:${entry.message}`)).toEqual([
      "system:已連線至 Zig core。輸入 /help 查看可用指令。",
      "game:你摸到 五條",
      "system:你的手牌：",
      "system:萬：",
      "system:┌─────┐",
      "system:│  1  │",
      "system:│ 萬  │",
      "system:└─────┘",
      "system:筒：",
      "system:┌─────┐",
      "system:│  3  │",
      "system:│  ●  │",
      "system:└─────┘",
      "system:摸牌：",
      "system:┌─────┐",
      "system:│  5  │",
      "system:│  █  │",
      "system:└─────┘",
    ]);
  });

  it("does not append hand summary for non-viewer updates", () => {
    const store = useGameState();

    store.applyInit(createInitMessage(createState([tileId("characters", 1), tileId("circles", 3)], null)));
    store.applyStateUpdate(createStateUpdate({
      ...createState([tileId("characters", 1), tileId("circles", 3)], tileId("bamboos", 5)),
      current_player_id: 1,
      players: [
        { player_id: 0, hand: [tileId("characters", 1), tileId("circles", 3)], melds: [], discards: [] },
        { player_id: 1, hand_count: 17, melds: [], discards: [] },
        { player_id: 2, hand_count: 16, melds: [], discards: [] },
        { player_id: 3, hand_count: 16, melds: [], discards: [] },
      ],
    }));

    expect(store.eventLog().map((entry) => `${entry.kind}:${entry.message}`)).toEqual([
      "system:已連線至 Zig core。輸入 /help 查看可用指令。",
      "game:玩家 2摸牌",
    ]);
  });
});

describe("useGameState applyTurnChanged", () => {
  it("stores discard reaction context and appends player-facing prompt", () => {
    const store = useGameState();
    store.applyInit(createInitMessage(createState([tileId("characters", 1)], null)));

    const msg: ZigTurnChangedMessage = {
      type: "turn_changed",
      player_id: 0,
      phase_kind: "discard_reaction",
      available_actions: ["chi", "pass"],
      discarded_tile_id: tileId("characters", 3),
      discarder_player_id: 2,
      priority_group: "chi",
      chi_options: [{ claim_tile_ids: [tileId("characters", 1), tileId("characters", 2)] }],
    };

    store.applyTurnChanged(msg);

    expect(store.phaseKind()).toBe("discard_reaction");
    expect(store.claimContext()).toEqual({
      discardedTileId: tileId("characters", 3),
      discarderPlayerId: 2,
      priorityGroup: "chi",
      chiOptions: [{ claim_tile_ids: [tileId("characters", 1), tileId("characters", 2)] }],
    });
    expect(store.eventLog().at(-1)?.message).toContain("玩家 3打出 三萬");
  });
});

describe("useGameState discard picker state", () => {
  it("starts closed with focus at first item", () => {
    const store = useGameState();

    expect(store.activeDialog()).toBe("none");
    expect(store.discardPickerFocusIndex()).toBe(0);
  });

  it("opens and closes discard picker without mixing into ui mode", () => {
    const store = useGameState();

    store.openDiscardPicker();
    expect(store.activeDialog()).toBe("discard_picker");
    expect(store.discardPickerFocusIndex()).toBe(0);

    store.setDiscardPickerFocusIndex(2);
    expect(store.discardPickerFocusIndex()).toBe(2);

    store.closeDiscardPicker();
    expect(store.activeDialog()).toBe("none");
    expect(store.discardPickerFocusIndex()).toBe(0);
  });
});

function createInitMessage(state: ZigGameState): ZigInitMessage {
  return {
    type: "init",
    tile_catalog: createZigTileCatalog(),
    state,
    pass_timeout_seconds: 5,
  };
}

function createStateUpdate(state: ZigGameState): ZigStateUpdateMessage {
  return {
    type: "state_update",
    state,
  };
}

function createState(hand: number[], drawnTileId: number | null): ZigGameState {
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

function createZigTileCatalog(): ZigTileEntry[] {
  return catalog.map((tile) => ({
    id: tile.tile_id,
    suit: tile.suit,
    rank: toZigRank(tile),
    copy_index: tile.copy_index,
  }));
}

function toZigRank(tile: CanonicalTile): string {
  if (tile.rank != null) {
    return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][tile.rank]!;
  }
  if (tile.wind) return tile.wind;
  if (tile.dragon) return tile.dragon;
  if (tile.bonus_name) return tile.bonus_name;
  throw new Error(`unsupported tile rank for ${tile.name_en}`);
}

function tileId(suit: "characters" | "circles" | "bamboos", rank: number): number {
  const tile = catalog.find((entry) => entry.suit === suit && entry.rank === rank && entry.copy_index === 0);
  if (!tile) {
    throw new Error(`missing tile id for ${suit} ${rank}`);
  }
  return tile.tile_id;
}
