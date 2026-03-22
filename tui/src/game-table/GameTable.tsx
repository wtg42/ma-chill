import { JSX, Show } from "solid-js";
import { useTerminalDimensions } from "./useTerminalDimensions";
import { TooSmallWarning } from "./TooSmallWarning";
import { useCommandKeys } from "./useCommandKeys";
import type { GameStateStore } from "../game-state";
import { ShellStatusBar } from "./ShellStatusBar";
import { EventLog } from "./EventLog";
import { CommandInput } from "./CommandInput";

const MIN_WIDTH = 80;
const MIN_HEIGHT = 24;

interface GameTableProps {
  store: GameStateStore;
}

export function GameTable(props: GameTableProps): JSX.Element {
  const { store } = props;
  const dimensions = useTerminalDimensions();
  useCommandKeys(store);

  const isSizeValid = () =>
    dimensions().width >= MIN_WIDTH && dimensions().height >= MIN_HEIGHT;

  return (
    <Show
      when={isSizeValid()}
      fallback={<TooSmallWarning currentDimensions={dimensions()} />}
    >
      <box flexDirection="column" width="100%" height="100%" gap={1} paddingX={1} paddingY={1}>
        <ShellStatusBar store={store} />
        <EventLog entries={store.eventLog()} />
        <CommandInput store={store} />
      </box>
    </Show>
  );
}
