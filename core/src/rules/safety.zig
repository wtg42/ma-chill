const std = @import("std");
const tile = @import("../game/tile.zig");
const game_state = @import("../game/state.zig");

pub const DangerLevel = enum {
    safe,
    low,
    medium,
    high,
};

pub const PublicPlayerState = struct {
    melds: []const game_state.Meld,
    discards: []const u8,
};

pub const PublicState = struct {
    tile_catalog: []const tile.Tile,
    players: []const PublicPlayerState,
};

pub fn analyzeTile(tile_id: u8, public_state: PublicState) DangerLevel {
    const target_tile = public_state.tile_catalog[tile_id];
    const visible_copies = countVisibleCopies(target_tile, public_state);

    if (target_tile.isBonus()) {
        return .safe;
    }
    if (visible_copies >= 3) {
        return .safe;
    }

    if (target_tile.suit == .winds or target_tile.suit == .dragons) {
        return if (visible_copies >= 2) .low else .medium;
    }

    if (hasNearbySuitMeld(target_tile, public_state)) {
        return if (visible_copies == 0) .high else .medium;
    }

    return if (visible_copies >= 2) .low else .medium;
}

fn countVisibleCopies(target_tile: tile.Tile, public_state: PublicState) usize {
    var visible_copies: usize = 0;

    for (public_state.players) |player| {
        for (player.discards) |discarded_tile_id| {
            if (sameKind(target_tile, public_state.tile_catalog[discarded_tile_id])) {
                visible_copies += 1;
            }
        }

        for (player.melds) |meld| {
            for (meld.tiles[0..meld.tile_count]) |meld_tile_id| {
                if (sameKind(target_tile, public_state.tile_catalog[meld_tile_id])) {
                    visible_copies += 1;
                }
            }
        }
    }

    return visible_copies;
}

fn hasNearbySuitMeld(target_tile: tile.Tile, public_state: PublicState) bool {
    const target_rank = suitedRankValue(target_tile) orelse return false;

    for (public_state.players) |player| {
        for (player.melds) |meld| {
            if (meld.kind != .chi) {
                continue;
            }

            for (meld.tiles[0..meld.tile_count]) |meld_tile_id| {
                const meld_tile = public_state.tile_catalog[meld_tile_id];
                if (meld_tile.suit != target_tile.suit) {
                    continue;
                }

                const meld_rank = suitedRankValue(meld_tile) orelse continue;
                const distance = if (meld_rank > target_rank) meld_rank - target_rank else target_rank - meld_rank;
                if (distance <= 1) {
                    return true;
                }
            }
        }
    }

    return false;
}

fn sameKind(a: tile.Tile, b: tile.Tile) bool {
    return a.suit == b.suit and a.rank == b.rank;
}

fn suitedRankValue(entry: tile.Tile) ?usize {
    return switch (entry.rank) {
        .one => 1,
        .two => 2,
        .three => 3,
        .four => 4,
        .five => 5,
        .six => 6,
        .seven => 7,
        .eight => 8,
        .nine => 9,
        else => null,
    };
}

test "analyzeTile returns safe when three copies are already visible" {
    const catalog = tile.generateCatalog();
    const players = [_]PublicPlayerState{
        .{ .melds = &.{}, .discards = &.{ 0, 1 } },
        .{ .melds = &.{}, .discards = &.{2} },
    };

    const result = analyzeTile(3, .{
        .tile_catalog = &catalog,
        .players = &players,
    });

    try std.testing.expectEqual(DangerLevel.safe, result);
}

test "analyzeTile raises danger around nearby chi melds" {
    const catalog = tile.generateCatalog();
    const melds = [_]game_state.Meld{game_state.Meld.init(.chi, &[_]u8{ 12, 16, 20 }, 1)};
    const players = [_]PublicPlayerState{
        .{ .melds = &melds, .discards = &.{} },
    };

    const result = analyzeTile(24, .{
        .tile_catalog = &catalog,
        .players = &players,
    });

    try std.testing.expectEqual(DangerLevel.high, result);
}
