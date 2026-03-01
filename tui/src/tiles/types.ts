import type {
  BonusName,
  BonusOrdinal,
  BonusType,
  Dragon,
  HonorType,
  SuitedSuit,
  TileCategory,
  Wind,
} from "./constants";

export type CanonicalSuit = SuitedSuit | "winds" | "dragons" | "bonus";

export interface CanonicalTile {
  tile_id: number;
  kind_id: number;
  copy_index: number;
  category: TileCategory;
  suit: CanonicalSuit;
  rank: number | null;
  honor_type: HonorType | null;
  wind: Wind | null;
  dragon: Dragon | null;
  bonus_type: BonusType | null;
  bonus_name: BonusName | null;
  bonus_ordinal: BonusOrdinal | null;
  name_en: string;
  name_zh_hant: string;
  symbol: string | null;
  sort_key: number;
}

export interface TileKind {
  kind_id: number;
  category: TileCategory;
  suit: CanonicalSuit;
  rank: number | null;
  honor_type: HonorType | null;
  wind: Wind | null;
  dragon: Dragon | null;
  bonus_type: BonusType | null;
  bonus_name: BonusName | null;
  bonus_ordinal: BonusOrdinal | null;
  name_en: string;
  name_zh_hant: string;
  symbol: string | null;
  sort_key: number;
  copy_count: number;
}

export interface CatalogValidationResult {
  ok: boolean;
  errors: string[];
}

export interface ZigInteropTile {
  tile_id: number;
  kind_id: number;
  copy_index: number;
  category: TileCategory;
  suit: CanonicalSuit;
  rank: number | null;
  wind: Wind | null;
  dragon: Dragon | null;
  bonus_type: BonusType | null;
  bonus_ordinal: BonusOrdinal | null;
}
