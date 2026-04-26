import { describe, expect, it } from "bun:test";
import { buildTaiwanMahjongCatalog } from "../tiles";
import type { CanonicalTile } from "../tiles/types";
import type { HandEntry } from "../game-state";
import {
  buildDiscardPickerCardStyle,
  buildDiscardPickerPopupPlacement,
  buildDiscardPickerRows,
  buildDiscardPickerVisualLayout,
  canOpenDiscardPicker,
  moveDiscardPickerFocus,
} from "./discard-picker";
import type { DiscardPickerRow } from "./discard-picker";

const catalog = buildTaiwanMahjongCatalog();

describe("canOpenDiscardPicker", () => {
  it("只有可棄牌時才允許開啟 dialog", () => {
    expect(canOpenDiscardPicker(["discard", "win"])).toBe(true);
    expect(canOpenDiscardPicker(["chi", "pass"])).toBe(false);
  });
});

describe("buildDiscardPickerCardStyle", () => {
  it("回傳不透明的卡片樣式，且不再暴露全畫面遮罩設定", () => {
    const style = buildDiscardPickerCardStyle();

    expect(style.backgroundColor).not.toBe("transparent");
    expect(style.borderStyle).toBe("rounded");
    expect("overlayBackgroundColor" in style).toBe(false);
  });
});

describe("buildDiscardPickerRows", () => {
  it("建立含短標籤的手牌列與摸牌列", () => {
    const tileCatalog = new Map<number, CanonicalTile>([
      [tileId("characters", 1), findSuited("characters", 1)],
      [tileId("circles", 7), findSuited("circles", 7)],
      [tileId("bamboos", 5), findSuited("bamboos", 5)],
    ]);
    const handEntries: HandEntry[] = [
      { id: tileId("characters", 1), tile: findSuited("characters", 1) },
      { id: tileId("circles", 7), tile: findSuited("circles", 7) },
    ];

    const rows = buildDiscardPickerRows(handEntries, tileId("bamboos", 5), tileCatalog);

    expect(rows).toEqual([
      {
        id: "hand",
        label: "手牌",
        items: [
          { tileId: tileId("characters", 1), tile: findSuited("characters", 1), shortLabel: "1m", source: "hand" },
          { tileId: tileId("circles", 7), tile: findSuited("circles", 7), shortLabel: "7p", source: "hand" },
        ],
      },
      {
        id: "drawn",
        label: "摸牌",
        items: [
          { tileId: tileId("bamboos", 5), tile: findSuited("bamboos", 5), shortLabel: "5s", source: "drawn" },
        ],
      },
    ]);
  });

  it("沒有摸牌時省略摸牌列", () => {
    const handEntries: HandEntry[] = [
      { id: tileId("wind", 0, "east"), tile: findWind("east") },
    ];
    const tileCatalog = new Map<number, CanonicalTile>([
      [tileId("wind", 0, "east"), findWind("east")],
    ]);

    const rows = buildDiscardPickerRows(handEntries, null, tileCatalog);

    expect(rows).toEqual([
      {
        id: "hand",
        label: "手牌",
        items: [
          { tileId: tileId("wind", 0, "east"), tile: findWind("east"), shortLabel: "east", source: "hand" },
        ],
      },
    ]);
  });
});

describe("buildDiscardPickerVisualLayout", () => {
  it("會依 dialog 內容寬度把手牌切成多個視覺列", () => {
    const layout = buildDiscardPickerVisualLayout(createWrappedRows());
    const handSection = layout.sections[0];
    const drawnSection = layout.sections[1];

    expect(handSection?.id).toBe("hand");
    expect(handSection?.visualRows.map((row) => row.items.length)).toEqual([7, 2]);
    expect(drawnSection?.id).toBe("drawn");
    expect(drawnSection?.visualRows.map((row) => row.items.length)).toEqual([1]);
  });

  it("為每個項目建立正確的視覺列與欄位置", () => {
    const layout = buildDiscardPickerVisualLayout(createWrappedRows());

    expect(layout.positions[0]).toMatchObject({ flatIndex: 0, visualRowIndex: 0, visualColumnIndex: 0 });
    expect(layout.positions[6]).toMatchObject({ flatIndex: 6, visualRowIndex: 0, visualColumnIndex: 6 });
    expect(layout.positions[7]).toMatchObject({ flatIndex: 7, visualRowIndex: 1, visualColumnIndex: 0 });
    expect(layout.positions[9]).toMatchObject({ flatIndex: 9, visualRowIndex: 2, visualColumnIndex: 0 });
  });
});

