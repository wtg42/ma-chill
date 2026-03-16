//! By convention, root.zig is the root source file when making a package.
const std = @import("std");
const Io = std.Io;

pub const game = struct {
    pub const tile = @import("game/tile.zig");
    pub const deck = @import("game/deck.zig");
    pub const state = @import("game/state.zig");
    pub const round = @import("game/round.zig");
    pub const seat_wind = @import("game/seat_wind.zig");
};

pub const ipc = struct {
    pub const protocol = @import("ipc/protocol.zig");
    pub const server = @import("ipc/server.zig");
    pub const session = @import("ipc/session.zig");
};

pub const rules = struct {
    pub const actions = @import("rules/actions.zig");
    pub const safety = @import("rules/safety.zig");
    pub const scoring = @import("rules/scoring.zig");
};

pub const ai = struct {
    pub const agent = @import("ai/agent.zig");
};

/// This is a documentation comment to explain the `printAnotherMessage` function below.
///
/// Accepting an `Io.Writer` instance is a handy way to write reusable code.
pub fn printAnotherMessage(writer: *Io.Writer) Io.Writer.Error!void {
    try writer.print("Run `zig build test` to run the tests.\n", .{});
}

pub fn add(a: i32, b: i32) i32 {
    return a + b;
}

test "basic add functionality" {
    try std.testing.expect(add(3, 7) == 10);
}
