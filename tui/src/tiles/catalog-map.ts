import { buildTaiwanMahjongCatalog } from "./catalog";
import type { CanonicalTile } from "./types";
import { RANK_STRING_TO_NUMBER } from "./rank-map";

export interface ZigTileEntry {
  id: number;
  suit: string;
  rank: string;
  copy_index: number;
}

/**
 * Build a Map<tile_id, CanonicalTile> from Zig's init.tile_catalog.
 * copy_index is ignored — same suit/rank always maps to the same CanonicalTile.
 */
export function buildTileCatalogMap(initCatalog: ZigTileEntry[]): Map<number, CanonicalTile> {
  const localCatalog = buildTaiwanMahjongCatalog();
  const map = new Map<number, CanonicalTile>();

  for (const entry of initCatalog) {
    const tile = findCanonicalTile(localCatalog, entry.suit, entry.rank);
    if (tile) {
      map.set(entry.id, tile);
    }
  }

  return map;
}

function findCanonicalTile(
  catalog: CanonicalTile[],
  suit: string,
  rank: string,
): CanonicalTile | undefined {
  // Suited tiles (characters, bamboos, circles): rank is "one"..."nine"
  if (suit === "characters" || suit === "bamboos" || suit === "circles") {
    const rankNum = RANK_STRING_TO_NUMBER[rank];
    return catalog.find((t) => t.suit === suit && t.rank === rankNum);
  }

  // Wind tiles: suit="winds", rank="east"/"south"/"west"/"north"
  if (suit === "winds") {
    return catalog.find((t) => t.suit === "winds" && t.wind === rank);
  }

  // Dragon tiles: suit="dragons", rank="red"/"green"/"white"
  if (suit === "dragons") {
    return catalog.find((t) => t.suit === "dragons" && t.dragon === rank);
  }

  // Bonus tiles: suit="bonus", rank is bonus name
  if (suit === "bonus") {
    return catalog.find((t) => t.suit === "bonus" && t.bonus_name === rank);
  }

  return undefined;
}
