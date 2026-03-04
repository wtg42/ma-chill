import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";

interface AiPlayerRowProps {
  wind: string;
  windZh: string;
  handCount: number;
  latestDiscard: CanonicalTile | null;
}

export function AiPlayerRow(props: AiPlayerRowProps): JSX.Element {
  // Memoize discard tile rendering
  const discardLines = createMemo(() => {
    if (!props.latestDiscard) {
      return null;
    }
    const textKey = toTextRenderKey(props.latestDiscard);
    const template = resolveTileTextTemplateByKey(textKey);
    const rendered = renderTileTextTemplate(template);
    return rendered.split("\n");
  });

  // Render latest discard tile
  const renderDiscardTile = () => {
    const lines = discardLines();
    if (!lines) {
      return <text dimmed={true}>       </text>;
    }
    // Render tile in 3 lines format for single column display
    return (
      <box flexDirection="column" height={3}>
        <For each={lines}>
          {(line) => <text>{line}</text>}
        </For>
      </box>
    );
  };

  return (
    <box flexDirection="row" height={3} borderStyle="single" paddingLeft={1} paddingRight={1} gap={1}>
      {/* Wind position */}
      <text width={1} justifyContent="center">
        {props.windZh}
      </text>

      {/* Hand tiles (face-down) */}
      <box flexDirection="row" gap={0}>
        <For each={Array(props.handCount)}>
          {() => <text>🀫</text>}
        </For>
      </box>

      {/* Spacer */}
      <text flexGrow={1}></text>

      {/* Latest discard */}
      <box flexDirection="column" height={3} borderStyle="single" borderLeft={false} borderTop={false} borderBottom={false}>
        {renderDiscardTile()}
      </box>
    </box>
  );
}
