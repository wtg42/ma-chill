import {
  BONUS_ORDINALS,
  COPIES_PER_BONUS_KIND,
  COPIES_PER_STANDARD_KIND,
  DRAGONS,
  SUITED_RANKS,
  SUITED_SUITS,
  TAIWAN_TILE_COUNT,
  WINDS,
} from "./constants";
import type { CanonicalTile, TileKind } from "./types";

function createTileKinds(): TileKind[] {
  const kinds: TileKind[] = [];
  let kindId = 0;
  let sortKey = 0;

  for (const suit of SUITED_SUITS) {
    for (const rank of SUITED_RANKS) {
      kinds.push({
        kind_id: kindId,
        category: "suited",
        suit,
        rank,
        honor_type: null,
        wind: null,
        dragon: null,
        bonus_type: null,
        bonus_name: null,
        bonus_ordinal: null,
        name_en: `${rank} of ${suit}`,
        name_zh_hant: `${toZhNumber(rank)}${toZhSuit(suit)}`,
        symbol: null,
        sort_key: sortKey,
        copy_count: COPIES_PER_STANDARD_KIND,
      });
      kindId += 1;
      sortKey += 1;
    }
  }

  for (const wind of WINDS) {
    kinds.push({
      kind_id: kindId,
      category: "honor",
      suit: "winds",
      rank: null,
      honor_type: "wind",
      wind,
      dragon: null,
      bonus_type: null,
      bonus_name: null,
      bonus_ordinal: null,
      name_en: `${wind} wind`,
      name_zh_hant: toZhWind(wind),
      symbol: null,
      sort_key: sortKey,
      copy_count: COPIES_PER_STANDARD_KIND,
    });
    kindId += 1;
    sortKey += 1;
  }

  for (const dragon of DRAGONS) {
    kinds.push({
      kind_id: kindId,
      category: "honor",
      suit: "dragons",
      rank: null,
      honor_type: "dragon",
      wind: null,
      dragon,
      bonus_type: null,
      bonus_name: null,
      bonus_ordinal: null,
      name_en: `${dragon} dragon`,
      name_zh_hant: toZhDragon(dragon),
      symbol: null,
      sort_key: sortKey,
      copy_count: COPIES_PER_STANDARD_KIND,
    });
    kindId += 1;
    sortKey += 1;
  }

  const seasons = ["spring", "summer", "autumn", "winter"] as const;
  for (const bonusOrdinal of BONUS_ORDINALS) {
    const bonusName = seasons[bonusOrdinal - 1];
    if (!bonusName) {
      throw new Error(`Missing season mapping for ordinal ${bonusOrdinal}`);
    }
    kinds.push({
      kind_id: kindId,
      category: "bonus",
      suit: "bonus",
      rank: null,
      honor_type: null,
      wind: null,
      dragon: null,
      bonus_type: "season",
      bonus_name: bonusName,
      bonus_ordinal: bonusOrdinal,
      name_en: `${bonusName} season`,
      name_zh_hant: toZhSeason(bonusOrdinal),
      symbol: null,
      sort_key: sortKey,
      copy_count: COPIES_PER_BONUS_KIND,
    });
    kindId += 1;
    sortKey += 1;
  }

  const flowers = ["plum", "orchid", "chrysanthemum", "bamboo"] as const;
  for (const bonusOrdinal of BONUS_ORDINALS) {
    const bonusName = flowers[bonusOrdinal - 1];
    if (!bonusName) {
      throw new Error(`Missing flower mapping for ordinal ${bonusOrdinal}`);
    }
    kinds.push({
      kind_id: kindId,
      category: "bonus",
      suit: "bonus",
      rank: null,
      honor_type: null,
      wind: null,
      dragon: null,
      bonus_type: "flower",
      bonus_name: bonusName,
      bonus_ordinal: bonusOrdinal,
      name_en: `${bonusName} flower`,
      name_zh_hant: toZhFlower(bonusOrdinal),
      symbol: null,
      sort_key: sortKey,
      copy_count: COPIES_PER_BONUS_KIND,
    });
    kindId += 1;
    sortKey += 1;
  }

  return kinds;
}

export function buildTaiwanMahjongCatalog(): CanonicalTile[] {
  const kinds = createTileKinds();
  const tiles: CanonicalTile[] = [];
  let tileId = 0;

  for (const kind of kinds) {
    for (let copyIndex = 0; copyIndex < kind.copy_count; copyIndex += 1) {
      tiles.push({
        tile_id: tileId,
        kind_id: kind.kind_id,
        copy_index: copyIndex,
        category: kind.category,
        suit: kind.suit,
        rank: kind.rank,
        honor_type: kind.honor_type,
        wind: kind.wind,
        dragon: kind.dragon,
        bonus_type: kind.bonus_type,
        bonus_name: kind.bonus_name,
        bonus_ordinal: kind.bonus_ordinal,
        name_en: kind.name_en,
        name_zh_hant: kind.name_zh_hant,
        symbol: kind.symbol,
        sort_key: kind.sort_key,
      });
      tileId += 1;
    }
  }

  if (tiles.length !== TAIWAN_TILE_COUNT) {
    throw new Error(`Expected ${TAIWAN_TILE_COUNT} tiles, got ${tiles.length}`);
  }

  return tiles;
}

function toZhSuit(suit: (typeof SUITED_SUITS)[number]): string {
  if (suit === "characters") {
    return "萬";
  }
  if (suit === "circles") {
    return "筒";
  }
  return "條";
}

function toZhNumber(rank: (typeof SUITED_RANKS)[number]): string {
  const zhNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
  const zhNumber = zhNumbers[rank - 1];
  if (!zhNumber) {
    throw new Error(`Invalid suited rank: ${rank}`);
  }
  return zhNumber;
}

function toZhWind(wind: (typeof WINDS)[number]): string {
  if (wind === "east") {
    return "東";
  }
  if (wind === "south") {
    return "南";
  }
  if (wind === "west") {
    return "西";
  }
  return "北";
}

function toZhDragon(dragon: (typeof DRAGONS)[number]): string {
  if (dragon === "red") {
    return "中";
  }
  if (dragon === "green") {
    return "發";
  }
  return "白";
}

function toZhSeason(ordinal: (typeof BONUS_ORDINALS)[number]): string {
  if (ordinal === 1) {
    return "春";
  }
  if (ordinal === 2) {
    return "夏";
  }
  if (ordinal === 3) {
    return "秋";
  }
  return "冬";
}

function toZhFlower(ordinal: (typeof BONUS_ORDINALS)[number]): string {
  if (ordinal === 1) {
    return "梅";
  }
  if (ordinal === 2) {
    return "蘭";
  }
  if (ordinal === 3) {
    return "菊";
  }
  return "竹";
}
