const std = @import("std");
const state = @import("state.zig");
const tile = @import("tile.zig");

pub fn drawForCurrentPlayer(game_state: *state.GameState) !?tile.Tile {
    return drawForPlayer(game_state, game_state.current_player_id);
}

pub fn drawForPlayer(game_state: *state.GameState, player_id: u8) !?tile.Tile {
    while (game_state.wall.items.len > 0) {
        const drawn_tile = game_state.wall.pop().?;
        if (drawn_tile.isBonus()) {
            try game_state.players[player_id].bonus_tiles.append(game_state.allocator, drawn_tile);
            try game_state.events.append(game_state.allocator, .{ .kind = .bonus_tile, .player_id = player_id, .tile_id = drawn_tile.id });
            continue;
        }

        try game_state.players[player_id].hand.append(game_state.allocator, drawn_tile);
        game_state.drawn_tile_id = if (player_id == 0) drawn_tile.id else null;
        return drawn_tile;
    }

    game_state.drawn_tile_id = null;
    return null;
}

pub fn discardTile(game_state: *state.GameState, player_id: u8, tile_id: u8) !void {
    const removed_tile = removeTileById(&game_state.players[player_id].hand, tile_id) orelse return error.InvalidTile;
    try game_state.players[player_id].discards.append(game_state.allocator, removed_tile.id);
    game_state.drawn_tile_id = null;
}

pub fn applyClosedKong(game_state: *state.GameState, tile_id: u8) !void {
    const target_tile = tileById(tile_id) orelse return error.InvalidTile;
    var meld_tiles: [4]u8 = undefined;
    var found: usize = 0;
    var index: usize = 0;

    while (index < game_state.players[game_state.current_player_id].hand.items.len and found < 4) {
        const candidate = game_state.players[game_state.current_player_id].hand.items[index];
        if (sameKind(candidate, target_tile)) {
            _ = orderedRemove(&game_state.players[game_state.current_player_id].hand, index);
            meld_tiles[found] = candidate.id;
            found += 1;
            continue;
        }
        index += 1;
    }

    if (found != 4) return error.InvalidTile;
    try game_state.players[game_state.current_player_id].melds.append(game_state.allocator, state.Meld.init(.closed_kong, &meld_tiles, null));
}

/// 套用吃牌結果，若提供 claim_tile_ids 則依指定 tile id 組成面子。
pub fn applyChiClaim(game_state: *state.GameState, player_id: u8, discarded_tile_id: u8, claim_tile_ids: ?[2]u8) !void {
    const discarded_tile = tileById(discarded_tile_id) orelse return error.InvalidTile;
    var meld_tiles = [_]u8{ 0, 0, 0 };
    meld_tiles[2] = discarded_tile_id;
    if (claim_tile_ids) |selected_ids| {
        meld_tiles[0] = try removeTileByExactId(game_state, player_id, selected_ids[0], discarded_tile.suit);
        meld_tiles[1] = try removeTileByExactId(game_state, player_id, selected_ids[1], discarded_tile.suit);
    } else {
        const ranks = chiSequence(discarded_tile, game_state.players[player_id].hand.items) orelse return error.InvalidTile;
        meld_tiles[0] = try removeTileByRank(game_state, player_id, discarded_tile.suit, ranks[0]);
        meld_tiles[1] = try removeTileByRank(game_state, player_id, discarded_tile.suit, ranks[1]);
    }
    try game_state.players[player_id].melds.append(game_state.allocator, state.Meld.init(.chi, &meld_tiles, 2));
    game_state.any_claims_made = true;
    game_state.current_player_id = player_id;
    game_state.drawn_tile_id = null;
}

pub fn applyPonClaim(game_state: *state.GameState, player_id: u8, discarded_tile_id: u8) !void {
    const discarded_tile = tileById(discarded_tile_id) orelse return error.InvalidTile;
    var meld_tiles = [_]u8{ discarded_tile_id, 0, 0 };
    meld_tiles[1] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    meld_tiles[2] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    try game_state.players[player_id].melds.append(game_state.allocator, state.Meld.init(.pon, &meld_tiles, 0));
    game_state.any_claims_made = true;
    game_state.current_player_id = player_id;
    game_state.drawn_tile_id = null;
}

pub fn applyOpenKongClaim(game_state: *state.GameState, player_id: u8, discarded_tile_id: u8) !void {
    const discarded_tile = tileById(discarded_tile_id) orelse return error.InvalidTile;
    var meld_tiles = [_]u8{ discarded_tile_id, 0, 0, 0 };
    meld_tiles[1] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    meld_tiles[2] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    meld_tiles[3] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    try game_state.players[player_id].melds.append(game_state.allocator, state.Meld.init(.open_kong, &meld_tiles, 0));
    game_state.any_claims_made = true;
    game_state.current_player_id = player_id;
    game_state.drawn_tile_id = null;
}

pub fn nextPlayer(player_id: u8) u8 {
    return @intCast((player_id + 1) % state.player_count);
}

fn tileById(tile_id: u8) ?tile.Tile {
    const catalog = tile.generateCatalog();
    if (tile_id >= catalog.len) return null;
    return catalog[tile_id];
}

fn sameKind(a: tile.Tile, b: tile.Tile) bool {
    return a.suit == b.suit and a.rank == b.rank;
}

