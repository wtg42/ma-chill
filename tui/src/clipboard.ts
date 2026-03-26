interface OscRenderer {
  copyToClipboardOSC52(text: string): boolean;
}

export async function copyToClipboard(
  text: string,
  renderer?: OscRenderer,
): Promise<boolean> {
  // OSC 52: best for SSH/tmux remote sessions
  if (renderer) {
    try {
      const ok = renderer.copyToClipboardOSC52(text);
      if (ok) return true;
    } catch {
      // fall through to OS tools
    }
  }

  return await tryOSToolFallback(text);
}

async function tryOSToolFallback(text: string): Promise<boolean> {
  const input = Buffer.from(text);

  // Wayland
  if (process.env.WAYLAND_DISPLAY) {
    if (await spawnTool(["wl-copy"], input)) return true;
  }

  // X11
  if (process.env.DISPLAY) {
    if (await spawnTool(["xclip", "-selection", "clipboard"], input)) return true;
    if (await spawnTool(["xsel", "-bi"], input)) return true;
  }

  // macOS
  if (process.platform === "darwin") {
    if (await spawnTool(["pbcopy"], input)) return true;
  }

  // WSL / Windows
  if (await spawnTool(["clip.exe"], input)) return true;

  return false;
}

async function spawnTool(cmd: string[], input: Buffer): Promise<boolean> {
  try {
    const proc = Bun.spawn({
      cmd,
      stdin: "pipe",
      stdout: "ignore",
      stderr: "ignore",
    });
    proc.stdin.write(input);
    proc.stdin.end();
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}
