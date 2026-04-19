const std = @import("std");
const tile = @import("../game/tile.zig");
const scoring = @import("../rules/scoring.zig");

pub const ScoringDetail = scoring.ScoreResult;

pub const ActionType = enum {
    discard,
    chi,
    pon,
    kong,
    win,
    pass,
};

pub const PhaseKind = enum {
    self_turn,
    discard_reaction,
};

pub const PriorityGroup = enum {
    none,
    win,
    meld,
    chi,
};

pub const ChiOption = struct {
    claim_tile_ids: [2]u8,
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
    phase_kind: PhaseKind,
    available_actions: []ActionType,
    discarded_tile_id: ?u8 = null,
    discarder_player_id: ?u8 = null,
    priority_group: PriorityGroup = .none,
    chi_options: []const ChiOption = &.{},
};

pub const GameOverMessage = struct {
    winner_id: ?u8,
    scores: [4]i32,
    scoring_detail: ?ScoringDetail,
};

pub const PlayerActionMessage = struct {
    action: ActionType,
    tile_id: ?u8,
    claim_tile_ids: ?[]const u8 = null,
};

pub const PlayerReadyMessage = struct {};

pub const Message = union(enum) {
    init: InitMessage,
    state_update: StateUpdateMessage,
    turn_changed: TurnChangedMessage,
    game_over: GameOverMessage,
    player_action: PlayerActionMessage,
    player_ready: PlayerReadyMessage,

    pub fn deinit(self: *Message, allocator: std.mem.Allocator) void {
        switch (self.*) {
            .init => |payload| {
                allocator.free(payload.tile_catalog);
                allocator.free(payload.state_json);
            },
            .state_update => |payload| allocator.free(payload.state_json),
            .turn_changed => |payload| {
                allocator.free(payload.available_actions);
                if (payload.chi_options.len > 0) allocator.free(payload.chi_options);
            },
            .game_over, .player_ready => {},
            .player_action => |payload| {
                if (payload.claim_tile_ids) |claim_tile_ids| allocator.free(claim_tile_ids);
            },
        }
    }
};

/// 將協定訊息序列化為 JSONL，供 UDS 雙向通訊使用。
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
            try writer.writeAll(",\"phase_kind\":");
            try writeStringValue(writer, @tagName(payload.phase_kind));
            try writer.writeAll(",\"available_actions\":");
            try writeActionList(writer, payload.available_actions);
            if (payload.discarded_tile_id) |discarded_tile_id| {
                try writer.writeAll(",\"discarded_tile_id\":");
                try writer.print("{}", .{discarded_tile_id});
            }
            if (payload.discarder_player_id) |discarder_player_id| {
                try writer.writeAll(",\"discarder_player_id\":");
                try writer.print("{}", .{discarder_player_id});
            }
            try writer.writeAll(",\"priority_group\":");
            try writeStringValue(writer, @tagName(payload.priority_group));
            if (payload.chi_options.len > 0) {
                try writer.writeAll(",\"chi_options\":");
                try writeChiOptionList(writer, payload.chi_options);
            }
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
            try writer.writeAll("],\"scoring_detail\":");
            if (payload.scoring_detail) |detail| {
                try writer.writeAll("{\"total_fan\":");
                try writer.print("{}", .{detail.total_fan});
                try writer.writeAll(",\"lines\":[");
                var first = true;
                for (detail.lines[0..detail.line_count]) |line_opt| {
                    if (line_opt) |line| {
                        if (!first) try writer.writeByte(',');
                        first = false;
                        try writer.writeAll("{\"pattern\":");
                        try writeStringValue(writer, @tagName(line.pattern));
                        try writer.writeAll(",\"fan\":");
                        try writer.print("{}", .{line.fan});
                        try writer.writeByte('}');
                    }
                }
                try writer.writeAll("]}");
            } else {
                try writer.writeAll("null");
            }
            try writer.writeAll("}\n");
        },
        .player_action => |payload| {
            try writer.writeAll("{\"type\":\"player_action\",\"action\":");
            try writeStringValue(writer, @tagName(payload.action));
            if (payload.tile_id) |tile_id| {
                try writer.writeAll(",\"tile_id\":");
                try writer.print("{}", .{tile_id});
            }
            if (payload.claim_tile_ids) |claim_tile_ids| {
                try writer.writeAll(",\"claim_tile_ids\":");
                try writeU8List(writer, claim_tile_ids);
            }
            try writer.writeAll("}\n");
        },
        .player_ready => {
            try writer.writeAll("{\"type\":\"player_ready\"}\n");
        },
    }
}

