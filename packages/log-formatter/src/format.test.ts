import { describe, expect, it } from "vite-plus/test";

import { formatLog } from "./format.ts";

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;
const strip = (value: string) => value.replace(ANSI, "");

const TIME = Date.parse("2026-06-26T18:40:01");

describe("formatLog", () => {
  it("renders a compact info line with the tag and message", () => {
    const line = strip(formatLog({ level: 30, time: TIME, msg: "ready" }));
    expect(line).toContain("[graphql]");
    expect(line).toContain("ready");
    expect(line).not.toContain("\n");
  });

  it("uses a custom tag name when provided", () => {
    const line = strip(formatLog({ level: 30, msg: "hi" }, { name: "api" }));
    expect(line).toContain("[api]");
  });

  it("maps numeric pino levels to names (no crash, still tagged)", () => {
    for (const level of [10, 20, 30, 40, 50, 60]) {
      const line = strip(formatLog({ level, msg: "x" }));
      expect(line).toContain("[graphql]");
      expect(line).toContain("x");
    }
  });

  it("formats incoming requests as an arrow + method + url", () => {
    const line = strip(
      formatLog({
        level: 30,
        msg: "incoming request",
        req: { method: "POST", url: "/graphql" },
      }),
    );
    expect(line).toContain("→ POST /graphql");
    expect(line).not.toContain("incoming request");
  });

  it("formats responses as an arrow + status + duration", () => {
    const line = strip(
      formatLog({
        level: 30,
        msg: "request completed",
        res: { statusCode: 200 },
        responseTime: 12.4,
      }),
    );
    expect(line).toContain("← 200");
    expect(line).toContain("12.4ms");
    expect(line).not.toContain("request completed");
  });

  it("renders sub-second durations over 1s in seconds", () => {
    const line = strip(formatLog({ level: 30, res: { statusCode: 500 }, responseTime: 1500 }));
    expect(line).toContain("1.50s");
  });

  it("combines the GraphQL operation name and timing into one lean line", () => {
    const line = strip(formatLog({ level: 30, operationName: "ListPosts", responseTime: 12.4 }));
    expect(line).toContain("ListPosts");
    expect(line).toContain("12.4ms");
    expect(line).not.toContain("→");
    expect(line).not.toContain("←");
  });

  it("shows the error message and first stack frame for errors", () => {
    const line = strip(
      formatLog({
        level: 50,
        msg: "boom",
        err: {
          message: "kaboom",
          stack: "Error: kaboom\n    at handler (src/x.ts:1:1)\n    at next",
        },
      }),
    );
    expect(line).toContain("boom");
    expect(line).toContain("kaboom");
    expect(line).toContain("at handler (src/x.ts:1:1)");
  });

  it("passes through plain strings untouched", () => {
    expect(formatLog("just text")).toBe("just text");
  });

  it("falls back to msg for objects without a recognizable level", () => {
    expect(formatLog({ msg: "no level here" })).toBe("no level here");
  });
});
