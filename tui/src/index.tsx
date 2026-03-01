import { TextAttributes } from "@opentui/core";
import { render } from "@opentui/solid";
import {
  buildTaiwanMahjongCatalog,
  toDisplayAdapter,
  toTileTextRenderBinding,
  toZigInteropTile,
  toTextRenderKey,
  validateTileCatalogOrThrow,
} from "./tiles";

const tileCatalog = buildTaiwanMahjongCatalog();
validateTileCatalogOrThrow(tileCatalog);

const demoTile = tileCatalog.find(
  (tile) => tile.category === "suited" && tile.suit === "circles" && tile.rank === 1 && tile.copy_index === 0,
);
const demoBambooTile = tileCatalog.find(
  (tile) => tile.category === "suited" && tile.suit === "bamboos" && tile.rank === 1 && tile.copy_index === 0,
);
const demoWanTile = tileCatalog.find(
  (tile) => tile.category === "suited" && tile.suit === "characters" && tile.rank === 1 && tile.copy_index === 0,
);
const demoWhiteTile = tileCatalog.find(
  (tile) => tile.category === "honor" && tile.honor_type === "dragon" && tile.dragon === "white" && tile.copy_index === 0,
);
const demoSeasonTile = tileCatalog.find(
  (tile) => tile.category === "bonus" && tile.bonus_type === "season" && tile.bonus_ordinal === 1,
);
const demoTileCopy1 = tileCatalog.find(
  (tile) => tile.category === "suited" && tile.suit === "circles" && tile.rank === 1 && tile.copy_index === 1,
);

if (!demoTile || !demoBambooTile || !demoWanTile || !demoWhiteTile || !demoSeasonTile || !demoTileCopy1) {
  throw new Error("Unable to find required demo tiles");
}

if (toTextRenderKey(demoTile) !== toTextRenderKey(demoTileCopy1)) {
  throw new Error("Expected same semantics copies to map to identical text keys");
}

const circleBinding = toTileTextRenderBinding(demoTile);
const bambooBinding = toTileTextRenderBinding(demoBambooTile);
const wanBinding = toTileTextRenderBinding(demoWanTile);
const whiteBinding = toTileTextRenderBinding(demoWhiteTile);
const seasonBinding = toTileTextRenderBinding(demoSeasonTile);

const demoDisplay = toDisplayAdapter(demoTile);
const demoInterop = toZigInteropTile(demoTile);

function TilePreview(props: { ascii: string }) {
  const lines = props.ascii.split("\n");
  return (
    <box flexDirection="column">
      {lines.map((line) => (
        <text>{line}</text>
      ))}
    </box>
  );
}

render(() => (
  <box alignItems="center" justifyContent="center" flexGrow={1}>
    <box flexDirection="column" alignItems="center" gap={2}>
      <ascii_font font="tiny" text="ma-chill" />
      <text attributes={TextAttributes.BOLD}>麻將 1v3</text>

      <box flexDirection="column" marginTop={2} gap={1}>
        <TilePreview ascii={circleBinding.ascii} />
        <TilePreview ascii={bambooBinding.ascii} />
        <TilePreview ascii={wanBinding.ascii} />
        <TilePreview ascii={whiteBinding.ascii} />
      </box>

      <box flexDirection="column" marginTop={1}>
        <text>
          {`tile_id=${demoTile.tile_id} kind_id=${demoTile.kind_id} key=${demoDisplay.text_key}`}
        </text>
        <text>{`bamboo status=${bambooBinding.template.status} key=${bambooBinding.text_key}`}</text>
        <text>{`white status=${whiteBinding.template.status} key=${whiteBinding.text_key}`}</text>
        <text>{`season status=${seasonBinding.template.status} key=${seasonBinding.text_key}`}</text>
        <text attributes={TextAttributes.DIM}>{`zig={tile_id:${demoInterop.tile_id},kind_id:${demoInterop.kind_id}}`}</text>
        <text attributes={TextAttributes.DIM}>Known limitation: full-width glyphs may align differently across terminals.</text>
      </box>

      <text attributes={TextAttributes.DIM} marginTop={2}>
        Press any key to start...
      </text>
    </box>
  </box>
));
