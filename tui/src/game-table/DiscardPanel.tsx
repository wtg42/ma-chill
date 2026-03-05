import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";

interface DiscardPanelProps {
  tile: CanonicalTile | null;
  height: number;
}

export function DiscardPanel(props: DiscardPanelProps): JSX.Element {
  const tileLines = createMemo(() => {
    if (!props.tile) return null;
    const textKey = toTextRenderKey(props.tile);
    const template = resolveTileTextTemplateByKey(textKey);
    return renderTileTextTemplate(template).split("\n");
  });

  return (
    <box width={9} height={props.height} borderStyle="single" justifyContent="center" alignItems="center">
      {tileLines() ? (
        <box flexDirection="column">
          <For each={tileLines()!}>
            {(line) => <text>{line}</text>}
          </For>
        </box>
      ) : (
        <text dimmed={true}>  —  </text>
      )}
    </box>
  );
}
