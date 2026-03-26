import { JSX, Show, createSignal } from "solid-js";
import { useRenderer, useSelectionHandler, useKeyboard } from "@opentui/solid";
import type { Selection } from "@opentui/core";
import { useTerminalDimensions } from "./useTerminalDimensions";
import { TooSmallWarning } from "./TooSmallWarning";
import { useCommandKeys } from "./useCommandKeys";
import type { GameStateStore } from "../game-state";
import { ShellStatusBar } from "./ShellStatusBar";
import { EventLog } from "./EventLog";
import { CommandInput } from "./CommandInput";
import type { EventLogScrollRequest } from "./event-log-controls";
import { copyToClipboard } from "../clipboard";

const MIN_WIDTH = 80;
const MIN_HEIGHT = 24;

interface GameTableProps {
  store: GameStateStore;
}

export function GameTable(props: GameTableProps): JSX.Element {
  const { store } = props;
  const dimensions = useTerminalDimensions();
  const renderer = useRenderer();
  const [eventLogScrollRequest, setEventLogScrollRequest] = createSignal<EventLogScrollRequest | null>(null);
  let nextScrollToken = 1;
  let activeSelection: Selection | null = null;

  const requestScroll = (kind: EventLogScrollRequest["kind"]) => {
    setEventLogScrollRequest({ kind, token: nextScrollToken });
    nextScrollToken += 1;
  };

  // Copy-on-select: copy text to clipboard when mouse is released with a selection
  useSelectionHandler((selection) => {
    activeSelection = selection.isActive ? selection : null;
    if (!selection.isDragging && selection.isActive) {
      const text = selection.getSelectedText();
      if (text) copyToClipboard(text, renderer);
    }
  });

  // Ctrl+C: copy selection if active, otherwise fall through to default exit
  useKeyboard((key) => {
    if (key.eventType !== "press" || !key.ctrl || key.name !== "c") return;
    if (!activeSelection?.isActive) return;
    key.preventDefault();
    const text = activeSelection.getSelectedText();
    if (text) copyToClipboard(text, renderer);
    renderer.clearSelection();
  });

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
        />
        <CommandInput store={store} />
      </box>
    </Show>
  );
}
