import { JSX, Show } from "solid-js";
import { useTerminalDimensions } from "./useTerminalDimensions";
import { TooSmallWarning } from "./TooSmallWarning";
import { AiPlayerRow } from "./AiPlayerRow";
import { PlayerRow } from "./PlayerRow";
import * as fakeData from "./fake-data";

const MIN_WIDTH = 140;
const MIN_HEIGHT = 40;

export function GameTable(): JSX.Element {
  const dimensions = useTerminalDimensions();

  const isSizeValid = () => {
    return dimensions().width >= MIN_WIDTH && dimensions().height >= MIN_HEIGHT;
  };

  return (
    <Show
      when={isSizeValid()}
      fallback={<TooSmallWarning currentDimensions={dimensions()} />}
    >
      <box flexDirection="column" width="100%" height="100%" gap={0}>
        {/* North player */}
        <AiPlayerRow
          wind="north"
          windZh="北"
          handCount={fakeData.aiPlayers[0].handCount}
          latestDiscard={fakeData.aiPlayers[0].latestDiscard}
        />

        {/* West player */}
        <AiPlayerRow
          wind="west"
          windZh="西"
          handCount={fakeData.aiPlayers[1].handCount}
          latestDiscard={fakeData.aiPlayers[1].latestDiscard}
        />

        {/* East player */}
        <AiPlayerRow
          wind="east"
          windZh="東"
          handCount={fakeData.aiPlayers[2].handCount}
          latestDiscard={fakeData.aiPlayers[2].latestDiscard}
        />

        {/* Player (South) */}
        <PlayerRow
          hand={fakeData.playerHand}
          drawnTile={fakeData.lastDrawnTile}
        />
      </box>
    </Show>
  );
}
