## ADDED Requirements

### Requirement: Canonical Taiwan 144-tile catalog
The system SHALL define a canonical tile catalog containing exactly 144 Mahjong tiles for Taiwan rules, including 108 suited tiles, 16 winds, 12 dragons, 4 seasons, and 4 gentlemen tiles.

#### Scenario: Catalog composition is complete
- **WHEN** the tile catalog is generated
- **THEN** it contains all required tile groups with exact counts for a 144-tile set

### Requirement: Stable unique tile identity
Each physical tile SHALL have a unique immutable numeric `tile_id`, and each tile face SHALL have a deterministic `kind_id` shared by all duplicate copies of that face.

#### Scenario: Duplicate faces are still distinguishable
- **WHEN** two copies of the same face tile are present in hand state
- **THEN** they share the same `kind_id` and have different `tile_id` values

### Requirement: Display-agnostic tile metadata
Canonical tile records MUST remain independent from rendering technology and SHALL NOT require ASCII, Unicode, or image assets to determine tile semantics.

#### Scenario: Rendering mode switches without identity changes
- **WHEN** UI output switches from text rendering to image rendering
- **THEN** all existing tile semantics and `tile_id` values remain unchanged

### Requirement: Canonical English naming with alias normalization
The catalog SHALL use canonical English taxonomy names for suits and categories, and the parser MUST normalize recognized aliases to canonical values before rule or interop processing.

#### Scenario: Regional aliases normalize to canonical suit
- **WHEN** input contains equivalent suit labels such as `索`, `條`, `条`, `sou`, or `bamboo`
- **THEN** the normalized suit value is canonical `bamboos`

### Requirement: Flower numbering semantics are explicit
Bonus tiles SHALL include explicit flower metadata with group and ordinal values, where seasons map to `1..4` and gentlemen map to `1..4` in configured order, without deriving ordinals from presentation text.

#### Scenario: Gentlemen ordinal is consumed by rules
- **WHEN** a gentlemen tile is evaluated for scoring metadata
- **THEN** its stored ordinal value is available directly from canonical tile data
