import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";

export type MeldType = "chi" | "pon" | "open_kong" | "closed_kong";

export interface MeldGroupProps {
  tiles: CanonicalTile[];
  type: MeldType;
  sourceTileIndex: number | null;
  viewerIsOwner: boolean;
}

interface TileDisplayInfo {
  tile: CanonicalTile;
  lines: string[];
  dimmed: boolean;
}

function renderTileLines(tile: CanonicalTile): string[] {
  const textKey = toTextRenderKey(tile);
  const template = resolveTileTextTemplateByKey(textKey);
  return renderTileTextTemplate(template).split("\n");
}

function renderBackLines(): string[] {
  const template = resolveTileTextTemplateByKey("tile-back");
  return renderTileTextTemplate(template).split("\n");
}

export function MeldGroup(props: MeldGroupProps): JSX.Element {
  const displayTiles = createMemo((): TileDisplayInfo[] => {
    const { tiles, type, sourceTileIndex, viewerIsOwner } = props;

    if (type === "chi" && sourceTileIndex !== null) {
      // Place source tile in the center, others sorted by rank on left/right
      const sourceT = tiles[sourceTileIndex]!;
      const rest = tiles.filter((_, i) => i !== sourceTileIndex).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      const arranged: CanonicalTile[] = [rest[0]!, sourceT, rest[1]!];
      return arranged.map((t) => ({ tile: t, lines: renderTileLines(t), dimmed: false }));
    }

    if (type === "closed_kong") {
      if (viewerIsOwner) {
        return tiles.map((t) => ({ tile: t, lines: renderTileLines(t), dimmed: true }));
      } else {
        return tiles.map((t) => ({ tile: t, lines: renderBackLines(), dimmed: false }));
      }
    }

    // pon, open_kong: all face-up
    return tiles.map((t) => ({ tile: t, lines: renderTileLines(t), dimmed: false }));
  });

  return (
    <box flexDirection="row" gap={0}>
      <For each={displayTiles()}>
        {(item) => (
          <box flexDirection="column" width={7}>
            <For each={item.lines}>
              {(line) => <text dimmed={item.dimmed}>{line}</text>}
            </For>
          </box>
        )}
      </For>
    </box>
  );
}
