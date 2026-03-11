const std = @import("std");
const tile = @import("tile.zig");

pub const player_count: usize = 4;
pub const initial_hand_size: usize = 16;

pub const BonusReplacementEvent = struct {
    player_id: u8,
    tile_id: u8,
};

pub const DealResult = struct {
    allocator: std.mem.Allocator,
    hands: [player_count]std.ArrayListUnmanaged(tile.Tile),
    bonus_tiles: [player_count]std.ArrayListUnmanaged(tile.Tile),
    wall: std.ArrayListUnmanaged(tile.Tile),
    events: std.ArrayListUnmanaged(BonusReplacementEvent),

    pub fn init(allocator: std.mem.Allocator) DealResult {
        return .{
            .allocator = allocator,
            .hands = std.mem.zeroes([player_count]std.ArrayListUnmanaged(tile.Tile)),
            .bonus_tiles = std.mem.zeroes([player_count]std.ArrayListUnmanaged(tile.Tile)),
            .wall = .empty,
            .events = .empty,
        };
    }

    pub fn deinit(self: *DealResult) void {
        for (&self.hands) |*hand| {
            hand.deinit(self.allocator);
        }
        for (&self.bonus_tiles) |*bonus_tiles| {
            bonus_tiles.deinit(self.allocator);
        }
        self.wall.deinit(self.allocator);
        self.events.deinit(self.allocator);
    }
};

pub fn shuffle(random: std.Random, tiles: []tile.Tile) void {
    if (tiles.len < 2) {
        return;
    }

    var i: usize = tiles.len - 1;
    while (i > 0) : (i -= 1) {
        const j = random.uintLessThan(usize, i + 1);
        std.mem.swap(tile.Tile, &tiles[i], &tiles[j]);
    }
}

pub fn dealInitialHands(allocator: std.mem.Allocator, shuffled_tiles: []const tile.Tile) !DealResult {
    if (shuffled_tiles.len < tile.generateCatalog().len) {
        return error.NotEnoughTiles;
    }

    var result = DealResult.init(allocator);
    errdefer result.deinit();

    var front_index: usize = 0;
    var back_index: usize = shuffled_tiles.len;

    for (0..player_count) |player_index| {
        while (result.hands[player_index].items.len < initial_hand_size) {
            const drawn_tile = shuffled_tiles[front_index];
            front_index += 1;

            if (drawn_tile.isBonus()) {
                try recordBonusTile(&result, @intCast(player_index), drawn_tile);
                try drawReplacementUntilPlayable(&result, player_index, shuffled_tiles, &back_index);
                continue;
            }

            try result.hands[player_index].append(allocator, drawn_tile);
        }
    }

    try result.wall.appendSlice(allocator, shuffled_tiles[front_index..back_index]);
    return result;
}

fn drawReplacementUntilPlayable(result: *DealResult, player_index: usize, shuffled_tiles: []const tile.Tile, back_index: *usize) !void {
    while (true) {
        if (back_index.* == 0) {
            return error.NotEnoughTiles;
        }

        back_index.* -= 1;
        const replacement_tile = shuffled_tiles[back_index.*];

        if (replacement_tile.isBonus()) {
            try recordBonusTile(result, @intCast(player_index), replacement_tile);
            continue;
        }

        try result.hands[player_index].append(result.allocator, replacement_tile);
        return;
    }
}

fn recordBonusTile(result: *DealResult, player_id: u8, bonus_tile: tile.Tile) !void {
    try result.bonus_tiles[player_id].append(result.allocator, bonus_tile);
    try result.events.append(result.allocator, .{
        .player_id = player_id,
        .tile_id = bonus_tile.id,
    });
}

test "dealInitialHands keeps total tile count and fills every hand" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();

    var deal = try dealInitialHands(allocator, &catalog);
    defer deal.deinit();

    var total_tiles: usize = deal.wall.items.len;
    for (deal.hands) |hand| {
        try std.testing.expectEqual(@as(usize, initial_hand_size), hand.items.len);
        total_tiles += hand.items.len;
    }
    for (deal.bonus_tiles) |bonus_tiles| {
        total_tiles += bonus_tiles.items.len;
    }

    try std.testing.expectEqual(@as(usize, 144), total_tiles);
    try std.testing.expectEqual(@as(usize, 80), deal.wall.items.len);
    try std.testing.expectEqual(@as(usize, 0), deal.events.items.len);
}

test "dealInitialHands keeps replacing bonus tiles until a playable tile is drawn" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var rigged_deck = catalog;

    std.mem.swap(tile.Tile, &rigged_deck[0], &rigged_deck[136]);
    std.mem.swap(tile.Tile, &rigged_deck[143], &rigged_deck[137]);

    var deal = try dealInitialHands(allocator, &rigged_deck);
    defer deal.deinit();

    try std.testing.expectEqual(@as(usize, initial_hand_size), deal.hands[0].items.len);
    try std.testing.expectEqual(@as(usize, 2), deal.bonus_tiles[0].items.len);
    try std.testing.expectEqual(@as(usize, 2), deal.events.items.len);
    try std.testing.expectEqual(@as(usize, 78), deal.wall.items.len);

    for (deal.hands[0].items) |hand_tile| {
        try std.testing.expect(!hand_tile.isBonus());
    }
}

test "shuffle preserves all tile identities" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var shuffled = catalog;
    var prng = std.Random.DefaultPrng.init(42);

    shuffle(prng.random(), &shuffled);

    var seen_ids = [_]bool{false} ** 144;
    for (shuffled) |entry| {
        try std.testing.expect(!seen_ids[entry.id]);
        seen_ids[entry.id] = true;
    }

    for (seen_ids) |seen| {
        try std.testing.expect(seen);
    }

    _ = allocator;
}
