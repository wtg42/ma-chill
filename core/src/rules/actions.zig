const std = @import("std");
const tile = @import("../game/tile.zig");

pub const ClaimAction = enum {
    chi,
    pon,
    kong,
};

pub fn canChi(claimant_player_id: u8, discarder_player_id: u8, discarded_tile: tile.Tile, hand: []const tile.Tile) bool {
    if (claimant_player_id != (discarder_player_id + 1) % 4) {
        return false;
    }

    const discarded_rank = suitedRankValue(discarded_tile) orelse return false;

    var present = [_]bool{false} ** 9;
    for (hand) |hand_tile| {
        if (hand_tile.suit != discarded_tile.suit) {
            continue;
        }
        const rank_value = suitedRankValue(hand_tile) orelse continue;
        present[rank_value - 1] = true;
    }

    if (discarded_rank >= 3 and present[discarded_rank - 3] and present[discarded_rank - 2]) {
        return true;
    }
    if (discarded_rank >= 2 and discarded_rank <= 8 and present[discarded_rank - 2] and present[discarded_rank]) {
        return true;
    }
    if (discarded_rank <= 7 and present[discarded_rank] and present[discarded_rank + 1]) {
        return true;
    }
    return false;
}

pub fn canPon(discarded_tile: tile.Tile, hand: []const tile.Tile) bool {
    return countMatchingTiles(discarded_tile, hand) >= 2;
}

pub fn canOpenKong(discarded_tile: tile.Tile, hand: []const tile.Tile) bool {
    return countMatchingTiles(discarded_tile, hand) >= 3;
}

pub fn canClosedKong(hand: []const tile.Tile) bool {
    for (hand, 0..) |candidate, candidate_index| {
        var count: usize = 1;
        for (hand[candidate_index + 1 ..]) |other_tile| {
            if (sameKind(candidate, other_tile)) {
                count += 1;
            }
        }
        if (count >= 4) {
            return true;
        }
    }
    return false;
}

pub fn prioritizeClaims(actions: []const ClaimAction) ?ClaimAction {
    var best: ?ClaimAction = null;

    for (actions) |action| {
        if (best == null or actionPriority(action) > actionPriority(best.?)) {
            best = action;
        }
    }

    return best;
}

fn countMatchingTiles(target: tile.Tile, hand: []const tile.Tile) usize {
    var count: usize = 0;
    for (hand) |hand_tile| {
        if (sameKind(target, hand_tile)) {
            count += 1;
        }
    }
    return count;
}

fn sameKind(a: tile.Tile, b: tile.Tile) bool {
    return a.suit == b.suit and a.rank == b.rank;
}

fn suitedRankValue(entry: tile.Tile) ?usize {
    return switch (entry.rank) {
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

fn actionPriority(action: ClaimAction) u8 {
    return switch (action) {
        .chi => 0,
        .pon => 1,
        .kong => 2,
    };
}

test "canChi only allows next player with a valid straight" {
    const catalog = tile.generateCatalog();
    const hand = [_]tile.Tile{ catalog[0], catalog[4] };

    try std.testing.expect(canChi(1, 0, catalog[8], &hand));
    try std.testing.expect(!canChi(2, 0, catalog[8], &hand));
    try std.testing.expect(!canChi(1, 0, catalog[108], &hand));
}

test "canPon and canOpenKong count matching kinds" {
    const catalog = tile.generateCatalog();
    const pair_hand = [_]tile.Tile{ catalog[0], catalog[1], catalog[10] };
    const triple_hand = [_]tile.Tile{ catalog[0], catalog[1], catalog[2], catalog[10] };

    try std.testing.expect(canPon(catalog[3], &pair_hand));
    try std.testing.expect(!canOpenKong(catalog[3], &pair_hand));
    try std.testing.expect(canOpenKong(catalog[3], &triple_hand));
}

test "canClosedKong detects four identical tiles in hand" {
    const catalog = tile.generateCatalog();
    const hand = [_]tile.Tile{ catalog[0], catalog[1], catalog[2], catalog[3], catalog[20] };
    const incomplete = [_]tile.Tile{ catalog[0], catalog[1], catalog[2], catalog[20] };

    try std.testing.expect(canClosedKong(&hand));
    try std.testing.expect(!canClosedKong(&incomplete));
}

test "prioritizeClaims prefers kong and pon over chi" {
    try std.testing.expectEqual(ClaimAction.kong, prioritizeClaims(&.{ .chi, .pon, .kong }).?);
    try std.testing.expectEqual(ClaimAction.pon, prioritizeClaims(&.{ .chi, .pon }).?);
    try std.testing.expectEqual(ClaimAction.chi, prioritizeClaims(&.{.chi}).?);
    try std.testing.expect(prioritizeClaims(&.{}) == null);
}
