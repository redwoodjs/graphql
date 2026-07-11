import { createColors } from "picocolors";

/**
 * pino runs this transport in a worker thread, where stdout is a pipe rather
 * than the terminal. picocolors' auto-detection therefore disables color, so
 * we force it on (this is a dev pretty-printer) while still honoring the
 * standard NO_COLOR / FORCE_COLOR escape hatches.
 */
const isColorEnabled = (): boolean => {
  if (process.env.NO_COLOR) {
    return false;
  }
  if (process.env.FORCE_COLOR === "0") {
    return false;
  }
  return true;
};

export const pc = createColors(isColorEnabled());
