import { describe, expect, it, mock } from "bun:test";
import type { GameStateStore } from "../game-state";
import { buildTaiwanMahjongCatalog } from "../tiles";
import type { CanonicalTile } from "../tiles/types";
import {
  handleLeaderKey,
  LEADER_BINDINGS,
  createModeKeyHandler,
  type UiMode,
} from "./useCommandKeys";

const catalog = buildTaiwanMahjongCatalog();
const mockStore = {
  availableActions: mock(() => []),
  openDiscardPicker: mock(() => {}),
  activeDialog: mock(() => "none"),
  discardPickerFocusIndex: mock(() => 0),
  setDiscardPickerFocusIndex: mock(() => {}),
  closeDiscardPicker: mock(() => {}),
  handWithIds: mock(() => []),
  gameState: mock(() => null),
  tileCatalog: mock(() => new Map()),
} as unknown as GameStateStore;

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

  it("opens discard picker for d when discard is available", () => {
    const execute = mock(() => ({ ok: true, message: "" }));
    const key = makeKey("d");
    const store = {
      ...mockStore,
      availableActions: mock(() => ["discard"]),
      openDiscardPicker: mock(() => {}),
    } as unknown as GameStateStore;

    handleLeaderKey(key, LEADER_BINDINGS, store, execute);

    expect(store.openDiscardPicker).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
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

  it("LEADER: d opens discard picker when discard is available", () => {
    const store = {
      ...mockStore,
      availableActions: mock(() => ["discard"]),
      openDiscardPicker: mock(() => {}),
    } as unknown as GameStateStore;
    let mode: UiMode = "normal";
    const handler = createModeKeyHandler(
      () => mode,
      (nextMode: UiMode) => {
        mode = nextMode;
      },
      mock(() => {}),
      store,
      undefined,
      mock(() => ({ ok: true, message: "" })),
    );

    handler(makeKey("space"));
    expect(mode).toBe("leader");
    handler(makeKey("d"));

    expect(mode).toBe("normal");
    expect(store.openDiscardPicker).toHaveBeenCalledTimes(1);
  });

  it("LEADER: d does not open discard picker when discard is unavailable", () => {
    const store = {
      ...mockStore,
      availableActions: mock(() => []),
      openDiscardPicker: mock(() => {}),
    } as unknown as GameStateStore;
    const execute = mock(() => ({ ok: true, message: "" }));
    let mode: UiMode = "normal";
    const handler = createModeKeyHandler(
      () => mode,
      (nextMode: UiMode) => {
        mode = nextMode;
      },
      mock(() => {}),
      store,
      undefined,
      execute,
    );

    handler(makeKey("space"));
    handler(makeKey("d"));

    expect(mode).toBe("normal");
    expect(store.openDiscardPicker).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
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

  it("DISCARD DIALOG: arrow keys move focus", () => {
    const store = createDiscardDialogStore();
    const handler = createModeKeyHandler(
      () => "normal",
      () => {},
      mock(() => {}),
      store,
    );

    handler(makeKey("right"));

    expect(store.setDiscardPickerFocusIndex).toHaveBeenCalledWith(1);
  });

  it("DISCARD DIALOG: Esc closes dialog", () => {
    const store = createDiscardDialogStore();
    const handler = createModeKeyHandler(
      () => "normal",
      () => {},
      mock(() => {}),
      store,
    );

    handler(makeKey("escape"));

    expect(store.closeDiscardPicker).toHaveBeenCalledTimes(1);
  });

  it("DISCARD DIALOG: Enter confirms discard through command execution path", () => {
    const store = {
      ...createDiscardDialogStore(),
      discardPickerFocusIndex: mock(() => 1),
    } as unknown as GameStateStore;
    const execute = mock(() => ({ ok: true, message: "" }));
    const handler = createModeKeyHandler(
      () => "normal",
      () => {},
      mock(() => {}),
      store,
      undefined,
      execute,
    );

    handler(makeKey("return"));

    expect(execute).toHaveBeenCalledWith("/discard 2", store, { echo: false });
    expect(store.closeDiscardPicker).not.toHaveBeenCalled();
  });

  it("DISCARD DIALOG: other keys do not reopen leader mode", () => {
    const store = createDiscardDialogStore();
    let mode: UiMode = "normal";
    const handler = createModeKeyHandler(
      () => mode,
      (nextMode: UiMode) => {
        mode = nextMode;
      },
      mock(() => {}),
      store,
    );

    handler(makeKey("space"));

    expect(mode).toBe("normal");
  });
});

// 建立可供 discard dialog 導覽測試使用的 store stub，覆蓋手牌與摸牌資料。
function createDiscardDialogStore(): GameStateStore {
  return {
    ...mockStore,
    activeDialog: mock(() => "discard_picker"),
    discardPickerFocusIndex: mock(() => 0),
    setDiscardPickerFocusIndex: mock(() => {}),
    closeDiscardPicker: mock(() => {}),
    handWithIds: mock(() => [
      { id: 1, tile: findSuited("characters", 1) },
      { id: 2, tile: findSuited("circles", 7) },
    ]),
    gameState: mock(() => ({
      drawn_tile_id: 3,
    })),
    tileCatalog: mock(() => new Map<number, CanonicalTile>([
      [1, findSuited("characters", 1)],
      [2, findSuited("circles", 7)],
      [3, findWind("east")],
    ])),
  } as unknown as GameStateStore;
}

// 取得測試用數牌，讓 discard dialog 導覽測試能重用真實牌面資料。
function findSuited(suit: "characters" | "circles" | "bamboos", rank: number): CanonicalTile {
  const tile = catalog.find((entry) => entry.suit === suit && entry.rank === rank);
  if (!tile) {
    throw new Error(`missing suited tile for ${suit} ${rank}`);
  }
  return tile;
}

// 取得測試用風牌，驗證跨列導覽與摸牌列資料。
function findWind(wind: "east" | "south" | "west" | "north"): CanonicalTile {
  const tile = catalog.find((entry) => entry.wind === wind);
  if (!tile) {
    throw new Error(`missing wind tile for ${wind}`);
  }
  return tile;
}
