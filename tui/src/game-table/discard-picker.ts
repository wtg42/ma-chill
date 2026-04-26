import type { HandEntry } from "../game-state";
import { formatTileShort } from "../tiles";
import type { CanonicalTile } from "../tiles/types";

export interface DiscardPickerItem {
  tileId: number;
  tile: CanonicalTile;
  shortLabel: string;
  source: "hand" | "drawn";
}

export interface DiscardPickerRow {
  id: "hand" | "drawn";
  label: string;
  items: DiscardPickerItem[];
}

export type DiscardPickerDirection = "left" | "right" | "up" | "down";

export interface DiscardPickerCardStyle {
  backgroundColor: string;
  borderStyle: "rounded";
}

export interface DiscardPickerPopupPlacement {
  position: "absolute";
  zIndex: number;
  left: number;
  top: number;
}

export interface DiscardPickerVisualPosition {
  flatIndex: number;
  visualRowIndex: number;
  visualColumnIndex: number;
}

export interface DiscardPickerVisualItem extends DiscardPickerVisualPosition {
  item: DiscardPickerItem;
}

export interface DiscardPickerVisualRow {
  visualRowIndex: number;
  items: DiscardPickerVisualItem[];
}

export interface DiscardPickerVisualSection {
  id: "hand" | "drawn";
  label: string;
  visualRows: DiscardPickerVisualRow[];
}

export interface DiscardPickerVisualLayout {
  sections: DiscardPickerVisualSection[];
  positions: DiscardPickerVisualPosition[];
}

export const DISCARD_PICKER_DIALOG_WIDTH = 64;

const DISCARD_PICKER_DIALOG_PADDING_X = 2;
const DISCARD_PICKER_TILE_WIDTH = 7;
const DISCARD_PICKER_TILE_GAP = 1;
const DISCARD_PICKER_TILE_HEIGHT = 4;
const DISCARD_PICKER_CARD_OUTER_WIDTH = DISCARD_PICKER_DIALOG_WIDTH + 4;
const DISCARD_PICKER_BASE_POPUP_HEIGHT = 8;

// 判斷目前是否具備開啟棄牌 dialog 的基本條件。
export function canOpenDiscardPicker(availableActions: string[]): boolean {
  return availableActions.includes("discard");
}

// 提供 discard popup 卡片樣式，確保內容區維持不透明背景。
export function buildDiscardPickerCardStyle(): DiscardPickerCardStyle {
  return {
    backgroundColor: "#111827",
    borderStyle: "rounded",
  };
}

// 建立 discard dialog 需要的列資料，統一提供手牌、摸牌與短 label。
export function buildDiscardPickerRows(
  handEntries: HandEntry[],
  drawnTileId: number | null,
  tileCatalog: Map<number, CanonicalTile>,
): DiscardPickerRow[] {
  const rows: DiscardPickerRow[] = [];
  const handItems = handEntries.map((entry) => ({
    tileId: entry.id,
    tile: entry.tile,
    shortLabel: formatTileShort(entry.tile),
    source: "hand" as const,
  }));

  if (handItems.length > 0) {
    rows.push({
      id: "hand",
      label: "手牌",
      items: handItems,
    });
  }

  if (drawnTileId != null) {
    const drawnTile = tileCatalog.get(drawnTileId);
    if (drawnTile) {
      rows.push({
        id: "drawn",
        label: "摸牌",
        items: [{
          tileId: drawnTileId,
          tile: drawnTile,
          shortLabel: formatTileShort(drawnTile),
          source: "drawn",
        }],
      });
    }
  }

  return rows;
}

// 將 discard dialog 的列資料攤平成單一陣列，供焦點定位與鍵盤導覽共用。
export function flattenDiscardPickerRows(rows: DiscardPickerRow[]): DiscardPickerItem[] {
  return rows.flatMap((row) => row.items);
}

// 依目前焦點索引取得對應的 discard picker 項目，供確認棄牌時重用。
export function discardPickerItemAtIndex(
  rows: DiscardPickerRow[],
  focusIndex: number,
): DiscardPickerItem | null {
  return flattenDiscardPickerRows(rows)[focusIndex] ?? null;
}

// 依 dialog 可用內容寬度反推每個手牌視覺列最多可容納幾張牌。
function getMaxHandItemsPerVisualRow(dialogWidth: number): number {
  const contentWidth = Math.max(1, dialogWidth - DISCARD_PICKER_DIALOG_PADDING_X);
  return Math.max(
    1,
    Math.floor((contentWidth + DISCARD_PICKER_TILE_GAP) / (DISCARD_PICKER_TILE_WIDTH + DISCARD_PICKER_TILE_GAP)),
  );
}

// 依指定大小切分陣列，供手牌區轉成多個視覺列。
function chunkItems<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    chunks.push(items.slice(start, start + chunkSize));
  }
  return chunks;
}

