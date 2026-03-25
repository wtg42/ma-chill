import { describe, expect, it, mock } from "bun:test";
import type { GameStateStore } from "../game-state";
import { handleCommandKey } from "./useCommandKeys";

describe("handleCommandKey", () => {
  it("maps Ctrl+o to /hand through the command system", () => {
    const execute = mock(() => ({ ok: true, message: "" }));
    const preventDefault = mock(() => {});

    const handled = handleCommandKey(
      {
        eventType: "press",
        ctrl: true,
        name: "o",
        preventDefault,
      },
      {} as GameStateStore,
      execute,
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith("/hand", expect.anything());
  });

  it("ignores non-accelerator keys", () => {
    const execute = mock(() => ({ ok: true, message: "" }));
    const preventDefault = mock(() => {});

    const handled = handleCommandKey(
      {
        eventType: "press",
        ctrl: true,
        name: "x",
        preventDefault,
      },
      {} as GameStateStore,
      execute,
    );

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
