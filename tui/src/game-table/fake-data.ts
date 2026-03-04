import type { CanonicalTile } from "../tiles/types";

/**
 * Fake game data for MVP table visualization
 */

// 玩家手牌：16 張（起手）
export const playerHand: CanonicalTile[] = [
  { suit: "circles", rank: 1 },   // 1筒
  { suit: "circles", rank: 2 },   // 2筒
  { suit: "circles", rank: 3 },   // 3筒
  { suit: "circles", rank: 4 },   // 4筒
  { suit: "bamboos", rank: 1 },   // 1竹
  { suit: "bamboos", rank: 2 },   // 2竹
  { suit: "bamboos", rank: 3 },   // 3竹
  { suit: "characters", rank: 1 }, // 1萬
  { suit: "characters", rank: 2 }, // 2萬
  { suit: "characters", rank: 3 }, // 3萬
  { suit: "characters", rank: 4 }, // 4萬
  { suit: "characters", rank: 5 }, // 5萬
  { honor: "wind", wind: "east" },  // 東
  { honor: "wind", wind: "south" }, // 南
  { honor: "wind", wind: "west" },  // 西
  { honor: "wind", wind: "north" }, // 北
];

// 最後摸到的牌（示例）
export const lastDrawnTile: CanonicalTile = { suit: "bamboos", rank: 5 }; // 5竹

// AI 玩家數據
export const aiPlayers = [
  {
    wind: "north",
    name: "北家",
    handCount: 13,
    latestDiscard: { suit: "circles", rank: 7 } as CanonicalTile,
  },
  {
    wind: "west",
    name: "西家",
    handCount: 13,
    latestDiscard: { suit: "bamboos", rank: 4 } as CanonicalTile,
  },
  {
    wind: "east",
    name: "東家",
    handCount: 13,
    latestDiscard: { honor: "wind", wind: "east" } as CanonicalTile,
  },
];

// 玩家最新棄牌（示例）
export const playerLatestDiscard: CanonicalTile = { suit: "characters", rank: 7 }; // 7萬
