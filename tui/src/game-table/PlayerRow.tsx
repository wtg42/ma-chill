import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";
import { MeldRow, type MeldData } from "./MeldRow";
import { LatestTileBox } from "./LatestTileBox";

interface PlayerRowProps {
  hand: CanonicalTile[];
  drawnTile?: CanonicalTile | null;
  melds?: MeldData[];
}

export function PlayerRow(props: PlayerRowProps): JSX.Element {
  const renderTile = (tile: CanonicalTile) => {
    const textKey = toTextRenderKey(tile);
    const template = resolveTileTextTemplateByKey(textKey);
    return renderTileTextTemplate(template);
  };

  const renderedTiles = createMemo(() =>
    props.hand.map((tile) => ({
      tile,
      lines: renderTile(tile).split("\n"),
    }))
  );

  const renderHand = () => {
    return (
      <box flexDirection="column" gap={0}>
        {/* Tiles row + LatestTileBox */}
        <box flexDirection="row" gap={0}>
          <For each={renderedTiles()}>
            {(item) => (
              <box flexDirection="column" width={7}>
                <For each={item.lines}>
                  {(line) => <text>{line}</text>}
                </For>
              </box>
            )}
          </For>

          {/* Gap then drawn tile */}
          <box width={2} />
          <LatestTileBox tile={props.drawnTile ?? null} />
        </box>
      </box>
    );
  };

  return (
    <box flexDirection="column" height={20} flexGrow={1} borderStyle="single" gap={0}>
      {/* Meld row at top */}
      <MeldRow melds={props.melds ?? []} />

      {/* Hand area */}
      <box flexDirection="row" flexGrow={1} gap={0} paddingLeft={1}>
        <box flexDirection="column" flexGrow={1}>
          {renderHand()}
        </box>
      </box>
    </box>
  );
}
