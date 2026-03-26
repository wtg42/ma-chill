const std = @import("std");
const protocol = @import("protocol.zig");

const READ_BUFFER_SIZE = 4096;
const WRITE_BUFFER_SIZE = 4096;

/// 封裝與單一 TUI client 的雙向 UDS 連線。
/// 提供 sendMessage（Zig→TUI）與 receivePlayerAction（TUI→Zig）。
pub const Session = struct {
    stream: std.Io.net.Stream,
    io: std.Io,
    allocator: std.mem.Allocator,

    pub fn init(stream: std.Io.net.Stream, io: std.Io, allocator: std.mem.Allocator) Session {
        return .{ .stream = stream, .io = io, .allocator = allocator };
    }

    /// 將訊息以 JSONL 格式傳送給 TUI。
    pub fn sendMessage(self: *Session, message: protocol.Message) !void {
        var write_buffer: [WRITE_BUFFER_SIZE]u8 = undefined;
        var stream_writer = self.stream.writer(self.io, &write_buffer);
        try protocol.sendMessage(&stream_writer.interface, message);
        try stream_writer.interface.flush();
    }

    /// 等待 TUI 傳來 player_ready 訊息。
    /// 非 player_ready 訊息會被略過，繼續等待。
    pub fn waitForPlayerReady(self: *Session) !void {
        var read_buffer: [READ_BUFFER_SIZE]u8 = undefined;
        var reader = self.stream.reader(self.io, &read_buffer);

        while (true) {
            const line = reader.interface.takeDelimiterExclusive('\n') catch |err| switch (err) {
                error.EndOfStream => return error.ConnectionClosed,
                error.ReadFailed => return reader.err.?,
                else => return err,
            };

            var message = protocol.parseMessage(self.allocator, line) catch continue;
            defer message.deinit(self.allocator);

            switch (message) {
                .player_ready => return,
                else => continue,
            }
        }
    }

    /// 等待 TUI 傳來 player_action 訊息。
    /// 非 player_action 訊息會被略過，繼續等待。
    /// Pass timeout 由 TUI 端 auto-pass timer 負責。
    pub fn receivePlayerAction(self: *Session) !protocol.PlayerActionMessage {
        var read_buffer: [READ_BUFFER_SIZE]u8 = undefined;
        var reader = self.stream.reader(self.io, &read_buffer);

        while (true) {
            const line = reader.interface.takeDelimiterExclusive('\n') catch |err| switch (err) {
                error.EndOfStream => return error.ConnectionClosed,
                error.ReadFailed => return reader.err.?,
                else => return err,
            };

            var message = protocol.parseMessage(self.allocator, line) catch continue;
            defer message.deinit(self.allocator);

            switch (message) {
                .player_action => |payload| return payload,
                else => continue,
            }
        }
    }
};

test "Session.sendMessage writes valid JSONL to stream" {
    // 使用 allocating writer 驗證 sendMessage 的輸出格式
    const allocator = std.testing.allocator;
    var buf: std.Io.Writer.Allocating = .init(allocator);
    defer buf.deinit();

    const message: protocol.Message = .{ .turn_changed = .{
        .player_id = 0,
        .available_actions = &.{ .discard, .win },
    } };
    try protocol.sendMessage(&buf.writer, message);

    const output = buf.written();
    try std.testing.expect(std.mem.indexOf(u8, output, "\"type\":\"turn_changed\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, output, "\"player_id\":0") != null);
    try std.testing.expect(output[output.len - 1] == '\n');
}

