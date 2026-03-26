import { describe, expect, it, mock } from "bun:test";
import {
  applyEventLogScrollRequest,
  getEventLogRenderEntries,
  handleEventLogNavigationKey,
  isEventLogAtBottom,
  toEventLogViewportState,
  type EventLogNavigationControls,
} from "./event-log-controls";

describe("handleEventLogNavigationKey", () => {
  it("maps PageUp/PageDown/Home/End to local event log controls", () => {
    const controls: EventLogNavigationControls = {
      pageUp: mock(() => {}),
      pageDown: mock(() => {}),
      scrollToTop: mock(() => {}),
      scrollToBottom: mock(() => {}),
    };
    const preventDefault = mock(() => {});

    expect(handleEventLogNavigationKey({ eventType: "press", name: "pageup", preventDefault }, controls)).toBe(true);
    expect(handleEventLogNavigationKey({ eventType: "press", name: "pagedown", preventDefault }, controls)).toBe(true);
    expect(handleEventLogNavigationKey({ eventType: "press", name: "home", preventDefault }, controls)).toBe(true);
    expect(handleEventLogNavigationKey({ eventType: "press", name: "end", preventDefault }, controls)).toBe(true);

    expect(preventDefault).toHaveBeenCalledTimes(4);
    expect(controls.pageUp).toHaveBeenCalledTimes(1);
    expect(controls.pageDown).toHaveBeenCalledTimes(1);
    expect(controls.scrollToTop).toHaveBeenCalledTimes(1);
    expect(controls.scrollToBottom).toHaveBeenCalledTimes(1);
  });

  it("ignores modified or unrelated keys", () => {
    const controls: EventLogNavigationControls = {
      pageUp: mock(() => {}),
      pageDown: mock(() => {}),
      scrollToTop: mock(() => {}),
      scrollToBottom: mock(() => {}),
    };
    const preventDefault = mock(() => {});

    expect(handleEventLogNavigationKey({ eventType: "press", name: "pageup", ctrl: true, preventDefault }, controls)).toBe(false);
    expect(handleEventLogNavigationKey({ eventType: "press", name: "home", shift: true, preventDefault }, controls)).toBe(false);
    expect(handleEventLogNavigationKey({ eventType: "press", name: "x", preventDefault }, controls)).toBe(false);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(controls.pageUp).not.toHaveBeenCalled();
    expect(controls.scrollToTop).not.toHaveBeenCalled();
  });
});

describe("event log viewport helpers", () => {
  it("keeps all event entries available for rendering", () => {
    expect(getEventLogRenderEntries(Array.from({ length: 25 }, (_, index) => index + 1))).toHaveLength(25);
  });

  it("detects when the viewport is following the latest content", () => {
    expect(isEventLogAtBottom({ scrollTop: 14, scrollHeight: 20, viewportHeight: 6 })).toBe(true);
    expect(isEventLogAtBottom({ scrollTop: 8, scrollHeight: 20, viewportHeight: 6 })).toBe(false);
  });

  it("derives local viewport state from scroll metrics", () => {
    expect(toEventLogViewportState({ scrollTop: 5, scrollHeight: 20, viewportHeight: 10 })).toEqual({
      scrollTop: 5,
    });

    expect(toEventLogViewportState({ scrollTop: 10, scrollHeight: 20, viewportHeight: 10 })).toEqual({
      scrollTop: 10,
    });
  });

  it("pages through history", () => {
    expect(applyEventLogScrollRequest(
      { kind: "page_up", token: 1 },
      { scrollTop: 20, scrollHeight: 40, viewportHeight: 10 },
    )).toEqual({
      nextScrollTop: 10,
      scrollTop: 10,
    });

    expect(applyEventLogScrollRequest(
      { kind: "page_down", token: 2 },
      { scrollTop: 10, scrollHeight: 40, viewportHeight: 10 },
    )).toEqual({
      nextScrollTop: 20,
      scrollTop: 20,
    });

    expect(applyEventLogScrollRequest(
      { kind: "bottom", token: 3 },
      { scrollTop: 10, scrollHeight: 40, viewportHeight: 10 },
    )).toEqual({
      nextScrollTop: 30,
      scrollTop: 30,
    });
  });
});
