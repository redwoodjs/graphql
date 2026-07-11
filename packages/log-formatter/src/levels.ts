import { pc } from "./colors.ts";

export type LevelName = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

type Colorize = (input: string) => string;

const NUMERIC_LEVELS: Record<number, LevelName> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

const LEVEL_COLORS: Record<LevelName, Colorize> = {
  trace: pc.dim,
  debug: pc.magenta,
  info: pc.cyan,
  warn: pc.yellow,
  error: pc.red,
  fatal: (input) => pc.bold(pc.red(input)),
};

/**
 * Normalizes a pino `level` field (numeric like 30, or a string like "info")
 * into a known level name. Returns undefined for values we don't recognize so
 * callers can decide how to handle non-pino input.
 */
export const toLevelName = (level: unknown): LevelName | undefined => {
  if (typeof level === "number") {
    return NUMERIC_LEVELS[level];
  }

  if (typeof level === "string" && level in LEVEL_COLORS) {
    return level as LevelName;
  }

  return undefined;
};

export const colorizeLevel = (level: LevelName, input: string): string =>
  LEVEL_COLORS[level](input);
