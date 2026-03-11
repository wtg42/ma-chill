const std = @import("std");
const tile = @import("../game/tile.zig");

pub const ActionType = enum {
    discard,
    chi,
    pon,
    kong,
    win,
    pass,
};

pub const InitMessage = struct {
    tile_catalog: []tile.Tile,
    state_json: []const u8,
    pass_timeout_seconds: u16,
};

pub const StateUpdateMessage = struct {
    state_json: []const u8,
};

pub const TurnChangedMessage = struct {
    player_id: u8,
    available_actions: []ActionType,
};

pub const GameOverMessage = struct {
    winner_id: ?u8,
    scores: [4]i32,
};

pub const PlayerActionMessage = struct {
    action: ActionType,
    tile_id: ?u8,
};

pub const Message = union(enum) {
    init: InitMessage,
    state_update: StateUpdateMessage,
    turn_changed: TurnChangedMessage,
    game_over: GameOverMessage,
    player_action: PlayerActionMessage,

    pub fn deinit(self: *Message, allocator: std.mem.Allocator) void {
        switch (self.*) {
            .init => |payload| {
                allocator.free(payload.tile_catalog);
                allocator.free(payload.state_json);
            },
            .state_update => |payload| allocator.free(payload.state_json),
            .turn_changed => |payload| allocator.free(payload.available_actions),
            .game_over, .player_action => {},
        }
    }
};

pub fn sendMessage(writer: anytype, message: Message) !void {
    switch (message) {
        .init => |payload| {
            try writer.writeAll("{\"type\":\"init\",\"tile_catalog\":");
            try writeTileCatalog(writer, payload.tile_catalog);
            try writer.writeAll(",\"state\":");
            try writer.writeAll(payload.state_json);
            try writer.writeAll(",\"pass_timeout_seconds\":");
            try writer.print("{}", .{payload.pass_timeout_seconds});
            try writer.writeAll("}\n");
        },
        .state_update => |payload| {
            try writer.writeAll("{\"type\":\"state_update\",\"state\":");
            try writer.writeAll(payload.state_json);
            try writer.writeAll("}\n");
        },
        .turn_changed => |payload| {
            try writer.writeAll("{\"type\":\"turn_changed\",\"player_id\":");
            try writer.print("{}", .{payload.player_id});
            try writer.writeAll(",\"available_actions\":");
            try writeActionList(writer, payload.available_actions);
            try writer.writeAll("}\n");
        },
        .game_over => |payload| {
            try writer.writeAll("{\"type\":\"game_over\",\"winner_id\":");
            if (payload.winner_id) |winner_id| {
                try writer.print("{}", .{winner_id});
            } else {
                try writer.writeAll("null");
            }
            try writer.writeAll(",\"scores\":[");
            for (payload.scores, 0..) |score, index| {
                if (index > 0) {
                    try writer.writeByte(',');
                }
                try writer.print("{}", .{score});
            }
            try writer.writeAll("]}\n");
        },
        .player_action => |payload| {
            try writer.writeAll("{\"type\":\"player_action\",\"action\":");
            try writeStringValue(writer, @tagName(payload.action));
            if (payload.tile_id) |tile_id| {
                try writer.writeAll(",\"tile_id\":");
                try writer.print("{}", .{tile_id});
            }
            try writer.writeAll("}\n");
        },
    }
}

pub fn parseMessage(allocator: std.mem.Allocator, input: []const u8) !Message {
    const trimmed = std.mem.trimRight(u8, input, "\r\n");
    var parsed = try std.json.parseFromSlice(std.json.Value, allocator, trimmed, .{});
    defer parsed.deinit();

    const object = parsed.value.object;
    const type_name = try getStringField(object, "type");

    if (std.mem.eql(u8, type_name, "init")) {
        const tile_catalog_value = object.get("tile_catalog") orelse return error.InvalidMessage;
        const state_value = object.get("state") orelse return error.InvalidMessage;
        const pass_timeout_seconds = try getIntField(object, "pass_timeout_seconds", u16);

        const tile_catalog = try parseTileCatalog(allocator, tile_catalog_value);
        errdefer allocator.free(tile_catalog);

        const state_json = try std.json.stringifyAlloc(allocator, state_value, .{});
        errdefer allocator.free(state_json);

        return .{ .init = .{
            .tile_catalog = tile_catalog,
            .state_json = state_json,
            .pass_timeout_seconds = pass_timeout_seconds,
        } };
    }

    if (std.mem.eql(u8, type_name, "state_update")) {
        const state_value = object.get("state") orelse return error.InvalidMessage;
        return .{ .state_update = .{
            .state_json = try std.json.stringifyAlloc(allocator, state_value, .{}),
        } };
    }

    if (std.mem.eql(u8, type_name, "turn_changed")) {
        const action_values = object.get("available_actions") orelse return error.InvalidMessage;
        return .{ .turn_changed = .{
            .player_id = try getIntField(object, "player_id", u8),
            .available_actions = try parseActionList(allocator, action_values),
        } };
    }

    if (std.mem.eql(u8, type_name, "game_over")) {
        const scores_value = object.get("scores") orelse return error.InvalidMessage;
        return .{ .game_over = .{
            .winner_id = try parseOptionalIntField(object, "winner_id", u8),
            .scores = try parseScores(scores_value),
        } };
    }

    if (std.mem.eql(u8, type_name, "player_action")) {
        const action_name = try getStringField(object, "action");
        return .{ .player_action = .{
            .action = std.meta.stringToEnum(ActionType, action_name) orelse return error.InvalidMessage,
            .tile_id = try parseOptionalIntField(object, "tile_id", u8),
        } };
    }

    return error.InvalidMessage;
}

