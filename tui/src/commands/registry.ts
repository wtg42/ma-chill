export type CommandKind = "local" | "action";

export interface CommandDefinition {
  name: string;
  kind: CommandKind;
  usage: string;
  description: string;
  action?: string;
}

const COMMANDS: CommandDefinition[] = [
  {
    name: "help",
    kind: "local",
    usage: "/help",
    description: "顯示可用指令與快捷鍵",
  },
  {
    name: "status",
    kind: "local",
    usage: "/status",
    description: "顯示目前局況摘要",
  },
  {
    name: "discard",
    kind: "action",
    action: "discard",
    usage: "/discard <tile|drawn|tile_id>",
    description: "打出指定手牌，例：/discard 7p",
  },
  {
    name: "chi",
    kind: "action",
    action: "chi",
    usage: "/chi",
    description: "吃牌",
  },
  {
    name: "pon",
    kind: "action",
    action: "pon",
    usage: "/pon",
    description: "碰牌",
  },
  {
    name: "kong",
    kind: "action",
    action: "kong",
    usage: "/kong",
    description: "槓牌",
  },
  {
    name: "win",
    kind: "action",
    action: "win",
    usage: "/win",
    description: "胡牌",
  },
  {
    name: "pass",
    kind: "action",
    action: "pass",
    usage: "/pass",
    description: "放棄當前回應",
  },
];

const ACTION_TO_USAGE = new Map<string, string>(
  COMMANDS.filter((command) => command.kind === "action" && command.action).map((command) => [
    command.action!,
    command.usage,
  ]),
);

export function getCommandDefinitions(): CommandDefinition[] {
  return COMMANDS;
}

export function findCommandDefinition(name: string): CommandDefinition | undefined {
  return COMMANDS.find((command) => command.name === name);
}

export function getAlwaysAvailableCommandHints(): string[] {
  return ["/help", "/status"];
}

export function getAvailableCommandHints(actions: string[]): string[] {
  const hints = [...getAlwaysAvailableCommandHints()];
  for (const action of actions) {
    const usage = ACTION_TO_USAGE.get(action);
    if (usage) {
      hints.push(usage);
    }
  }
  return hints;
}

export function describeAllCommands(): string {
  return COMMANDS.map((command) => `${command.usage} - ${command.description}`).join(" | ");
}
