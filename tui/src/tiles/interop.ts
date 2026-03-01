import type { CanonicalTile, ZigInteropTile } from "./types";

export function toZigInteropTile(tile: CanonicalTile): ZigInteropTile {
  return {
    tile_id: tile.tile_id,
    kind_id: tile.kind_id,
    copy_index: tile.copy_index,
    category: tile.category,
    suit: tile.suit,
    rank: tile.rank,
    wind: tile.wind,
    dragon: tile.dragon,
    bonus_type: tile.bonus_type,
    bonus_ordinal: tile.bonus_ordinal,
  };
}

export function toZigInteropCatalog(catalog: CanonicalTile[]): ZigInteropTile[] {
  return catalog.map(toZigInteropTile);
}