fn writeTileCatalog(writer: anytype, tiles: []const tile.Tile) !void {
    try writer.writeByte('[');
    for (tiles, 0..) |entry, index| {
        if (index > 0) {
            try writer.writeByte(',');
        }
        try writer.writeAll("{\"id\":");
        try writer.print("{}", .{entry.id});
        try writer.writeAll(",\"suit\":");
        try writeStringValue(writer, @tagName(entry.suit));
        try writer.writeAll(",\"rank\":");
        try writeStringValue(writer, @tagName(entry.rank));
        try writer.writeAll(",\"copy_index\":");
        try writer.print("{}", .{entry.copy_index});
        try writer.writeByte('}');
    }
    try writer.writeByte(']');
}

fn writeActionList(writer: anytype, actions: []const ActionType) !void {
    try writer.writeByte('[');
    for (actions, 0..) |action, index| {
        if (index > 0) {
            try writer.writeByte(',');
        }
        try writeStringValue(writer, @tagName(action));
    }
    try writer.writeByte(']');
}

fn writeStringValue(writer: anytype, value: []const u8) !void {
    try writer.print("\"{s}\"", .{value});
}

fn parseTileCatalog(allocator: std.mem.Allocator, value: std.json.Value) ![]tile.Tile {
    if (value != .array) {
        return error.InvalidMessage;
    }

    const items = try allocator.alloc(tile.Tile, value.array.items.len);
    errdefer allocator.free(items);

    for (value.array.items, 0..) |item, index| {
        if (item != .object) {
            return error.InvalidMessage;
        }

        const object = item.object;
        const suit_name = try getStringField(object, "suit");
        const rank_name = try getStringField(object, "rank");
        items[index] = .{
            .id = try getIntField(object, "id", u8),
            .suit = std.meta.stringToEnum(tile.Suit, suit_name) orelse return error.InvalidMessage,
            .rank = std.meta.stringToEnum(tile.Rank, rank_name) orelse return error.InvalidMessage,
            .copy_index = try getIntField(object, "copy_index", u8),
        };
    }

    return items;
}

fn parseActionList(allocator: std.mem.Allocator, value: std.json.Value) ![]ActionType {
    if (value != .array) {
        return error.InvalidMessage;
    }

    const actions = try allocator.alloc(ActionType, value.array.items.len);
    errdefer allocator.free(actions);

    for (value.array.items, 0..) |item, index| {
        if (item != .string) {
            return error.InvalidMessage;
        }
        actions[index] = std.meta.stringToEnum(ActionType, item.string) orelse return error.InvalidMessage;
    }

    return actions;
}

fn parseScores(value: std.json.Value) ![4]i32 {
    if (value != .array or value.array.items.len != 4) {
        return error.InvalidMessage;
    }

    var scores: [4]i32 = undefined;
    for (value.array.items, 0..) |item, index| {
        if (item != .integer) {
            return error.InvalidMessage;
        }
        scores[index] = std.math.cast(i32, item.integer) orelse return error.InvalidMessage;
    }
    return scores;
}

fn getStringField(object: std.json.ObjectMap, field_name: []const u8) ![]const u8 {
    const value = object.get(field_name) orelse return error.InvalidMessage;
    if (value != .string) {
        return error.InvalidMessage;
    }
    return value.string;
}

fn getIntField(object: std.json.ObjectMap, field_name: []const u8, comptime Int: type) !Int {
    const value = object.get(field_name) orelse return error.InvalidMessage;
    if (value != .integer) {
        return error.InvalidMessage;
    }
    return std.math.cast(Int, value.integer) orelse return error.InvalidMessage;
}

