const std = @import("std");
const deck = @import("deck.zig");
const state = @import("state.zig");
const tile = @import("tile.zig");
const seat_wind = @import("seat_wind.zig");
const action_availability = @import("action_availability.zig");
const transitions = @import("transitions.zig");
const claims = @import("claims.zig");
const protocol = @import("../ipc/protocol.zig");
const scoring = @import("../rules/scoring.zig");

pub const RoundResult = struct {
    winner_id: ?u8,
    scores: [4]i32,
};

pub fn initGameState(allocator: std.mem.Allocator, shuffled_tiles: []const tile.Tile, dealer_player_id: u8) !state.GameState {
    var deal = try deck.dealInitialHands(allocator, shuffled_tiles);
    defer deal.deinit();

    var game_state = state.GameState.init(allocator);
    errdefer game_state.deinit();

    game_state.dealer_player_id = dealer_player_id;
    game_state.current_player_id = dealer_player_id;
    game_state.seat_winds = seat_wind.assignSeatWinds(dealer_player_id);

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
    return action_availability.forPlayer(allocator, game_state, player_id, discarded_tile_id, discarder_player_id);
}

/// driver: anytype — 需提供三個方法：
///   fn turnDecide(*T, *const state.GameState, TurnChangedMessage) !PlayerActionMessage
///   fn claimDecide(*T, *const state.GameState, u8, TurnChangedMessage) !PlayerActionMessage
///   fn sink(*T, protocol.Message) !void
pub fn playRound(allocator: std.mem.Allocator, game_state: *state.GameState, driver: anytype) !RoundResult {
    var pending_draw = true;

    while (true) {
        if (pending_draw) {
            game_state.clearEvents();
            const drawn_tile = try transitions.drawForCurrentPlayer(game_state);
            if (drawn_tile == null) {
                const game_over: protocol.Message = .{ .game_over = .{
                    .winner_id = null,
                    .scores = game_state.scores,
                    .scoring_detail = null,
                } };
                try driver.sink(game_over);
                return .{ .winner_id = null, .scores = game_state.scores };
            }
            try emitStateUpdate(allocator, game_state, driver);
        }

        const turn_changed = try buildTurnChangedMessage(allocator, game_state, game_state.current_player_id, null, null);
        defer allocator.free(turn_changed.available_actions);
        try driver.sink(.{ .turn_changed = turn_changed });

        const turn_action = try driver.turnDecide(game_state, turn_changed);
        if (!action_availability.containsAction(turn_changed.available_actions, turn_action.action)) {
            return error.IllegalAction;
        }

        switch (turn_action.action) {
            .win => return finishWin(game_state, game_state.current_player_id, null, true, driver),
            .kong => {
                try transitions.applyClosedKong(game_state, turn_action.tile_id orelse return error.InvalidTile);
                try emitStateUpdate(allocator, game_state, driver);
                pending_draw = true;
                continue;
            },
            .discard => {
                const discarded_tile_id = turn_action.tile_id orelse return error.InvalidTile;
                const discarder = game_state.current_player_id;

                try transitions.discardTile(game_state, discarder, discarded_tile_id);
                try emitStateUpdate(allocator, game_state, driver);

                const claim_outcome = try resolveClaims(allocator, game_state, discarded_tile_id, driver);
                game_state.turn_count += 1;

                switch (claim_outcome) {
                    .none => {
                        game_state.current_player_id = transitions.nextPlayer(discarder);
                        pending_draw = true;
                    },
                    .claim_turn => |claim_turn| {
                        game_state.current_player_id = claim_turn.player_id;
                        try emitStateUpdate(allocator, game_state, driver);
                        pending_draw = claim_turn.pending_draw;
                    },
                    .win => |winner_id| return finishWin(game_state, winner_id, discarded_tile_id, false, driver),
                }
            },
            else => return error.IllegalAction,
        }
    }
}

