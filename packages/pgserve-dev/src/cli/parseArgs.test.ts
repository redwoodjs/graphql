import { describe, expect, it } from "vite-plus/test";

import { getStringArg, parseCliArgs } from "./parseArgs.ts";

describe("parseCliArgs", () => {
  it("parses boolean flags", () => {
    expect(parseCliArgs(["--verbose"])).toEqual({ verbose: true });
  });

  it("parses key=value flags", () => {
    expect(parseCliArgs(["--port=8432", "--database=app"])).toEqual({
      port: "8432",
      database: "app",
    });
  });

  it("returns undefined for missing string args", () => {
    const args = parseCliArgs(["--port=8432"]);
    expect(getStringArg(args, "database")).toBeUndefined();
  });
});
