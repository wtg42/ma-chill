const std = @import("std");

pub const Suit = enum {
    characters,
    bamboos,
    circles,
    winds,
    dragons,
    bonus,
};

pub const Rank = enum {
    one,
    two,
    three,
    four,
    five,
    six,
    seven,
    eight,
    nine,
    east,
    south,
    west,
    north,
    red,
    green,
    white,
    plum,
    orchid,
    chrysanthemum,
    bamboo,
    spring,
    summer,
    autumn,
    winter,
};

pub const Tile = struct {
    id: u8,
    suit: Suit,
    rank: Rank,
    copy_index: u8,

    pub fn isBonus(self: Tile) bool {
        return self.suit == .bonus;
    }
};

pub fn generateCatalog() [144]Tile {
    var catalog: [144]Tile = undefined;
    var next_id: u8 = 0;

    inline for ([_]Suit{ .characters, .circles, .bamboos }) |suit| {
        inline for ([_]Rank{ .one, .two, .three, .four, .five, .six, .seven, .eight, .nine }) |rank| {
            appendCopies(&catalog, &next_id, suit, rank, 4);
        }
    }

    inline for ([_]Rank{ .east, .south, .west, .north }) |rank| {
        appendCopies(&catalog, &next_id, .winds, rank, 4);
    }

    inline for ([_]Rank{ .red, .green, .white }) |rank| {
        appendCopies(&catalog, &next_id, .dragons, rank, 4);
    }

    inline for ([_]Rank{ .plum, .orchid, .chrysanthemum, .bamboo, .spring, .summer, .autumn, .winter }) |rank| {
        appendCopies(&catalog, &next_id, .bonus, rank, 1);
    }

    std.debug.assert(next_id == 144);
    return catalog;
}

fn appendCopies(catalog: *[144]Tile, next_id: *u8, suit: Suit, rank: Rank, copy_count: u8) void {
    var copy_index: u8 = 0;
    while (copy_index < copy_count) : (copy_index += 1) {
        catalog[next_id.*] = .{
            .id = next_id.*,
            .suit = suit,
            .rank = rank,
            .copy_index = copy_index,
        };
        next_id.* += 1;
    }
}

test "generateCatalog creates 144 uniquely identified tiles" {
    const catalog = generateCatalog();
    var seen_ids = [_]bool{false} ** 144;

    for (catalog) |tile| {
        try std.testing.expect(tile.id < 144);
        try std.testing.expect(!seen_ids[tile.id]);
        seen_ids[tile.id] = true;
    }

    for (seen_ids) |seen| {
        try std.testing.expect(seen);
    }
}

test "generateCatalog matches Taiwan mahjong tile counts" {
    const catalog = generateCatalog();

    var characters_count: usize = 0;
    var bamboos_count: usize = 0;
    var circles_count: usize = 0;
    var winds_count: usize = 0;
    var dragons_count: usize = 0;
    var bonus_count: usize = 0;

    for (catalog) |tile| {
        switch (tile.suit) {
            .characters => characters_count += 1,
            .bamboos => bamboos_count += 1,
            .circles => circles_count += 1,
            .winds => winds_count += 1,
            .dragons => dragons_count += 1,
            .bonus => bonus_count += 1,
        }

        if (tile.suit == .bonus) {
            try std.testing.expectEqual(@as(u8, 0), tile.copy_index);
        } else {
            try std.testing.expect(tile.copy_index < 4);
        }
    }

    try std.testing.expectEqual(@as(usize, 36), characters_count);
    try std.testing.expectEqual(@as(usize, 36), bamboos_count);
    try std.testing.expectEqual(@as(usize, 36), circles_count);
    try std.testing.expectEqual(@as(usize, 16), winds_count);
    try std.testing.expectEqual(@as(usize, 12), dragons_count);
    try std.testing.expectEqual(@as(usize, 8), bonus_count);
    try std.testing.expectEqual(@as(usize, 144), catalog.len);
}
