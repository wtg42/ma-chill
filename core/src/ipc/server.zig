const std = @import("std");
const Io = std.Io;
const protocol = @import("protocol.zig");

pub const default_socket_path = "/tmp/ma-chill.sock";

pub const Server = struct {
    listener: std.Io.net.Server,
    socket_path: []const u8,

    pub fn deinit(self: *Server, io: Io) void {
        self.listener.deinit(io);
        std.Io.Dir.deleteFileAbsolute(io, self.socket_path) catch {};
    }
};

pub fn socketPathFromEnviron(environ_map: *const std.process.Environ.Map) []const u8 {
    return environ_map.get("MA_CHILL_SOCKET") orelse default_socket_path;
}

pub fn listen(io: Io, socket_path: []const u8) !Server {
    // 清除殘留的 socket 檔案，避免 AddressInUse
    std.Io.Dir.deleteFileAbsolute(io, socket_path) catch |err| switch (err) {
        error.FileNotFound => {},
        else => return err,
    };
    const address = try std.Io.net.UnixAddress.init(socket_path);
    return .{
        .listener = try address.listen(io, .{}),
        .socket_path = socket_path,
    };
}

pub fn acceptLoop(server: *Server, allocator: std.mem.Allocator, io: Io, action_handler: anytype) !void {
    while (true) {
        var stream = try server.listener.accept(io);
        defer stream.close(io);
        try dispatchClientMessages(stream, allocator, io, action_handler);
    }
}

pub fn dispatchClientMessages(stream: std.Io.net.Stream, allocator: std.mem.Allocator, io: Io, action_handler: anytype) !void {
    var read_buffer: [4096]u8 = undefined;
    var reader = stream.reader(io, &read_buffer);

    while (true) {
        const line = reader.interface.takeDelimiterExclusive('\n') catch |err| switch (err) {
            error.EndOfStream => break,
            error.ReadFailed => return reader.err.?,
            else => return err,
        };

        var message = try protocol.parseMessage(allocator, line);
        defer message.deinit(allocator);

        switch (message) {
            .player_action => |payload| try action_handler(payload),
            else => {},
        }
    }
}

test "socketPathFromEnviron prefers MA_CHILL_SOCKET" {
    const allocator = std.testing.allocator;
    var env = std.process.Environ.Map.init(allocator);
    defer env.deinit();

    try env.put("MA_CHILL_SOCKET", "/tmp/custom-ma-chill.sock");

    try std.testing.expectEqualStrings("/tmp/custom-ma-chill.sock", socketPathFromEnviron(&env));
}

test "socketPathFromEnviron falls back to default" {
    const allocator = std.testing.allocator;
    var env = std.process.Environ.Map.init(allocator);
    defer env.deinit();

    try std.testing.expectEqualStrings(default_socket_path, socketPathFromEnviron(&env));
}
