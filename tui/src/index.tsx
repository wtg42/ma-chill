import { render } from "@opentui/solid";
import { validateTileCatalogOrThrow, buildTaiwanMahjongCatalog } from "./tiles";
import { GameTable } from "./game-table";
import { useGameState, type GameStateStore } from "./game-state";
import { connect } from "./connection";

// Validate tile catalog at startup
const catalog = buildTaiwanMahjongCatalog();
validateTileCatalogOrThrow(catalog);

// Initialize game state store
const store = useGameState();

// Connect to Zig core via UDS (exits on failure)
await connect(store);

// Main App
function App(props: { store: GameStateStore }) {
  return <GameTable store={props.store} />;
}

// Render the app
render(() => <App store={store} />, {
  exitOnCtrlC: true,
});
