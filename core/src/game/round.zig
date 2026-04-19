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
const pacing = @import("../ai/pacing.zig");

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
    return buildTurnChangedMessageForPriority(allocator, game_state, player_id, discarded_tile_id, discarder_player_id, .none);
}

/// 依指定優先層級建立 prompt，讓自己回合與棄牌反應窗都能共用同一套 message builder。
pub fn buildTurnChangedMessageForPriority(allocator: std.mem.Allocator, game_state: *const state.GameState, player_id: u8, discarded_tile_id: ?u8, discarder_player_id: ?u8, priority_group: protocol.PriorityGroup) !protocol.TurnChangedMessage {
    const phase_kind = if (discarded_tile_id == null) protocol.PhaseKind.self_turn else protocol.PhaseKind.discard_reaction;
    const all_actions = try availableActionsForPlayer(allocator, game_state, player_id, discarded_tile_id, discarder_player_id);
    errdefer allocator.free(all_actions);
    const available_actions = if (priority_group == .none)
        all_actions
    else
        try action_availability.filterActionsForPriority(allocator, all_actions, priority_group);
    if (priority_group != .none) allocator.free(all_actions);
    const chi_options = if (discarded_tile_id != null and (priority_group == .none or priority_group == .chi) and action_availability.containsAction(available_actions, .chi))
        try action_availability.chiOptionsForPlayer(allocator, game_state, player_id, discarded_tile_id, discarder_player_id)
    else
        &.{};
    return .{
        .player_id = player_id,
        .phase_kind = phase_kind,
        .available_actions = available_actions,
        .discarded_tile_id = discarded_tile_id,
        .discarder_player_id = discarder_player_id,
        .priority_group = if (discarded_tile_id == null) .none else priority_group,
        .chi_options = chi_options,
    };
}

pub fn availableActionsForPlayer(allocator: std.mem.Allocator, game_state: *const state.GameState, player_id: u8, discarded_tile_id: ?u8, discarder_player_id: ?u8) ![]protocol.ActionType {
    return action_availability.forPlayer(allocator, game_state, player_id, discarded_tile_id, discarder_player_id);
}

