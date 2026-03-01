# Canonical Tile ID Contract (Taiwan 144)

This document defines immutable ID rules for TUI and Zig interop.

## Core guarantees

- `tile_id` is unique per physical tile and immutable once published.
- `kind_id` identifies tile face semantics and is shared by duplicate copies.
- `tile_id` values are contiguous integers from `0..143` for the Taiwan 144-tile catalog.
- Rendering mode changes (ASCII/Unicode/image) MUST NOT change `tile_id` or `kind_id`.

## Ordering and ranges

`kind_id` order is fixed:

1. Suited kinds in this order: `characters`, `circles`, `bamboos`, each rank `1..9`
2. Winds in order: `east`, `south`, `west`, `north`
3. Dragons in order: `red`, `green`, `white`
4. Seasons in ordinal order: `1..4` (`spring`, `summer`, `autumn`, `winter`)
5. Flowers in ordinal order: `1..4` (`plum`, `orchid`, `chrysanthemum`, `bamboo`)

`tile_id` is assigned by iterating `kind_id` in order and emitting:

- 4 copies for suited and honor kinds (`copy_index` `0..3`)
- 1 copy for bonus kinds (`copy_index` `0`)

## Compatibility rules

- Do not remap existing IDs after they are used by logs/tests/Zig interop.
- If regional variants are needed, build subsets from this catalog instead of reindexing IDs.
- Any breaking contract change requires a new versioned catalog and explicit migration.
