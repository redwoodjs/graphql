import build from "pino-abstract-transport";

import { formatLog, type FormatterOptions } from "./format.ts";

export { formatLog, type FormatterOptions } from "./format.ts";
export { toLevelName, type LevelName } from "./levels.ts";

/**
 * pino transport target. Wire it up the idiomatic Fastify way:
 *
 *   Fastify({ logger: { transport: { target: "@rwgql/log-formatter" } } })
 *
 * pino runs this in a worker thread, hands us already-parsed log objects, and
 * we write a compact Vite-style line to stdout for each one.
 */
export default function logFormatterTransport(options: FormatterOptions = {}) {
  return build(async (source) => {
    for await (const log of source) {
      process.stdout.write(formatLog(log, options) + "\n");
    }
  });
}
