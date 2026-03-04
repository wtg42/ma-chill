import { JSX } from "solid-js";
import type { TerminalDimensions } from "./useTerminalDimensions";

const MIN_WIDTH = 140;
const MIN_HEIGHT = 40;

interface TooSmallWarningProps {
  currentDimensions: TerminalDimensions;
}

export function TooSmallWarning(props: TooSmallWarningProps): JSX.Element {
  return (
    <box flexDirection="column" width="100%" height="100%" justifyContent="center" alignItems="center">
      <text bold={true}>❌ 終端機尺寸不足</text>
      <text></text>
      <text>最小需求: {MIN_WIDTH.toString()} × {MIN_HEIGHT.toString()} (寬 × 高)</text>
      <text>目前尺寸: {props.currentDimensions.width.toString()} × {props.currentDimensions.height.toString()}</text>
      <text></text>
      <text dimmed={true}>請調整終端視窗大小以繼續遊玩</text>
    </box>
  );
}