pub fn emitStateUpdate(allocator: std.mem.Allocator, game_state: *const state.GameState, driver: anytype) !void {
    const json = try game_state.toJson(allocator);
    defer allocator.free(json);
    try driver.sink(.{ .state_update = .{ .state_json = json } });
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

fn resolveClaims(allocator: std.mem.Allocator, game_state: *state.GameState, discarded_tile_id: u8, driver: anytype) !claims.Outcome {
    var choices: [state.player_count - 1]?claims.ClaimChoice = .{ null, null, null };
    var choice_count: usize = 0;
    const discarder = game_state.current_player_id;

    for (1..state.player_count) |offset| {
        const player_id: u8 = @intCast((discarder + offset) % state.player_count);
        const turn_changed = try buildTurnChangedMessage(allocator, game_state, player_id, discarded_tile_id, discarder);
        defer allocator.free(turn_changed.available_actions);
        if (turn_changed.available_actions.len == 1 and turn_changed.available_actions[0] == .pass) {
            continue;
        }

        try driver.sink(.{ .turn_changed = turn_changed });
        const response = try driver.claimDecide(game_state, discarded_tile_id, turn_changed);
        if (!action_availability.containsAction(turn_changed.available_actions, response.action)) {
            return error.IllegalAction;
        }

        choices[choice_count] = .{ .player_id = player_id, .action = claims.mapProtocolAction(response.action) };
        choice_count += 1;
    }

    return claims.resolve(game_state, discarded_tile_id, choices[0..choice_count]);
}

fn finishWin(game_state: *state.GameState, winner_id: u8, discarded_tile_id: ?u8, self_draw: bool, driver: anytype) !RoundResult {
    const win_ctx = buildWinContext(game_state, winner_id, discarded_tile_id, self_draw);
    const score_result = scoring.calculateFan(&win_ctx);
    applyWinScores(game_state, winner_id, score_result.total_fan);
    try driver.sink(.{ .game_over = .{
        .winner_id = winner_id,
        .scores = game_state.scores,
        .scoring_detail = score_result,
    } });
    return .{ .winner_id = winner_id, .scores = game_state.scores };
}

fn applyWinScores(game_state: *state.GameState, winner_id: u8, total_fan: u8) void {
    const fan: i32 = @as(i32, total_fan) + 1;
    for (&game_state.scores, 0..) |*score, player_id| {
        if (player_id == winner_id) {
            score.* += fan * 3;
        } else {
            score.* -= fan;
        }
    }
}

fn buildWinContext(game_state: *const state.GameState, winner_id: u8, discarded_tile_id: ?u8, self_draw: bool) scoring.WinContext {
    const winner = &game_state.players[winner_id];
    const catalog = tile.generateCatalog();

    var is_concealed = true;
    for (winner.melds.items) |meld| {
        if (meld.kind == .chi or meld.kind == .pon or meld.kind == .open_kong) {
            is_concealed = false;
            break;
        }
    }

    const winning_tile_val = if (discarded_tile_id) |id|
        catalog[id]
    else
        game_state.players[winner_id].hand.items[game_state.players[winner_id].hand.items.len - 1];

    const seat_offset: u32 = (winner_id + 4 - game_state.dealer_player_id) % 4;
    const is_first_draw = (game_state.turn_count == seat_offset);
    const is_first_round_no_claims = (game_state.turn_count < 4) and !game_state.any_claims_made;

    return .{
        .hand = winner.hand.items,
        .melds = winner.melds.items,
        .bonus_tiles = winner.bonus_tiles.items,
        .winning_tile = winning_tile_val,
        .seat_wind = game_state.seat_winds[winner_id],
        .round_wind = game_state.round_wind,
        .self_draw = self_draw,
        .is_concealed = is_concealed,
        .is_dealer = (winner_id == game_state.dealer_player_id),
        .is_first_draw = is_first_draw,
        .is_first_round_no_claims = is_first_round_no_claims,
    };
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

    const Driver = struct {
        count: usize = 0,

        fn turnDecide(_: *@This(), gs: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .discard, .tile_id = gs.players[gs.current_player_id].hand.items[0].id };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(self: *@This(), _: protocol.Message) !void {
            self.count += 1;
        }
    };

    var driver = Driver{};
    const result = try playRound(allocator, &game_state, &driver);
    try std.testing.expectEqual(@as(?u8, null), result.winner_id);
    try std.testing.expect(driver.count > 0);
}

test "playRound keeps claimer turn after pon" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[0].hand.appendSlice(allocator, catalog[0..16]);
    try game_state.players[1].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[1], catalog[2], catalog[40] });
    try game_state.players[2].hand.appendSlice(allocator, catalog[32..48]);
    try game_state.players[3].hand.appendSlice(allocator, catalog[48..64]);
    try game_state.wall.append(allocator, catalog[80]);
    game_state.current_player_id = 0;

    const Driver = struct {
        saw_claim_turn: bool = false,

        fn turnDecide(_: *@This(), gs: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (gs.current_player_id == 0) {
                return .{ .action = .discard, .tile_id = catalog[0].id };
            }
            return .{ .action = .discard, .tile_id = gs.players[gs.current_player_id].hand.items[0].id };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (turn_changed.player_id == 1) {
                return .{ .action = .pon, .tile_id = null };
            }
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(self: *@This(), message: protocol.Message) !void {
            switch (message) {
                .turn_changed => |payload| {
                    if (payload.player_id == 1 and action_availability.containsAction(payload.available_actions, .discard)) {
                        self.saw_claim_turn = true;
                    }
                },
                else => {},
            }
        }
    };

    var driver = Driver{};
    _ = try playRound(allocator, &game_state, &driver);
    try std.testing.expect(driver.saw_claim_turn);
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

    const Driver = struct {
        game_over_seen: bool = false,

        fn turnDecide(_: *@This(), gs: *const state.GameState, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return @import("../ai/agent.zig").decide(gs, turn_changed.player_id, @import("../ai/agent.zig").presets.conservative, turn_changed.available_actions);
        }

        fn claimDecide(_: *@This(), gs: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return @import("../ai/agent.zig").decide(gs, turn_changed.player_id, @import("../ai/agent.zig").presets.conservative, turn_changed.available_actions);
        }

        fn sink(self: *@This(), message: protocol.Message) !void {
            if (message == .game_over) self.game_over_seen = true;
        }
    };

    var driver = Driver{};
    const result = try playRound(allocator, &game_state, &driver);
    try std.testing.expectEqual(@as(?u8, 0), result.winner_id);
    try std.testing.expect(driver.game_over_seen);
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

        fn sink(self: *@This(), message: protocol.Message) !void {
            switch (message) {
                .state_update => |payload| self.json = payload.state_json,
                else => {},
            }
        }
    };

    var sink = Sink{};
    try emitStateUpdate(allocator, &game_state, &sink);
    const json = sink.json orelse return error.TestUnexpectedResult;
    try std.testing.expect(std.mem.indexOf(u8, json, "\"melds\":[{\"type\":\"chi\",\"tiles\":[3,4,5],\"source_index\":2}]") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"events\":[{\"type\":\"bonus_tile\",\"player_id\":2,\"tile_id\":136}]") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"scores\":[8,-2,-2,-4]") != null);
}
