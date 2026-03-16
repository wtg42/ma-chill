const std = @import("std");
const core = @import("core");
const game = core.game;
const ipc = core.ipc;
const ai = core.ai;
const protocol = ipc.protocol;
const session_mod = ipc.session;

const PASS_TIMEOUT_MS: u64 = 5_000;

/// 遊戲主程式。
/// 啟動順序：開 UDS socket → spawn TUI → 等待連線 → 推送 init → 執行 playRound。
pub fn main(init: std.process.Init) !void {
    const arena: std.mem.Allocator = init.arena.allocator();
    const socket_path = ipc.server.socketPathFromEnviron(init.environ_map);

    // 1. 開始監聽（先開 socket，確保 TUI 啟動時已就緒）
    var server = try ipc.server.listen(init.io, socket_path);
    defer server.deinit(init.io);

    // 2. Spawn TUI 子程序
    var child = try spawnTui(init.io, arena, init.environ_map, socket_path);
    defer child.kill(init.io);

    // 3. 等待 TUI 連線
    var stream = try server.listener.accept(init.io);
    defer stream.close(init.io);

    var session = session_mod.Session.init(stream, init.io, arena);

    // 4. 初始化牌局
    var catalog = game.tile.generateCatalog();
    const ts = std.Io.Clock.real.now(init.io);
    var prng = std.Random.DefaultPrng.init(@intCast(ts.toMilliseconds()));
    game.deck.shuffle(prng.random(), &catalog);

    const dealer_player_id: u8 = prng.random().intRangeAtMost(u8, 0, 3);
    var game_state = try game.round.initGameState(arena, &catalog, dealer_player_id);
    defer game_state.deinit();

    // 5. 推送 init 訊息
    var init_msg = try game.round.buildInitMessage(arena, &catalog, &game_state, PASS_TIMEOUT_MS / 1000);
    defer init_msg.deinit(arena);
    try session.sendMessage(init_msg);

    // 5.5 等待 TUI 玩家按鍵確認（Lobby 畫面）
    try session.waitForPlayerReady();

    // 6. 執行遊戲迴圈
    var driver = GameDriver{ .session = &session, .pass_timeout_ms = PASS_TIMEOUT_MS };
    const result = try game.round.playRound(arena, &game_state, &driver);

    // 7. 等待 TUI 結束並 log 結果
    const term = try child.wait(init.io);
    std.log.info("Game over. winner={?}, scores={any}, TUI exit={}", .{ result.winner_id, result.scores, term });
}

/// 持有 Session，提供 playRound 所需的 turn_decider、claim_decider、sink。
const GameDriver = struct {
    session: *session_mod.Session,
    pass_timeout_ms: u64,

    /// player 0 從 TUI 讀取動作；AI 玩家呼叫 ai.agent.decide()。
    /// 若可用動作含 pass（副露詢問），player 0 有 timeout；棄牌回合無 timeout。
    pub fn turnDecide(self: *GameDriver, gs: *const game.state.GameState, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
        if (turn_changed.player_id == 0) {
            const has_pass = containsAction(turn_changed.available_actions, .pass);
            const timeout = if (has_pass) self.pass_timeout_ms else null;
            return self.session.receivePlayerAction(timeout);
        }
        return ai.agent.decide(gs, turn_changed.player_id, ai.agent.presets.conservative, turn_changed.available_actions);
    }

    /// claim_decider：同 turnDecide 邏輯（副露詢問永遠有 timeout）。
    pub fn claimDecide(self: *GameDriver, gs: *const game.state.GameState, _: u8, turn_changed: protocol.TurnChangedMessage) !protocol.PlayerActionMessage {
        if (turn_changed.player_id == 0) {
            return self.session.receivePlayerAction(self.pass_timeout_ms);
        }
        return ai.agent.decide(gs, turn_changed.player_id, ai.agent.presets.conservative, turn_changed.available_actions);
    }

    /// 將 playRound 產生的訊息轉發給 TUI。
    pub fn sink(self: *GameDriver, message: protocol.Message) !void {
        try self.session.sendMessage(message);
    }
};

fn containsAction(actions: []const protocol.ActionType, action: protocol.ActionType) bool {
    for (actions) |a| if (a == action) return true;
    return false;
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

test "GameDriver.turnDecide uses AI for non-player-0" {
    const allocator = std.testing.allocator;
    const catalog = game.tile.generateCatalog();
    var game_state = game.state.GameState.init(allocator);
    defer game_state.deinit();
    try game_state.players[1].hand.appendSlice(allocator, catalog[0..17]);

    // 使用 undefined session（AI 路徑不存取 session）
    const dummy_stream: std.Io.net.Stream = undefined;
    const dummy_io: std.Io = undefined;
    var sess = session_mod.Session.init(dummy_stream, dummy_io, allocator);
    var driver = GameDriver{ .session = &sess, .pass_timeout_ms = 5000 };

    var actions = [_]protocol.ActionType{.discard};
    const turn_changed = protocol.TurnChangedMessage{
        .player_id = 1,
        .available_actions = &actions,
    };
    const action = try driver.turnDecide(&game_state, turn_changed);
    try std.testing.expectEqual(protocol.ActionType.discard, action.action);
}
