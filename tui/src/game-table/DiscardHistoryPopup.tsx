import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";

interface DiscardHistoryPopupProps {
  discards: CanonicalTile[];
}

interface DiscardGroup {
  tile: CanonicalTile;
  count: number;
  lines: string[];
}

export function DiscardHistoryPopup(props: DiscardHistoryPopupProps): JSX.Element {
  const groups = createMemo((): DiscardGroup[] => {
    const countMap = new Map<number, { tile: CanonicalTile; count: number }>();
    for (const tile of props.discards) {
      const entry = countMap.get(tile.kind_id);
      if (entry) {
        entry.count++;
      } else {
        countMap.set(tile.kind_id, { tile, count: 1 });
      }
    }

    return Array.from(countMap.values()).map(({ tile, count }) => {
      const textKey = toTextRenderKey(tile);
      const template = resolveTileTextTemplateByKey(textKey);
      const lines = renderTileTextTemplate(template).split("\n");
      return { tile, count, lines };
    });
  });

  return (
    <box
      borderStyle="single"
      flexDirection="column"
      padding={1}
      width={60}
    >
      <text bold={true}>棄牌歷史</text>
      {groups().length === 0 ? (
        <text dimmed={true}>尚無棄牌</text>
      ) : (
        <box flexDirection="row" flexWrap="wrap" gap={1}>
          <For each={groups()}>
            {(group) => (
              <box flexDirection="column" width={7} alignItems="center">
                <For each={group.lines}>
                  {(line) => <text>{line}</text>}
                </For>
                <text justifyContent="center">×{group.count}</text>
              </box>
            )}
          </For>
        </box>
      )}
    </box>
  );
}
