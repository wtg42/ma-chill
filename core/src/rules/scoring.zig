const std = @import("std");
const tile = @import("../game/tile.zig");

pub const ScoringPattern = enum {
    self_draw,
    pinfu,
};

pub const WinContext = struct {
    self_draw: bool = false,
    pinfu: bool = false,
};

pub const ScoreLine = struct {
    pattern: ScoringPattern,
    fan: u8,
};

pub const ScoreResult = struct {
    total_fan: u8,
    lines: [2]?ScoreLine,
    line_count: u8,
};

pub fn calculateBasicFan(context: WinContext) ScoreResult {
    var result = ScoreResult{
        .total_fan = 0,
        .lines = .{ null, null },
        .line_count = 0,
    };

    if (context.self_draw) {
        appendLine(&result, .self_draw, 1);
    }
    if (context.pinfu) {
        appendLine(&result, .pinfu, 1);
    }

    return result;
}

pub fn isStandardWinningHand(hand: []const tile.Tile) bool {
    if (hand.len % 3 != 2 or hand.len == 0) {
        return false;
    }

    var counts = [_]u8{0} ** 34;
    for (hand) |entry| {
        const kind_index = tileKindIndex(entry) orelse return false;
        counts[kind_index] += 1;
    }

    for (counts, 0..) |count, pair_index| {
        if (count < 2) {
            continue;
        }

        var candidate = counts;
        candidate[pair_index] -= 2;
        if (canFormMelds(&candidate)) {
            return true;
        }
    }

    return false;
}

fn appendLine(result: *ScoreResult, pattern: ScoringPattern, fan: u8) void {
    std.debug.assert(result.line_count < result.lines.len);
    result.lines[result.line_count] = .{
        .pattern = pattern,
        .fan = fan,
    };
    result.line_count += 1;
    result.total_fan += fan;
}

fn canFormMelds(counts: *[34]u8) bool {
    var index: usize = 0;
    while (index < counts.len and counts[index] == 0) : (index += 1) {}
    if (index == counts.len) {
        return true;
    }

    if (counts[index] >= 3) {
        counts[index] -= 3;
        if (canFormMelds(counts)) {
            counts[index] += 3;
            return true;
        }
        counts[index] += 3;
    }

    if (index < 27) {
        const suit_offset = index % 9;
        if (suit_offset <= 6 and counts[index + 1] > 0 and counts[index + 2] > 0) {
            counts[index] -= 1;
            counts[index + 1] -= 1;
            counts[index + 2] -= 1;
            if (canFormMelds(counts)) {
                counts[index] += 1;
                counts[index + 1] += 1;
                counts[index + 2] += 1;
                return true;
            }
            counts[index] += 1;
            counts[index + 1] += 1;
            counts[index + 2] += 1;
        }
    }

    return false;
}

fn tileKindIndex(entry: tile.Tile) ?usize {
    return switch (entry.suit) {
        .characters => suitedIndex(0, entry.rank),
        .circles => suitedIndex(9, entry.rank),
        .bamboos => suitedIndex(18, entry.rank),
        .winds => switch (entry.rank) {
            .east => 27,
            .south => 28,
            .west => 29,
            .north => 30,
            else => null,
        },
        .dragons => switch (entry.rank) {
            .red => 31,
            .green => 32,
            .white => 33,
            else => null,
        },
        .bonus => null,
    };
}

fn suitedIndex(base: usize, rank: tile.Rank) ?usize {
    return switch (rank) {
        .one => base,
        .two => base + 1,
        .three => base + 2,
        .four => base + 3,
        .five => base + 4,
        .six => base + 5,
        .seven => base + 6,
        .eight => base + 7,
        .nine => base + 8,
        else => null,
    };
}

test "calculateBasicFan scores self draw and pinfu" {
    const result = calculateBasicFan(.{ .self_draw = true, .pinfu = true });

    try std.testing.expectEqual(@as(u8, 2), result.total_fan);
    try std.testing.expectEqual(@as(u8, 2), result.line_count);
    try std.testing.expectEqual(ScoringPattern.self_draw, result.lines[0].?.pattern);
    try std.testing.expectEqual(ScoringPattern.pinfu, result.lines[1].?.pattern);
}

test "calculateBasicFan returns zero when no base patterns apply" {
    const result = calculateBasicFan(.{});

    try std.testing.expectEqual(@as(u8, 0), result.total_fan);
    try std.testing.expectEqual(@as(u8, 0), result.line_count);
}

test "isStandardWinningHand recognizes four melds and a pair" {
    const catalog = tile.generateCatalog();
    const hand = [_]tile.Tile{
        catalog[0],   catalog[1],   catalog[2],
        catalog[4],   catalog[8],   catalog[12],
        catalog[16],  catalog[17],  catalog[18],
        catalog[36],  catalog[40],  catalog[44],
        catalog[72],  catalog[73],  catalog[74],
        catalog[108], catalog[109],
    };

    try std.testing.expect(isStandardWinningHand(&hand));
}

test "isStandardWinningHand rejects incomplete hand" {
    const catalog = tile.generateCatalog();
    const hand = [_]tile.Tile{
        catalog[0],   catalog[1],   catalog[2],
        catalog[4],   catalog[8],   catalog[12],
        catalog[16],  catalog[17],  catalog[18],
        catalog[36],  catalog[40],  catalog[44],
        catalog[72],  catalog[73],  catalog[74],
        catalog[108], catalog[112],
    };

    try std.testing.expect(!isStandardWinningHand(&hand));
}
