import { render } from "@opentui/solid";
import { createSignal, Show } from "solid-js";
import { validateTileCatalogOrThrow, buildTaiwanMahjongCatalog } from "./tiles";
import { GameTable } from "./game-table";
import { DiceLobby } from "./game-table/DiceLobby";
import { GameOverScreen } from "./game-table/GameOverScreen";
import { useGameState, type GameStateStore } from "./game-state";
import { connect, sendPlayerReady } from "./connection";

// Validate tile catalog at startup
const catalog = buildTaiwanMahjongCatalog();
validateTileCatalogOrThrow(catalog);

// Initialize game state store
const store = useGameState();

// Connect to Zig core via UDS (exits on failure)
await connect(store);

// Main App
function App(props: { store: GameStateStore }) {
  const [phase, setPhase] = createSignal<"lobby" | "playing" | "game_over">("lobby");

  const handleStart = () => {
    sendPlayerReady();
    setPhase("playing");
  };

  const state = () => props.store.gameState();
  const dealerPlayerId = () => state()?.dealer_player_id ?? 0;
  const seatWinds = () => props.store.seatWinds();
  const gameOverMsg = () => props.store.gameOverMsg();

  // Transition to game_over when message arrives
  const currentGameOver = () => {
    const msg = gameOverMsg();
    if (msg && phase() === "playing") {
      setPhase("game_over");
    }
    return msg;
  };

  return (
    <Show
      when={phase() !== "lobby"}
      fallback={
        <DiceLobby
          seatWinds={seatWinds()}
          dealerPlayerId={dealerPlayerId()}
          onStart={handleStart}
        />
      }
    >
      <Show
        when={phase() === "game_over" && currentGameOver() !== null}
        fallback={<GameTable store={props.store} />}
      >
        <GameOverScreen msg={currentGameOver()!} />
      </Show>
    </Show>
  );
}

// Render the app
render(() => <App store={store} />, {
  exitOnCtrlC: true,
});
