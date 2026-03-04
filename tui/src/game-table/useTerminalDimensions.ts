import { createSignal, onCleanup } from "solid-js";

export interface TerminalDimensions {
  width: number;
  height: number;
}

/**
 * Solid-JS hook to track terminal window dimensions
 * Returns a signal with current {width, height}
 */
export function useTerminalDimensions() {
  const [dimensions, setDimensions] = createSignal<TerminalDimensions>({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  });

  // Listen to resize events
  const resizeHandler = () => {
    setDimensions({
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24,
    });
  };

  process.stdout.on("resize", resizeHandler);

  onCleanup(() => {
    process.stdout.off("resize", resizeHandler);
  });

  return dimensions;
}
