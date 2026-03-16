import { JSX, For, Show } from "solid-js";
import { useKeyboard, useRenderer } from "@opentui/solid";
import type { ZigGameOverMessage, ZigScoringLine } from "../game-state";

// Task 7.4: pattern 英文→中文對照表
const PATTERN_ZH: Record<string, string> = {
  self_draw: "自摸",
  concealed: "門清",
  single_wait: "單吊",
  round_wind_triplet: "圈風刻",
  seat_wind_triplet: "座風刻",
  all_triplets: "對對胡",
  small_three_dragons: "小三元",
  big_three_dragons: "大三元",
  flush: "清一色",
  all_honors: "字一色",
  small_four_winds: "小四喜",
  big_four_winds: "大四喜",
  own_flowers: "自花",
  eight_immortals: "八仙過海",
  human_win: "人胡",
  earth_win: "地胡",
  heaven_win: "天胡",
};

const PLAYER_NAMES = ["你", "玩家 2", "玩家 3", "玩家 4"];

interface Props {
  msg: ZigGameOverMessage;
}

export function GameOverScreen(props: Props): JSX.Element {
  const renderer = useRenderer();

  // Task 7.6: 任意鍵結束
  useKeyboard(() => {
    renderer.destroy();
  });

  const isExhaustiveDraw = () => props.msg.winner_id === null;
  const winnerName = () =>
    props.msg.winner_id !== null
      ? (PLAYER_NAMES[props.msg.winner_id] ?? `玩家 ${props.msg.winner_id + 1}`)
      : null;
  const detail = () => props.msg.scoring_detail;

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" width="100%" height="100%">
      <box flexDirection="column" border borderStyle="rounded" paddingX={4} paddingY={1}>
        <text>
          <strong>{isExhaustiveDraw() ? "流局" : `${winnerName()} 胡牌！`}</strong>
        </text>

        <Show when={!isExhaustiveDraw() && detail() !== null}>
          <box flexDirection="column" marginTop={1}>
            <For each={detail()!.lines}>
              {(line: ZigScoringLine) => (
                <box>
                  <text>{PATTERN_ZH[line.pattern] ?? line.pattern}</text>
                  <text>　<span fg="cyan">{line.fan} 台</span></text>
                </box>
              )}
            </For>
            <box marginTop={1}>
              <text><strong>合計：</strong><span fg="green">{detail()!.total_fan} 台</span></text>
            </box>
          </box>
        </Show>

        <box flexDirection="column" marginTop={1}>
          <text>分數變動：</text>
          <For each={props.msg.scores}>
            {(score: number, i) => (
              <text>
                {PLAYER_NAMES[i()] ?? `玩家 ${i() + 1}`}：
                <span fg={score >= 0 ? "green" : "red"}>
                  {score >= 0 ? "+" : ""}{score}
                </span>
              </text>
            )}
          </For>
        </box>

        <box marginTop={1}>
          <text><span fg="#888">按任意鍵結束</span></text>
        </box>
      </box>
    </box>
  );
}
