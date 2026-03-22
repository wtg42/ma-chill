import type { CanonicalTile } from "./types";

const SUIT_SHORT: Record<string, string> = {
  characters: "m",
  circles: "p",
  bamboos: "s",
};

const WIND_ALIASES: Record<string, string[]> = {
  east: ["east", "e"],
  south: ["south"],
  west: ["west"],
  north: ["north", "n"],
};

const DRAGON_ALIASES: Record<string, string[]> = {
  red: ["red", "zhong"],
  green: ["green", "fa"],
  white: ["white", "bai"],
};

export function formatTileLabel(tile: CanonicalTile): string {
  return tile.name_zh_hant;
}

export function formatTileShort(tile: CanonicalTile): string {
  if (tile.category === "suited" && tile.rank !== null) {
    const suffix = SUIT_SHORT[tile.suit] ?? "?";
    return `${tile.rank}${suffix}`;
  }

  if (tile.honor_type === "wind" && tile.wind) {
    return tile.wind;
  }

  if (tile.honor_type === "dragon" && tile.dragon) {
    return tile.dragon;
  }

  return tile.name_en;
}

export function tileMatchesToken(tile: CanonicalTile, token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }

  if (tile.category === "suited" && tile.rank !== null) {
    const suffix = SUIT_SHORT[tile.suit] ?? "";
    return normalized === `${tile.rank}${suffix}`;
  }

  if (tile.honor_type === "wind" && tile.wind) {
    return (WIND_ALIASES[tile.wind] ?? []).includes(normalized);
  }

  if (tile.honor_type === "dragon" && tile.dragon) {
    return (DRAGON_ALIASES[tile.dragon] ?? []).includes(normalized);
  }

  return false;
}
