const std = @import("std");
const state = @import("../game/state.zig");
const tile = @import("../game/tile.zig");
const protocol = @import("../ipc/protocol.zig");
const safety = @import("../rules/safety.zig");
const scoring = @import("../rules/scoring.zig");

pub const AiPersonality = struct {
    aggression: f32,
    meld_tendency: f32,
    defense: f32,
    score_sensitive: f32,
    wall_sensitive: f32,
};

pub const presets = struct {
    pub const conservative = AiPersonality{ .aggression = 0.1, .meld_tendency = 0.2, .defense = 0.8, .score_sensitive = 0.7, .wall_sensitive = 0.6 };
    pub const aggressive = AiPersonality{ .aggression = 0.9, .meld_tendency = 0.8, .defense = 0.1, .score_sensitive = 0.4, .wall_sensitive = 0.3 };
    pub const balanced = AiPersonality{ .aggression = 0.5, .meld_tendency = 0.5, .defense = 0.5, .score_sensitive = 0.5, .wall_sensitive = 0.5 };
};

pub fn decide(game_state: *const state.GameState, player_id: u8, personality: AiPersonality, available_actions: []const protocol.ActionType) protocol.PlayerActionMessage {
    if (containsAction(available_actions, .win) and shouldTakeWin(game_state, player_id, personality)) {
        return .{ .action = .win, .tile_id = null };
    }

    if (containsAction(available_actions, .kong) and personality.meld_tendency >= 0.7) {
        if (findClosedKongTile(game_state.players[player_id].hand.items)) |tile_id| {
            return .{ .action = .kong, .tile_id = tile_id };
        }
    }

    if (containsAction(available_actions, .pon) and personality.meld_tendency >= 0.65) {
        return .{ .action = .pon, .tile_id = null };
    }
    if (containsAction(available_actions, .chi) and personality.meld_tendency >= 0.55) {
        return .{ .action = .chi, .tile_id = null };
    }
    if (containsAction(available_actions, .pass) and !containsAction(available_actions, .discard)) {
        return .{ .action = .pass, .tile_id = null };
    }

    return .{ .action = .discard, .tile_id = chooseDiscardTile(game_state, player_id, personality) };
}

fn chooseDiscardTile(game_state: *const state.GameState, player_id: u8, personality: AiPersonality) u8 {
    const hand = game_state.players[player_id].hand.items;
    const catalog = tile.generateCatalog();
    var players: [state.player_count]safety.PublicPlayerState = undefined;
    for (game_state.players, 0..) |player, index| {
        players[index] = .{ .melds = player.melds.items, .discards = player.discards.items };
    }
    const public_state = safety.PublicState{ .tile_catalog = &catalog, .players = &players };
    const wall_pressure = if (game_state.wall.items.len <= 8) personality.wall_sensitive else 0;
    const score_pressure = scorePressure(game_state.scores, player_id, personality.score_sensitive);

    var best_tile_id = hand[0].id;
    var best_score: f32 = -9999;

    for (hand) |entry| {
        const danger = @as(f32, @floatFromInt(@intFromEnum(safety.analyzeTile(entry.id, public_state))));
        const isolation = tileIsolation(hand, entry);
        const score = isolation + (personality.aggression * 1.2) + wall_pressure + score_pressure - (danger * personality.defense * 1.5);
        if (score > best_score) {
            best_score = score;
            best_tile_id = entry.id;
        }
    }

    return best_tile_id;
}

fn tileIsolation(hand: []const tile.Tile, candidate: tile.Tile) f32 {
    var neighbors: f32 = 0;
    for (hand) |entry| {
        if (entry.id == candidate.id) continue;
        if (entry.suit == candidate.suit and entry.rank == candidate.rank) neighbors += 1.2;
        const candidate_rank = suitedRank(candidate.rank) orelse continue;
        const entry_rank = suitedRank(entry.rank) orelse continue;
        if (entry.suit == candidate.suit and @abs(@as(i32, @intCast(candidate_rank)) - @as(i32, @intCast(entry_rank))) <= 1) {
            neighbors += 0.8;
        }
    }
    return 3.0 - neighbors;
}

fn scorePressure(scores: [state.player_count]i32, player_id: u8, sensitivity: f32) f32 {
    var best_other = scores[0];
    for (scores, 0..) |score, index| {
        if (index == player_id) continue;
        if (score > best_other) best_other = score;
    }
    const diff = best_other - scores[player_id];
    return @as(f32, @floatFromInt(diff)) / 20.0 * sensitivity;
}

fn shouldTakeWin(game_state: *const state.GameState, player_id: u8, personality: AiPersonality) bool {
    const behind = scorePressure(game_state.scores, player_id, personality.score_sensitive) > 0.5;
    const wall_low = game_state.wall.items.len <= 8 and personality.wall_sensitive >= 0.5;
    return behind or wall_low or personality.aggression < 0.8;
}

fn findClosedKongTile(hand: []const tile.Tile) ?u8 {
    for (hand, 0..) |candidate, idx| {
        var count: usize = 1;
        for (hand[idx + 1 ..]) |entry| {
            if (entry.suit == candidate.suit and entry.rank == candidate.rank) count += 1;
        }
        if (count >= 4) return candidate.id;
    }
    return null;
}

fn suitedRank(rank: tile.Rank) ?usize {
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

fn containsAction(actions_list: []const protocol.ActionType, action: protocol.ActionType) bool {
    for (actions_list) |candidate| if (candidate == action) return true;
    return false;
}

test "decide wins immediately with conservative preset" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const hand = [_]tile.Tile{
        catalog[0], catalog[1], catalog[2], catalog[4], catalog[8], catalog[12], catalog[16], catalog[17], catalog[18], catalog[36], catalog[40], catalog[44], catalog[72], catalog[73], catalog[74], catalog[108], catalog[109],
    };
    try game_state.players[1].hand.appendSlice(allocator, &hand);

    const action = decide(&game_state, 1, presets.conservative, &.{ .win, .discard });
    try std.testing.expectEqual(protocol.ActionType.win, action.action);
}

test "decide chooses a discard when no claim is available" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[2].hand.appendSlice(allocator, catalog[0..17]);
    const action = decide(&game_state, 2, presets.balanced, &.{.discard});
    try std.testing.expectEqual(protocol.ActionType.discard, action.action);
    try std.testing.expect(action.tile_id != null);
}
