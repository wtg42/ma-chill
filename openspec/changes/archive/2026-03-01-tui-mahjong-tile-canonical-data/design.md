## Context

The TUI currently renders a tile mockup directly in `tui/src/index.tsx` and does not yet expose a reusable tile domain model. The project also plans to route tile data into a Zig computation layer, which requires stable numeric identity independent from rendering choices. Additional constraints from product direction include support for Taiwan 144-tile sets, flower semantics (seasons and gentlemen ordering), and terminology normalization where user input can vary but internal representation remains consistent.

## Goals / Non-Goals

**Goals:**
- Define a display-agnostic canonical tile model for all 144 Taiwan Mahjong tiles.
- Guarantee immutable numeric tile identity for TS-to-Zig interop and deterministic replay/debugging.
- Standardize canonical English naming based on Mahjong tile taxonomy while preserving alias normalization for multilingual inputs.
- Capture flower metadata needed by rules engines (group and 1..4 numbering).

**Non-Goals:**
- Implement game rules, scoring, or hand evaluation logic.
- Build final image-based rendering assets.
- Define network/API payload standards outside current TUI and local Zig integration boundaries.

## Decisions

1. Canonical identity model uses two layers: `kind_id` (tile face) and `tile_id` (physical copy).
   - Rationale: rules mostly operate on tile faces, while shuffled decks and hand state require unique physical identity.
   - Alternative considered: tile-face-only IDs; rejected because duplicate tiles become ambiguous in draw/discard replay.

2. `tile_id` is immutable numeric and contiguous for the Taiwan 144-tile set.
   - Rationale: compact transport to Zig and deterministic indexing.
   - Alternative considered: UUID/string IDs; rejected due to overhead and avoidable complexity.

3. Canonical naming follows English Mahjong taxonomy (`characters`, `bamboos`, `circles`, honors, bonus) with alias normalization.
   - Rationale: avoids mixed-language ambiguity in code while allowing regional terms (`索/條/条`, etc.) at parsing boundaries.
   - Alternative considered: Chinese-only canonical names; rejected to reduce cross-language tooling friction.

4. Rendering adapters are explicit and separate from canonical data.
   - Rationale: allows Unicode/ASCII/image frontends to change without touching rules identity.
   - Alternative considered: storing presentation strings as primary tile descriptors; rejected because it couples logic to UI assets.

5. Flower metadata includes both category and ordinal values.
   - Rationale: flower numbering (`1..4`) has rule significance and must be first-class data.
   - Alternative considered: derive from localized display name; rejected as brittle and localization-dependent.

## Risks / Trade-offs

- [Risk] Early ID ordering choice becomes hard to change later once persisted in logs/tests. → Mitigation: treat ID map as versioned contract and document it in the capability spec.
- [Risk] Terminology mismatch across client input sources (`bamboo/sou/suo/條/索`). → Mitigation: define one canonical vocabulary and an explicit alias table.
- [Risk] Future variants (e.g., no-flowers or regional sets) may pressure current fixed mapping. → Mitigation: keep canonical Taiwan-144 map stable and add variant deck builders that select subsets rather than remapping IDs.
- [Trade-off] Extra metadata fields increase model verbosity. → Mitigation: keep required runtime shape minimal and use derived/read-only views for UI labels.
