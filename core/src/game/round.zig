const std = @import("std");
const deck = @import("deck.zig");
const state = @import("state.zig");
const tile = @import("tile.zig");
const protocol = @import("../ipc/protocol.zig");
const actions = @import("../rules/actions.zig");
const scoring = @import("../rules/scoring.zig");

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
};

pub const RoundResult = struct {
    winner_id: ?u8,
    scores: [4]i32,
};

pub fn initGameState(allocator: std.mem.Allocator, shuffled_tiles: []const tile.Tile) !state.GameState {
    var deal = try deck.dealInitialHands(allocator, shuffled_tiles);
    defer deal.deinit();

    var game_state = state.GameState.init(allocator);
    errdefer game_state.deinit();

    for (0..state.player_count) |player_id| {
        try game_state.players[player_id].hand.appendSlice(allocator, deal.hands[player_id].items);
        try game_state.players[player_id].bonus_tiles.appendSlice(allocator, deal.bonus_tiles[player_id].items);
    }
    try game_state.wall.appendSlice(allocator, deal.wall.items);
    for (deal.events.items) |event| {
        try game_state.events.append(allocator, .{
            .kind = .bonus_tile,
            .player_id = event.player_id,
            .tile_id = event.tile_id,
        });
    }
    return game_state;
}

pub fn buildTurnChangedMessage(allocator: std.mem.Allocator, game_state: *const state.GameState, player_id: u8, discarded_tile_id: ?u8, discarder_player_id: ?u8) !protocol.TurnChangedMessage {
    return .{
        .player_id = player_id,
        .available_actions = try availableActionsForPlayer(allocator, game_state, player_id, discarded_tile_id, discarder_player_id),
    };
}

