import type { ScrollBoxRenderable } from "@opentui/core";
import { For, JSX, createEffect } from "solid-js";
import type { EventLogEntry } from "../game-state";
import {
  applyEventLogScrollRequest,
  getEventLogRenderEntries,
  type EventLogScrollRequest,
} from "./event-log-controls";

interface Props {
  entries: EventLogEntry[];
  scrollRequest?: EventLogScrollRequest | null;
  scrollboxRef?: (renderable: ScrollBoxRenderable) => void;
}

const KIND_COLOR: Record<EventLogEntry["kind"], string> = {
  system: "cyan",
  command: "yellow",
  game: "white",
  error: "red",
};

export function EventLog(props: Props): JSX.Element {
  let scrollbox: ScrollBoxRenderable | undefined;

  createEffect(() => {
    const request = props.scrollRequest;
    if (!request || !scrollbox) return;

    const nextState = applyEventLogScrollRequest(request, {
      scrollTop: scrollbox.scrollTop,
      scrollHeight: scrollbox.scrollHeight,
      viewportHeight: scrollbox.viewport.height,
    });

    scrollbox.scrollTo(nextState.nextScrollTop);
  });

  return (
    <scrollbox
      ref={(renderable) => {
        scrollbox = renderable;
        props.scrollboxRef?.(renderable);
      }}
      flexGrow={1}
      minHeight={12}
      border
      borderStyle="rounded"
      paddingX={1}
      paddingY={0}
      title="事件流"
      stickyScroll
      stickyStart="bottom"
    >
      <For each={getEventLogRenderEntries(props.entries)}>
        {(entry) => (
          <text selectable>
            <span fg={KIND_COLOR[entry.kind]}>- {entry.message}</span>
          </text>
        )}
      </For>
    </scrollbox>
  );
}
