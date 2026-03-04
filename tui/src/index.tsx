import { render } from "@opentui/solid";
import { validateTileCatalogOrThrow, buildTaiwanMahjongCatalog } from "./tiles";
import { GameTable } from "./game-table";

// Initialize tile catalog
const tileCatalog = buildTaiwanMahjongCatalog();
validateTileCatalogOrThrow(tileCatalog);

// Main App
function App() {
  return <GameTable />;
}

// Render the app
render(() => <App />, {
  exitOnCtrlC: true,
});
