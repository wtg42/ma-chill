import { For, JSX, createMemo } from "solid-js";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";
import type { CanonicalTile } from "../tiles/types";
import type { DiscardPickerRow, DiscardPickerVisualSection } from "./discard-picker";
import {
  DISCARD_PICKER_DIALOG_WIDTH,
  buildDiscardPickerCardStyle,
  buildDiscardPickerVisualLayout,
  flattenDiscardPickerRows,
} from "./discard-picker";

const focusedTileFg = "#86efac";

interface DiscardPickerDialogProps {
  rows: DiscardPickerRow[];
  focusedIndex: number;
}

interface DiscardPickerDialogLine {
  content: string;
  fg: string | undefined;
}

interface DiscardPickerDialogItemModel {
  flatIndex: number;
  isFocused: boolean;
  tileLines: DiscardPickerDialogLine[];
  label: DiscardPickerDialogLine;
}

interface DiscardPickerDialogRowModel {
  visualRowIndex: number;
  items: DiscardPickerDialogItemModel[];
}

interface DiscardPickerDialogSectionModel {
  id: "hand" | "drawn";
  label: string;
  visualRows: DiscardPickerDialogRowModel[];
}

export interface DiscardPickerDialogModel {
  emptyMessage: string | null;
  focusedLabel: string | null;
  hintText: string;
  cardStyle: ReturnType<typeof buildDiscardPickerCardStyle>;
  visualSections: DiscardPickerDialogSectionModel[];
}

// 將單張牌轉成可逐行顯示的 ASCII 牌面，供 discard dialog 重用。
function renderTileLines(tile: CanonicalTile): string[] {
  const textKey = toTextRenderKey(tile);
  const template = resolveTileTextTemplateByKey(textKey);
  return renderTileTextTemplate(template).split("\n");
}

// 依目前焦點索引找出對應的短 label，讓 dialog 可顯示目前選擇。
function focusedLabel(rows: DiscardPickerRow[], focusedIndex: number): string | null {
  const item = flattenDiscardPickerRows(rows)[focusedIndex];
  return item?.shortLabel ?? null;
}

// 將文字補齊到固定寬度，讓每張牌塊維持一致的可視寬度。
function padDisplayText(text: string, width: number): string {
  return text.length >= width ? text : `${text}${" ".repeat(width - text.length)}`;
}

// 將牌面文字與焦點狀態轉成可直接渲染的行資料。
function buildTileLineModels(tile: CanonicalTile, isFocused: boolean): DiscardPickerDialogLine[] {
  const fg = isFocused ? focusedTileFg : undefined;
  return renderTileLines(tile).map((line) => ({
    content: padDisplayText(line, 7),
    fg,
  }));
}

// 將單個可選牌項轉成 dialog 需要的整張牌 view-model。
function buildDialogItemModel(
  flatIndex: number,
  tile: CanonicalTile,
  shortLabel: string,
  focusedIndex: number,
): DiscardPickerDialogItemModel {
  const isFocused = flatIndex === focusedIndex;
  const fg = isFocused ? focusedTileFg : undefined;
  return {
    flatIndex,
    isFocused,
    tileLines: buildTileLineModels(tile, isFocused),
    label: {
      content: padDisplayText(shortLabel, 7),
      fg,
    },
  };
}

// 將 discard picker 的視覺列資料轉成包含焦點樣式的 dialog 顯示模型。
function buildDialogSections(
  sections: DiscardPickerVisualSection[],
  focusedIndex: number,
): DiscardPickerDialogSectionModel[] {
  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    visualRows: section.visualRows.map((visualRow) => ({
      visualRowIndex: visualRow.visualRowIndex,
      items: visualRow.items.map((item) => buildDialogItemModel(
        item.flatIndex,
        item.item.tile,
        item.item.shortLabel,
        focusedIndex,
      )),
    })),
  }));
}

// 建立 discard dialog 的顯示模型，讓測試可直接驗證核心文字狀態與多列配置。
export function buildDiscardPickerDialogModel(
  rows: DiscardPickerRow[],
  focusedIndex: number,
): DiscardPickerDialogModel {
  const visualLayout = buildDiscardPickerVisualLayout(rows);
  return {
    emptyMessage: rows.length === 0 ? "目前沒有可棄的牌" : null,
    focusedLabel: focusedLabel(rows, focusedIndex),
    hintText: "方向鍵移動 / Enter 棄牌 / Esc 取消",
    cardStyle: buildDiscardPickerCardStyle(),
    visualSections: buildDialogSections(visualLayout.sections, focusedIndex),
  };
}

// 渲染玩家棄牌 dialog，顯示可棄牌項目、短 label 與操作提示。
export function DiscardPickerDialog(props: DiscardPickerDialogProps): JSX.Element {
  const model = createMemo(() => buildDiscardPickerDialogModel(props.rows, props.focusedIndex));

  return (
    <box
      borderStyle="single"
      flexDirection="column"
      padding={1}
      width={DISCARD_PICKER_DIALOG_WIDTH}
      backgroundColor={model().cardStyle.backgroundColor}
    >
      <text bold={true}>棄牌選擇</text>
      {model().emptyMessage ? (
        <text dimmed={true}>{model().emptyMessage}</text>
      ) : (
        <box flexDirection="column" gap={1}>
          <For each={model().visualSections}>
            {(section) => (
              <box flexDirection="column" gap={0}>
                <text>{section.label}</text>
                <For each={section.visualRows}>
                  {(visualRow) => (
                    <box flexDirection="row" gap={1}>
                      <For each={visualRow.items}>
                        {(visualItem) => {
                          return (
                            <box flexDirection="column" width={7}>
                              <For each={visualItem.tileLines}>
                                {(line) => <text fg={line.fg}>{line.content}</text>}
                              </For>
                              <text fg={visualItem.label.fg}>{visualItem.label.content}</text>
                            </box>
                          );
                        }}
                      </For>
                    </box>
                  )}
                </For>
              </box>
            )}
          </For>
          <text>目前選擇：{model().focusedLabel ?? "無"}</text>
          <text>{model().hintText}</text>
        </box>
      )}
    </box>
  );
}
