import { For, JSX } from "solid-js";
import type { GameStateStore } from "../game-state";

const ROUND_WIND_ZH: Record<string, string> = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
};

const PLAYER_NAMES = ["你", "玩家 2", "玩家 3", "玩家 4"];

interface Props {
  store: GameStateStore;
}

export function ShellStatusBar(props: Props): JSX.Element {
  const state = () => props.store.gameState();
  const available = () => props.store.availableCommandHints();
  const currentPlayer = () => PLAYER_NAMES[props.store.currentPlayerId()] ?? `玩家 ${props.store.currentPlayerId() + 1}`;

  return (
    <box flexDirection="column" border borderStyle="rounded" paddingX={1} paddingY={0} minHeight={4}>
      <text>
        <strong>局況</strong>
        {state() ? `  ${ROUND_WIND_ZH[state()!.round_wind] ?? state()!.round_wind}風 ${state()!.round_number} 局` : "  等待初始化"}
        {state() ? `  牌山 ${state()!.wall_count}` : ""}
        {state() ? `  輪到 ${currentPlayer()}` : ""}
      </text>
      <text>
        <strong>分數</strong>
        {state() ? `  ${state()!.scores.map((score, index) => `${PLAYER_NAMES[index] ?? `玩家 ${index + 1}`}:${score}`).join(" / ")}` : ""}
      </text>
      <text>
        <strong>可用命令</strong>
        {available().length > 0 ? " " : " 無"}
        <For each={available()}>{(hint, index) => <span fg={index() < 2 ? "cyan" : "green"}>{`${index() > 0 ? " " : ""}${hint}`}</span>}</For>
      </text>
    </box>
  );
}