pub fn availableActionsForPlayer(allocator: std.mem.Allocator, game_state: *const state.GameState, player_id: u8, discarded_tile_id: ?u8, discarder_player_id: ?u8) ![]protocol.ActionType {
    var list: std.ArrayList(protocol.ActionType) = .empty;
    errdefer list.deinit(allocator);

    if (discarded_tile_id) |discard_id| {
        const discarded_tile = tileById(game_state, discard_id) orelse return error.InvalidTile;
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

pub fn playRound(allocator: std.mem.Allocator, game_state: *state.GameState, turn_decider: anytype, claim_decider: anytype, sink: anytype) !RoundResult {
    var pending_draw = true;

    while (true) {
        if (pending_draw) {
            game_state.clearEvents();
            const drawn_tile = try drawTileForCurrentPlayer(game_state);
            if (drawn_tile == null) {
                const game_over: protocol.Message = .{ .game_over = .{
                    .winner_id = null,
                    .scores = game_state.scores,
                } };
                try sink(game_over);
                return .{ .winner_id = null, .scores = game_state.scores };
            }
            try emitStateUpdate(allocator, game_state, sink);
        }

        var turn_changed = try buildTurnChangedMessage(allocator, game_state, game_state.current_player_id, null, null);
        defer allocator.free(turn_changed.available_actions);
        try sink(.{ .turn_changed = turn_changed });

        const turn_action = try turn_decider(game_state, turn_changed);
        if (!containsAction(turn_changed.available_actions, turn_action.action)) {
            return error.IllegalAction;
        }

        switch (turn_action.action) {
            .win => {
                applyWin(game_state, game_state.current_player_id, true);
                try sink(.{ .game_over = .{ .winner_id = game_state.current_player_id, .scores = game_state.scores } });
                return .{ .winner_id = game_state.current_player_id, .scores = game_state.scores };
            },
            .kong => {
                try applyClosedKong(game_state, turn_action.tile_id orelse return error.InvalidTile);
                try emitStateUpdate(allocator, game_state, sink);
                pending_draw = true;
                continue;
            },
            .discard => {
                const discarded_tile_id = turn_action.tile_id orelse return error.InvalidTile;
                try discardTile(game_state, game_state.current_player_id, discarded_tile_id);
                try emitStateUpdate(allocator, game_state, sink);

                if (try resolveClaims(allocator, game_state, discarded_tile_id, claim_decider, sink)) |winner_id| {
                    return .{ .winner_id = winner_id, .scores = game_state.scores };
                }

                game_state.current_player_id = nextPlayer(game_state.current_player_id);
                pending_draw = true;
            },
            else => return error.IllegalAction,
        }
    }
}

pub fn emitStateUpdate(allocator: std.mem.Allocator, game_state: *const state.GameState, sink: anytype) !void {
    const json = try game_state.toJson(allocator);
    defer allocator.free(json);
    try sink(.{ .state_update = .{ .state_json = json } });
}

pub fn buildInitMessage(allocator: std.mem.Allocator, catalog: []const tile.Tile, game_state: *const state.GameState, pass_timeout_seconds: u16) !protocol.Message {
    const catalog_copy = try allocator.dupe(tile.Tile, catalog);
    errdefer allocator.free(catalog_copy);
    const state_json = try game_state.toJson(allocator);
    errdefer allocator.free(state_json);
    return .{ .init = .{
        .tile_catalog = catalog_copy,
        .state_json = state_json,
        .pass_timeout_seconds = pass_timeout_seconds,
    } };
}

fn resolveClaims(allocator: std.mem.Allocator, game_state: *state.GameState, discarded_tile_id: u8, claim_decider: anytype, sink: anytype) !?u8 {
    var choices: [state.player_count - 1]?ClaimChoice = .{ null, null, null };
    var choice_count: usize = 0;
    const discarder = game_state.current_player_id;

    for (1..state.player_count) |offset| {
        const player_id: u8 = @intCast((discarder + offset) % state.player_count);
        var turn_changed = try buildTurnChangedMessage(allocator, game_state, player_id, discarded_tile_id, discarder);
        defer allocator.free(turn_changed.available_actions);
        if (turn_changed.available_actions.len == 1 and turn_changed.available_actions[0] == .pass) {
            continue;
        }

        try sink(.{ .turn_changed = turn_changed });
        const response = try claim_decider(game_state, discarded_tile_id, turn_changed);
        if (!containsAction(turn_changed.available_actions, response.action)) {
            return error.IllegalAction;
        }
        if (response.action == .pass) {
            continue;
        }

        choices[choice_count] = .{ .player_id = player_id, .action = mapClaimAction(response.action) };
        choice_count += 1;
    }

    const selected = prioritizeClaimChoices(choices[0..choice_count]) orelse return null;
    switch (selected.action) {
        .win => {
            applyWin(game_state, selected.player_id, false);
            try sink(.{ .game_over = .{ .winner_id = selected.player_id, .scores = game_state.scores } });
            return selected.player_id;
        },
        .chi => try applyChiClaim(game_state, selected.player_id, discarded_tile_id),
        .pon => try applyPonClaim(game_state, selected.player_id, discarded_tile_id),
        .kong => {
            try applyOpenKongClaim(game_state, selected.player_id, discarded_tile_id);
            _ = try drawTileForPlayer(game_state, selected.player_id);
        },
        .pass => {},
    }

    game_state.current_player_id = selected.player_id;
    try emitStateUpdate(allocator, game_state, sink);
    return null;
}

fn prioritizeClaimChoices(choices: []const ?ClaimChoice) ?ClaimChoice {
    var best: ?ClaimChoice = null;
    for (choices) |choice_opt| {
        const choice = choice_opt orelse continue;
        if (best == null or claimPriority(choice.action) > claimPriority(best.?.action)) {
            best = choice;
        }
    }
    return best;
}

fn claimPriority(action: ClaimAction) u8 {
    return switch (action) {
        .pass => 0,
        .chi => 1,
        .pon => 2,
        .kong => 3,
        .win => 4,
    };
}

fn mapClaimAction(action: protocol.ActionType) ClaimAction {
    return switch (action) {
        .chi => .chi,
        .pon => .pon,
        .kong => .kong,
        .win => .win,
        .pass => .pass,
        else => .pass,
    };
}

fn drawTileForCurrentPlayer(game_state: *state.GameState) !?tile.Tile {
    return drawTileForPlayer(game_state, game_state.current_player_id);
}

fn drawTileForPlayer(game_state: *state.GameState, player_id: u8) !?tile.Tile {
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

fn discardTile(game_state: *state.GameState, player_id: u8, tile_id: u8) !void {
    const removed_tile = removeTileById(&game_state.players[player_id].hand, tile_id) orelse return error.InvalidTile;
    try game_state.players[player_id].discards.append(game_state.allocator, removed_tile.id);
    game_state.drawn_tile_id = null;
}

fn applyClosedKong(game_state: *state.GameState, tile_id: u8) !void {
    const target_tile = tileById(game_state, tile_id) orelse return error.InvalidTile;
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

fn applyChiClaim(game_state: *state.GameState, player_id: u8, discarded_tile_id: u8) !void {
    const discarded_tile = tileById(game_state, discarded_tile_id) orelse return error.InvalidTile;
    const ranks = chiSequence(discarded_tile, game_state.players[player_id].hand.items) orelse return error.InvalidTile;

    var meld_tiles = [_]u8{ 0, 0, 0 };
    meld_tiles[2] = discarded_tile_id;
    meld_tiles[0] = try removeTileByRank(game_state, player_id, discarded_tile.suit, ranks[0]);
    meld_tiles[1] = try removeTileByRank(game_state, player_id, discarded_tile.suit, ranks[1]);
    try game_state.players[player_id].melds.append(game_state.allocator, state.Meld.init(.chi, &meld_tiles, 2));
}

fn applyPonClaim(game_state: *state.GameState, player_id: u8, discarded_tile_id: u8) !void {
    const discarded_tile = tileById(game_state, discarded_tile_id) orelse return error.InvalidTile;
    var meld_tiles = [_]u8{ discarded_tile_id, 0, 0 };
    meld_tiles[1] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    meld_tiles[2] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    try game_state.players[player_id].melds.append(game_state.allocator, state.Meld.init(.pon, &meld_tiles, 0));
}

fn applyOpenKongClaim(game_state: *state.GameState, player_id: u8, discarded_tile_id: u8) !void {
    const discarded_tile = tileById(game_state, discarded_tile_id) orelse return error.InvalidTile;
    var meld_tiles = [_]u8{ discarded_tile_id, 0, 0, 0 };
    meld_tiles[1] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    meld_tiles[2] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    meld_tiles[3] = try removeTileByRank(game_state, player_id, discarded_tile.suit, discarded_tile.rank);
    try game_state.players[player_id].melds.append(game_state.allocator, state.Meld.init(.open_kong, &meld_tiles, 0));
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

fn tileById(game_state: *const state.GameState, tile_id: u8) ?tile.Tile {
    _ = game_state;
    const catalog = tile.generateCatalog();
    if (tile_id >= catalog.len) return null;
    return catalog[tile_id];
}

fn nextPlayer(player_id: u8) u8 {
    return @intCast((player_id + 1) % state.player_count);
}

fn containsAction(actions_list: []const protocol.ActionType, action: protocol.ActionType) bool {
    for (actions_list) |candidate| if (candidate == action) return true;
    return false;
}

fn applyWin(game_state: *state.GameState, winner_id: u8, self_draw: bool) void {
    const fan = scoring.calculateBasicFan(.{ .self_draw = self_draw }).total_fan + 1;
    for (&game_state.scores, 0..) |*score, player_id| {
        if (player_id == winner_id) {
            score.* += @as(i32, fan * 3);
        } else {
            score.* -= @as(i32, fan);
        }
    }
}

fn sameKind(a: tile.Tile, b: tile.Tile) bool {
    return a.suit == b.suit and a.rank == b.rank;
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

test "availableActionsForPlayer includes discard and win on active turn" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const hand = [_]tile.Tile{
        catalog[0], catalog[1], catalog[2], catalog[4], catalog[8], catalog[12], catalog[16], catalog[17], catalog[18], catalog[36], catalog[40], catalog[44], catalog[72], catalog[73], catalog[74], catalog[108], catalog[109],
    };
    try game_state.players[0].hand.appendSlice(allocator, &hand);

    const available = try availableActionsForPlayer(allocator, &game_state, 0, null, null);
    defer allocator.free(available);

    try std.testing.expect(containsAction(available, .discard));
    try std.testing.expect(containsAction(available, .win));
}

test "playRound ends in draw when wall runs out" {
    const allocator = std.testing.allocator;
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const catalog = tile.generateCatalog();
    for (0..state.player_count) |player_id| {
        try game_state.players[player_id].hand.appendSlice(allocator, catalog[player_id * 16 .. player_id * 16 + 16]);
    }
    try game_state.wall.append(allocator, catalog[100]);

    const Sink = struct {
        count: usize = 0,
        fn handle(self: *@This(), message: protocol.Message) !void {
            _ = message;
            self.count += 1;
        }
    };
    const Turn = struct {
        fn decide(gs: *state.GameState, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            _ = turn_changed;
            return .{ .action = .discard, .tile_id = gs.players[gs.current_player_id].hand.items[0].id };
        }
    };
    const Claim = struct {
        fn decide(gs: *state.GameState, discarded_tile_id: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            _ = gs;
            _ = discarded_tile_id;
            _ = turn_changed;
            return .{ .action = .pass, .tile_id = null };
        }
    };

    var sink = Sink{};
    const result = try playRound(allocator, &game_state, Turn.decide, Claim.decide, Sink.handle.bind(&sink));
    try std.testing.expectEqual(@as(?u8, null), result.winner_id);
    try std.testing.expect(sink.count > 0);
}

test "playRound integrates AI decisions and can end in a win" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    const player_zero_hand = [_]tile.Tile{
        catalog[0],   catalog[1],  catalog[2],
        catalog[4],   catalog[8],  catalog[12],
        catalog[16],  catalog[17], catalog[18],
        catalog[36],  catalog[40], catalog[44],
        catalog[72],  catalog[73], catalog[74],
        catalog[108],
    };
    try game_state.players[0].hand.appendSlice(allocator, &player_zero_hand);
    for (1..state.player_count) |player_id| {
        try game_state.players[player_id].hand.appendSlice(allocator, catalog[player_id * 16 .. player_id * 16 + 16]);
    }
    try game_state.wall.append(allocator, catalog[109]);

    const Sink = struct {
        game_over_seen: bool = false,
        fn handle(self: *@This(), message: protocol.Message) !void {
            if (message == .game_over) self.game_over_seen = true;
        }
    };
    const Turn = struct {
        fn decide(gs: *state.GameState, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return @import("../ai/agent.zig").decide(gs, turn_changed.player_id, @import("../ai/agent.zig").presets.conservative, turn_changed.available_actions);
        }
    };
    const Claim = struct {
        fn decide(gs: *state.GameState, discarded_tile_id: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            _ = discarded_tile_id;
            return @import("../ai/agent.zig").decide(gs, turn_changed.player_id, @import("../ai/agent.zig").presets.conservative, turn_changed.available_actions);
        }
    };

    var sink = Sink{};
    const result = try playRound(allocator, &game_state, Turn.decide, Claim.decide, Sink.handle.bind(&sink));
    try std.testing.expectEqual(@as(?u8, 0), result.winner_id);
    try std.testing.expect(sink.game_over_seen);
}

test "emitStateUpdate serializes melds and bonus events together" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[0].hand.append(allocator, catalog[0]);
    try game_state.players[1].melds.append(allocator, state.Meld.init(.chi, &[_]u8{ 3, 4, 5 }, 2));
    try game_state.events.append(allocator, .{ .kind = .bonus_tile, .player_id = 2, .tile_id = 136 });
    game_state.scores = .{ 8, -2, -2, -4 };

    const Sink = struct {
        json: ?[]const u8 = null,
        fn handle(self: *@This(), message: protocol.Message) !void {
            switch (message) {
                .state_update => |payload| self.json = payload.state_json,
                else => {},
            }
        }
    };

    var sink = Sink{};
    try emitStateUpdate(allocator, &game_state, Sink.handle.bind(&sink));
    const json = sink.json orelse return error.TestUnexpectedResult;
    try std.testing.expect(std.mem.indexOf(u8, json, "\"melds\":[{\"type\":\"chi\",\"tiles\":[3,4,5],\"source_index\":2}]") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"events\":[{\"type\":\"bonus_tile\",\"player_id\":2,\"tile_id\":136}]") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"scores\":[8,-2,-2,-4]") != null);
}
