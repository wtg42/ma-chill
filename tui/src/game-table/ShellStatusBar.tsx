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

// 取得分數列專用玩家名稱，讓玩家編號與名稱貼合以降低冒號判讀干擾。
function scorePlayerLabel(playerId: number): string {
  return playerId === 0 ? "你" : `玩家${playerId + 1}`;
}

// 將玩家分數格式化為狀態列文字，冒號後保留空格以清楚分隔名稱與分數。
export function formatScoreLine(scores: number[]): string {
  return scores.map((score, index) => `${scorePlayerLabel(index)}: ${score}`).join(" / ");
}

export function ShellStatusBar(props: Props): JSX.Element {
  const state = () => props.store.gameState();
  const available = () => props.store.availableCommandHints();
  const currentPlayer = () => PLAYER_NAMES[props.store.currentPlayerId()] ?? `玩家 ${props.store.currentPlayerId() + 1}`;
  const phaseLabel = () => {
    if (props.store.phaseKind() === "discard_reaction") {
      const ctx = props.store.claimContext();
      const discarder = ctx.discarderPlayerId != null
        ? PLAYER_NAMES[ctx.discarderPlayerId] ?? `玩家 ${ctx.discarderPlayerId + 1}`
        : "他家";
      return `回應視窗 ${discarder}`;
    }
    return "自己回合";
  };

  return (
    <box flexDirection="column" border borderStyle="rounded" paddingX={1} paddingY={0} minHeight={4}>
      <text>
        <strong>局況</strong>
        {state() ? `  ${ROUND_WIND_ZH[state()!.round_wind] ?? state()!.round_wind}風 ${state()!.round_number} 局` : "  等待初始化"}
        {state() ? `  牌山 ${state()!.wall_count}` : ""}
        {state() ? `  輪到 ${currentPlayer()}` : ""}
        {state() ? `  ${phaseLabel()}` : ""}
      </text>
      <text>
        <strong>分數</strong>
        {state() ? `  ${formatScoreLine(state()!.scores)}` : ""}
      </text>
      <text>
        <strong>可用命令</strong>
        {available().length > 0 ? " " : " 無"}
        <For each={available()}>{(hint, index) => <span fg={index() < 2 ? "cyan" : "green"}>{`${index() > 0 ? " " : ""}${hint}`}</span>}</For>
      </text>
    </box>
  );
}
