import type { CanonicalTile } from "../tiles/types";
import { buildTaiwanMahjongCatalog } from "../tiles/catalog";

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
 * Fake game data for MVP table visualization
 */

// 玩家手牌：16 張（起手）
export const playerHand: CanonicalTile[] = [
  findSuited("circles", 1),
  findSuited("circles", 2),
  findSuited("circles", 3),
  findSuited("circles", 4),
  findSuited("bamboos", 1),
  findSuited("bamboos", 2),
  findSuited("bamboos", 3),
  findSuited("characters", 1),
  findSuited("characters", 2),
  findSuited("characters", 3),
  findSuited("characters", 4),
  findSuited("characters", 5),
  findWind("east"),
  findWind("south"),
  findWind("west"),
  findWind("north"),
];

// 最後摸到的牌（示例）
export const lastDrawnTile: CanonicalTile = findSuited("bamboos", 5);

// AI 玩家數據
export const aiPlayers = [
  {
    wind: "north",
    name: "北家",
    handCount: 13,
    latestDiscard: findSuited("circles", 7),
  },
  {
    wind: "west",
    name: "西家",
    handCount: 13,
    latestDiscard: findSuited("bamboos", 4),
  },
  {
    wind: "east",
    name: "東家",
    handCount: 13,
    latestDiscard: findWind("east"),
  },
];

// 玩家最新棄牌（示例）
export const playerLatestDiscard: CanonicalTile = findSuited("characters", 7);
