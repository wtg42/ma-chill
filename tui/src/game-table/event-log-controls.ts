export const EVENT_LOG_SCROLL_TOLERANCE = 1;

export interface EventLogViewportMetrics {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
}

export interface EventLogViewportState {
  scrollTop: number;
  isFollowingLatest: boolean;
}

export interface EventLogScrollResult extends EventLogViewportState {
  nextScrollTop: number;
}

export interface EventLogScrollRequest {
  kind: "page_up" | "page_down" | "top" | "bottom";
  token: number;
}

export interface EventLogNavigationControls {
  pageUp: () => void;
  pageDown: () => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export interface EventLogKeyEvent {
  eventType: string;
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  preventDefault: () => void;
}

export function getMaxScrollTop(metrics: EventLogViewportMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.viewportHeight);
}

export function isEventLogAtBottom(metrics: EventLogViewportMetrics): boolean {
  return metrics.scrollTop >= getMaxScrollTop(metrics) - EVENT_LOG_SCROLL_TOLERANCE;
}

export function toEventLogViewportState(metrics: EventLogViewportMetrics): EventLogViewportState {
  return {
    scrollTop: metrics.scrollTop,
    isFollowingLatest: isEventLogAtBottom(metrics),
  };
}

export function applyEventLogScrollRequest(
  request: EventLogScrollRequest,
  metrics: EventLogViewportMetrics,
): EventLogScrollResult {
  const maxScrollTop = getMaxScrollTop(metrics);
  let nextScrollTop = metrics.scrollTop;

  switch (request.kind) {
    case "page_up":
      nextScrollTop = Math.max(0, metrics.scrollTop - Math.max(1, metrics.viewportHeight));
      break;
    case "page_down":
      nextScrollTop = Math.min(maxScrollTop, metrics.scrollTop + Math.max(1, metrics.viewportHeight));
      break;
    case "top":
      nextScrollTop = 0;
      break;
    case "bottom":
      nextScrollTop = maxScrollTop;
      break;
  }

  return {
    nextScrollTop,
    scrollTop: nextScrollTop,
    isFollowingLatest: nextScrollTop >= maxScrollTop - EVENT_LOG_SCROLL_TOLERANCE,
  };
}

export function getEventLogRenderEntries<T>(entries: T[]): T[] {
  return entries;
}

export function handleEventLogNavigationKey(
  key: EventLogKeyEvent,
  controls: EventLogNavigationControls,
): boolean {
  if (key.eventType !== "press" || key.ctrl || key.meta || key.shift) {
    return false;
  }

  switch (key.name) {
    case "pageup":
      key.preventDefault();
      controls.pageUp();
      return true;
    case "pagedown":
      key.preventDefault();
      controls.pageDown();
      return true;
    case "home":
      key.preventDefault();
      controls.scrollToTop();
      return true;
    case "end":
      key.preventDefault();
      controls.scrollToBottom();
      return true;
    default:
      return false;
  }
}