fn parseOptionalIntField(object: std.json.ObjectMap, field_name: []const u8, comptime Int: type) !?Int {
    const value = object.get(field_name) orelse return null;
    if (value == .null) {
        return null;
    }
    if (value != .integer) {
        return error.InvalidMessage;
    }
    return std.math.cast(Int, value.integer) orelse return error.InvalidMessage;
}

test "player_action message roundtrip" {
    const allocator = std.testing.allocator;
    const message: Message = .{ .player_action = .{
        .action = .discard,
        .tile_id = 12,
    } };

    var writer: std.Io.Writer.Allocating = .init(allocator);
    defer writer.deinit();
    try sendMessage(&writer.writer, message);

    var parsed = try parseMessage(allocator, writer.written());
    defer parsed.deinit(allocator);

    switch (parsed) {
        .player_action => |payload| {
            try std.testing.expectEqual(ActionType.discard, payload.action);
            try std.testing.expectEqual(@as(?u8, 12), payload.tile_id);
        },
        else => return error.TestUnexpectedResult,
    }
}

test "turn_changed message roundtrip" {
    const allocator = std.testing.allocator;
    const actions = [_]ActionType{ .chi, .pon, .discard };
    const message: Message = .{ .turn_changed = .{
        .player_id = 2,
        .available_actions = &actions,
    } };

    var writer: std.Io.Writer.Allocating = .init(allocator);
    defer writer.deinit();
    try sendMessage(&writer.writer, message);

    var parsed = try parseMessage(allocator, writer.written());
    defer parsed.deinit(allocator);

    switch (parsed) {
        .turn_changed => |payload| {
            try std.testing.expectEqual(@as(u8, 2), payload.player_id);
            try std.testing.expectEqual(@as(usize, 3), payload.available_actions.len);
            try std.testing.expectEqual(ActionType.chi, payload.available_actions[0]);
            try std.testing.expectEqual(ActionType.pon, payload.available_actions[1]);
            try std.testing.expectEqual(ActionType.discard, payload.available_actions[2]);
        },
        else => return error.TestUnexpectedResult,
    }
}

test "init and state_update messages roundtrip" {
    const allocator = std.testing.allocator;
    const catalog = tile.generateCatalog();
    const init_message: Message = .{ .init = .{
        .tile_catalog = catalog[0..2],
        .state_json = "{\"players\":[],\"wall_count\":80}",
        .pass_timeout_seconds = 5,
    } };

    var init_writer: std.Io.Writer.Allocating = .init(allocator);
    defer init_writer.deinit();
    try sendMessage(&init_writer.writer, init_message);

    var parsed_init = try parseMessage(allocator, init_writer.written());
    defer parsed_init.deinit(allocator);

    switch (parsed_init) {
        .init => |payload| {
            try std.testing.expectEqual(@as(usize, 2), payload.tile_catalog.len);
            try std.testing.expectEqual(@as(u16, 5), payload.pass_timeout_seconds);
            try std.testing.expect(std.mem.indexOf(u8, payload.state_json, "\"wall_count\":80") != null);
        },
        else => return error.TestUnexpectedResult,
    }

    const update_message: Message = .{ .state_update = .{
        .state_json = "{\"events\":[{\"type\":\"bonus_tile\",\"player_id\":0,\"tile_id\":136}]}",
    } };

    var update_writer: std.Io.Writer.Allocating = .init(allocator);
    defer update_writer.deinit();
    try sendMessage(&update_writer.writer, update_message);

    var parsed_update = try parseMessage(allocator, update_writer.written());
    defer parsed_update.deinit(allocator);

    switch (parsed_update) {
        .state_update => |payload| {
            try std.testing.expect(std.mem.indexOf(u8, payload.state_json, "\"bonus_tile\"") != null);
        },
        else => return error.TestUnexpectedResult,
    }
}

test "game_over message roundtrip" {
    const allocator = std.testing.allocator;
    const message: Message = .{ .game_over = .{
        .winner_id = null,
        .scores = .{ 10, -5, 0, -5 },
    } };

    var writer: std.Io.Writer.Allocating = .init(allocator);
    defer writer.deinit();
    try sendMessage(&writer.writer, message);

    var parsed = try parseMessage(allocator, writer.written());
    defer parsed.deinit(allocator);

    switch (parsed) {
        .game_over => |payload| {
            try std.testing.expectEqual(@as(?u8, null), payload.winner_id);
            try std.testing.expectEqual(@as(i32, 10), payload.scores[0]);
            try std.testing.expectEqual(@as(i32, -5), payload.scores[1]);
            try std.testing.expectEqual(@as(i32, 0), payload.scores[2]);
            try std.testing.expectEqual(@as(i32, -5), payload.scores[3]);
        },
        else => return error.TestUnexpectedResult,
    }
}
