import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import {
  buildConnectionEnv,
  getConnectionEnvPath,
  persistConnectionEnv,
  readConnectionEnv,
} from "./connectionEnv.ts";
import type { ResolvedPgserveConfig } from "../types.ts";

const testConfig = (dataDir: string): ResolvedPgserveConfig => ({
  configModule: "apps/db/pgserve.config.ts",
  workspaceRoot: "/tmp",
  databaseName: "redwoodgql",
  defaultPort: 8432,
  dataDir,
  pgserveBinPath: "/tmp/apps/db/node_modules/pgserve/bin/pgserve-wrapper.cjs",
});

describe("connectionEnv", () => {
  it("round-trips wrapper pid in connection env files", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "pgserve-dev-"));
    const connection = persistConnectionEnv(
      buildConnectionEnv({
        connectionEnvPath: join(dataDir, "connection.env"),
        databaseUrl: "postgresql://postgres@127.0.0.1:8432/redwoodgql",
        dataDir,
        routerPort: 8432,
        postgresPort: 8432,
        socketDir: "/tmp",
        wrapperPid: 4242,
      }),
    );

    expect(readFileSync(connection.connectionEnvPath, "utf8")).toContain(
      "PGSERVE_WRAPPER_PID=4242",
    );
    expect(readConnectionEnv(testConfig(dataDir)).wrapperPid).toBe(4242);
  });

  it("reads connection env without wrapper pid", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "pgserve-dev-"));
    const connectionEnvPath = getConnectionEnvPath(testConfig(dataDir));
    writeFileSync(
      connectionEnvPath,
      [
        "DATABASE_URL=postgresql://postgres@127.0.0.1:8432/redwoodgql",
        `PGSERVE_DATA_DIR=${dataDir}`,
        "PGSERVE_PORT=8432",
        "PGSERVE_POSTGRES_PORT=8432",
        "PGSERVE_SOCKET_DIR=/tmp",
        "",
      ].join("\n"),
    );

    expect(readConnectionEnv(testConfig(dataDir)).wrapperPid).toBeUndefined();
  });
});
