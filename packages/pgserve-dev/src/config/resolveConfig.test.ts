import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { buildPgserveConfigArg } from "./resolveConfig.ts";

describe("buildPgserveConfigArg", () => {
  it("emits an absolute config path", () => {
    const workspaceRoot = path.resolve("/tmp/redwoodGQL");
    const configModule = "apps/db/pgserve.config.ts";

    expect(buildPgserveConfigArg({ workspaceRoot, configModule } as never)).toBe(
      `--config=${path.join(workspaceRoot, configModule)}`,
    );
  });
});