// 將原始資料列轉成視覺列與座標，讓渲染與焦點導覽共享同一份 view-model。
export function buildDiscardPickerVisualLayout(
  rows: DiscardPickerRow[],
  dialogWidth: number = DISCARD_PICKER_DIALOG_WIDTH,
): DiscardPickerVisualLayout {
  const sections: DiscardPickerVisualSection[] = [];
  const positions: DiscardPickerVisualPosition[] = [];
  const maxHandItemsPerVisualRow = getMaxHandItemsPerVisualRow(dialogWidth);
  let nextFlatIndex = 0;
  let nextVisualRowIndex = 0;

  for (const row of rows) {
    const chunkSize = row.id === "hand" ? maxHandItemsPerVisualRow : Math.max(1, row.items.length);
    const visualRows = chunkItems(row.items, chunkSize).map((items) => {
      const visualRowIndex = nextVisualRowIndex;
      nextVisualRowIndex += 1;

      return {
        visualRowIndex,
        items: items.map((item, visualColumnIndex) => {
          const flatIndex = nextFlatIndex;
          nextFlatIndex += 1;
          const position = {
            flatIndex,
            visualRowIndex,
            visualColumnIndex,
          };
          positions[flatIndex] = position;
          return {
            ...position,
            item,
          };
        }),
      };
    });

    if (visualRows.length > 0) {
      sections.push({
        id: row.id,
        label: row.label,
        visualRows,
      });
    }
  }

  return { sections, positions };
}

// 估算 popup 高度，讓卡片定位可大致置中且不需建立全畫面容器。
function estimateDiscardPickerPopupHeight(sections: DiscardPickerVisualSection[]): number {
  if (sections.length === 0) {
    return DISCARD_PICKER_BASE_POPUP_HEIGHT;
  }

  const sectionRows = sections.reduce((sum, section) => sum + section.visualRows.length, 0);
  const sectionLabels = sections.length;
  const gapsBetweenSections = Math.max(0, sections.length - 1);
  return DISCARD_PICKER_BASE_POPUP_HEIGHT
    + sectionLabels
    + sectionRows * DISCARD_PICKER_TILE_HEIGHT
    + gapsBetweenSections;
}

// 建立 discard popup 的絕對定位資訊，只讓卡片浮在內容上方而不產生整頁遮罩。
export function buildDiscardPickerPopupPlacement(
  viewportWidth: number,
  viewportHeight: number,
  sections: DiscardPickerVisualSection[],
): DiscardPickerPopupPlacement {
  const popupHeight = estimateDiscardPickerPopupHeight(sections);
  return {
    position: "absolute",
    zIndex: 90,
    left: Math.max(0, Math.floor((viewportWidth - DISCARD_PICKER_CARD_OUTER_WIDTH) / 2)),
    top: Math.max(0, Math.floor((viewportHeight - popupHeight) / 2)),
  };
}

// 依視覺列索引找出對應列，供方向鍵在相鄰列間切換。
function findVisualRow(
  sections: DiscardPickerVisualSection[],
  visualRowIndex: number,
): DiscardPickerVisualRow | null {
  for (const section of sections) {
    const matchedRow = section.visualRows.find((row) => row.visualRowIndex === visualRowIndex);
    if (matchedRow) {
      return matchedRow;
    }
  }
  return null;
}

// 在目標視覺列中找出最接近目前欄位的項目，供上下移動時使用。
function findClosestVisualItem(
  row: DiscardPickerVisualRow,
  visualColumnIndex: number,
): DiscardPickerVisualItem | null {
  let closestItem: DiscardPickerVisualItem | null = null;
  for (const item of row.items) {
    if (!closestItem) {
      closestItem = item;
      continue;
    }

    const currentDistance = Math.abs(item.visualColumnIndex - visualColumnIndex);
    const closestDistance = Math.abs(closestItem.visualColumnIndex - visualColumnIndex);
    if (currentDistance < closestDistance) {
      closestItem = item;
    }
  }
  return closestItem;
}

// 依方向計算 discard dialog 的下一個焦點索引，供方向鍵導覽共用。
export function moveDiscardPickerFocus(
  rows: DiscardPickerRow[],
  currentIndex: number,
  direction: DiscardPickerDirection,
): number {
  const layout = buildDiscardPickerVisualLayout(rows);
  const currentPosition = layout.positions[currentIndex];
  if (!currentPosition) {
    return currentIndex;
  }

  const currentRow = findVisualRow(layout.sections, currentPosition.visualRowIndex);
  if (!currentRow) {
    return currentIndex;
  }

  if (direction === "left" || direction === "right") {
    const offset = direction === "left" ? -1 : 1;
    const targetColumn = currentPosition.visualColumnIndex + offset;
    const targetItem = currentRow.items.find((item) => item.visualColumnIndex === targetColumn);
    return targetItem?.flatIndex ?? currentIndex;
  }

  const targetRowIndex = direction === "up"
    ? currentPosition.visualRowIndex - 1
    : currentPosition.visualRowIndex + 1;
  const targetRow = findVisualRow(layout.sections, targetRowIndex);
  if (!targetRow) {
    return currentIndex;
  }

  return findClosestVisualItem(targetRow, currentPosition.visualColumnIndex)?.flatIndex ?? currentIndex;
}
