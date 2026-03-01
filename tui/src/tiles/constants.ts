export const TILE_CATEGORIES = ["suited", "honor", "bonus"] as const;
export type TileCategory = (typeof TILE_CATEGORIES)[number];

export const SUITED_SUITS = ["characters", "circles", "bamboos"] as const;
export type SuitedSuit = (typeof SUITED_SUITS)[number];

export const HONOR_TYPES = ["wind", "dragon"] as const;
export type HonorType = (typeof HONOR_TYPES)[number];

export const WINDS = ["east", "south", "west", "north"] as const;
export type Wind = (typeof WINDS)[number];

export const DRAGONS = ["red", "green", "white"] as const;
export type Dragon = (typeof DRAGONS)[number];

export const BONUS_TYPES = ["season", "flower"] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

export const BONUS_NAMES = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "plum",
  "orchid",
  "chrysanthemum",
  "bamboo",
] as const;
export type BonusName = (typeof BONUS_NAMES)[number];

export const SUITED_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type SuitedRank = (typeof SUITED_RANKS)[number];

export const BONUS_ORDINALS = [1, 2, 3, 4] as const;
export type BonusOrdinal = (typeof BONUS_ORDINALS)[number];

export const TAIWAN_TILE_COUNT = 144;
export const COPIES_PER_STANDARD_KIND = 4;
export const COPIES_PER_BONUS_KIND = 1;
