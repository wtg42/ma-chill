import { TAIWAN_TILE_COUNT } from "./constants";
import type { CanonicalTile, CatalogValidationResult } from "./types";

export function validateTileCatalog(catalog: CanonicalTile[]): CatalogValidationResult {
  const errors: string[] = [];

  if (catalog.length !== TAIWAN_TILE_COUNT) {
    errors.push(`Catalog size mismatch: expected ${TAIWAN_TILE_COUNT}, got ${catalog.length}`);
  }

  const tileIds = new Set<number>();
  const kindToTileIds = new Map<number, number[]>();
  const kindToFaceSignature = new Map<number, string>();

  let suitedCount = 0;
  let windCount = 0;
  let dragonCount = 0;
  let seasonCount = 0;
  let flowerCount = 0;

  for (const tile of catalog) {
    tileIds.add(tile.tile_id);

    const entries = kindToTileIds.get(tile.kind_id);
    if (entries) {
      entries.push(tile.tile_id);
    } else {
      kindToTileIds.set(tile.kind_id, [tile.tile_id]);
    }

    const signature = `${tile.category}|${tile.suit}|${tile.rank}|${tile.honor_type}|${tile.wind}|${tile.dragon}|${tile.bonus_type}|${tile.bonus_ordinal}`;
    const existingSignature = kindToFaceSignature.get(tile.kind_id);
    if (existingSignature && existingSignature !== signature) {
      errors.push(`kind_id=${tile.kind_id} has inconsistent semantic fields`);
    }
    kindToFaceSignature.set(tile.kind_id, signature);

    if (tile.category === "suited") {
      suitedCount += 1;
    } else if (tile.honor_type === "wind") {
      windCount += 1;
    } else if (tile.honor_type === "dragon") {
      dragonCount += 1;
    } else if (tile.bonus_type === "season") {
      seasonCount += 1;
    } else if (tile.bonus_type === "flower") {
      flowerCount += 1;
    }
  }

  if (tileIds.size !== catalog.length) {
    errors.push("tile_id values are not unique");
  }

  for (let expected = 0; expected < catalog.length; expected += 1) {
    if (!tileIds.has(expected)) {
      errors.push(`tile_id sequence is not contiguous from 0..${catalog.length - 1}`);
      break;
    }
  }

  if (suitedCount !== 108) {
    errors.push(`Suited tile count mismatch: expected 108, got ${suitedCount}`);
  }
  if (windCount !== 16) {
    errors.push(`Wind tile count mismatch: expected 16, got ${windCount}`);
  }
  if (dragonCount !== 12) {
    errors.push(`Dragon tile count mismatch: expected 12, got ${dragonCount}`);
  }
  if (seasonCount !== 4) {
    errors.push(`Season tile count mismatch: expected 4, got ${seasonCount}`);
  }
  if (flowerCount !== 4) {
    errors.push(`Flower tile count mismatch: expected 4, got ${flowerCount}`);
  }

  for (const [kindId, ids] of kindToTileIds.entries()) {
    if (ids.length > 1) {
      const sorted = [...ids].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i += 1) {
        if (sorted[i] === sorted[i + 1]) {
          errors.push(`kind_id=${kindId} has duplicate tile_id values`);
          break;
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateTileCatalogOrThrow(catalog: CanonicalTile[]): void {
  const result = validateTileCatalog(catalog);
  if (!result.ok) {
    throw new Error(`Tile catalog validation failed:\n${result.errors.join("\n")}`);
  }
}
