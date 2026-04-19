import type { GameStateStore } from "./game-state";
import type { ZigInitMessage, ZigStateUpdateMessage, ZigTurnChangedMessage, ZigGameOverMessage } from "./game-state";

const DEFAULT_SOCKET = "/tmp/ma-chill.sock";

type ZigMessage = ZigInitMessage | ZigStateUpdateMessage | ZigTurnChangedMessage | ZigGameOverMessage | { type: string };

let socket: { write: (data: string) => void } | null = null;

/// 將結構化玩家動作送往 Zig core，並保留擴充 claim payload 的空間。
export function sendAction(action: string, tileId?: number, claimTileIds?: number[]): void {
  if (!socket) return;
  const msg: Record<string, unknown> = { type: "player_action", action };
  if (tileId !== undefined) {
    msg.tile_id = tileId;
  }
  if (claimTileIds !== undefined) {
    msg.claim_tile_ids = claimTileIds;
  }
  socket.write(JSON.stringify(msg) + "\n");
}

export function sendPlayerReady(): void {
  if (!socket) return;
  socket.write(JSON.stringify({ type: "player_ready" }) + "\n");
}

export async function connect(store: GameStateStore): Promise<void> {
  const socketPath = process.env.MA_CHILL_SOCKET ?? DEFAULT_SOCKET;

  let lineBuffer = "";

  function handleLine(line: string): void {
    let msg: ZigMessage;
    try {
      msg = JSON.parse(line) as ZigMessage;
    } catch {
      // Malformed JSON — ignore
      return;
    }

    switch (msg.type) {
      case "init":
        store.applyInit(msg as ZigInitMessage);
        break;
      case "state_update":
        store.applyStateUpdate(msg as ZigStateUpdateMessage);
        break;
      case "turn_changed":
        store.applyTurnChanged(msg as ZigTurnChangedMessage);
        break;
      case "game_over":
        store.applyGameOver(msg as ZigGameOverMessage);
        break;
      default:
        // Unknown message type — ignore
        break;
    }
  }

  try {
    const conn = await Bun.connect({
      unix: socketPath,
      socket: {
        data(_sock, data) {
          lineBuffer += Buffer.from(data).toString("utf8");
          const lines = lineBuffer.split("\n");
          // Last element is incomplete (no trailing \n yet) — keep in buffer
          lineBuffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 0) {
              handleLine(trimmed);
            }
          }
        },
        error(_sock, err) {
          console.error("UDS error:", err);
        },
        close() {
          // Socket closed — game likely ended
        },
      },
    });

    socket = {
      write: (data: string) => conn.write(data),
    };
  } catch {
    // Connection failed — render error and exit
    console.error("無法連線至遊戲核心");
    console.error(`Socket path: ${socketPath}`);
    console.error("請先啟動 Zig core 再執行 TUI。");
    process.exit(1);
  }
}
