import { JSX, For, Show } from "solid-js";
import { MeldGroup, type MeldGroupProps } from "./MeldGroup";

export type MeldData = Omit<MeldGroupProps, never>;

interface MeldRowProps {
  melds: MeldData[];
}

// Fixed height: tile height (4 lines) + 1 line margin = 5 rows
const MELD_ROW_HEIGHT = 5;

export function MeldRow(props: MeldRowProps): JSX.Element {
  return (
    <box flexDirection="row" height={MELD_ROW_HEIGHT} gap={1} alignItems="flex-start">
      <Show
        when={props.melds.length > 0}
        fallback={<box flexGrow={1} />}
      >
        <For each={props.melds}>
          {(meld) => (
            <MeldGroup
              tiles={meld.tiles}
              type={meld.type}
              sourceTileIndex={meld.sourceTileIndex}
              viewerIsOwner={meld.viewerIsOwner}
            />
          )}
        </For>
      </Show>
    </box>
  );
}
