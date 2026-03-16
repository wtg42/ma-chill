import { JSX, For, onCleanup, onMount } from "solid-js";

const WIND_ZH: Record<string, string> = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
};

// 從 dealer_player_id 反推合理的骰子展示值（兩顆骰子，合值 mod 4 = dealer_player_id）
function deriveDisplayDice(dealerPlayerId: number): [number, number] {
  // 選一個合值使 (d1 + d2 - 2) mod 4 === dealerPlayerId（台灣麻將慣例：合值 mod 4，從 1 起算）
  // 簡化：固定 d1=3，調整 d2
  const d1 = 3;
  const d2 = ((dealerPlayerId - d1 + 12) % 4) + 1;
  return [d1, d2];
}

interface DiceLobbyProps {
  seatWinds: string[];
  dealerPlayerId: number;
  onStart: () => void;
}

export function DiceLobby(props: DiceLobbyProps): JSX.Element {
  const [d1, d2] = deriveDisplayDice(props.dealerPlayerId);

  const positions = [
    { label: "上（對面）", playerId: 1 },
    { label: "左", playerId: 2 },
    { label: "右", playerId: 3 },
    { label: "下（你）", playerId: 0 },
  ];

  onMount(() => {
    const handler = (_key: string) => {
      props.onStart();
    };
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once("data", () => handler("any"));
    onCleanup(() => {
      process.stdin.pause();
    });
  });

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" width="100%" height="100%" gap={1}>
      <text bold={true}>🎲 擲骰決定莊家</text>
      <text>骰子結果：{d1} + {d2} = {d1 + d2}</text>

      <box flexDirection="column" gap={0} marginTop={1}>
        <text bold={true}>座位風分配</text>
        <For each={positions}>
          {(pos) => {
            const wind = props.seatWinds[pos.playerId] ?? "east";
            const windZh = WIND_ZH[wind] ?? wind;
            const isDealer = pos.playerId === props.dealerPlayerId;
            const isPlayer = pos.playerId === 0;
            return (
              <text>
                {pos.label}：{windZh}風{isDealer ? "（莊）" : ""}{isPlayer ? "（你）" : ""}
              </text>
            );
          }}
        </For>
      </box>

      <text dimmed={true} marginTop={1}>按任意鍵開始遊戲...</text>
    </box>
  );
}
