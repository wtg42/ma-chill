import { JSX, Show, createSignal, createMemo } from "solid-js";
import { useTerminalDimensions } from "./useTerminalDimensions";
import { TooSmallWarning } from "./TooSmallWarning";
import { AiPlayerRow } from "./AiPlayerRow";
import { PlayerRow } from "./PlayerRow";
import { DiscardHistoryPopup } from "./DiscardHistoryPopup";
import { GameInfoPopup } from "./GameInfoPopup";
import { useGameKeys } from "./useGameKeys";
import type { GameStateStore, ZigGameState, ZigMeld } from "../game-state";
import type { CanonicalTile } from "../tiles/types";
import type { MeldData } from "./MeldRow";
import type { AiMeldData } from "./AiPlayerRow";

const MIN_WIDTH = 140;
const MIN_HEIGHT = 40;

// Map Zig round_wind string to display character
const ROUND_WIND_ZH: Record<string, string> = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
};

// AI player screen positions (layout): player_id 1=north side, 2=west side, 3=east side
const AI_PLAYER_IDS = [1, 2, 3] as const;

interface GameTableProps {
  store: GameStateStore;
}

function resolveTiles(
  catalog: Map<number, CanonicalTile>,
  ids: number[],
): CanonicalTile[] {
  return ids.flatMap((id) => {
    const t = catalog.get(id);
    return t ? [t] : [];
  });
}

function resolvePlayerMelds(
  catalog: Map<number, CanonicalTile>,
  melds: ZigMeld[],
  viewerIsOwner: boolean,
): MeldData[] {
  return melds.map((meld) => ({
    tiles: resolveTiles(catalog, meld.tiles),
    type: meld.type,
    sourceTileIndex: meld.source_index,
    viewerIsOwner,
  }));
}

function resolveAiMelds(
  catalog: Map<number, CanonicalTile>,
  melds: ZigMeld[],
): AiMeldData[] {
  return melds.map((meld) => ({
    tiles: resolveTiles(catalog, meld.tiles),
    type: meld.type,
    sourceTileIndex: meld.source_index,
    viewerIsOwner: false,
  }));
}

function getAiPlayerData(
  state: ZigGameState,
  catalog: Map<number, CanonicalTile>,
  playerId: number,
) {
  const player = state.players[playerId];
  if (!player) {
    return { handCount: 0, latestDiscard: null, melds: [] };
  }
  const discardTiles = resolveTiles(catalog, player.discards);
  const latestDiscard = discardTiles.length > 0 ? (discardTiles[discardTiles.length - 1] ?? null) : null;
  return {
    handCount: player.hand_count ?? 0,
    latestDiscard,
    melds: resolveAiMelds(catalog, player.melds),
  };
}

export function GameTable(props: GameTableProps): JSX.Element {
  const { store } = props;
  const dimensions = useTerminalDimensions();
  const [showDiscardHistory, setShowDiscardHistory] = createSignal(false);
  const [showGameInfo, setShowGameInfo] = createSignal(false);

  useGameKeys(store, {
    showDiscardHistory,
    setShowDiscardHistory,
    showGameInfo,
    setShowGameInfo,
  });

  const isSizeValid = () =>
    dimensions().width >= MIN_WIDTH && dimensions().height >= MIN_HEIGHT;

  // Derived data from store
  const catalog = () => store.tileCatalog();
  const state = () => store.gameState();
  const seatWinds = () => store.seatWinds();

  const playerHand = createMemo(() => store.handWithIds().map((e) => e.tile));

  const playerDrawnTile = createMemo(() => {
    const s = state();
    if (!s || s.drawn_tile_id == null) return null;
    return catalog().get(s.drawn_tile_id) ?? null;
  });

  const playerMelds = createMemo<MeldData[]>(() => {
    const s = state();
    if (!s) return [];
    const p = s.players[0];
    if (!p) return [];
    return resolvePlayerMelds(catalog(), p.melds, true);
  });

  const allDiscards = createMemo<CanonicalTile[]>(() => {
    const s = state();
    if (!s) return [];
    return s.players.flatMap((p) => resolveTiles(catalog(), p.discards));
  });

  const gameInfo = createMemo(() => {
    const s = state();
    if (!s) return { roundWind: "東", roundNumber: 1, tilesRemaining: 0 };
    return {
      roundWind: ROUND_WIND_ZH[s.round_wind] ?? s.round_wind,
      roundNumber: s.round_number,
      tilesRemaining: s.wall_count,
    };
  });

  return (
    <Show
      when={isSizeValid()}
      fallback={<TooSmallWarning currentDimensions={dimensions()} />}
    >
      <box flexDirection="column" width="100%" height="100%" gap={0}>
        {/* AI players (player_id 1, 2, 3) */}
        {AI_PLAYER_IDS.map((playerId) => {
          const wind = () => seatWinds()[playerId] ?? "east";
          const windZh = () => ROUND_WIND_ZH[wind()] ?? wind();
          return (
            <AiPlayerRow
              wind={wind()}
              windZh={windZh()}
              handCount={state() ? getAiPlayerData(state()!, catalog(), playerId).handCount : 0}
              latestDiscard={state() ? getAiPlayerData(state()!, catalog(), playerId).latestDiscard : null}
              melds={state() ? getAiPlayerData(state()!, catalog(), playerId).melds : []}
            />
          );
        })}

        {/* Player (player_id=0) */}
        <PlayerRow
          hand={playerHand()}
          drawnTile={playerDrawnTile()}
          melds={playerMelds()}
          availableActions={store.availableActions()}
          seatWind={seatWinds()[0]}
        />

        {/* Popups (mutually exclusive) */}
        <Show when={showDiscardHistory()}>
          <box position="absolute" top={4} left={4}>
            <DiscardHistoryPopup discards={allDiscards()} />
          </box>
        </Show>

        <Show when={showGameInfo()}>
          <box position="absolute" top={4} right={4}>
            <GameInfoPopup
              roundWind={gameInfo().roundWind}
              roundNumber={gameInfo().roundNumber}
              tilesRemaining={gameInfo().tilesRemaining}
            />
          </box>
        </Show>
      </box>
    </Show>
  );
}
