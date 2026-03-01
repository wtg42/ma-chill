## Why

The TUI currently renders tile visuals directly without a canonical tile data model. We need a stable tile identity contract now so UI changes (Unicode, ASCII, images) and Zig-based game logic can evolve independently without breaking interoperability.

## What Changes

- Define a canonical 144-tile Taiwan Mahjong catalog for the TUI domain, including suits, honors, seasons, and gentlemen tiles.
- Standardize immutable numeric `tile_id` assignment and companion semantic fields (`kind`, `rank`, `copy_index`, flower metadata).
- Define naming normalization rules using English canonical terms aligned with Mahjong tile taxonomy while supporting Chinese aliases for parsing.
- Add explicit mapping rules from canonical data to display adapters so presentation can switch between text and image assets without affecting logic IDs.

## Capabilities

### New Capabilities
- `tile-catalog`: Canonical Mahjong tile dataset, ID contract, normalization rules, and display-agnostic metadata for TUI-to-Zig interoperability.

### Modified Capabilities
- None.

## Impact

- Affects `tui` tile modeling and rendering integration points.
- Establishes ID and metadata contract consumed by downstream Zig computation layers.
- Reduces risk of regressions when adding image-based rendering or localization variants.
