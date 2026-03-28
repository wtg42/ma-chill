const std = @import("std");

const ns_per_ms: u64 = 1_000_000;

pub const Phase = enum {
    after_draw_revealed,
    after_turn_prompt,
    after_action_resolved,
    after_claim_prompt,
};

pub const Profile = enum {
    off,
    normal,
};

const DurationRange = struct {
    min_ms: u64,
    max_ms: u64,
};

pub const Sleeper = struct {
    context: ?*anyopaque,
    callback: *const fn (?*anyopaque, u64) void,

    /// 透過注入的 callback 執行等待，讓正式環境與測試可共用同一介面。
    pub fn sleep(self: Sleeper, duration_ns: u64) void {
        self.callback(self.context, duration_ns);
    }

    /// 建立使用真實執行緒 sleep 的 sleeper。
    pub fn thread() Sleeper {
        return .{ .context = null, .callback = threadSleep };
    }
};

pub const Controller = struct {
    profile: Profile,
    sleeper: Sleeper,
    prng: std.Random.DefaultPrng,

    /// 使用指定 profile、seed 與 sleeper 建立 pacing controller。
    pub fn init(profile: Profile, seed: u64, sleeper: Sleeper) Controller {
        return .{
            .profile = profile,
            .sleeper = sleeper,
            .prng = std.Random.DefaultPrng.init(seed),
        };
    }

    /// 在指定 phase 套用 pacing；若 profile 關閉則直接返回。
    pub fn pause(self: *Controller, phase: Phase) void {
        const duration_ns = self.durationFor(phase) orelse return;
        self.sleeper.sleep(duration_ns);
    }

    /// 計算指定 phase 的等待時間；off profile 不產生任何實際延遲。
    pub fn durationFor(self: *Controller, phase: Phase) ?u64 {
        if (self.profile == .off) return null;

        const range = rangeForPhase(phase);
        const duration_ms = if (range.min_ms == range.max_ms)
            range.min_ms
        else
            self.prng.random().intRangeAtMost(u64, range.min_ms, range.max_ms);
        return duration_ms * ns_per_ms;
    }
};

/// 從環境變數解析 AI pacing profile；未知值退回 normal。
pub fn profileFromEnviron(environ_map: *const std.process.Environ.Map) Profile {
    const raw = environ_map.get("MA_CHILL_AI_PACING") orelse return .normal;
    if (std.ascii.eqlIgnoreCase(raw, "off") or std.ascii.eqlIgnoreCase(raw, "disabled") or std.mem.eql(u8, raw, "0")) {
        return .off;
    }
    return .normal;
}

/// 提供各 phase 的預設延遲區間，單位為毫秒。
fn rangeForPhase(phase: Phase) DurationRange {
    return switch (phase) {
        .after_draw_revealed => .{ .min_ms = 260, .max_ms = 420 },
        .after_turn_prompt => .{ .min_ms = 780, .max_ms = 1_180 },
        .after_action_resolved => .{ .min_ms = 220, .max_ms = 340 },
        .after_claim_prompt => .{ .min_ms = 720, .max_ms = 1_020 },
    };
}

/// 正式環境的 sleep 實作，直接交由執行緒阻塞等待。
fn threadSleep(_: ?*anyopaque, duration_ns: u64) void {
    const io = std.Options.debug_io;
    const duration = std.Io.Clock.Duration{
        .clock = .awake,
        .raw = .fromNanoseconds(duration_ns),
    };
    duration.sleep(io) catch unreachable;
}

test "off profile 不會觸發實際等待" {
    const Recorder = struct {
        count: usize = 0,

        /// 記錄 sleep 呼叫次數，供測試驗證用。
        fn callback(ctx: ?*anyopaque, _: u64) void {
            const self: *@This() = @ptrCast(@alignCast(ctx.?));
            self.count += 1;
        }
    };

    var recorder = Recorder{};
    var controller = Controller.init(.off, 42, .{ .context = &recorder, .callback = Recorder.callback });
    controller.pause(.after_turn_prompt);

    try std.testing.expectEqual(@as(usize, 0), recorder.count);
    try std.testing.expectEqual(@as(?u64, null), controller.durationFor(.after_turn_prompt));
}

test "normal profile 會在區間內產生等待時間" {
    const Recorder = struct {
        count: usize = 0,
        last_duration_ns: u64 = 0,

        /// 記錄 sleep 參數，供測試驗證用。
        fn callback(ctx: ?*anyopaque, duration_ns: u64) void {
            const self: *@This() = @ptrCast(@alignCast(ctx.?));
            self.count += 1;
            self.last_duration_ns = duration_ns;
        }
    };

    var recorder = Recorder{};
    var controller = Controller.init(.normal, 7, .{ .context = &recorder, .callback = Recorder.callback });
    controller.pause(.after_claim_prompt);

    try std.testing.expectEqual(@as(usize, 1), recorder.count);
    try std.testing.expect(recorder.last_duration_ns >= 720 * ns_per_ms);
    try std.testing.expect(recorder.last_duration_ns <= 1_020 * ns_per_ms);
}

test "turn prompt 會落在接近一秒的等待區間" {
    var controller = Controller.init(.normal, 11, Sleeper.thread());
    const duration_ns = controller.durationFor(.after_turn_prompt) orelse return error.TestUnexpectedResult;

    try std.testing.expect(duration_ns >= 780 * ns_per_ms);
    try std.testing.expect(duration_ns <= 1_180 * ns_per_ms);
}

test "環境變數可切換到 off profile" {
    const allocator = std.testing.allocator;
    var env = std.process.Environ.Map.init(allocator);
    defer env.deinit();

    try std.testing.expectEqual(Profile.normal, profileFromEnviron(&env));
    try env.put("MA_CHILL_AI_PACING", "off");
    try std.testing.expectEqual(Profile.off, profileFromEnviron(&env));
}

test "thread sleeper 支援零奈秒等待" {
    const sleeper = Sleeper.thread();

    sleeper.sleep(0);
}
