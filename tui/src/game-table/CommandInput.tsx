import { JSX, createMemo } from "solid-js";
import type { GameStateStore } from "../game-state";
import { executeCommand } from "../commands";

interface Props {
  store: GameStateStore;
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
    const result = executeCommand(value, props.store);
    if (result.ok) {
      props.store.setCommandInput("");
    }
  };

  return (
    <box flexDirection="column" border borderStyle="rounded" paddingX={1} paddingY={0} minHeight={4}>
      <text>
        <strong>命令列</strong>
        {feedback() ? " " : ""}
        {feedback() ? <span fg={feedback()!.kind === "error" ? "red" : feedback()!.kind === "success" ? "green" : "cyan"}>{feedback()!.message}</span> : null}
      </text>
      <input
        focused={true}
        value={props.store.commandInput()}
        placeholder={placeholder()}
        width="100%"
        onInput={(value) => props.store.setCommandInput(value)}
        onSubmit={submit}
      />
    </box>
  );
}
