const std = @import("std");
const state = @import("state.zig");
const tile = @import("tile.zig");
const protocol = @import("../ipc/protocol.zig");
const actions = @import("../rules/actions.zig");
const scoring = @import("../rules/scoring.zig");

pub fn forPlayer(allocator: std.mem.Allocator, game_state: *const state.GameState, player_id: u8, discarded_tile_id: ?u8, discarder_player_id: ?u8) ![]protocol.ActionType {
    var list: std.ArrayList(protocol.ActionType) = .empty;
    errdefer list.deinit(allocator);

    if (discarded_tile_id) |discard_id| {
        const discarded_tile = tileById(discard_id) orelse return error.InvalidTile;
        const hand = game_state.players[player_id].hand.items;
        const discarder = discarder_player_id orelse return error.InvalidTile;

        if (canWinWithDiscard(hand, discarded_tile)) {
            try list.append(allocator, .win);
        }
        if (actions.canOpenKong(discarded_tile, hand)) {
            try list.append(allocator, .kong);
        }
        if (actions.canPon(discarded_tile, hand)) {
            try list.append(allocator, .pon);
        }
        if (actions.canChi(player_id, discarder, discarded_tile, hand)) {
            try list.append(allocator, .chi);
        }
        try list.append(allocator, .pass);
        return list.toOwnedSlice(allocator);
    }

    const hand = game_state.players[player_id].hand.items;
    if (scoring.isStandardWinningHand(hand)) {
        try list.append(allocator, .win);
    }
    if (actions.canClosedKong(hand)) {
        try list.append(allocator, .kong);
    }
    try list.append(allocator, .discard);
    return list.toOwnedSlice(allocator);
}

pub fn containsAction(actions_list: []const protocol.ActionType, action: protocol.ActionType) bool {
    for (actions_list) |candidate| {
        if (candidate == action) return true;
    }
    return false;
}

fn tileById(tile_id: u8) ?tile.Tile {
    const catalog = tile.generateCatalog();
    if (tile_id >= catalog.len) return null;
    return catalog[tile_id];
}

fn canWinWithDiscard(hand: []const tile.Tile, discarded_tile: tile.Tile) bool {
    var candidate: [32]tile.Tile = undefined;
    if (hand.len + 1 > candidate.len) {
        return false;
    }
    @memcpy(candidate[0..hand.len], hand);
    candidate[hand.len] = discarded_tile;
    return scoring.isStandardWinningHand(candidate[0 .. hand.len + 1]);
}

test "forPlayer includes discard and win on active turn" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const hand = [_]tile.Tile{
        catalog[0], catalog[1], catalog[2], catalog[4], catalog[8], catalog[12], catalog[16], catalog[17], catalog[18], catalog[36], catalog[40], catalog[44], catalog[72], catalog[73], catalog[74], catalog[108], catalog[109],
    };
    try game_state.players[0].hand.appendSlice(allocator, &hand);

    const available = try forPlayer(allocator, &game_state, 0, null, null);
    defer allocator.free(available);

    try std.testing.expect(containsAction(available, .discard));
    try std.testing.expect(containsAction(available, .win));
}

test "forPlayer includes chi and pass for next player after discard" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const hand = [_]tile.Tile{ catalog[0], catalog[4], catalog[20] };
    try game_state.players[1].hand.appendSlice(allocator, &hand);

    const available = try forPlayer(allocator, &game_state, 1, catalog[8].id, 0);
    defer allocator.free(available);

    try std.testing.expect(containsAction(available, .chi));
    try std.testing.expect(containsAction(available, .pass));
}

test "forPlayer excludes chi for non-next player after discard" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const hand = [_]tile.Tile{ catalog[0], catalog[4], catalog[20] };
    try game_state.players[2].hand.appendSlice(allocator, &hand);

    const available = try forPlayer(allocator, &game_state, 2, catalog[8].id, 0);
    defer allocator.free(available);

    try std.testing.expect(!containsAction(available, .chi));
    try std.testing.expect(containsAction(available, .pass));
}
