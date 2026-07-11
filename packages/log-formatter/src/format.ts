import { pc } from "./colors.ts";
import { colorizeLevel, toLevelName, type LevelName } from "./levels.ts";

export interface FormatterOptions {
  /** Tag rendered in brackets, Vite-style (e.g. `[graphql]`). Defaults to "graphql". */
  name?: string;
}

interface PinoLog {
  level?: unknown;
  time?: number;
  msg?: string;
  message?: string;
  responseTime?: number;
  operationName?: string;
  req?: { method?: string; url?: string };
  res?: { statusCode?: number };
  err?: { message?: string; stack?: string; type?: string };
  [key: string]: unknown;
}

const NEWLINE = "\n";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const formatTime = (time?: number): string => {
  const date = typeof time === "number" ? new Date(time) : new Date();
  return pc.dim(date.toLocaleTimeString());
};

const formatTag = (name: string, level: LevelName): string =>
  pc.bold(colorizeLevel(level, `[${name}]`));

const formatStatusCode = (statusCode?: number): string => {
  if (typeof statusCode !== "number") {
    return "";
  }

  const text = String(statusCode);
  if (statusCode >= 500) {
    return pc.red(text);
  }
  if (statusCode >= 400) {
    return pc.yellow(text);
  }
  if (statusCode >= 300) {
    return pc.cyan(text);
  }
  return pc.green(text);
};

const formatDuration = (ms?: number): string => {
  if (typeof ms !== "number" || Number.isNaN(ms)) {
    return "";
  }

  if (ms >= 1000) {
    return pc.dim(`${(ms / 1000).toFixed(2)}s`);
  }

  const rounded = ms >= 100 ? Math.round(ms) : Math.round(ms * 10) / 10;
  return pc.dim(`${rounded}ms`);
};

const firstStackFrame = (stack?: string): string => {
  if (!stack) {
    return "";
  }

  const frame = stack.split(NEWLINE).find((line) => line.trim().startsWith("at "));
  return frame ? pc.dim(frame.trim()) : "";
};

const buildMessage = (log: PinoLog, level: LevelName): string => {
  const parts: string[] = [];
  const message = log.msg ?? log.message;
  const isError = level === "error" || level === "fatal";

  if (isObject(log.req)) {
    const { method, url } = log.req;
    const target = [method, url].filter(Boolean).join(" ");
    if (target) {
      parts.push(pc.dim("→"), target);
    }
  } else if (isObject(log.res)) {
    const status = formatStatusCode(log.res.statusCode);
    const duration = formatDuration(log.responseTime);
    const segment = [status, duration].filter(Boolean).join(" ");
    if (segment) {
      parts.push(pc.dim("←"), segment);
    }
  } else {
    // Lean operation log: a GraphQL operation name (when present) is the label,
    // and timing is folded onto the same line, e.g. `ListPosts 12.4ms`.
    const label = log.operationName ?? message;
    if (label) {
      parts.push(isError ? pc.red(label) : label);
    }

    const duration = formatDuration(log.responseTime);
    if (duration) {
      parts.push(duration);
    }
  }

  if (isError && isObject(log.err)) {
    const errMessage = typeof log.err.message === "string" ? log.err.message : "";
    if (errMessage && errMessage !== message && errMessage !== log.operationName) {
      parts.push(pc.red(errMessage));
    }

    const frame = firstStackFrame(log.err.stack);
    if (frame) {
      parts.push(frame);
    }
  }

  return parts.filter(Boolean).join(" ");
};

/**
 * Formats a single pino log record into a compact, Vite-style line:
 *
 *   6:40:01 PM [graphql] server ready
 *   6:40:01 PM [graphql] ListPosts 12.4ms
 *
 * Non-pino input (no recognizable `level`) is passed through untouched so the
 * stream never swallows stray output.
 */
export const formatLog = (input: unknown, options: FormatterOptions = {}): string => {
  const name = options.name ?? "graphql";

  if (!isObject(input)) {
    return typeof input === "string" ? input : String(input);
  }

  const log = input as PinoLog;
  const level = toLevelName(log.level);

  if (!level) {
    const fallback = log.msg ?? log.message;
    return typeof fallback === "string" ? fallback : JSON.stringify(log);
  }

  return [formatTime(log.time), formatTag(name, level), buildMessage(log, level)]
    .filter(Boolean)
    .join(" ");
};
