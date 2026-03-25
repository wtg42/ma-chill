import type { ScrollBoxRenderable } from "@opentui/core";
import { For, JSX, createEffect, createSignal } from "solid-js";
import type { EventLogEntry } from "../game-state";
import {
  applyEventLogScrollRequest,
  getEventLogRenderEntries,
  getMaxScrollTop,
  toEventLogViewportState,
  type EventLogScrollRequest,
  type EventLogViewportState,
} from "./event-log-controls";

interface Props {
  entries: EventLogEntry[];
  scrollRequest?: EventLogScrollRequest | null;
  onViewportChange?: (state: EventLogViewportState) => void;
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
  const [viewportState, setViewportState] = createSignal<EventLogViewportState>({
    scrollTop: 0,
    isFollowingLatest: true,
  });

  const syncViewportState = () => {
    if (!scrollbox) return;

    const nextState = toEventLogViewportState({
      scrollTop: scrollbox.scrollTop,
      scrollHeight: scrollbox.scrollHeight,
      viewportHeight: scrollbox.viewport.height,
    });

    setViewportState(nextState);
    props.onViewportChange?.(nextState);
  };

  const scrollToBottom = () => {
    if (!scrollbox) return;

    scrollbox.scrollTo(getMaxScrollTop({
      scrollTop: scrollbox.scrollTop,
      scrollHeight: scrollbox.scrollHeight,
      viewportHeight: scrollbox.viewport.height,
    }));
    syncViewportState();
  };

  createEffect(() => {
    const request = props.scrollRequest;
    if (!request || !scrollbox) return;

    const nextState = applyEventLogScrollRequest(request, {
      scrollTop: scrollbox.scrollTop,
      scrollHeight: scrollbox.scrollHeight,
      viewportHeight: scrollbox.viewport.height,
    });

    scrollbox.scrollTo(nextState.nextScrollTop);
    setViewportState({
      scrollTop: nextState.scrollTop,
      isFollowingLatest: nextState.isFollowingLatest,
    });
    props.onViewportChange?.({
      scrollTop: nextState.scrollTop,
      isFollowingLatest: nextState.isFollowingLatest,
    });
  });

  createEffect(() => {
    props.entries.length;
    if (!scrollbox) return;

    queueMicrotask(() => {
      if (!scrollbox) return;

      if (viewportState().isFollowingLatest) {
        scrollToBottom();
        return;
      }

      syncViewportState();
    });
  });

  return (
    <scrollbox
      ref={(renderable) => {
        scrollbox = renderable;
        props.scrollboxRef?.(renderable);
        queueMicrotask(syncViewportState);
      }}
      flexGrow={1}
      minHeight={12}
      border
      borderStyle="rounded"
      paddingX={1}
      paddingY={0}
      title="事件流"
      onSizeChange={() => queueMicrotask(syncViewportState)}
    >
      <For each={getEventLogRenderEntries(props.entries)}>
        {(entry) => (
          <text>
            <span fg={KIND_COLOR[entry.kind]}>- {entry.message}</span>
          </text>
        )}
      </For>
    </scrollbox>
  );
}
