import type { CanonicalTile } from "./types";

export interface TileDisplayAdapter {
  text_key: string;
  image_asset_key: string;
  label_en: string;
  label_zh_hant: string;
}

export function toTextRenderKey(tile: CanonicalTile): string {
  if (tile.category === "suited") {
    return `suited.${tile.suit}.${tile.rank}`;
  }
  if (tile.honor_type === "wind" && tile.wind) {
    return `honor.wind.${tile.wind}`;
  }
  if (tile.honor_type === "dragon" && tile.dragon) {
    return `honor.dragon.${tile.dragon}`;
  }
  if (tile.bonus_type && tile.bonus_ordinal) {
    return `bonus.${tile.bonus_type}.${tile.bonus_ordinal}`;
  }
  throw new Error(`Unrecognized tile semantics for kind_id=${tile.kind_id}`);
}

export function toImageAssetKey(tile: CanonicalTile): string {
  return `tiles/kind-${tile.kind_id}.png`;
}

export function toDisplayAdapter(tile: CanonicalTile): TileDisplayAdapter {
  return {
    text_key: toTextRenderKey(tile),
    image_asset_key: toImageAssetKey(tile),
    label_en: tile.name_en,
    label_zh_hant: tile.name_zh_hant,
  };
}
