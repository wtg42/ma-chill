import { For, JSX } from "solid-js";
import type { EventLogEntry } from "../game-state";

interface Props {
  entries: EventLogEntry[];
}

const KIND_COLOR: Record<EventLogEntry["kind"], string> = {
  system: "cyan",
  command: "yellow",
  game: "white",
  error: "red",
};

export function EventLog(props: Props): JSX.Element {
  const visibleEntries = () => props.entries.slice(-18);

  return (
    <box flexDirection="column" flexGrow={1} border borderStyle="rounded" paddingX={1} paddingY={0} minHeight={12}>
      <text><strong>事件流</strong></text>
      <For each={visibleEntries()}>
        {(entry) => (
          <text>
            <span fg={KIND_COLOR[entry.kind]}>- {entry.message}</span>
          </text>
        )}
      </For>
    </box>
  );
}
