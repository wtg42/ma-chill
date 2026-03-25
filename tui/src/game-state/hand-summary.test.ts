import { describe, expect, it } from "bun:test";
import { buildTaiwanMahjongCatalog } from "../tiles";
import type { CanonicalTile } from "../tiles/types";
import { formatHandSummaryLines } from "./hand-summary";

const catalog = buildTaiwanMahjongCatalog();

describe("formatHandSummaryLines", () => {
  it("groups tiles by type, sorts each line, omits empty groups, and separates drawn tile", () => {
    const lines = formatHandSummaryLines(
      [
        hand(findDragon("white"), 1),
        hand(findBonus("flower", "bamboo"), 2),
        hand(findSuited("bamboos", 9), 3),
        hand(findSuited("characters", 3), 4),
        hand(findWind("east"), 5),
        hand(findSuited("circles", 2), 6),
        hand(findBonus("season", "spring"), 7),
        hand(findDragon("red"), 8),
        hand(findSuited("characters", 1), 9),
        hand(findWind("north"), 10),
        hand(findSuited("circles", 8), 11),
        hand(findSuited("bamboos", 1), 12),
        hand(findSuited("characters", 1), 13),
        hand(findSuited("circles", 5), 20),
      ],
      20,
      findSuited("circles", 5),
    );

    expect(lines).toEqual([
      "你的手牌：",
      "萬：",
      "┌─────┐ ┌─────┐ ┌─────┐",
      "│  1  │ │  1  │ │  3  │",
      "│ 萬  │ │ 萬  │ │ 萬  │",
      "└─────┘ └─────┘ └─────┘",
      "筒：",
      "┌─────┐ ┌─────┐",
      "│  2  │ │  8  │",
      "│  ●  │ │  ●  │",
      "└─────┘ └─────┘",
      "條：",
      "┌─────┐ ┌─────┐",
      "│  1  │ │  9  │",
      "│  █  │ │  █  │",
      "└─────┘ └─────┘",
      "風：",
      "┌─────┐ ┌─────┐",
      "│ 東  │ │ 北  │",
      "│     │ │     │",
      "└─────┘ └─────┘",
      "三元：",
      "┌─────┐ ┌─────┐",
      "│ 中  │ │     │",
      "│     │ │     │",
      "└─────┘ └─────┘",
      "四季：",
      "┌─────┐",
      "│  1  │",
      "│ 春  │",
      "└─────┘",
      "四君子：",
      "┌─────┐",
      "│  4  │",
      "│ 竹  │",
      "└─────┘",
      "摸牌：",
      "┌─────┐",
      "│  5  │",
      "│  ●  │",
      "└─────┘",
    ]);
  });

  it("does not output empty groups", () => {
    const lines = formatHandSummaryLines(
      [
        hand(findSuited("characters", 7), 1),
        hand(findSuited("characters", 9), 2),
      ],
      null,
      null,
    );

    expect(lines).toEqual([
      "你的手牌：",
      "萬：",
      "┌─────┐ ┌─────┐",
      "│  7  │ │  9  │",
      "│ 萬  │ │ 萬  │",
      "└─────┘ └─────┘",
    ]);
  });
});

function hand(tile: CanonicalTile, id: number) {
  return { id, tile };
}

function findSuited(suit: "characters" | "circles" | "bamboos", rank: number): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === suit && entry.rank === rank);
  if (!tile) {
    throw new Error(`missing suited tile: ${suit} ${rank}`);
  }
  return tile;
}

function findWind(wind: "east" | "south" | "west" | "north"): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === "winds" && entry.wind === wind);
  if (!tile) {
    throw new Error(`missing wind tile: ${wind}`);
  }
  return tile;
}

function findDragon(dragon: "red" | "green" | "white"): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === "dragons" && entry.dragon === dragon);
  if (!tile) {
    throw new Error(`missing dragon tile: ${dragon}`);
  }
  return tile;
}

function findBonus(type: "season" | "flower", name: string): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === "bonus" && entry.bonus_type === type && entry.bonus_name === name);
  if (!tile) {
    throw new Error(`missing bonus tile: ${type} ${name}`);
  }
  return tile;
}
