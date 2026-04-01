import { describe, expect, it, mock } from "bun:test";
import type { GameStateStore } from "../game-state";
import {
  handleLeaderKey,
  LEADER_BINDINGS,
  createModeKeyHandler,
  type UiMode,
} from "./useCommandKeys";

const mockStore = {} as GameStateStore;

// 建立鍵盤事件測試資料，讓各案例只關注要驗證的按鍵差異。
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
  // 建立可觀察模式切換的 handler，方便驗證不同按鍵路徑。
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

  it("NORMAL: Ctrl+Space does not enter leader", () => {
    const { handler, getMode } = makeHandler();
    handler(makeKey("space", { ctrl: true }));
    expect(getMode()).toBe("normal");
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

  it("LEADER: Ctrl+binding does not execute command", () => {
    const { handler, getMode, execute } = makeHandler();
    handler(makeKey("space")); // enter leader
    expect(getMode()).toBe("leader");
    handler(makeKey("f", { ctrl: true }));
    expect(getMode()).toBe("normal");
    expect(execute).not.toHaveBeenCalled();
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
