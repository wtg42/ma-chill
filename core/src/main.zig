const std = @import("std");
const game = @import("core").game;
const ipc = @import("core").ipc;

pub fn main(init: std.process.Init) !void {
    const arena: std.mem.Allocator = init.arena.allocator();
    const socket_path = ipc.server.socketPathFromEnviron(init.environ_map);

    var child = try spawnTui(init.io, arena, init.environ_map, socket_path);
    defer child.kill(init.io);

    const term = try child.wait(init.io);
    std.log.info("TUI exited: {}", .{term});
}

fn spawnTui(io: std.Io, allocator: std.mem.Allocator, environ_map: *const std.process.Environ.Map, socket_path: []const u8) !std.process.Child {
    var child_environ = try environ_map.clone(allocator);
    defer child_environ.deinit();

    try child_environ.put("MA_CHILL_SOCKET", socket_path);

    return std.process.spawn(io, .{
        .argv = tuiArgv(isTuiDevMode(environ_map)),
        .environ_map = &child_environ,
        .stdin = .inherit,
        .stdout = .inherit,
        .stderr = .inherit,
    });
}

fn isTuiDevMode(environ_map: *const std.process.Environ.Map) bool {
    return std.mem.eql(u8, environ_map.get("MA_CHILL_TUI_DEV") orelse "0", "1");
}

fn tuiArgv(dev_mode: bool) []const []const u8 {
    return if (dev_mode)
        &.{ "bun", "run", "tui/src/index.tsx" }
    else
        &.{ "bun", "tui/dist/index.js" };
}

test "tuiArgv selects production bundle by default" {
    const argv = tuiArgv(false);

    try std.testing.expectEqual(@as(usize, 2), argv.len);
    try std.testing.expectEqualStrings("bun", argv[0]);
    try std.testing.expectEqualStrings("tui/dist/index.js", argv[1]);
}

test "tuiArgv selects dev entrypoint when enabled" {
    const argv = tuiArgv(true);

    try std.testing.expectEqual(@as(usize, 3), argv.len);
    try std.testing.expectEqualStrings("bun", argv[0]);
    try std.testing.expectEqualStrings("run", argv[1]);
    try std.testing.expectEqualStrings("tui/src/index.tsx", argv[2]);
}

test "isTuiDevMode reads MA_CHILL_TUI_DEV from environment" {
    const allocator = std.testing.allocator;
    var env = std.process.Environ.Map.init(allocator);
    defer env.deinit();

    try std.testing.expect(!isTuiDevMode(&env));
    try env.put("MA_CHILL_TUI_DEV", "1");
    try std.testing.expect(isTuiDevMode(&env));
}

test "mock tui spawn pairs with init message serialization" {
    const allocator = std.testing.allocator;
    const io = std.testing.io;
    var child = try std.process.spawn(io, .{
        .argv = &.{ "/bin/sh", "-c", "exit 0" },
        .stdin = .ignore,
        .stdout = .ignore,
        .stderr = .ignore,
    });
    const term = try child.wait(io);
    try std.testing.expectEqual(@as(u8, 0), term.exited);

    const catalog = game.tile.generateCatalog();
    var game_state = game.state.GameState.init(allocator);
    defer game_state.deinit();
    try game_state.players[0].hand.append(allocator, catalog[0]);

    var init_message = try game.round.buildInitMessage(allocator, &catalog, &game_state, 7);
    defer init_message.deinit(allocator);

    var writer: std.Io.Writer.Allocating = .init(allocator);
    defer writer.deinit();
    try ipc.protocol.sendMessage(&writer.writer, init_message);

    try std.testing.expect(std.mem.indexOf(u8, writer.written(), "\"type\":\"init\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, writer.written(), "\"tile_catalog\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, writer.written(), "\"pass_timeout_seconds\":7") != null);
}