/// driver: anytype — 需提供四個方法：
///   fn turnDecide(*T, *const state.GameState, TurnChangedMessage) !PlayerActionMessage
///   fn claimDecide(*T, *const state.GameState, u8, TurnChangedMessage) !PlayerActionMessage
///   fn sink(*T, protocol.Message) !void
///   fn pace(*T, u8, pacing.Phase) !void（可選）
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
            try pacePlayer(driver, game_state.current_player_id, .after_draw_revealed);
        }

        const turn_changed = try buildTurnChangedMessage(allocator, game_state, game_state.current_player_id, null, null);
        defer freeTurnChangedMessage(allocator, turn_changed);
        try driver.sink(.{ .turn_changed = turn_changed });
        try pacePlayer(driver, turn_changed.player_id, .after_turn_prompt);

        const turn_action = try driver.turnDecide(game_state, turn_changed);
        if (!action_availability.containsAction(turn_changed.available_actions, turn_action.action)) {
            return error.IllegalAction;
        }

        switch (turn_action.action) {
            .win => return finishWin(game_state, game_state.current_player_id, null, true, driver),
            .kong => {
                try transitions.applyClosedKong(game_state, turn_action.tile_id orelse return error.InvalidTile);
                try emitStateUpdate(allocator, game_state, driver);
                try pacePlayer(driver, game_state.current_player_id, .after_action_resolved);
                pending_draw = true;
                continue;
            },
            .discard => {
                const discarded_tile_id = turn_action.tile_id orelse return error.InvalidTile;
                const discarder = game_state.current_player_id;

                try transitions.discardTile(game_state, discarder, discarded_tile_id);
                try emitStateUpdate(allocator, game_state, driver);
                try pacePlayer(driver, discarder, .after_action_resolved);

                const claim_outcome = try resolveClaims(allocator, game_state, discarded_tile_id, driver);
                game_state.turn_count += 1;

                switch (claim_outcome) {
                    .none => {
                        game_state.current_player_id = transitions.nextPlayer(discarder);
                        pending_draw = true;
                    },
                    .claim_turn => |claim_turn| {
                        game_state.turn_count += 1;
                        game_state.current_player_id = claim_turn.player_id;
                        try emitStateUpdate(allocator, game_state, driver);
                        try pacePlayer(driver, claim_turn.player_id, .after_action_resolved);
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

/// 釋放 round 內臨時建立的 turn_changed payload，避免漏掉 chi_options 配置。
fn freeTurnChangedMessage(allocator: std.mem.Allocator, turn_changed: protocol.TurnChangedMessage) void {
    allocator.free(turn_changed.available_actions);
    if (turn_changed.chi_options.len > 0) allocator.free(turn_changed.chi_options);
}

/// 若 driver 有實作 pace hook，則在指定玩家與 phase 套用節奏控制。
fn pacePlayer(driver: anytype, player_id: u8, phase: pacing.Phase) !void {
    const DriverType = switch (@typeInfo(@TypeOf(driver))) {
        .pointer => |pointer_info| pointer_info.child,
        else => @TypeOf(driver),
    };
    if (!@hasDecl(DriverType, "pace")) return;
    try driver.pace(player_id, phase);
}

fn resolveClaims(allocator: std.mem.Allocator, game_state: *state.GameState, discarded_tile_id: u8, driver: anytype) !claims.Outcome {
    const discarder = game_state.current_player_id;

    if (try resolveClaimsForPriority(allocator, game_state, discarded_tile_id, discarder, .win, driver)) |outcome| {
        return outcome;
    }
    if (try resolveClaimsForPriority(allocator, game_state, discarded_tile_id, discarder, .meld, driver)) |outcome| {
        return outcome;
    }
    if (try resolveClaimsForPriority(allocator, game_state, discarded_tile_id, discarder, .chi, driver)) |outcome| {
        return outcome;
    }
    return .none;
}

/// 依單一優先層處理棄牌反應，先給玩家，再讓 AI 補位決策。
fn resolveClaimsForPriority(allocator: std.mem.Allocator, game_state: *state.GameState, discarded_tile_id: u8, discarder: u8, priority_group: protocol.PriorityGroup, driver: anytype) !?claims.Outcome {
    if (try resolvePlayerClaimForPriority(allocator, game_state, discarded_tile_id, discarder, priority_group, driver)) |outcome| {
        return outcome;
    }

    var choices: [state.player_count - 1]?claims.ClaimChoice = .{ null, null, null };
    var choice_count: usize = 0;
    for (1..state.player_count) |offset| {
        const player_id: u8 = @intCast((discarder + offset) % state.player_count);
        if (player_id == 0) continue;

        const turn_changed = try buildTurnChangedMessageForPriority(allocator, game_state, player_id, discarded_tile_id, discarder, priority_group);
        defer freeTurnChangedMessage(allocator, turn_changed);
        if (turn_changed.available_actions.len == 0) continue;

        try driver.sink(.{ .turn_changed = turn_changed });
        try pacePlayer(driver, player_id, .after_claim_prompt);
        const response = try driver.claimDecide(game_state, discarded_tile_id, turn_changed);
        if (!action_availability.containsAction(turn_changed.available_actions, response.action)) {
            return error.IllegalAction;
        }

        choices[choice_count] = .{
            .player_id = player_id,
            .action = claims.mapProtocolAction(response.action),
            .claim_tile_ids = try claims.parseClaimTileIds(response),
        };
        choice_count += 1;
    }

    if (choice_count == 0) return null;
    const outcome = try claims.resolve(game_state, discarded_tile_id, choices[0..choice_count]);
    return if (outcome == .none) null else outcome;
}

/// 若玩家在指定優先層具備合法反應，先給玩家 prompt；玩家 pass 後才允許 AI 補位。
fn resolvePlayerClaimForPriority(allocator: std.mem.Allocator, game_state: *state.GameState, discarded_tile_id: u8, discarder: u8, priority_group: protocol.PriorityGroup, driver: anytype) !?claims.Outcome {
    if (discarder == 0) return null;

    const turn_changed = try buildTurnChangedMessageForPriority(allocator, game_state, 0, discarded_tile_id, discarder, priority_group);
    defer freeTurnChangedMessage(allocator, turn_changed);
    if (turn_changed.available_actions.len == 0) return null;

    try driver.sink(.{ .turn_changed = turn_changed });
    const response = try driver.claimDecide(game_state, discarded_tile_id, turn_changed);
    if (!action_availability.containsAction(turn_changed.available_actions, response.action)) {
        return error.IllegalAction;
    }
    if (response.action == .pass) return null;

    return try claims.resolve(game_state, discarded_tile_id, &.{claims.ClaimChoice{
        .player_id = 0,
        .action = claims.mapProtocolAction(response.action),
        .claim_tile_ids = try claims.parseClaimTileIds(response),
    }});
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

test "resolveClaims gives player win priority over AI win on same discard" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[0].hand.appendSlice(allocator, &[_]tile.Tile{
        catalog[0], catalog[1], catalog[2],
        catalog[4], catalog[8], catalog[12],
        catalog[16], catalog[17], catalog[18],
        catalog[36], catalog[40], catalog[44],
        catalog[72], catalog[73], catalog[74],
        catalog[108],
    });
    try game_state.players[2].hand.appendSlice(allocator, &[_]tile.Tile{
        catalog[0], catalog[1], catalog[2],
        catalog[4], catalog[8], catalog[12],
        catalog[16], catalog[17], catalog[18],
        catalog[36], catalog[40], catalog[44],
        catalog[72], catalog[73], catalog[74],
        catalog[108],
    });
    game_state.current_player_id = 1;

    const Driver = struct {
        fn turnDecide(_: *@This(), _: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .discard, .tile_id = null };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (turn_changed.player_id == 0) return .{ .action = .win, .tile_id = null };
            return .{ .action = .win, .tile_id = null };
        }

        fn sink(_: *@This(), _: protocol.Message) !void {}
    };

    var driver = Driver{};
    const outcome = try resolveClaims(allocator, &game_state, catalog[109].id, &driver);
    try std.testing.expectEqual(@as(claims.Outcome, .{ .win = 0 }), outcome);
}

test "resolveClaims lets AI take meld after player passes same layer" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[0].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[1], catalog[2], catalog[40] });
    try game_state.players[2].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[1], catalog[2], catalog[44] });
    game_state.current_player_id = 1;

    const Driver = struct {
        fn turnDecide(_: *@This(), _: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .discard, .tile_id = null };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (turn_changed.player_id == 0) return .{ .action = .pass, .tile_id = null };
            if (turn_changed.player_id == 2) return .{ .action = .pon, .tile_id = null };
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(_: *@This(), _: protocol.Message) !void {}
    };

    var driver = Driver{};
    const outcome = try resolveClaims(allocator, &game_state, catalog[0].id, &driver);
    switch (outcome) {
        .claim_turn => |claim_turn| try std.testing.expectEqual(@as(u8, 2), claim_turn.player_id),
        else => return error.TestUnexpectedResult,
    }
}