/// 將單行 JSON 協定訊息解析回結構化 Message，供 core 與 TUI 共用。
pub fn parseMessage(allocator: std.mem.Allocator, input: []const u8) !Message {
    const trimmed = std.mem.trimEnd(u8, input, "\r\n");
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

        const state_json = try std.json.Stringify.valueAlloc(allocator, state_value, .{});
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
            .state_json = try std.json.Stringify.valueAlloc(allocator, state_value, .{}),
        } };
    }

    if (std.mem.eql(u8, type_name, "turn_changed")) {
        const action_values = object.get("available_actions") orelse return error.InvalidMessage;
        const chi_option_values = object.get("chi_options");
        return .{ .turn_changed = .{
            .player_id = try getIntField(object, "player_id", u8),
            .phase_kind = try parseEnumField(object, "phase_kind", PhaseKind),
            .available_actions = try parseActionList(allocator, action_values),
            .discarded_tile_id = try parseOptionalIntField(object, "discarded_tile_id", u8),
            .discarder_player_id = try parseOptionalIntField(object, "discarder_player_id", u8),
            .priority_group = try parseOptionalEnumField(object, "priority_group", PriorityGroup) orelse .none,
            .chi_options = if (chi_option_values) |value| try parseChiOptionList(allocator, value) else &.{},
        } };
    }

    if (std.mem.eql(u8, type_name, "game_over")) {
        const scores_value = object.get("scores") orelse return error.InvalidMessage;
        return .{ .game_over = .{
            .winner_id = try parseOptionalIntField(object, "winner_id", u8),
            .scores = try parseScores(scores_value),
            .scoring_detail = null, // TUI does not send game_over; ignore on parse
        } };
    }

    if (std.mem.eql(u8, type_name, "player_action")) {
        const action_name = try getStringField(object, "action");
        return .{ .player_action = .{
            .action = std.meta.stringToEnum(ActionType, action_name) orelse return error.InvalidMessage,
            .tile_id = try parseOptionalIntField(object, "tile_id", u8),
            .claim_tile_ids = try parseOptionalU8List(allocator, object, "claim_tile_ids"),
        } };
    }

    if (std.mem.eql(u8, type_name, "player_ready")) {
        return .{ .player_ready = .{} };
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

/// 將吃牌可選組合序列化成 JSON 陣列，供 TUI 顯示具體選項。
fn writeChiOptionList(writer: anytype, chi_options: []const ChiOption) !void {
    try writer.writeByte('[');
    for (chi_options, 0..) |chi_option, index| {
        if (index > 0) {
            try writer.writeByte(',');
        }
        try writer.writeAll("{\"claim_tile_ids\":");
        try writeU8List(writer, &chi_option.claim_tile_ids);
        try writer.writeByte('}');
    }
    try writer.writeByte(']');
}

/// 將 u8 陣列序列化成 JSON 陣列，供 tile id 類欄位共用。
fn writeU8List(writer: anytype, values: []const u8) !void {
    try writer.writeByte('[');
    for (values, 0..) |value, index| {
        if (index > 0) {
            try writer.writeByte(',');
        }
        try writer.print("{}", .{value});
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

/// 解析 turn_changed 中的 chi_options，保留每組吃牌會消耗的兩張 tile id。
fn parseChiOptionList(allocator: std.mem.Allocator, value: std.json.Value) ![]ChiOption {
    if (value != .array) {
        return error.InvalidMessage;
    }

    const chi_options = try allocator.alloc(ChiOption, value.array.items.len);
    errdefer allocator.free(chi_options);

    for (value.array.items, 0..) |item, index| {
        if (item != .object) {
            return error.InvalidMessage;
        }

        const claim_tile_ids_value = item.object.get("claim_tile_ids") orelse return error.InvalidMessage;
        if (claim_tile_ids_value != .array or claim_tile_ids_value.array.items.len != 2) {
            return error.InvalidMessage;
        }
        const first = claim_tile_ids_value.array.items[0];
        const second = claim_tile_ids_value.array.items[1];
        if (first != .integer or second != .integer) {
            return error.InvalidMessage;
        }

        chi_options[index] = .{
            .claim_tile_ids = .{
                std.math.cast(u8, first.integer) orelse return error.InvalidMessage,
                std.math.cast(u8, second.integer) orelse return error.InvalidMessage,
            },
        };
    }

    return chi_options;
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

/// 解析必要 enum 欄位，確保 JSON 字串能對應到合法列舉值。
fn parseEnumField(object: std.json.ObjectMap, field_name: []const u8, comptime Enum: type) !Enum {
    const value = try getStringField(object, field_name);
    return std.meta.stringToEnum(Enum, value) orelse return error.InvalidMessage;
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

/// 解析可選 enum 欄位，欄位不存在或為 null 時回傳 null。
fn parseOptionalEnumField(object: std.json.ObjectMap, field_name: []const u8, comptime Enum: type) !?Enum {
    const value = object.get(field_name) orelse return null;
    if (value == .null) return null;
    if (value != .string) return error.InvalidMessage;
    return std.meta.stringToEnum(Enum, value.string) orelse return error.InvalidMessage;
}

/// 解析可選的 u8 陣列欄位，供 claim_tile_ids 這類 payload 使用。
fn parseOptionalU8List(allocator: std.mem.Allocator, object: std.json.ObjectMap, field_name: []const u8) !?[]u8 {
    const value = object.get(field_name) orelse return null;
    if (value == .null) return null;

    if (value != .array) {
        return error.InvalidMessage;
    }

    const output = try allocator.alloc(u8, value.array.items.len);
    errdefer allocator.free(output);

    for (value.array.items, 0..) |item, index| {
        if (item != .integer) {
            return error.InvalidMessage;
        }
        output[index] = std.math.cast(u8, item.integer) orelse return error.InvalidMessage;
    }

    return output;
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

test "player_action message roundtrip with chi claim_tile_ids" {
    const allocator = std.testing.allocator;
    const claim_tile_ids = [_]u8{ 3, 4 };
    const message: Message = .{ .player_action = .{
        .action = .chi,
        .tile_id = null,
        .claim_tile_ids = &claim_tile_ids,
    } };

    var writer: std.Io.Writer.Allocating = .init(allocator);
    defer writer.deinit();
    try sendMessage(&writer.writer, message);

    var parsed = try parseMessage(allocator, writer.written());
    defer parsed.deinit(allocator);

    switch (parsed) {
        .player_action => |payload| {
            try std.testing.expectEqual(ActionType.chi, payload.action);
            try std.testing.expect(payload.claim_tile_ids != null);
            try std.testing.expectEqualSlices(u8, &claim_tile_ids, payload.claim_tile_ids.?);
        },
        else => return error.TestUnexpectedResult,
    }
}

test "turn_changed message roundtrip" {
    const allocator = std.testing.allocator;
    const actions = [_]ActionType{ .chi, .pon, .discard };
    const message: Message = .{ .turn_changed = .{
        .player_id = 2,
        .phase_kind = .self_turn,
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
            try std.testing.expectEqual(PhaseKind.self_turn, payload.phase_kind);
            try std.testing.expectEqual(@as(usize, 3), payload.available_actions.len);
            try std.testing.expectEqual(ActionType.chi, payload.available_actions[0]);
            try std.testing.expectEqual(ActionType.pon, payload.available_actions[1]);
            try std.testing.expectEqual(ActionType.discard, payload.available_actions[2]);
        },
        else => return error.TestUnexpectedResult,
    }
}

test "turn_changed message roundtrip with discard reaction context" {
    const allocator = std.testing.allocator;
    const actions = [_]ActionType{ .chi, .pass };
    const chi_options = [_]ChiOption{
        .{ .claim_tile_ids = .{ 1, 2 } },
        .{ .claim_tile_ids = .{ 2, 4 } },
    };
    const message: Message = .{ .turn_changed = .{
        .player_id = 0,
        .phase_kind = .discard_reaction,
        .available_actions = &actions,
        .discarded_tile_id = 8,
        .discarder_player_id = 3,
        .priority_group = .chi,
        .chi_options = &chi_options,
    } };

    var writer: std.Io.Writer.Allocating = .init(allocator);
    defer writer.deinit();
    try sendMessage(&writer.writer, message);

    var parsed = try parseMessage(allocator, writer.written());
    defer parsed.deinit(allocator);

    switch (parsed) {
        .turn_changed => |payload| {
            try std.testing.expectEqual(@as(u8, 0), payload.player_id);
            try std.testing.expectEqual(PhaseKind.discard_reaction, payload.phase_kind);
            try std.testing.expectEqual(@as(?u8, 8), payload.discarded_tile_id);
            try std.testing.expectEqual(@as(?u8, 3), payload.discarder_player_id);
            try std.testing.expectEqual(PriorityGroup.chi, payload.priority_group);
            try std.testing.expectEqual(@as(usize, 2), payload.chi_options.len);
            try std.testing.expectEqualSlices(u8, &[_]u8{ 1, 2 }, &payload.chi_options[0].claim_tile_ids);
            try std.testing.expectEqualSlices(u8, &[_]u8{ 2, 4 }, &payload.chi_options[1].claim_tile_ids);
        },
        else => return error.TestUnexpectedResult,
    }
}

test "turn_changed message supports empty const chi_options slice" {
    const allocator = std.testing.allocator;
    const actions = [_]ActionType{ .pass };
    const message: Message = .{ .turn_changed = .{
        .player_id = 1,
        .phase_kind = .discard_reaction,
        .available_actions = &actions,
        .discarded_tile_id = 11,
        .discarder_player_id = 0,
        .priority_group = .chi,
        .chi_options = &.{},
    } };

    var writer: std.Io.Writer.Allocating = .init(allocator);
    defer writer.deinit();
    try sendMessage(&writer.writer, message);

    var parsed = try parseMessage(allocator, writer.written());
    defer parsed.deinit(allocator);

    switch (parsed) {
        .turn_changed => |payload| {
            try std.testing.expectEqual(@as(u8, 1), payload.player_id);
            try std.testing.expectEqual(PhaseKind.discard_reaction, payload.phase_kind);
            try std.testing.expectEqual(PriorityGroup.chi, payload.priority_group);
            try std.testing.expectEqual(@as(usize, 0), payload.chi_options.len);
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
        .scoring_detail = null,
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
