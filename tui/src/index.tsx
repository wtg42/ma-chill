import { render } from "@opentui/solid";
import { validateTileCatalogOrThrow, buildTaiwanMahjongCatalog } from "./tiles";
import { createSignal, Show } from "solid-js";

const tileCatalog = buildTaiwanMahjongCatalog();
validateTileCatalogOrThrow(tileCatalog);

// 最新棄牌區狀態 - 4.1, 4.2, 4.3
type DiscardState = { tile: string } | null;

const [gameState, setGameState] = createSignal({
  northDiscard: null as DiscardState,
  westDiscard: null as DiscardState,
  eastDiscard: null as DiscardState,
  southDiscard: { tile: "7條" } as DiscardState, // 示例：南家最後棄了7條
  showDiscardDialog: false,
});

// 快捷鍵配置 - 5.1, 5.2, 5.3, 5.4
const keyBindings = {
  // 打牌 (5.1)
  playCard: ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  // 吃/碰/槓/胡 (5.2)
  eat: "c",
  pung: "p",
  kong: "k",
  win: "h",
  // 放棄動作 (5.3)
  pass: ["Enter", " "],
  // 棄牌 dialog 熱鍵 (5.4)
  discardDialog: "r",
};

// 棄牌欄位 - 4.2 顯示牌/清空
function DiscardZone(props: { state: DiscardState }) {
  if (props.state) {
    return (
      <box width={7} borderStyle="single" borderLeft={false} borderTop={false} borderBottom={false} justifyContent="center">
        <text>{props.state.tile}</text>
      </box>
    );
  }
  return (
    <box width={7} borderStyle="single" borderLeft={false} borderTop={false} borderBottom={false} justifyContent="center">
      <text dimmed={true}>     </text>
    </box>
  );
}

// 風位顯示 - 2.3
function WindDisplay(props: { wind: string }) {
  const windMap: Record<string, string> = {
    "北": "北",
    "西": "西",
    "東": "東",
    "南": "南"
  };
  return <text width={1}>{windMap[props.wind]}</text>;
}

// AI 手牌背面 - 2.1
function AIHandDisplay(props: { count: number }) {
  return <text>🀫×{props.count.toString().padStart(2)}</text>;
}

// AI 副露 - 2.2
function AIMeldDisplay() {
  return <text>副露:—</text>;
}

// AI 列 - 包含風位、手牌張數、副露、棄牌區 (4.1)
function AIRow(props: { wind: string; handCount: number; discardState: DiscardState }) {
  return (
    <box flexDirection="row" height={3} borderStyle="single" paddingLeft={1} paddingRight={1} gap={1}>
      <WindDisplay wind={props.wind} />
      <AIHandDisplay count={props.handCount} />
      <AIMeldDisplay />
      <text flexGrow={1}></text>
      <DiscardZone state={props.discardState} />
    </box>
  );
}

// 玩家手牌 - 3.1 使用既有 tile text-render binding
function PlayerHandDisplay() {
  return (
    <box flexDirection="row" gap={0} paddingLeft={1}>
      <text>你</text>
      <text>  </text>
      <text>1萬 2萬 3萬 4萬 5萬</text>
      <text> </text>
      <text>1筒 2筒</text>
      <text> </text>
      <text>東 東</text>
      <text> </text>
      <text>5條 6條 7條</text>
    </box>
  );
}

// 按鍵提示 - 3.2 對應手牌位置
function KeyHintDisplay() {
  return (
    <box flexDirection="row" paddingLeft={1} gap={0}>
      <text>     a   s   d   f   g     h   i     j   k     l   ;   '</text>
    </box>
  );
}

// 狀態列 - 3.3 和 3.4 局況資訊 + 可用動作快捷鍵
function StatusBarDisplay() {
  return (
    <box flexDirection="row" paddingLeft={1} gap={2}>
      <text>東風三局  剩44張</text>
      <text dimmed={true}>|</text>
      <text>c=吃 p=碰 k=槓 h=胡 r=棄牌</text>
    </box>
  );
}

// 玩家列 - 包含手牌、按鍵提示、狀態列三個子層 (含棄牌欄位 4.1)
function PlayerRow(props: { discardState: DiscardState }) {
  return (
    <box flexDirection="row" borderStyle="single">
      <box flexDirection="column" flexGrow={1}>
        {/* 手牌列 */}
        <PlayerHandDisplay />

        {/* 分隔 */}
        <box height={1} borderTop="single" borderStyle="none" />

        {/* 按鍵提示列 */}
        <KeyHintDisplay />

        {/* 分隔 */}
        <box height={1} borderTop="single" borderStyle="none" />

        {/* 狀態列 */}
        <StatusBarDisplay />
      </box>

      {/* 棄牌區 */}
      <DiscardZone state={props.discardState} />
    </box>
  );
}

// 棄牌 Dialog - 6.1, 6.2
function DiscardDialog() {
  const state = gameState();
  return (
    <Show when={state.showDiscardDialog}>
      <box
        position="absolute"
        top={5}
        left={10}
        width={50}
        height={10}
        borderStyle="double"
        paddingLeft={2}
        paddingRight={2}
        flexDirection="column"
      >
        <text bold={true}>棄牌歷史</text>
        <text>北家: —</text>
        <text>西家: —</text>
        <text>東家: —</text>
        <text>你:   7條</text>
        <text dimmed={true}>(按 r 關閉)</text>
      </box>
    </Show>
  );
}

// 鍵盤事件處理 - 5.1, 5.2, 5.3, 5.4
function handleKeypress(key: string) {
  // 打牌 (5.1)
  if (keyBindings.playCard.includes(key)) {
    const idx = keyBindings.playCard.indexOf(key);
    console.log(`打牌: 位置 ${idx} 的手牌`);
    return;
  }

  // 吃 (5.2)
  if (key === keyBindings.eat) {
    console.log("吃");
    return;
  }

  // 碰 (5.2)
  if (key === keyBindings.pung) {
    console.log("碰");
    return;
  }

  // 槓 (5.2)
  if (key === keyBindings.kong) {
    console.log("槓");
    return;
  }

  // 胡 (5.2)
  if (key === keyBindings.win) {
    console.log("胡");
    return;
  }

  // 放棄 (5.3)
  if (keyBindings.pass.includes(key)) {
    console.log("放棄");
    return;
  }

  // 棄牌 dialog (5.4)
  if (key === keyBindings.discardDialog) {
    const state = gameState();
    setGameState({ ...state, showDiscardDialog: !state.showDiscardDialog });
    return;
  }
}

// 主桌面 - 四列布局
function GameTable() {
  const state = gameState();
  return (
    <box flexDirection="column" flexGrow={1} padding={1} gap={0}>
      <AIRow wind="北" handCount={13} discardState={state.northDiscard} />
      <AIRow wind="西" handCount={11} discardState={state.westDiscard} />
      <AIRow wind="東" handCount={13} discardState={state.eastDiscard} />
      <PlayerRow discardState={state.southDiscard} />
      <DiscardDialog />
    </box>
  );
}

// 鍵盤輸入處理器
const inputHandler = (sequence: string): boolean => {
  const key = sequence.toLowerCase().trim();
  if (key) {
    handleKeypress(key);
  }
  return false; // 不攔截序列，讓其他處理器也能使用
};

render(() => <GameTable />, {
  prependInputHandlers: [inputHandler],
  exitOnCtrlC: true,
});
