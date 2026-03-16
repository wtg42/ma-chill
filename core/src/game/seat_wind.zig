const std = @import("std");
const state = @import("state.zig");
const tile = @import("tile.zig");

/// 根據莊家 player_id 計算四位玩家的座位風。
/// 公式：seat_winds[player_id] = (player_id - dealer + 4) % 4
/// 0→East, 1→South, 2→West, 3→North
pub fn assignSeatWinds(dealer_player_id: u8) [state.player_count]state.RoundWind {
    const winds = [_]state.RoundWind{ .east, .south, .west, .north };
    var result: [state.player_count]state.RoundWind = undefined;
    for (0..state.player_count) |player_id| {
        const index = (player_id + state.player_count - dealer_player_id) % state.player_count;
        result[player_id] = winds[index];
    }
    return result;
}

/// 花牌與座位風的對應：
/// 春(spring)/梅(plum) → East
/// 夏(summer)/蘭(orchid) → South
/// 秋(autumn)/菊(chrysanthemum) → West
/// 冬(winter)/竹(bamboo) → North
pub fn bonusWindForTile(t: tile.Tile) ?state.RoundWind {
    if (t.suit != .bonus) return null;
    return switch (t.rank) {
        .spring, .plum => .east,
        .summer, .orchid => .south,
        .autumn, .chrysanthemum => .west,
        .winter, .bamboo => .north,
        else => null,
    };
}

test "assignSeatWinds: dealer=0, player 0 is East" {
    const winds = assignSeatWinds(0);
    try std.testing.expectEqual(state.RoundWind.east, winds[0]);
    try std.testing.expectEqual(state.RoundWind.south, winds[1]);
    try std.testing.expectEqual(state.RoundWind.west, winds[2]);
    try std.testing.expectEqual(state.RoundWind.north, winds[3]);
}

test "assignSeatWinds: dealer=2, player 2 is East" {
    const winds = assignSeatWinds(2);
    try std.testing.expectEqual(state.RoundWind.west, winds[0]);
    try std.testing.expectEqual(state.RoundWind.north, winds[1]);
    try std.testing.expectEqual(state.RoundWind.east, winds[2]);
    try std.testing.expectEqual(state.RoundWind.south, winds[3]);
}

test "assignSeatWinds: dealer=3, player 3 is East" {
    const winds = assignSeatWinds(3);
    try std.testing.expectEqual(state.RoundWind.north, winds[0]);
    try std.testing.expectEqual(state.RoundWind.east, winds[1]);
    try std.testing.expectEqual(state.RoundWind.south, winds[2]);
    try std.testing.expectEqual(state.RoundWind.west, winds[3]);
}

test "bonusWindForTile: all bonus tiles map to correct wind" {
    const catalog = tile.generateCatalog();
    for (catalog) |t| {
        if (t.suit == .bonus) {
            const expected: state.RoundWind = switch (t.rank) {
                .spring, .plum => .east,
                .summer, .orchid => .south,
                .autumn, .chrysanthemum => .west,
                .winter, .bamboo => .north,
                else => continue,
            };
            try std.testing.expectEqual(expected, bonusWindForTile(t).?);
        }
    }
}

test "bonusWindForTile: non-bonus tile returns null" {
    const catalog = tile.generateCatalog();
    try std.testing.expectEqual(@as(?state.RoundWind, null), bonusWindForTile(catalog[0]));
}
