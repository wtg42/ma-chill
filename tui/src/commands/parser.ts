export interface ParsedCommand {
  raw: string;
  name: string;
  args: string[];
}

export type ParseResult =
  | { ok: true; command: ParsedCommand }
  | { ok: false; message: string };

export function parseSlashCommand(input: string): ParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "請先輸入指令。" };
  }

  if (!trimmed.startsWith("/")) {
    return { ok: false, message: "指令需以 / 開頭。" };
  }

  const body = trimmed.slice(1).trim();
  if (body.length === 0) {
    return { ok: false, message: "請在 / 後輸入指令名稱。" };
  }

  const parts = body.split(/\s+/);
  const [name, ...args] = parts;
  return {
    ok: true,
    command: {
      raw: trimmed,
      name: name.toLowerCase(),
      args,
    },
  };
}
