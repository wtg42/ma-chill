const std = @import("std");
const tile = @import("tile.zig");

pub const player_count: usize = 4;

pub const RoundWind = enum {
    east,
    south,
    west,
    north,
};

pub const MeldType = enum {
    chi,
    pon,
    open_kong,
    closed_kong,
};

pub const Meld = struct {
    kind: MeldType,
    tiles: [4]u8,
    tile_count: u8,
    source_index: ?u8,

    pub fn init(kind: MeldType, values: []const u8, source_index: ?u8) Meld {
        std.debug.assert(values.len >= 3 and values.len <= 4);

        var tiles: [4]u8 = [_]u8{0} ** 4;
        for (values, 0..) |value, index| {
            tiles[index] = value;
        }

        return .{
            .kind = kind,
            .tiles = tiles,
            .tile_count = @intCast(values.len),
            .source_index = source_index,
        };
    }
};

pub const EventType = enum {
    bonus_tile,
};

pub const GameEvent = struct {
    kind: EventType,
    player_id: u8,
    tile_id: u8,
};

pub const PlayerState = struct {
    hand: std.ArrayListUnmanaged(tile.Tile),
    bonus_tiles: std.ArrayListUnmanaged(tile.Tile),
    melds: std.ArrayListUnmanaged(Meld),
    discards: std.ArrayListUnmanaged(u8),

    pub fn empty() PlayerState {
        return .{
            .hand = .empty,
            .bonus_tiles = .empty,
            .melds = .empty,
            .discards = .empty,
        };
    }

    pub fn deinit(self: *PlayerState, allocator: std.mem.Allocator) void {
        self.hand.deinit(allocator);
        self.bonus_tiles.deinit(allocator);
        self.melds.deinit(allocator);
        self.discards.deinit(allocator);
    }
};

pub const GameState = struct {
    allocator: std.mem.Allocator,
    players: [player_count]PlayerState,
    wall: std.ArrayListUnmanaged(tile.Tile),
    round_wind: RoundWind,
    round_number: u8,
    dealer_player_id: u8,
    current_player_id: u8,
    drawn_tile_id: ?u8,
    scores: [player_count]i32,
    events: std.ArrayListUnmanaged(GameEvent),

    pub fn init(allocator: std.mem.Allocator) GameState {
        var players: [player_count]PlayerState = undefined;
        for (&players) |*player| {
            player.* = PlayerState.empty();
        }

        return .{
            .allocator = allocator,
            .players = players,
            .wall = .empty,
            .round_wind = .east,
            .round_number = 1,
            .dealer_player_id = 0,
            .current_player_id = 0,
            .drawn_tile_id = null,
            .scores = .{ 0, 0, 0, 0 },
            .events = .empty,
        };
    }

    pub fn deinit(self: *GameState) void {
        for (&self.players) |*player| {
            player.deinit(self.allocator);
        }
        self.wall.deinit(self.allocator);
        self.events.deinit(self.allocator);
    }

    pub fn toJson(self: *const GameState, allocator: std.mem.Allocator) ![]u8 {
        return self.toJsonForViewer(allocator, 0);
    }

    pub fn clearEvents(self: *GameState) void {
        self.events.clearRetainingCapacity();
    }

    pub fn toJsonForViewer(self: *const GameState, allocator: std.mem.Allocator, viewer_player_id: u8) ![]u8 {
        var output: std.Io.Writer.Allocating = .init(allocator);
        defer output.deinit();

        const writer = &output.writer;
        try writer.writeAll("{\"players\":[");

        for (self.players, 0..) |player, player_index| {
            if (player_index > 0) {
                try writer.writeByte(',');
            }

            try writer.print("{{\"player_id\":{},", .{player_index});
            if (player_index == viewer_player_id) {
                try writer.writeAll("\"hand\":");
                try writeTileIdList(writer, player.hand.items);
            } else {
                try writer.print("\"hand_count\":{}", .{player.hand.items.len});
            }

            try writer.writeAll(",\"melds\":");
            try writeMeldList(writer, player.melds.items);
            try writer.writeAll(",\"discards\":");
            try writeIdList(writer, player.discards.items);
            try writer.writeByte('}');
        }

        try writer.writeAll("],\"wall_count\":");
        try writer.print("{}", .{self.wall.items.len});
        try writer.writeAll(",\"round_wind\":");
        try writeStringValue(writer, @tagName(self.round_wind));
        try writer.writeAll(",\"round_number\":");
        try writer.print("{}", .{self.round_number});
        try writer.writeAll(",\"dealer_player_id\":");
        try writer.print("{}", .{self.dealer_player_id});
        try writer.writeAll(",\"current_player_id\":");
        try writer.print("{}", .{self.current_player_id});
        try writer.writeAll(",\"drawn_tile_id\":");
        if (self.drawn_tile_id) |drawn_tile_id| {
            try writer.print("{}", .{drawn_tile_id});
        } else {
            try writer.writeAll("null");
        }
        try writer.writeAll(",\"scores\":[");
        for (self.scores, 0..) |score, index| {
            if (index > 0) {
                try writer.writeByte(',');
            }
            try writer.print("{}", .{score});
        }
        try writer.writeByte(']');
        try writer.writeAll(",\"events\":");
        try writeEventList(writer, self.events.items);
        try writer.writeByte('}');

        return output.toOwnedSlice();
    }
};

