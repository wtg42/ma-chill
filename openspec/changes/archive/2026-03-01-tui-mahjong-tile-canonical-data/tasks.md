## 1. Canonical Model Setup (TUI)

- [x] 1.1 Define TUI-side tile domain types for canonical taxonomy (`category`, `suit`, `kind_id`, `tile_id`, flower metadata)
- [x] 1.2 Add a canonical ID contract document in the TUI module that fixes `tile_id` immutability and ordering rules
- [x] 1.3 Create constants/enums for canonical English values and reject non-canonical internal values

## 2. Build Taiwan 144 Tile Catalog

- [x] 2.1 Implement a catalog builder that emits exactly 144 tiles with required group counts
- [x] 2.2 Implement deterministic `kind_id` and unique contiguous numeric `tile_id` assignment
- [x] 2.3 Include explicit flower metadata fields (group + ordinal) for seasons and gentlemen tiles

## 3. Normalization and Display Adapter Boundaries

- [x] 3.1 Implement alias normalization map (e.g., `索/條/条/sou/bamboo` → `bamboos`) at input boundary only
- [x] 3.2 Add display adapter mapping from canonical tile data to text render keys without mutating canonical IDs
- [x] 3.3 Define image-asset key placeholders derived from canonical IDs/kinds for future renderer migration

## 4. Validation and Interop Readiness

- [x] 4.1 Add validation checks for total tile count, per-group counts, and uniqueness of `tile_id`
- [x] 4.2 Add validation checks ensuring duplicate face tiles share `kind_id` but not `tile_id`
- [x] 4.3 Add an interop export shape for Zig handoff that transmits stable numeric IDs and required semantic fields
