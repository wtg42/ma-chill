import { JSX, Show, createSignal } from "solid-js";
import { useTerminalDimensions } from "./useTerminalDimensions";
import { TooSmallWarning } from "./TooSmallWarning";
import { AiPlayerRow } from "./AiPlayerRow";
import { PlayerRow } from "./PlayerRow";
import { DiscardHistoryPopup } from "./DiscardHistoryPopup";
import { GameInfoPopup } from "./GameInfoPopup";
import * as fakeData from "./fake-data";

const MIN_WIDTH = 140;
const MIN_HEIGHT = 40;

// Simulate player's turn for tab key gating
const isPlayerTurn = true;

export function GameTable(): JSX.Element {
  const dimensions = useTerminalDimensions();
  const [showDiscardHistory, setShowDiscardHistory] = createSignal(false);
  const [showGameInfo, setShowGameInfo] = createSignal(false);

  const isSizeValid = () => {
    return dimensions().width >= MIN_WIDTH && dimensions().height >= MIN_HEIGHT;
  };

  const handleKeyDown = (key: string) => {
    if (key === "tab") {
      if (!isPlayerTurn) return;
      if (showDiscardHistory()) {
        setShowDiscardHistory(false);
      } else {
        setShowDiscardHistory(true);
        setShowGameInfo(false);
      }
    } else if (key === "\\") {
      if (showGameInfo()) {
        setShowGameInfo(false);
      } else {
        setShowGameInfo(true);
        setShowDiscardHistory(false);
      }
    }
  };

  return (
    <Show
      when={isSizeValid()}
      fallback={<TooSmallWarning currentDimensions={dimensions()} />}
    >
      <box flexDirection="column" width="100%" height="100%" gap={0} onKeyDown={handleKeyDown}>
        {/* North player */}
        <AiPlayerRow
          wind="north"
          windZh="北"
          handCount={fakeData.aiPlayers[0]!.handCount}
          latestDiscard={fakeData.aiPlayers[0]!.latestDiscard}
          melds={fakeData.aiPlayers[0]!.melds}
        />

        {/* West player */}
        <AiPlayerRow
          wind="west"
          windZh="西"
          handCount={fakeData.aiPlayers[1]!.handCount}
          latestDiscard={fakeData.aiPlayers[1]!.latestDiscard}
          melds={fakeData.aiPlayers[1]!.melds}
        />

        {/* East player */}
        <AiPlayerRow
          wind="east"
          windZh="東"
          handCount={fakeData.aiPlayers[2]!.handCount}
          latestDiscard={fakeData.aiPlayers[2]!.latestDiscard}
          melds={fakeData.aiPlayers[2]!.melds}
        />

        {/* Player (South) */}
        <PlayerRow
          hand={fakeData.playerHand}
          drawnTile={fakeData.lastDrawnTile}
          melds={fakeData.playerMelds}
          availableActions={fakeData.playerAvailableActions}
        />

        {/* Popups (mutually exclusive) */}
        <Show when={showDiscardHistory()}>
          <box position="absolute" top={4} left={4}>
            <DiscardHistoryPopup discards={fakeData.allDiscards} />
          </box>
        </Show>

        <Show when={showGameInfo()}>
          <box position="absolute" top={4} right={4}>
            <GameInfoPopup
              roundWind={fakeData.gameInfo.roundWind}
              roundNumber={fakeData.gameInfo.roundNumber}
              tilesRemaining={fakeData.gameInfo.tilesRemaining}
            />
          </box>
        </Show>
      </box>
    </Show>
  );
}