fn chiSequence(discarded_tile: tile.Tile, hand: []const tile.Tile) ?[2]tile.Rank {
    const rank_value = suitedRankValue(discarded_tile.rank) orelse return null;

    if (rank_value >= 3 and hasRank(hand, discarded_tile.suit, rankEnum(rank_value - 2)) and hasRank(hand, discarded_tile.suit, rankEnum(rank_value - 1))) {
        return .{ rankEnum(rank_value - 2), rankEnum(rank_value - 1) };
    }
    if (rank_value >= 2 and rank_value <= 8 and hasRank(hand, discarded_tile.suit, rankEnum(rank_value - 1)) and hasRank(hand, discarded_tile.suit, rankEnum(rank_value + 1))) {
        return .{ rankEnum(rank_value - 1), rankEnum(rank_value + 1) };
    }
    if (rank_value <= 7 and hasRank(hand, discarded_tile.suit, rankEnum(rank_value + 1)) and hasRank(hand, discarded_tile.suit, rankEnum(rank_value + 2))) {
        return .{ rankEnum(rank_value + 1), rankEnum(rank_value + 2) };
    }
    return null;
}

fn hasRank(hand: []const tile.Tile, suit: tile.Suit, rank: tile.Rank) bool {
    for (hand) |entry| {
        if (entry.suit == suit and entry.rank == rank) return true;
    }
    return false;
}

fn removeTileByRank(game_state: *state.GameState, player_id: u8, suit: tile.Suit, rank: tile.Rank) !u8 {
    for (game_state.players[player_id].hand.items, 0..) |entry, index| {
        if (entry.suit == suit and entry.rank == rank) {
            return orderedRemove(&game_state.players[player_id].hand, index).id;
        }
    }
    return error.InvalidTile;
}

/// 依指定 tile id 移除手牌，並驗證其花色與吃牌目標一致。
fn removeTileByExactId(game_state: *state.GameState, player_id: u8, tile_id: u8, expected_suit: tile.Suit) !u8 {
    for (game_state.players[player_id].hand.items, 0..) |entry, index| {
        if (entry.id == tile_id and entry.suit == expected_suit) {
            return orderedRemove(&game_state.players[player_id].hand, index).id;
        }
    }
    return error.InvalidTile;
}

fn removeTileById(hand: *std.ArrayListUnmanaged(tile.Tile), tile_id: u8) ?tile.Tile {
    for (hand.items, 0..) |entry, index| {
        if (entry.id == tile_id) {
            return orderedRemove(hand, index);
        }
    }
    return null;
}

fn orderedRemove(list: *std.ArrayListUnmanaged(tile.Tile), index: usize) tile.Tile {
    const removed = list.items[index];
    std.mem.copyForwards(tile.Tile, list.items[index .. list.items.len - 1], list.items[index + 1 ..]);
    list.items.len -= 1;
    return removed;
}

fn suitedRankValue(rank: tile.Rank) ?usize {
    return switch (rank) {
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

fn rankEnum(value: usize) tile.Rank {
    return switch (value) {
        1 => .one,
        2 => .two,
        3 => .three,
        4 => .four,
        5 => .five,
        6 => .six,
        7 => .seven,
        8 => .eight,
        9 => .nine,
        else => unreachable,
    };
}

test "drawForPlayer skips bonus tiles and records events" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.wall.append(allocator, catalog[0]);
    try game_state.wall.append(allocator, catalog[136]);

    const drawn = try drawForPlayer(&game_state, 0);
    try std.testing.expect(drawn != null);
    try std.testing.expectEqual(catalog[0].id, drawn.?.id);
    try std.testing.expectEqual(@as(usize, 1), game_state.players[0].bonus_tiles.items.len);
    try std.testing.expectEqual(@as(usize, 1), game_state.events.items.len);
    try std.testing.expectEqual(@as(?u8, catalog[0].id), game_state.drawn_tile_id);
}

test "discardTile removes tile and appends discard" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[0].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[0], catalog[4] });
    game_state.drawn_tile_id = catalog[4].id;

    try discardTile(&game_state, 0, catalog[4].id);

    try std.testing.expectEqual(@as(usize, 1), game_state.players[0].hand.items.len);
    try std.testing.expectEqual(catalog[0].id, game_state.players[0].hand.items[0].id);
    try std.testing.expectEqual(@as(usize, 1), game_state.players[0].discards.items.len);
    try std.testing.expectEqual(catalog[4].id, game_state.players[0].discards.items[0]);
    try std.testing.expectEqual(@as(?u8, null), game_state.drawn_tile_id);
}

test "applyClosedKong removes tiles and adds meld" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[0].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[0], catalog[1], catalog[2], catalog[3], catalog[20] });
    game_state.current_player_id = 0;

    try applyClosedKong(&game_state, catalog[0].id);

    try std.testing.expectEqual(@as(usize, 1), game_state.players[0].hand.items.len);
    try std.testing.expectEqual(@as(usize, 1), game_state.players[0].melds.items.len);
    try std.testing.expectEqual(state.MeldType.closed_kong, game_state.players[0].melds.items[0].kind);
}

test "applyChiClaim updates melds and current player" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[1].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[0], catalog[4], catalog[40] });
    game_state.current_player_id = 0;

    try applyChiClaim(&game_state, 1, catalog[8].id, null);

    try std.testing.expectEqual(@as(usize, 1), game_state.players[1].hand.items.len);
    try std.testing.expectEqual(@as(usize, 1), game_state.players[1].melds.items.len);
    try std.testing.expectEqual(state.MeldType.chi, game_state.players[1].melds.items[0].kind);
    try std.testing.expectEqual(@as(u8, 1), game_state.current_player_id);
    try std.testing.expect(game_state.any_claims_made);
}

test "applyChiClaim uses explicit claim tile ids" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[1].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[0], catalog[4], catalog[12], catalog[40] });
    game_state.current_player_id = 0;

    try applyChiClaim(&game_state, 1, catalog[8].id, .{ catalog[4].id, catalog[12].id });

    try std.testing.expectEqual(@as(usize, 2), game_state.players[1].hand.items.len);
    try std.testing.expectEqual(catalog[0].id, game_state.players[1].hand.items[0].id);
}
