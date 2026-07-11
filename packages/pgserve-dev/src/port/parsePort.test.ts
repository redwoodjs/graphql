import { describe, expect, it } from "vite-plus/test";

import { parsePort, parseStrictPort } from "./parsePort.ts";

describe("parsePort", () => {
  it("parses valid ports", () => {
    expect(parsePort("8432")).toBe(8432);
    expect(parsePort(8910)).toBe(8910);
  });

  it("returns undefined for invalid ports", () => {
    expect(parsePort("abc")).toBeUndefined();
    expect(parsePort("0")).toBeUndefined();
  });

  it("throws for strict invalid ports", () => {
    expect(() => parseStrictPort("abc", "bad port")).toThrow("bad port");
  });
});
