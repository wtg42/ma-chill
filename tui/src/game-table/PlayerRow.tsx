import { JSX, For, createMemo } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { renderTileTextTemplate, resolveTileTextTemplateByKey } from "../tiles/text-render";
import { toTextRenderKey } from "../tiles/display";
import { MeldRow, type MeldData } from "./MeldRow";
import { LatestTileBox } from "./LatestTileBox";

const WIND_ZH: Record<string, string> = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
};

interface PlayerRowProps {
  hand: CanonicalTile[];
  drawnTile?: CanonicalTile | null;
  melds?: MeldData[];
  availableActions?: string[];
  seatWind?: string;
}

export function PlayerRow(props: PlayerRowProps): JSX.Element {
  const hotkeys = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "z", "x", "c", "v", "b"];
  const availableActions = createMemo(() => props.availableActions ?? []);

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

        {/* Hotkeys row */}
        <box flexDirection="row" gap={0}>
          <For each={props.hand}>
            {(_, idx) => (
              <text width={7} justifyContent="center">
                {hotkeys[idx()]}
              </text>
            )}
          </For>
          <box width={2} />
          <text width={7} justifyContent="center">space</text>
        </box>
      </box>
    );
  };

  const isActionAvailable = (action: string) => availableActions().includes(action);

  const renderStatusBar = () => {
    const actions = [
      { key: "c", label: "吃", action: "chi" },
      { key: "p", label: "碰", action: "pon" },
      { key: "k", label: "槓", action: "kong" },
      { key: "h", label: "胡", action: "win" },
      { key: "space", label: "切摸牌", action: "discard" },
    ];

    return (
      <box flexDirection="row" paddingLeft={1} gap={2} borderTop="single" borderStyle="none">
        <text>{WIND_ZH[props.seatWind ?? "east"] ?? "東"}風</text>
        <text dimmed={true}>|</text>
        <box flexDirection="row" gap={1}>
          <For each={actions}>
            {(a) => (
              <text dimmed={!isActionAvailable(a.action)}>
                {a.key}={a.label}
              </text>
            )}
          </For>
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

      {/* Status bar at bottom */}
      {renderStatusBar()}
    </box>
  );
}
