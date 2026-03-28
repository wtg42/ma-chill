import { describe, expect, it, mock } from "bun:test";
import type { GameStateStore } from "../game-state";
import {
  handleLeaderKey,
  LEADER_BINDINGS,
  createModeKeyHandler,
  type UiMode,
} from "./useCommandKeys";

const mockStore = {} as GameStateStore;

function makeKey(name: string, extra: Record<string, unknown> = {}) {
  return {
    eventType: "press",
    name,
    ctrl: false,
    preventDefault: mock(() => {}),
    ...extra,
  };
}

describe("handleLeaderKey", () => {
  it("executes command for valid binding key", () => {
    const execute = mock(() => ({ ok: true, message: "" }));
    const key = makeKey("j"); // 吃 → /chi

    const handled = handleLeaderKey(key, LEADER_BINDINGS, mockStore, execute);

    expect(handled).toBe(true);
    expect(key.preventDefault).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith("/chi", mockStore);
  });

  it("returns false for unrecognized key", () => {
    const execute = mock(() => ({ ok: true, message: "" }));
    const key = makeKey("x");

    const handled = handleLeaderKey(key, LEADER_BINDINGS, mockStore, execute);

    expect(handled).toBe(false);
    expect(key.preventDefault).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("maps d to /discard drawn", () => {
    const execute = mock(() => ({ ok: true, message: "" }));
    const key = makeKey("d");

    handleLeaderKey(key, LEADER_BINDINGS, mockStore, execute);

    expect(execute).toHaveBeenCalledWith("/discard drawn", mockStore);
  });

  it("maps f to /pass", () => {
    const execute = mock(() => ({ ok: true, message: "" }));
    const key = makeKey("f");

    handleLeaderKey(key, LEADER_BINDINGS, mockStore, execute);

    expect(execute).toHaveBeenCalledWith("/pass", mockStore);
  });
});

describe("mode transitions", () => {
  function makeHandler(executeMock?: ReturnType<typeof mock>) {
    let mode: UiMode = "normal";
    const setMode = (m: UiMode) => {
      mode = m;
    };
    const clearInput = mock(() => {});
    const execute = executeMock ?? mock(() => ({ ok: true, message: "" }));
    const handler = createModeKeyHandler(
      () => mode,
      setMode,
      clearInput,
      mockStore,
      undefined,
      execute,
    );
    return { handler, getMode: () => mode, clearInput, execute };
  }

  it("NORMAL: Space → leader", () => {
    const { handler, getMode } = makeHandler();
    handler(makeKey("space"));
    expect(getMode()).toBe("leader");
  });

  it("NORMAL: : → command", () => {
    const { handler, getMode } = makeHandler();
    handler(makeKey(":"));
    expect(getMode()).toBe("command");
  });

  it("LEADER: Esc → normal", () => {
    const { handler, getMode } = makeHandler();
    handler(makeKey("space")); // enter leader
    handler(makeKey("escape"));
    expect(getMode()).toBe("normal");
  });

  it("LEADER: valid binding key → execute command + normal", () => {
    const { handler, getMode, execute } = makeHandler();
    handler(makeKey("space")); // enter leader
    expect(getMode()).toBe("leader");
    handler(makeKey("f")); // /pass
    expect(getMode()).toBe("normal");
    expect(execute).toHaveBeenCalledWith("/pass", mockStore);
  });

  it("LEADER: unrecognized key → normal without executing command", () => {
    const { handler, getMode, execute } = makeHandler();
    handler(makeKey("space")); // enter leader
    handler(makeKey("x")); // not a binding
    expect(getMode()).toBe("normal");
    expect(execute).not.toHaveBeenCalled();
  });

  it("COMMAND: Esc → normal + clear input", () => {
    const { handler, getMode, clearInput } = makeHandler();
    handler(makeKey(":")); // enter command
    expect(getMode()).toBe("command");
    handler(makeKey("escape"));
    expect(getMode()).toBe("normal");
    expect(clearInput).toHaveBeenCalledTimes(1);
  });

  it("ignores non-press events", () => {
    const { handler, getMode } = makeHandler();
    handler({ ...makeKey("space"), eventType: "release" });
    expect(getMode()).toBe("normal");
  });
});
