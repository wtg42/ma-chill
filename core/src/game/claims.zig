const std = @import("std");
const state = @import("state.zig");
const protocol = @import("../ipc/protocol.zig");
const transitions = @import("transitions.zig");

pub const ClaimAction = enum {
    pass,
    chi,
    pon,
    kong,
    win,
};

pub const ClaimChoice = struct {
    player_id: u8,
    action: ClaimAction,
    claim_tile_ids: ?[2]u8 = null,
};

pub const ClaimTurn = struct {
    player_id: u8,
    pending_draw: bool,
};

pub const Outcome = union(enum) {
    none,
    claim_turn: ClaimTurn,
    win: u8,
};

pub fn mapProtocolAction(action: protocol.ActionType) ClaimAction {
    return switch (action) {
        .chi => .chi,
        .pon => .pon,
        .kong => .kong,
        .win => .win,
        .pass => .pass,
        else => .pass,
    };
}

pub fn resolve(game_state: *state.GameState, discarded_tile_id: u8, choices: []const ?ClaimChoice) !Outcome {
    const selected = prioritizeChoices(choices) orelse return .none;

    return switch (selected.action) {
        .pass => .none,
        .win => .{ .win = selected.player_id },
        .chi => blk: {
            try transitions.applyChiClaim(game_state, selected.player_id, discarded_tile_id, selected.claim_tile_ids);
            break :blk .{ .claim_turn = .{ .player_id = selected.player_id, .pending_draw = false } };
        },
        .pon => blk: {
            try transitions.applyPonClaim(game_state, selected.player_id, discarded_tile_id);
            break :blk .{ .claim_turn = .{ .player_id = selected.player_id, .pending_draw = false } };
        },
        .kong => blk: {
            try transitions.applyOpenKongClaim(game_state, selected.player_id, discarded_tile_id);
            _ = try transitions.drawForPlayer(game_state, selected.player_id);
            break :blk .{ .claim_turn = .{ .player_id = selected.player_id, .pending_draw = false } };
        },
    };
}

/// 將 player_action 附帶的 claim_tile_ids 正規化成固定長度的吃牌選項。
pub fn parseClaimTileIds(message: protocol.PlayerActionMessage) !?[2]u8 {
    const claim_tile_ids = message.claim_tile_ids orelse return null;
    if (claim_tile_ids.len != 2) return error.InvalidTile;
    return .{ claim_tile_ids[0], claim_tile_ids[1] };
}

pub fn prioritizeChoices(choices: []const ?ClaimChoice) ?ClaimChoice {
    var best: ?ClaimChoice = null;
    for (choices) |choice_opt| {
        const choice = choice_opt orelse continue;
        if (best == null or priority(choice.action) > priority(best.?.action)) {
            best = choice;
        }
    }
    return best;
}

fn priority(action: ClaimAction) u8 {
    return switch (action) {
        .pass => 0,
        .chi => 1,
        .pon => 2,
        .kong => 3,
        .win => 4,
    };
}

test "resolve prefers win over pon" {
    const allocator = std.testing.allocator;
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const outcome = try resolve(&game_state, 0, &.{
        ClaimChoice{ .player_id = 1, .action = .pon },
        ClaimChoice{ .player_id = 2, .action = .win },
    });

    try std.testing.expectEqual(@as(Outcome, .{ .win = 2 }), outcome);
}

test "resolve returns none when all players pass" {
    const allocator = std.testing.allocator;
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const outcome = try resolve(&game_state, 0, &.{
        ClaimChoice{ .player_id = 1, .action = .pass },
        ClaimChoice{ .player_id = 2, .action = .pass },
    });

    try std.testing.expectEqual(@as(Outcome, .none), outcome);
}

test "resolve open kong keeps claimer turn after supplement draw" {
    const allocator = std.testing.allocator;
    const tile = @import("tile.zig");
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[1].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[1], catalog[2], catalog[3] });
    try game_state.wall.append(allocator, catalog[20]);

    const outcome = try resolve(&game_state, catalog[0].id, &.{ClaimChoice{ .player_id = 1, .action = .kong }});

    try std.testing.expectEqual(@as(Outcome, .{ .claim_turn = .{ .player_id = 1, .pending_draw = false } }), outcome);
    try std.testing.expectEqual(@as(u8, 1), game_state.current_player_id);
    try std.testing.expectEqual(@as(usize, 1), game_state.players[1].melds.items.len);
    try std.testing.expectEqual(@as(usize, 1), game_state.players[1].hand.items.len);
}

test "parseClaimTileIds accepts exactly two ids" {
    const claim_tile_ids = [_]u8{ 3, 4 };
    const parsed = try parseClaimTileIds(.{ .action = .chi, .tile_id = null, .claim_tile_ids = &claim_tile_ids });
    try std.testing.expectEqualSlices(u8, &claim_tile_ids, &parsed.?);
}
