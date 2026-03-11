import { JSX } from "solid-js";

interface GameInfoPopupProps {
  roundWind: string;
  roundNumber: number;
  tilesRemaining: number;
}

export function GameInfoPopup(props: GameInfoPopupProps): JSX.Element {
  return (
    <box
      borderStyle="single"
      flexDirection="column"
      padding={1}
      width={24}
    >
      <text bold={true}>遊戲資訊</text>
      <text>局風：{props.roundWind}風</text>
      <text>局數：第 {props.roundNumber} 局</text>
      <text>牌山剩餘：{props.tilesRemaining} 張</text>
    </box>
  );
}