test "resolveClaims prioritizes meld layer over player chi layer" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[0].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[0], catalog[4], catalog[40] });
    try game_state.players[2].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[1], catalog[2], catalog[44] });
    game_state.current_player_id = 3;

    const Driver = struct {
        player_chi_prompted: bool = false,

        fn turnDecide(_: *@This(), _: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .discard, .tile_id = null };
        }

        fn claimDecide(self: *@This(), _: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (turn_changed.player_id == 0 and turn_changed.priority_group == .chi) {
                self.player_chi_prompted = true;
                return .{ .action = .chi, .tile_id = null };
            }
            if (turn_changed.player_id == 2 and turn_changed.priority_group == .meld) {
                return .{ .action = .pon, .tile_id = null };
            }
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(_: *@This(), _: protocol.Message) !void {}
    };

    var driver = Driver{};
    const outcome = try resolveClaims(allocator, &game_state, catalog[0].id, &driver);

    try std.testing.expect(!driver.player_chi_prompted);
    switch (outcome) {
        .claim_turn => |claim_turn| try std.testing.expectEqual(@as(u8, 2), claim_turn.player_id),
        else => return error.TestUnexpectedResult,
    }
}

test "playRound increments turn_count after successful claim turn" {
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
        fn turnDecide(_: *@This(), gs: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (gs.current_player_id == 0) {
                return .{ .action = .discard, .tile_id = catalog[0].id };
            }
            return .{ .action = .discard, .tile_id = gs.players[gs.current_player_id].hand.items[0].id };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (turn_changed.player_id == 1 and turn_changed.priority_group == .meld) {
                return .{ .action = .pon, .tile_id = null };
            }
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(_: *@This(), _: protocol.Message) !void {}
    };

    var driver = Driver{};
    _ = try playRound(allocator, &game_state, &driver);
    try std.testing.expect(game_state.turn_count >= 2);
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
            return @import("../ai/agent.zig").decide(gs, turn_changed, @import("../ai/agent.zig").presets.conservative);
        }

        fn claimDecide(_: *@This(), gs: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return @import("../ai/agent.zig").decide(gs, turn_changed, @import("../ai/agent.zig").presets.conservative);
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

test "playRound 會依序觸發 AI pacing phase" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    for (0..state.player_count) |player_id| {
        try game_state.players[player_id].hand.appendSlice(allocator, catalog[player_id * 16 .. player_id * 16 + 16]);
    }
    try game_state.wall.append(allocator, catalog[100]);
    game_state.current_player_id = 1;

    const Driver = struct {
        phases: [3]pacing.Phase = undefined,
        player_ids: [3]u8 = undefined,
        count: usize = 0,

        fn turnDecide(_: *@This(), gs: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .discard, .tile_id = gs.players[gs.current_player_id].hand.items[0].id };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(_: *@This(), _: protocol.Message) !void {}

        fn pace(self: *@This(), player_id: u8, phase: pacing.Phase) !void {
            self.player_ids[self.count] = player_id;
            self.phases[self.count] = phase;
            self.count += 1;
        }
    };

    var driver = Driver{};
    const result = try playRound(allocator, &game_state, &driver);

    try std.testing.expectEqual(@as(?u8, null), result.winner_id);
    try std.testing.expectEqual(@as(usize, 3), driver.count);
    try std.testing.expectEqual(pacing.Phase.after_draw_revealed, driver.phases[0]);
    try std.testing.expectEqual(pacing.Phase.after_turn_prompt, driver.phases[1]);
    try std.testing.expectEqual(pacing.Phase.after_action_resolved, driver.phases[2]);
    try std.testing.expectEqual(@as(u8, 1), driver.player_ids[0]);
    try std.testing.expectEqual(@as(u8, 1), driver.player_ids[1]);
    try std.testing.expectEqual(@as(u8, 1), driver.player_ids[2]);
}

