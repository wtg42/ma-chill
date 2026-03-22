import { describe, expect, test } from "bun:test";
import { parseSlashCommand } from "./parser";

describe("parseSlashCommand", () => {
  test("parses slash command with args", () => {
    const result = parseSlashCommand("/discard 7p");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.command.name).toBe("discard");
    expect(result.command.args).toEqual(["7p"]);
  });

  test("rejects command without slash", () => {
    const result = parseSlashCommand("discard 7p");
    expect(result.ok).toBe(false);
  });

  test("rejects empty input", () => {
    const result = parseSlashCommand("   ");
    expect(result.ok).toBe(false);
  });
});
