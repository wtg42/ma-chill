import { JSX, For } from "solid-js";
import type { CanonicalTile } from "../tiles/types";
import { DiscardPanel } from "./DiscardPanel";

interface AiPlayerRowProps {
  wind: string;
  windZh: string;
  handCount: number;
  latestDiscard: CanonicalTile | null;
}

const ROW_HEIGHT = 6;

export function AiPlayerRow(props: AiPlayerRowProps): JSX.Element {
  return (
    <box flexDirection="row">
      {/* Hand area */}
      <box flexDirection="row" height={ROW_HEIGHT} flexGrow={1} borderStyle="single" paddingLeft={1} paddingRight={1} gap={1} alignItems="center">
        {/* Wind position */}
        <text width={1} justifyContent="center">
          {props.windZh}
        </text>

        {/* Hand tiles (face-down) */}
        <box flexDirection="row" gap={0} flexGrow={1} overflow="hidden">
          <For each={Array(props.handCount)}>
            {() => <text>🀫</text>}
          </For>
        </box>
      </box>

      {/* Discard panel */}
      <DiscardPanel tile={props.latestDiscard} height={ROW_HEIGHT} />
    </box>
  );
}
