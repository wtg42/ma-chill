import type { CanonicalTile } from "../tiles/types";
import { buildTaiwanMahjongCatalog } from "../tiles/catalog";
import type { MeldData } from "./MeldRow";
import type { AiMeldData } from "./AiPlayerRow";

const catalog = buildTaiwanMahjongCatalog();

function findSuited(suit: string, rank: number): CanonicalTile {
  const tile = catalog.find((t) => t.category === "suited" && t.suit === suit && t.rank === rank);
  if (!tile) throw new Error(`Tile not found: suited ${suit} ${rank}`);
  return tile;
}

function findWind(wind: string): CanonicalTile {
  const tile = catalog.find((t) => t.honor_type === "wind" && t.wind === wind);
  if (!tile) throw new Error(`Tile not found: wind ${wind}`);
  return tile;
}

/**
 * Fake game data for UI visualization
 */

// 玩家手牌：13 張（副露後剩餘）
export const playerHand: CanonicalTile[] = [
  findSuited("circles", 1),
  findSuited("circles", 2),
  findSuited("circles", 3),
  findSuited("bamboos", 1),
  findSuited("bamboos", 2),
  findSuited("bamboos", 3),
  findSuited("characters", 1),
  findSuited("characters", 2),
  findSuited("characters", 3),
  findSuited("characters", 4),
  findWind("east"),
  findWind("south"),
  findWind("west"),
];

// 最後摸到的牌
export const lastDrawnTile: CanonicalTile = findSuited("bamboos", 5);

// 玩家副露範例：chi（吃尾張）
export const playerMelds: MeldData[] = [
  {
    tiles: [findSuited("characters", 5), findSuited("characters", 6), findSuited("characters", 7)],
    type: "chi",
    sourceTileIndex: 2, // 吃了 7，置中
    viewerIsOwner: true,
  },
  {
    tiles: [findWind("north"), findWind("north"), findWind("north")],
    type: "pon",
    sourceTileIndex: null,
    viewerIsOwner: true,
  },
];

// 玩家可用動作（示例：可碰、可胡）
export const playerAvailableActions: string[] = ["pon", "win", "discard"];

// AI 玩家數據
export const aiPlayers: {
  wind: string;
  name: string;
  handCount: number;
  latestDiscard: CanonicalTile | null;
  melds: AiMeldData[];
}[] = [
  {
    wind: "north",
    name: "北家",
    handCount: 10,
    latestDiscard: findSuited("circles", 7),
    melds: [
      {
        tiles: [findSuited("circles", 4), findSuited("circles", 4), findSuited("circles", 4), findSuited("circles", 4)],
        type: "open_kong",
        sourceTileIndex: null,
        viewerIsOwner: false,
      },
    ],
  },
  {
    wind: "west",
    name: "西家",
    handCount: 13,
    latestDiscard: findSuited("bamboos", 4),
    melds: [
      {
        tiles: [findSuited("bamboos", 8), findSuited("bamboos", 8), findSuited("bamboos", 8), findSuited("bamboos", 8)],
        type: "closed_kong",
        sourceTileIndex: null,
        viewerIsOwner: false, // AI 暗槓 → 全背面
      },
    ],
  },
  {
    wind: "east",
    name: "東家",
    handCount: 13,
    latestDiscard: findWind("east"),
    melds: [],
  },
];

// 全場棄牌歷史（示例）
export const allDiscards: CanonicalTile[] = [
  findSuited("circles", 7),
  findSuited("circles", 7),
  findSuited("bamboos", 4),
  findSuited("bamboos", 4),
  findSuited("bamboos", 4),
  findWind("east"),
  findSuited("characters", 7),
  findSuited("circles", 1),
  findSuited("circles", 1),
];

// 玩家最新棄牌
export const playerLatestDiscard: CanonicalTile = findSuited("characters", 7);

// 遊戲資訊
export const gameInfo = {
  roundWind: "東",
  roundNumber: 3,
  tilesRemaining: 44,
};
