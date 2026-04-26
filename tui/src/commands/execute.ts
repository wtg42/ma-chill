import { sendAction } from "../connection";
import type { GameStateStore } from "../game-state";
import { formatHandSummaryLines } from "../game-state/hand-summary";
import { formatTileLabel, formatTileShort, tileMatchesToken } from "../tiles";
import type { CanonicalTile } from "../tiles/types";
import { describeAllCommands, findCommandDefinition } from "./registry";
import { parseSlashCommand } from "./parser";

interface ExecuteOptions {
  echo?: boolean;
}

interface CommandResult {
  ok: boolean;
  message: string;
}

interface CommandDeps {
  sendAction: (action: string, tileId?: number, claimTileIds?: number[]) => void;
}

interface ResolvedDiscardSelection {
  tileId: number;
  display: string;
}

const ROUND_WIND_ZH: Record<string, string> = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
};

const PLAYER_NAMES = ["你", "玩家 2", "玩家 3", "玩家 4"];
const DEFAULT_DEPS: CommandDeps = { sendAction };

// 執行使用者輸入的 slash command，統一處理回顯、解析、驗證與送出流程。
export function executeCommand(
  raw: string,
  store: GameStateStore,
  options: ExecuteOptions = {},
  deps: CommandDeps = DEFAULT_DEPS,
): CommandResult {
  const echo = options.echo ?? true;
  const trimmed = raw.trim();

  if (echo && trimmed.length > 0) {
    store.appendEvent("command", `$ ${trimmed}`);
  }

  const parsed = parseSlashCommand(trimmed);
  if (!parsed.ok) {
    store.setCommandFeedback("error", parsed.message);
    store.appendEvent("error", parsed.message);
    return { ok: false, message: parsed.message };
  }

  const definition = findCommandDefinition(parsed.command.name);
  if (!definition) {
    const message = `未知指令：/${parsed.command.name}`;
    store.setCommandFeedback("error", message);
    store.appendEvent("error", message);
    return { ok: false, message };
  }

  if (definition.kind === "local") {
    return executeLocalCommand(definition.name, store);
  }

  return executeActionCommand(definition.action ?? definition.name, parsed.command.args, store, deps);
}

// 以 tile id 直接執行一次棄牌，重用既有 discard 成功路徑。
export function executeDiscardByTileId(
  tileId: number,
  store: GameStateStore,
  deps: CommandDeps = DEFAULT_DEPS,
): CommandResult {
  const tile = store.tileCatalog().get(tileId);
  return commitDiscardSelection(
    {
      tileId,
      display: formatDiscardSelectionDisplay(tile, String(tileId)),
    },
    store,
    deps,
  );
}

// 執行只在 TUI 本地處理的指令，避免不必要的 IPC 往返。
function executeLocalCommand(name: string, store: GameStateStore): CommandResult {
  if (name === "help") {
    const message = describeAllCommands();
    store.setCommandFeedback("info", message);
    store.appendEvent("system", message);
    return { ok: true, message };
  }

  const state = store.gameState();
  if (!state) {
    const message = "目前尚未收到遊戲狀態。";
    store.setCommandFeedback("error", message);
    store.appendEvent("error", message);
    return { ok: false, message };
  }

  if (name === "hand") {
    const lines = formatHandSummaryLines(
      store.handWithIds(),
      state.drawn_tile_id,
      state.drawn_tile_id != null ? store.tileCatalog().get(state.drawn_tile_id) ?? null : null,
    );

    for (const line of lines) {
      store.appendEvent("system", line);
    }

    const message = "已顯示目前手牌。";
    store.setCommandFeedback("info", message);
    return { ok: true, message };
  }

  const current = PLAYER_NAMES[store.currentPlayerId()] ?? `玩家 ${store.currentPlayerId() + 1}`;
  const scores = state.scores.map((score, index) => `${PLAYER_NAMES[index] ?? `玩家 ${index + 1}`} ${score}`).join(" / ");
  const hints = store.availableCommandHints().join(" ");
  const message = `局況：${ROUND_WIND_ZH[state.round_wind] ?? state.round_wind}風 ${state.round_number} 局 | 輪到：${current} | 牌山：${state.wall_count} | 分數：${scores} | 可用：${hints}`;
  store.setCommandFeedback("info", message);
  store.appendEvent("system", message);
  return { ok: true, message };
}

// 執行需要對遊戲核心送出 action 的指令，集中處理前置驗證與成功回饋。
function executeActionCommand(action: string, args: string[], store: GameStateStore, deps: CommandDeps): CommandResult {
  const availableActions = store.availableActions();
  if (!availableActions.includes(action)) {
    const message = `目前不可執行 /${action}。`;
    store.setCommandFeedback("error", message);
    store.appendEvent("error", message);
    return { ok: false, message };
  }

  if (action === "pass" && store.phaseKind() !== "discard_reaction") {
    const message = "/pass 只能在回應視窗使用。";
    store.setCommandFeedback("error", message);
    store.appendEvent("error", message);
    return { ok: false, message };
  }

  if (action === "discard") {
    if (store.phaseKind() !== "self_turn") {
      const message = "/discard 只能在自己的回合使用。";
      store.setCommandFeedback("error", message);
      store.appendEvent("error", message);
      return { ok: false, message };
    }
    const resolved = resolveDiscardTile(args, store);
    if (!resolved.ok) {
      store.setCommandFeedback("error", resolved.message);
      store.appendEvent("error", resolved.message);
      return resolved;
    }
    return commitDiscardSelection(resolved, store, deps);
  }

  if (action === "chi") {
    if (store.phaseKind() !== "discard_reaction") {
      const message = "/chi 只能在回應視窗使用。";
      store.setCommandFeedback("error", message);
      store.appendEvent("error", message);
      return { ok: false, message };
    }

    const resolved = resolveChiOption(args, store);
    if (!resolved.ok) {
      store.setCommandFeedback("error", resolved.message);
      store.appendEvent("error", resolved.message);
      return resolved;
    }
    store.clearTurnPrompt();
    deps.sendAction("chi", undefined, resolved.claimTileIds);
    const message = `已送出 /chi ${resolved.display}`;
    store.setCommandFeedback("success", message);
    store.appendEvent("system", message);
    return { ok: true, message };
  }

  store.clearTurnPrompt();
  deps.sendAction(action);
  const message = `已送出 /${action}`;
  store.setCommandFeedback("success", message);
  store.appendEvent("system", message);
  return { ok: true, message };
}

