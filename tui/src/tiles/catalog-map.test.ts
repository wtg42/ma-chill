import { describe, it, expect } from "bun:test";
import { buildTileCatalogMap, type ZigTileEntry } from "./catalog-map";

describe("buildTileCatalogMap", () => {
  it("maps suited tiles by suit and rank", () => {
    const catalog: ZigTileEntry[] = [
      { id: 0, suit: "characters", rank: "one", copy_index: 0 },
      { id: 1, suit: "characters", rank: "one", copy_index: 1 },
      { id: 8, suit: "bamboos", rank: "three", copy_index: 0 },
      { id: 20, suit: "circles", rank: "nine", copy_index: 2 },
    ];

    const map = buildTileCatalogMap(catalog);

    const tile0 = map.get(0);
    expect(tile0).toBeDefined();
    expect(tile0!.suit).toBe("characters");
    expect(tile0!.rank).toBe(1);

    const tile1 = map.get(1);
    expect(tile1).toBeDefined();
    expect(tile1!.suit).toBe("characters");
    expect(tile1!.rank).toBe(1);
    // Same CanonicalTile for same suit/rank regardless of copy_index
    expect(tile0).toBe(tile1);

    const tile8 = map.get(8);
    expect(tile8!.suit).toBe("bamboos");
    expect(tile8!.rank).toBe(3);

    const tile20 = map.get(20);
    expect(tile20!.suit).toBe("circles");
    expect(tile20!.rank).toBe(9);
  });

  it("maps wind tiles", () => {
    const catalog: ZigTileEntry[] = [
      { id: 100, suit: "winds", rank: "east", copy_index: 0 },
      { id: 101, suit: "winds", rank: "north", copy_index: 1 },
    ];

    const map = buildTileCatalogMap(catalog);

    const east = map.get(100);
    expect(east).toBeDefined();
    expect(east!.suit).toBe("winds");
    expect(east!.wind).toBe("east");

    const north = map.get(101);
    expect(north!.wind).toBe("north");
  });

  it("maps dragon tiles", () => {
    const catalog: ZigTileEntry[] = [
      { id: 110, suit: "dragons", rank: "red", copy_index: 0 },
      { id: 111, suit: "dragons", rank: "green", copy_index: 0 },
    ];

    const map = buildTileCatalogMap(catalog);

    expect(map.get(110)!.dragon).toBe("red");
    expect(map.get(111)!.dragon).toBe("green");
  });

  it("copy_index does not affect the result", () => {
    const catalog: ZigTileEntry[] = [
      { id: 50, suit: "circles", rank: "five", copy_index: 0 },
      { id: 51, suit: "circles", rank: "five", copy_index: 1 },
      { id: 52, suit: "circles", rank: "five", copy_index: 2 },
      { id: 53, suit: "circles", rank: "five", copy_index: 3 },
    ];

    const map = buildTileCatalogMap(catalog);

    const t50 = map.get(50);
    const t51 = map.get(51);
    const t52 = map.get(52);
    const t53 = map.get(53);

    // All four copies resolve to same CanonicalTile
    expect(t50).toBe(t51);
    expect(t51).toBe(t52);
    expect(t52).toBe(t53);
    expect(t50!.rank).toBe(5);
    expect(t50!.suit).toBe("circles");
  });
});