describe("moveDiscardPickerFocus", () => {
  it("左右鍵只在同一個視覺列內移動", () => {
    const rows = createWrappedRows();

    expect(moveDiscardPickerFocus(rows, 7, "right")).toBe(8);
    expect(moveDiscardPickerFocus(rows, 8, "left")).toBe(7);
    expect(moveDiscardPickerFocus(rows, 6, "right")).toBe(6);
    expect(moveDiscardPickerFocus(rows, 7, "left")).toBe(7);
  });

  it("上下鍵會在相鄰視覺列尋找最近欄位", () => {
    const rows = createWrappedRows();

    expect(moveDiscardPickerFocus(rows, 5, "down")).toBe(8);
    expect(moveDiscardPickerFocus(rows, 8, "up")).toBe(1);
    expect(moveDiscardPickerFocus(rows, 9, "up")).toBe(7);
  });

  it("超出邊界時焦點維持原位", () => {
    const rows = createWrappedRows();

    expect(moveDiscardPickerFocus(rows, 0, "left")).toBe(0);
    expect(moveDiscardPickerFocus(rows, 9, "down")).toBe(9);
  });
});

describe("buildDiscardPickerPopupPlacement", () => {
  it("只建立 popup 卡片定位資訊，不包含 overlay 背景", () => {
    const layout = buildDiscardPickerVisualLayout(createWrappedRows());
    const placement = buildDiscardPickerPopupPlacement(120, 40, layout.sections);

    expect(placement.position).toBe("absolute");
    expect(placement.zIndex).toBe(90);
    expect(placement.left).toBeGreaterThan(0);
    expect(placement.top).toBeGreaterThan(0);
    expect("backgroundColor" in placement).toBe(false);
  });
});

// 依花色與數字取得測試用牌 id，確保 discard picker 測試能對齊真實 catalog。
function tileId(
  suit: "characters" | "circles" | "bamboos" | "wind",
  rank: number,
  wind?: "east" | "south" | "west" | "north",
): number {
  if (suit === "wind") {
    const tile = catalog.find((entry) => entry.wind === wind && entry.copy_index === 0);
    if (!tile) {
      throw new Error(`missing tile id for wind ${wind}`);
    }
    return tile.tile_id;
  }

  const tile = catalog.find((entry) => entry.suit === suit && entry.rank === rank && entry.copy_index === 0);
  if (!tile) {
    throw new Error(`missing tile id for ${suit} ${rank}`);
  }
  return tile.tile_id;
}

// 取得測試用數牌，讓資料列斷言可以直接比對真實 CanonicalTile。
function findSuited(suit: "characters" | "circles" | "bamboos", rank: number): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === suit && entry.rank === rank);
  if (!tile) {
    throw new Error(`missing suited tile for ${suit} ${rank}`);
  }
  return tile;
}

// 取得測試用風牌，驗證短 label 與字牌資料列。
function findWind(wind: "east" | "south" | "west" | "north"): CanonicalTile {
  const tile = catalog.find((entry) => entry.wind === wind);
  if (!tile) {
    throw new Error(`missing wind tile for ${wind}`);
  }
  return tile;
}

// 建立可觸發手牌換行的測試資料，覆蓋多列手牌與獨立摸牌區。
function createWrappedRows(): DiscardPickerRow[] {
  return [
    {
      id: "hand",
      label: "手牌",
      items: [
        { tileId: tileId("characters", 1), tile: findSuited("characters", 1), shortLabel: "1m", source: "hand" },
        { tileId: tileId("circles", 7), tile: findSuited("circles", 7), shortLabel: "7p", source: "hand" },
        { tileId: tileId("bamboos", 1), tile: findSuited("bamboos", 1), shortLabel: "1s", source: "hand" },
        { tileId: tileId("characters", 2), tile: findSuited("characters", 2), shortLabel: "2m", source: "hand" },
        { tileId: tileId("circles", 2), tile: findSuited("circles", 2), shortLabel: "2p", source: "hand" },
        { tileId: tileId("bamboos", 2), tile: findSuited("bamboos", 2), shortLabel: "2s", source: "hand" },
        { tileId: tileId("characters", 3), tile: findSuited("characters", 3), shortLabel: "3m", source: "hand" },
        { tileId: tileId("circles", 3), tile: findSuited("circles", 3), shortLabel: "3p", source: "hand" },
        { tileId: tileId("bamboos", 3), tile: findSuited("bamboos", 3), shortLabel: "3s", source: "hand" },
      ],
    },
    {
      id: "drawn",
      label: "摸牌",
      items: [
        { tileId: tileId("wind", 0, "east"), tile: findWind("east"), shortLabel: "east", source: "drawn" },
      ],
    },
  ];
}
