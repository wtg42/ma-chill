import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";

interface LatestTileBoxProps {
  tile: CanonicalTile | null;
}

export function LatestTileBox(props: LatestTileBoxProps): JSX.Element {
  const tileLines = createMemo(() => {
    if (!props.tile) return null;
    const textKey = toTextRenderKey(props.tile);
    const template = resolveTileTextTemplateByKey(textKey);
    return renderTileTextTemplate(template).split("\n");
  });

  return (
    <box width={7} flexDirection="column">
      {tileLines() ? (
        <For each={tileLines()!}>
          {(line) => <text>{line}</text>}
        </For>
      ) : (
        <>
          <text>       </text>
          <text>       </text>
          <text>       </text>
          <text>       </text>
        </>
      )}
    </box>
  );
}