test "playRound 不會延遲真人玩家 prompt" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    for (0..state.player_count) |player_id| {
        try game_state.players[player_id].hand.appendSlice(allocator, catalog[player_id * 16 .. player_id * 16 + 16]);
    }
    try game_state.wall.append(allocator, catalog[100]);
    game_state.current_player_id = 0;

    const Driver = struct {
        pace_count: usize = 0,

        fn turnDecide(_: *@This(), gs: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .discard, .tile_id = gs.players[gs.current_player_id].hand.items[0].id };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(_: *@This(), _: protocol.Message) !void {}

        fn pace(self: *@This(), _: u8, _: pacing.Phase) !void {
            self.pace_count += 1;
        }
    };

    var driver = Driver{};
    _ = try playRound(allocator, &game_state, &driver);

    try std.testing.expectEqual(@as(usize, 0), driver.pace_count);
}

test "resolveClaims 遇到真人 claim prompt 時不會延遲" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[1].hand.appendSlice(allocator, catalog[0..16]);
    try game_state.players[0].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[1], catalog[2] });
    try game_state.players[2].hand.appendSlice(allocator, catalog[32..48]);
    try game_state.players[3].hand.appendSlice(allocator, catalog[48..64]);
    game_state.current_player_id = 1;

    const Driver = struct {
        pace_count: usize = 0,

        fn turnDecide(_: *@This(), _: *const state.GameState, _: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            return .{ .action = .discard, .tile_id = null };
        }

        fn claimDecide(_: *@This(), _: *const state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
            if (turn_changed.player_id == 0) {
                return .{ .action = .pon, .tile_id = null };
            }
            return .{ .action = .pass, .tile_id = null };
        }

        fn sink(_: *@This(), _: protocol.Message) !void {}

        fn pace(self: *@This(), _: u8, _: pacing.Phase) !void {
            self.pace_count += 1;
        }
    };

    var driver = Driver{};
    const result = try resolveClaims(allocator, &game_state, catalog[0].id, &driver);

    try std.testing.expectEqual(@as(usize, 0), driver.pace_count);
    try std.testing.expect(result == .claim_turn);
}

test "playRound 會在 AI claim 流程套用 pacing" {
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
        phases: [8]pacing.Phase = undefined,
        player_ids: [8]u8 = undefined,
        count: usize = 0,

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

        fn sink(_: *@This(), _: protocol.Message) !void {}

        fn pace(self: *@This(), player_id: u8, phase: pacing.Phase) !void {
            self.player_ids[self.count] = player_id;
            self.phases[self.count] = phase;
            self.count += 1;
        }
    };

    var driver = Driver{};
    _ = try playRound(allocator, &game_state, &driver);

    try std.testing.expect(driver.count >= 2);
    try std.testing.expectEqual(pacing.Phase.after_claim_prompt, driver.phases[0]);
    try std.testing.expectEqual(pacing.Phase.after_action_resolved, driver.phases[1]);
    try std.testing.expectEqual(@as(u8, 1), driver.player_ids[0]);
    try std.testing.expectEqual(@as(u8, 1), driver.player_ids[1]);
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
