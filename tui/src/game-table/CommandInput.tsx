import { JSX, For, createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import { Switch, Match } from "solid-js";
import type { GameStateStore } from "../game-state";
import { executeCommand } from "../commands";
import { LEADER_BINDINGS, type UiMode } from "./useCommandKeys";

interface Props {
  store: GameStateStore;
  uiMode: Accessor<UiMode>;
  availableActions: Accessor<string[]>;
  onExitCommand: () => void;
}

export function CommandInput(props: Props): JSX.Element {
  const feedback = () => props.store.commandFeedback();
  const placeholder = createMemo(() => {
    const hints = props.store.availableCommandHints();
    if (hints.length === 0) {
      return "/help";
    }
    return hints.join(" ");
  });

  const submit = (value: string) => {
    executeCommand(value, props.store);
    props.store.setCommandInput("");
    props.onExitCommand();
  };

  const feedbackEl = () => {
    const fb = feedback();
    if (!fb) return null;
    const fg = fb.kind === "error" ? "red" : fb.kind === "success" ? "green" : "cyan";
    return <span fg={fg}>{fb.message}</span>;
  };

  return (
    <box flexDirection="column" border borderStyle="rounded" paddingX={1} paddingY={0} minHeight={4}>
      <Switch>
        <Match when={props.uiMode() === "leader"}>
          <text><strong>LEADER</strong></text>
          <box flexDirection="row" gap={2}>
            <For each={LEADER_BINDINGS}>
              {(b) => (
                <text dimmed={!!b.action && !props.availableActions().includes(b.action)}>
                  {b.key}={b.label}
                </text>
              )}
            </For>
          </box>
        </Match>
        <Match when={props.uiMode() === "command"}>
          <text>
            <strong>命令列</strong>
            {feedback() ? " " : ""}
            {feedbackEl()}
          </text>
          <box flexDirection="row" gap={0}>
            <text>:</text>
            <input
              focused={true}
              value={props.store.commandInput()}
              placeholder={placeholder()}
              width="100%"
              onInput={(value) => props.store.setCommandInput(value)}
              onSubmit={submit}
            />
          </box>
        </Match>
        <Match when={true}>
          <text>
            <strong>命令列</strong>
            {feedback() ? " " : ""}
            {feedbackEl()}
          </text>
          <text>NORMAL  [SPC]=選單  :=命令列</text>
        </Match>
      </Switch>
    </box>
  );
}
