import type { CanonicalTile } from "../tiles/types";
import { toTileTextRenderBinding } from "../tiles";
import type { HandEntry } from "./index";

interface HandGroup {
  label: string;
  tiles: CanonicalTile[];
}

export function formatHandSummaryLines(
  handEntries: HandEntry[],
  drawnTileId: number | null,
  drawnTile: CanonicalTile | null,
): string[] {
  const groups = buildHandGroups(
    drawnTileId == null ? handEntries : handEntries.filter((entry) => entry.id !== drawnTileId),
  );
  const lines = ["你的手牌："];

  for (const group of groups) {
    if (group.tiles.length === 0) continue;
    lines.push(...renderTileGroup(group.label, group.tiles));
  }

  if (drawnTile) {
    lines.push(...renderTileGroup("摸牌", [drawnTile]));
  }

  return lines;
}

function buildHandGroups(handEntries: HandEntry[]): HandGroup[] {
  const sortedTiles = handEntries
    .map((entry) => entry.tile)
    .toSorted((left, right) => left.sort_key - right.sort_key);

  const characters: CanonicalTile[] = [];
  const circles: CanonicalTile[] = [];
  const bamboos: CanonicalTile[] = [];
  const winds: CanonicalTile[] = [];
  const dragons: CanonicalTile[] = [];
  const seasons: CanonicalTile[] = [];
  const flowers: CanonicalTile[] = [];

  for (const tile of sortedTiles) {
    if (tile.category === "suited") {
      if (tile.suit === "characters") {
        characters.push(tile);
      } else if (tile.suit === "circles") {
        circles.push(tile);
      } else if (tile.suit === "bamboos") {
        bamboos.push(tile);
      }
      continue;
    }

    if (tile.honor_type === "wind") {
      winds.push(tile);
      continue;
    }

    if (tile.honor_type === "dragon") {
      dragons.push(tile);
      continue;
    }

    if (tile.bonus_type === "season") {
      seasons.push(tile);
      continue;
    }

    if (tile.bonus_type === "flower") {
      flowers.push(tile);
    }
  }

  return [
    { label: "萬", tiles: characters },
    { label: "筒", tiles: circles },
    { label: "條", tiles: bamboos },
    { label: "風", tiles: winds },
    { label: "三元", tiles: dragons },
    { label: "四季", tiles: seasons },
    { label: "四君子", tiles: flowers },
  ];
}

function renderTileGroup(label: string, tiles: CanonicalTile[]): string[] {
  const renderedTiles = tiles.map((tile) => toTileTextRenderBinding(tile).ascii.split("\n"));
  const height = renderedTiles[0]?.length ?? 0;
  const lines = [`${label}：`];

  for (let row = 0; row < height; row += 1) {
    lines.push(renderedTiles.map((tile) => tile[row] ?? "").join(" "));
  }

  return lines;
}