fn writeTileIdList(writer: anytype, tiles: []const tile.Tile) !void {
    try writer.writeByte('[');
    for (tiles, 0..) |entry, index| {
        if (index > 0) {
            try writer.writeByte(',');
        }
        try writer.print("{}", .{entry.id});
    }
    try writer.writeByte(']');
}

fn writeIdList(writer: anytype, ids: []const u8) !void {
    try writer.writeByte('[');
    for (ids, 0..) |id, index| {
        if (index > 0) {
            try writer.writeByte(',');
        }
        try writer.print("{}", .{id});
    }
    try writer.writeByte(']');
}

fn writeMeldList(writer: anytype, melds: []const Meld) !void {
    try writer.writeByte('[');
    for (melds, 0..) |meld, meld_index| {
        if (meld_index > 0) {
            try writer.writeByte(',');
        }

        try writer.writeAll("{\"type\":");
        try writeStringValue(writer, @tagName(meld.kind));
        try writer.writeAll(",\"tiles\":[");
        for (meld.tiles[0..meld.tile_count], 0..) |tile_id, tile_index| {
            if (tile_index > 0) {
                try writer.writeByte(',');
            }
            try writer.print("{}", .{tile_id});
        }
        try writer.writeAll("],\"source_index\":");
        if (meld.source_index) |source_index| {
            try writer.print("{}", .{source_index});
        } else {
            try writer.writeAll("null");
        }
        try writer.writeByte('}');
    }
    try writer.writeByte(']');
}

fn writeEventList(writer: anytype, events: []const GameEvent) !void {
    try writer.writeByte('[');
    for (events, 0..) |event, index| {
        if (index > 0) {
            try writer.writeByte(',');
        }
        try writer.writeAll("{\"type\":");
        try writeStringValue(writer, @tagName(event.kind));
        try writer.writeAll(",\"player_id\":");
        try writer.print("{}", .{event.player_id});
        try writer.writeAll(",\"tile_id\":");
        try writer.print("{}", .{event.tile_id});
        try writer.writeByte('}');
    }
    try writer.writeByte(']');
}

fn writeStringValue(writer: anytype, value: []const u8) !void {
    try writer.print("\"{s}\"", .{value});
}

test "GameState JSON exposes player hand and hides AI hands" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    var state = GameState.init(allocator);
    defer state.deinit();

    try state.players[0].hand.append(allocator, catalog[0]);
    try state.players[0].hand.append(allocator, catalog[1]);
    try state.players[1].hand.append(allocator, catalog[2]);
    try state.players[1].melds.append(allocator, Meld.init(.pon, &[_]u8{ 10, 11, 12 }, 0));
    try state.players[1].discards.append(allocator, 30);
    try state.wall.append(allocator, catalog[3]);
    try state.events.append(allocator, .{
        .kind = .bonus_tile,
        .player_id = 1,
        .tile_id = 136,
    });
    state.drawn_tile_id = 1;
    state.scores = .{ 12, -4, -4, -4 };

    const json = try state.toJson(allocator);
    defer allocator.free(json);

    try std.testing.expect(std.mem.indexOf(u8, json, "\"hand\":[0,1]") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"hand_count\":1") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"events\":[{\"type\":\"bonus_tile\",\"player_id\":1,\"tile_id\":136}]") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"drawn_tile_id\":1") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"wall_count\":1") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"scores\":[12,-4,-4,-4]") != null);
}

test "GameState JSON preserves meld schema" {
    const allocator = std.testing.allocator;
    var state = GameState.init(allocator);
    defer state.deinit();

    try state.players[0].melds.append(allocator, Meld.init(.chi, &[_]u8{ 3, 4, 5 }, 2));

    const json = try state.toJson(allocator);
    defer allocator.free(json);

    try std.testing.expect(std.mem.indexOf(u8, json, "\"melds\":[{\"type\":\"chi\",\"tiles\":[3,4,5],\"source_index\":2}]") != null);
}
