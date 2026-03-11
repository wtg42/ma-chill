import { JSX, For } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { MeldGroup, type MeldGroupProps } from "./MeldGroup";
import { LatestTileBox } from "./LatestTileBox";

export type AiMeldData = MeldGroupProps;

interface AiPlayerRowProps {
  wind: string;
  windZh: string;
  handCount: number;
  latestDiscard: CanonicalTile | null;
  melds?: AiMeldData[];
}

// Fixed height aligned with full tile face (4 lines) + padding
const ROW_HEIGHT = 6;

export function AiPlayerRow(props: AiPlayerRowProps): JSX.Element {
  return (
    <box flexDirection="row" height={ROW_HEIGHT} flexGrow={1} borderStyle="single" paddingLeft={1} paddingRight={1} gap={1} alignItems="center">
      {/* Wind position */}
      <text width={1} justifyContent="center">
        {props.windZh}
      </text>

      {/* Melds (if any) */}
      <For each={props.melds ?? []}>
        {(meld) => (
          <MeldGroup
            tiles={meld.tiles}
            type={meld.type}
            sourceTileIndex={meld.sourceTileIndex}
            viewerIsOwner={meld.viewerIsOwner}
          />
        )}
      </For>

      {/* Remaining hand tiles as compact text */}
      <box flexDirection="row" gap={0} flexGrow={1} overflow="hidden">
        <text>🀫×{props.handCount}</text>
      </box>

      {/* Gap + LatestTileBox (only shows after AI discards) */}
      <box width={1} />
      <LatestTileBox tile={props.latestDiscard} />
    </box>
  );
}
