import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";

interface PlayerRowProps {
  hand: CanonicalTile[];
  drawnTile?: CanonicalTile | null;
}

interface TileRenderData {
  tile: CanonicalTile;
  lines: string[];
}

export function PlayerRow(props: PlayerRowProps): JSX.Element {
  // Hot keys for playing cards (a-z keys)
  const hotkeys = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "z", "x", "c", "v", "b"];

  // Render single tile (7 chars wide × 4 lines)
  const renderTile = (tile: CanonicalTile) => {
    const textKey = toTextRenderKey(tile);
    const template = resolveTileTextTemplateByKey(textKey);
    return renderTileTextTemplate(template);
  };

  // Memoize rendered tiles
  const renderedTiles = createMemo(() =>
    props.hand.map((tile) => ({
      tile,
      lines: renderTile(tile).split("\n"),
    }))
  );

  // Render player hand - all tiles on one line with hotkeys below
  const renderHand = () => {
    return (
      <box flexDirection="column" gap={0}>
        {/* Tiles row */}
        <box flexDirection="row" gap={0} paddingLeft={0}>
          <For each={renderedTiles()}>
            {(item) => (
              <box flexDirection="column" width={7}>
                <For each={item.lines}>
                  {(line) => <text>{line}</text>}
                </For>
              </box>
            )}
          </For>
        </box>

        {/* Hotkeys row below tiles */}
        <box flexDirection="row" gap={0} paddingLeft={0}>
          <For each={props.hand}>
            {(_, idx) => (
              <text width={7} justifyContent="center">
                {hotkeys[idx()]}
              </text>
            )}
          </For>
        </box>
      </box>
    );
  };

  // Memoize drawn tile rendering
  const drawnTileLines = createMemo(() => {
    if (!props.drawnTile) return null;
    return renderTile(props.drawnTile).split("\n");
  });

  // Render right info panel (drawn/discarded tile)
  const renderInfoPanel = () => {
    const lines = drawnTileLines();
    return (
      <box flexDirection="column" width={12} borderStyle="single" borderLeft={false} borderRight={false} paddingLeft={1} paddingRight={1} justifyContent="center">
        {lines ? (
          <box flexDirection="column">
            <text bold={true}>摸牌</text>
            <For each={lines}>
              {(line) => <text fontSize="small">{line}</text>}
            </For>
          </box>
        ) : (
          <box flexDirection="column">
            <text dimmed={true}>待摸</text>
            <text dimmed={true}>       </text>
            <text dimmed={true}>       </text>
          </box>
        )}
      </box>
    );
  };

  // Status bar with available actions
  const renderStatusBar = () => {
    return (
      <box flexDirection="row" paddingLeft={1} gap={2} borderTop="single" borderStyle="none">
        <text>東風三局  剩44張</text>
        <text dimmed={true}>|</text>
        <text>c=吃 p=碰 k=槓 h=胡 r=棄牌</text>
      </box>
    );
  };

  return (
    <box flexDirection="column" height={20} borderStyle="single" gap={0}>
      {/* Main content - hand + info panel */}
      <box flexDirection="row" flexGrow={1} gap={0} paddingLeft={1}>
        <box flexDirection="column" flexGrow={1}>
          {renderHand()}
        </box>
        {renderInfoPanel()}
      </box>

      {/* Status bar at bottom */}
      {renderStatusBar()}
    </box>
  );
}
