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
    /// timeout_ms 為 null 表示無限等待；非 null 時超過時限自動回傳 pass。
    pub fn receivePlayerAction(self: *Session, timeout_ms: ?u64) !protocol.PlayerActionMessage {
        var read_buffer: [READ_BUFFER_SIZE]u8 = undefined;
        var reader = self.stream.reader(self.io, &read_buffer);

        if (timeout_ms) |ms| {
            // TODO: 使用 std.Io.Timeout 實作非阻塞超時
            // 目前 TUI 尚未實作 IPC，暫時以短暫 sleep 模擬並回傳 pass
            _ = ms;
            return .{ .action = .pass, .tile_id = null };
        }

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

test "Session.receivePlayerAction returns pass on timeout" {
    // timeout_ms 非 null 時，目前實作立即回傳 pass（TODO: 實際 timer）
    const allocator = std.testing.allocator;
    // Session 不需要真實 stream，因為 timeout 路徑不讀取 stream
    // 用零值佔位，不會被呼叫到
    const dummy_stream: std.Io.net.Stream = undefined;
    const dummy_io: std.Io = undefined;
    var session = Session.init(dummy_stream, dummy_io, allocator);
    const result = try session.receivePlayerAction(5000);
    try std.testing.expectEqual(protocol.ActionType.pass, result.action);
    try std.testing.expectEqual(@as(?u8, null), result.tile_id);
}
