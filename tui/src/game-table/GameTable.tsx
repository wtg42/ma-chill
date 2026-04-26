import { JSX, Show, createMemo, createSignal, onCleanup } from "solid-js";
import { useRenderer, useSelectionHandler } from "@opentui/solid";
import type { Selection } from "@opentui/core";
import { useTerminalDimensions } from "./useTerminalDimensions";
import { TooSmallWarning } from "./TooSmallWarning";
import { useCommandKeys } from "./useCommandKeys";
import type { GameStateStore } from "../game-state";
import { ShellStatusBar } from "./ShellStatusBar";
import { EventLog } from "./EventLog";
import { CommandInput } from "./CommandInput";
import type { EventLogScrollRequest } from "./event-log-controls";
import { copyToClipboard } from "../clipboard";
import {
  buildDiscardPickerCardStyle,
  buildDiscardPickerPopupPlacement,
  buildDiscardPickerRows,
  buildDiscardPickerVisualLayout,
} from "./discard-picker";
import { DiscardPickerDialog } from "./DiscardPickerDialog";

const MIN_WIDTH = 80;
const MIN_HEIGHT = 24;

interface GameTableProps {
  store: GameStateStore;
}

// 組合遊戲主畫面的狀態列、事件流與命令列，並管理本地選取互動。
export function GameTable(props: GameTableProps): JSX.Element {
  const { store } = props;
  const dimensions = useTerminalDimensions();
  const renderer = useRenderer();
  const [eventLogScrollRequest, setEventLogScrollRequest] = createSignal<EventLogScrollRequest | null>(null);
  const [toast, setToast] = createSignal<boolean>(false);
  let nextScrollToken = 1;
  let activeSelection: Selection | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  onCleanup(() => {
    if (toastTimer !== null) clearTimeout(toastTimer);
  });

  // 顯示短暫複製成功提示，避免重複觸發時殘留舊計時器。
  function showToast(): void {
    if (toastTimer !== null) clearTimeout(toastTimer);
    setToast(true);
    toastTimer = setTimeout(() => setToast(false), 1500);
  }

  // 將事件流捲動請求轉成遞增 token，確保子元件能辨識每次導覽。
  function requestScroll(kind: EventLogScrollRequest["kind"]): void {
    setEventLogScrollRequest({ kind, token: nextScrollToken });
    nextScrollToken += 1;
  }

  // 滑鼠放開且仍有 selection 時，依 copy-on-select 規格自動複製文字。
  useSelectionHandler((selection) => {
    activeSelection = selection.isActive ? selection : null;
    if (!selection.isDragging && selection.isActive) {
      const text = selection.getSelectedText();
      if (text) copyToClipboard(text, renderer).then((ok) => { if (ok) showToast(); });
    }
  });

  const { uiMode, setUiMode } = useCommandKeys(store, {
    pageUp: () => requestScroll("page_up"),
    pageDown: () => requestScroll("page_down"),
    scrollToTop: () => requestScroll("top"),
    scrollToBottom: () => requestScroll("bottom"),
  });

  const isSizeValid = () =>
    dimensions().width >= MIN_WIDTH && dimensions().height >= MIN_HEIGHT;

  // 依目前玩家手牌與摸牌狀態派生 discard dialog 所需資料，避免在 JSX 內重複組裝。
  const discardPickerRows = createMemo(() => {
    return buildDiscardPickerRows(
      store.handWithIds(),
      store.gameState()?.drawn_tile_id ?? null,
      store.tileCatalog(),
    );
  });
  const discardPickerLayout = createMemo(() => buildDiscardPickerVisualLayout(discardPickerRows()));
  const discardPickerCardStyle = buildDiscardPickerCardStyle();
  const discardPickerPlacement = buildDiscardPickerPopupPlacement();

  return (
    <Show
      when={isSizeValid()}
      fallback={<TooSmallWarning currentDimensions={dimensions()} />}
    >
      <box flexDirection="column" width="100%" height="100%" gap={1} paddingX={1} paddingY={1}>
        <ShellStatusBar store={store} />
        <EventLog
          entries={store.eventLog()}
          scrollRequest={eventLogScrollRequest()}
        />
        <CommandInput
          store={store}
          uiMode={uiMode}
          availableActions={store.availableActions}
          onExitCommand={() => setUiMode("normal")}
        />
        <Show when={store.activeDialog() === "discard_picker"}>
          <box
            position={discardPickerPlacement.position}
            zIndex={discardPickerPlacement.zIndex}
            left={discardPickerPlacement.left}
            top={discardPickerPlacement.top}
            width={discardPickerPlacement.width}
            height={discardPickerPlacement.height}
            justifyContent={discardPickerPlacement.justifyContent}
            alignItems={discardPickerPlacement.alignItems}
          >
            <box
              borderStyle={discardPickerCardStyle.borderStyle}
              paddingX={1}
              paddingY={1}
              backgroundColor={discardPickerCardStyle.backgroundColor}
            >
              <DiscardPickerDialog
                rows={discardPickerRows()}
                focusedIndex={store.discardPickerFocusIndex()}
              />
            </box>
          </box>
        </Show>
        <Show when={toast()}>
          <box position="absolute" zIndex={100} right={2} bottom={7} borderStyle="rounded" paddingX={1} paddingY={0}>
            <text>已複製至剪貼簿</text>
          </box>
        </Show>
      </box>
    </Show>
  );
}
