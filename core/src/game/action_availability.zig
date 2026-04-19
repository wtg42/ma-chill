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

/// 依指定優先層級過濾可用動作，讓棄牌反應窗可逐層提示玩家或 AI。
pub fn filterActionsForPriority(allocator: std.mem.Allocator, actions_list: []const protocol.ActionType, priority_group: protocol.PriorityGroup) ![]protocol.ActionType {
    var list: std.ArrayList(protocol.ActionType) = .empty;
    errdefer list.deinit(allocator);

    switch (priority_group) {
        .none => {
            try list.appendSlice(allocator, actions_list);
        },
        .win => {
            if (containsAction(actions_list, .win)) try list.append(allocator, .win);
        },
        .meld => {
            if (containsAction(actions_list, .pon)) try list.append(allocator, .pon);
            if (containsAction(actions_list, .kong)) try list.append(allocator, .kong);
        },
        .chi => {
            if (containsAction(actions_list, .chi)) try list.append(allocator, .chi);
        },
    }

    if (priority_group != .none and list.items.len > 0) {
        try list.append(allocator, .pass);
    }
    return list.toOwnedSlice(allocator);
}

/// 計算某位玩家對當前棄牌的所有吃牌組合，回傳會消耗的兩張 tile id。
pub fn chiOptionsForPlayer(allocator: std.mem.Allocator, game_state: *const state.GameState, player_id: u8, discarded_tile_id: ?u8, discarder_player_id: ?u8) ![]protocol.ChiOption {
    const discard_id = discarded_tile_id orelse return &.{};
    const discarder = discarder_player_id orelse return &.{};
    const discarded_tile = tileById(discard_id) orelse return error.InvalidTile;
    const hand = game_state.players[player_id].hand.items;

    if (!actions.canChi(player_id, discarder, discarded_tile, hand)) {
        return &.{};
    }

    var list: std.ArrayList(protocol.ChiOption) = .empty;
    errdefer list.deinit(allocator);

    const rank_value = suitedRankValue(discarded_tile.rank) orelse return &.{};
    if (rank_value >= 3) {
        if (findTileIdBySuitRank(hand, discarded_tile.suit, rankEnum(rank_value - 2), null)) |first_id| {
            if (findTileIdBySuitRank(hand, discarded_tile.suit, rankEnum(rank_value - 1), first_id)) |second_id| {
                try list.append(allocator, .{ .claim_tile_ids = .{ first_id, second_id } });
            }
        }
    }
    if (rank_value >= 2 and rank_value <= 8) {
        if (findTileIdBySuitRank(hand, discarded_tile.suit, rankEnum(rank_value - 1), null)) |first_id| {
            if (findTileIdBySuitRank(hand, discarded_tile.suit, rankEnum(rank_value + 1), null)) |second_id| {
                try list.append(allocator, .{ .claim_tile_ids = .{ first_id, second_id } });
            }
        }
    }
    if (rank_value <= 7) {
        if (findTileIdBySuitRank(hand, discarded_tile.suit, rankEnum(rank_value + 1), null)) |first_id| {
            if (findTileIdBySuitRank(hand, discarded_tile.suit, rankEnum(rank_value + 2), null)) |second_id| {
                try list.append(allocator, .{ .claim_tile_ids = .{ first_id, second_id } });
            }
        }
    }

    return list.toOwnedSlice(allocator);
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

/// 依花色與數字在手牌中尋找對應 tile id，可選擇略過某一張已經使用的 tile。
fn findTileIdBySuitRank(hand: []const tile.Tile, suit: tile.Suit, rank: tile.Rank, skip_tile_id: ?u8) ?u8 {
    for (hand) |entry| {
        if (skip_tile_id != null and entry.id == skip_tile_id.?) continue;
        if (entry.suit == suit and entry.rank == rank) return entry.id;
    }
    return null;
}

/// 將 suited rank enum 轉成數字，供吃牌組合枚舉使用。
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

/// 將 1..9 轉回對應的牌面 rank enum。
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

test "chiOptionsForPlayer returns concrete combinations" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var game_state = state.GameState.init(allocator);
    defer game_state.deinit();

    try game_state.players[1].hand.appendSlice(allocator, &[_]tile.Tile{ catalog[0], catalog[4], catalog[12], catalog[16] });

    const options = try chiOptionsForPlayer(allocator, &game_state, 1, catalog[8].id, 0);
    defer if (options.len > 0) allocator.free(options);

    try std.testing.expectEqual(@as(usize, 2), options.len);
    try std.testing.expectEqualSlices(u8, &[_]u8{ catalog[0].id, catalog[4].id }, &options[0].claim_tile_ids);
    try std.testing.expectEqualSlices(u8, &[_]u8{ catalog[4].id, catalog[12].id }, &options[1].claim_tile_ids);
}
