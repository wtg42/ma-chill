import { describe, expect, it } from "bun:test";
import type { DiscardPickerRow } from "./discard-picker";
import { buildDiscardPickerDialogModel } from "./DiscardPickerDialog";
import { buildTaiwanMahjongCatalog } from "../tiles";
import type { CanonicalTile } from "../tiles/types";

const catalog = buildTaiwanMahjongCatalog();
const focusFg = "#86efac";

describe("DiscardPickerDialog", () => {
  it("建立多列手牌、獨立摸牌區與目前焦點提示", () => {
    const model = buildDiscardPickerDialogModel(createRows(), 7);
    const handSection = model.visualSections[0];
    const drawnSection = model.visualSections[1];

    expect(model.focusedLabel).toBe("3p");
    expect(model.hintText).toContain("方向鍵移動");
    expect(handSection?.visualRows.length).toBe(2);
    expect(handSection?.visualRows.map((row) => row.items.length)).toEqual([7, 2]);
    expect(drawnSection?.visualRows.length).toBe(1);
    expect(drawnSection?.visualRows[0]?.items[0]?.label.content.trim()).toBe("east");
    expect(model.cardStyle.backgroundColor).not.toBe("transparent");
  });

  it("用柔和綠色前景色標示焦點牌塊，不使用反白", () => {
    const model = buildDiscardPickerDialogModel(createRows(), 7);
    const focusedItem = model.visualSections[0]?.visualRows[1]?.items[0];
    const unfocusedItem = model.visualSections[0]?.visualRows[0]?.items[0];

    expect(focusedItem?.isFocused).toBe(true);
    expect(focusedItem?.tileLines.every((line) => line.fg === focusFg)).toBe(true);
    expect(focusedItem?.tileLines.every((line) => !("inverse" in line))).toBe(true);
    expect(focusedItem?.label.fg).toBe(focusFg);
    expect("inverse" in (focusedItem?.label ?? {})).toBe(false);
    expect(unfocusedItem?.isFocused).toBe(false);
    expect(unfocusedItem?.tileLines.every((line) => line.fg === undefined)).toBe(true);
    expect(unfocusedItem?.tileLines.every((line) => !("inverse" in line))).toBe(true);
    expect(unfocusedItem?.label.fg).toBeUndefined();
    expect("inverse" in (unfocusedItem?.label ?? {})).toBe(false);
  });

  it("沒有可棄牌時建立空狀態", () => {
    const model = buildDiscardPickerDialogModel([], 0);

    expect(model.emptyMessage).toBe("目前沒有可棄的牌");
  });
});

// 建立 discard dialog 測試資料，覆蓋手牌列、摸牌列與字牌短 label。
function createRows(): DiscardPickerRow[] {
  return [
    {
      id: "hand",
      label: "手牌",
      items: [
        {
          tileId: 1,
          tile: findSuited("characters", 1),
          shortLabel: "1m",
          source: "hand",
        },
        {
          tileId: 3,
          tile: findSuited("circles", 7),
          shortLabel: "7p",
          source: "hand",
        },
        {
          tileId: 4,
          tile: findSuited("bamboos", 1),
          shortLabel: "1s",
          source: "hand",
        },
        {
          tileId: 5,
          tile: findSuited("characters", 2),
          shortLabel: "2m",
          source: "hand",
        },
        {
          tileId: 6,
          tile: findSuited("circles", 2),
          shortLabel: "2p",
          source: "hand",
        },
        {
          tileId: 7,
          tile: findSuited("bamboos", 2),
          shortLabel: "2s",
          source: "hand",
        },
        {
          tileId: 8,
          tile: findSuited("characters", 3),
          shortLabel: "3m",
          source: "hand",
        },
        {
          tileId: 9,
          tile: findSuited("circles", 3),
          shortLabel: "3p",
          source: "hand",
        },
        {
          tileId: 10,
          tile: findSuited("bamboos", 3),
          shortLabel: "3s",
          source: "hand",
        },
      ],
    },
    {
      id: "drawn",
      label: "摸牌",
      items: [
        {
          tileId: 2,
          tile: findWind("east"),
          shortLabel: "east",
          source: "drawn",
        },
      ],
    },
  ];
}

// 取得測試用數牌，讓 dialog 渲染可重用真實牌面模板。
function findSuited(suit: "characters" | "circles" | "bamboos", rank: number): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === suit && entry.rank === rank);
  if (!tile) {
    throw new Error(`missing suited tile for ${suit} ${rank}`);
  }
  return tile;
}

// 取得測試用風牌，驗證字牌短 label 與焦點提示。
function findWind(wind: "east" | "south" | "west" | "north"): CanonicalTile {
  const tile = catalog.find((entry) => entry.wind === wind);
  if (!tile) {
    throw new Error(`missing wind tile for ${wind}`);
  }
  return tile;
}
