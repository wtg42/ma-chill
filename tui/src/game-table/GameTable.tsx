import { JSX, Show, createSignal } from "solid-js";
import { useTerminalDimensions } from "./useTerminalDimensions";
import { TooSmallWarning } from "./TooSmallWarning";
import { useCommandKeys } from "./useCommandKeys";
import type { GameStateStore } from "../game-state";
import { ShellStatusBar } from "./ShellStatusBar";
import { EventLog } from "./EventLog";
import { CommandInput } from "./CommandInput";
import type { EventLogScrollRequest, EventLogViewportState } from "./event-log-controls";

const MIN_WIDTH = 80;
const MIN_HEIGHT = 24;

interface GameTableProps {
  store: GameStateStore;
}

export function GameTable(props: GameTableProps): JSX.Element {
  const { store } = props;
  const dimensions = useTerminalDimensions();
  const [eventLogScrollRequest, setEventLogScrollRequest] = createSignal<EventLogScrollRequest | null>(null);
  const [eventLogViewport, setEventLogViewport] = createSignal<EventLogViewportState>({
    scrollTop: 0,
    isFollowingLatest: true,
  });
  let nextScrollToken = 1;

  const requestScroll = (kind: EventLogScrollRequest["kind"]) => {
    setEventLogScrollRequest({ kind, token: nextScrollToken });
    nextScrollToken += 1;
  };

  useCommandKeys(store, {
    pageUp: () => requestScroll("page_up"),
    pageDown: () => requestScroll("page_down"),
    scrollToTop: () => requestScroll("top"),
    scrollToBottom: () => requestScroll("bottom"),
  });

  const isSizeValid = () =>
    dimensions().width >= MIN_WIDTH && dimensions().height >= MIN_HEIGHT;

  return (
    <Show
      when={isSizeValid()}
      fallback={<TooSmallWarning currentDimensions={dimensions()} />}
    >
      <box flexDirection="column" width="100%" height="100%" gap={1} paddingX={1} paddingY={1}>
        <ShellStatusBar store={store} />
        <EventLog
          entries={store.eventLog()}
          scrollRequest={eventLogScrollRequest()}
          onViewportChange={setEventLogViewport}
        />
        <CommandInput store={store} />
      </box>
    </Show>
  );
}