// 解析 /chi 要使用的吃牌選項，並回傳對應的 claim tile ids。
function resolveChiOption(args: string[], store: GameStateStore):
  | { ok: true; claimTileIds: number[]; display: string; message: string }
  | { ok: false; message: string } {
  const chiOptions = store.claimContext().chiOptions;
  if (chiOptions.length === 0) {
    return { ok: false, message: "目前沒有可用的吃牌選項。" };
  }

  if (chiOptions.length === 1) {
    return {
      ok: true,
      claimTileIds: [...chiOptions[0].claim_tile_ids],
      display: "1",
      message: "",
    };
  }

  const token = args[0]?.trim();
  if (!token) {
    return { ok: false, message: `此刻可吃 ${chiOptions.length} 組，請輸入 /chi <index>。` };
  }
  const index = Number(token);
  if (!Number.isInteger(index) || index < 1 || index > chiOptions.length) {
    return { ok: false, message: `吃牌選項必須介於 1 到 ${chiOptions.length}。` };
  }

  return {
    ok: true,
    claimTileIds: [...chiOptions[index - 1].claim_tile_ids],
    display: String(index),
    message: "",
  };
}

// 將棄牌目標格式化成「短名（中文）」字串，避免成功訊息與事件流看起來像不同張牌。
function formatDiscardSelectionDisplay(tile: CanonicalTile | undefined, fallback: string): string {
  if (!tile) {
    return fallback;
  }
  return `${formatTileShort(tile)}（${formatTileLabel(tile)}）`;
}

// 解析 /discard 的輸入參數，統一支援短 token、drawn 與 tile id。
function resolveDiscardTile(args: string[], store: GameStateStore):
  | { ok: true; tileId: number; display: string; message: string }
  | { ok: false; message: string } {
  const token = args[0]?.trim().toLowerCase();
  if (!token) {
    return { ok: false, message: "用法：/discard <tile|drawn|tile_id>，例如 /discard 7p" };
  }

  const state = store.gameState();
  if (!state) {
    return { ok: false, message: "目前尚未收到遊戲狀態。" };
  }

  if (token === "drawn") {
    if (state.drawn_tile_id == null) {
      return { ok: false, message: "目前沒有可直接打出的摸牌。" };
    }
    const tile = store.tileCatalog().get(state.drawn_tile_id);
    return {
      ok: true,
      tileId: state.drawn_tile_id,
      display: formatDiscardSelectionDisplay(tile, String(state.drawn_tile_id)),
      message: "",
    };
  }

  if (/^\d+$/.test(token)) {
    const tileId = Number(token);
    const handIds = new Set(store.handWithIds().map((entry) => entry.id));
    if (state.drawn_tile_id != null) {
      handIds.add(state.drawn_tile_id);
    }
    if (!handIds.has(tileId)) {
      return { ok: false, message: `你手上沒有 tile_id=${tileId}。` };
    }
    const tile = store.tileCatalog().get(tileId);
    return {
      ok: true,
      tileId,
      display: formatDiscardSelectionDisplay(tile, String(tileId)),
      message: "",
    };
  }

  const handEntries = store.handWithIds();
  const stateDrawnTile = state.drawn_tile_id != null ? store.tileCatalog().get(state.drawn_tile_id) : null;
  const candidates = handEntries.filter((entry) => tileMatchesToken(entry.tile, token));
  if (stateDrawnTile && tileMatchesToken(stateDrawnTile, token)) {
    candidates.push({ id: state.drawn_tile_id!, tile: stateDrawnTile });
  }

  const selected = candidates[0];
  if (!selected) {
    return { ok: false, message: `找不到可打出的牌：${token}` };
  }

  return {
    ok: true,
    tileId: selected.id,
    display: formatDiscardSelectionDisplay(selected.tile, String(selected.id)),
    message: "",
  };
}

// 將已解析的棄牌選擇送入既有成功路徑，統一 prompt 清理、IPC 與回饋訊息。
function commitDiscardSelection(
  resolved: ResolvedDiscardSelection,
  store: GameStateStore,
  deps: CommandDeps,
): CommandResult {
  store.clearTurnPrompt();
  deps.sendAction("discard", resolved.tileId);
  const message = `已送出 /discard ${resolved.display}`;
  store.setCommandFeedback("success", message);
  store.appendEvent("system", message);
  return { ok: true, message };
}
