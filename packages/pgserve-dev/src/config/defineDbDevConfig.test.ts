import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import { defineDbDevConfig } from "./defineDbDevConfig.ts";

const noopAdapter = {
  fromConnection: () => ({}),
  fallback: () => ({}),
};

describe("defineDbDevConfig", () => {
  it("applies package defaults from the config module location", () => {
    const workspaceParent = mkdtempSync(join(tmpdir(), "rwgql-"));
    const workspaceRoot = join(workspaceParent, "redwoodGQL");
    const dbDir = join(workspaceRoot, "test-apps", "db");
    const configPath = join(dbDir, "pgserve.config.ts");

    mkdirSync(dbDir, { recursive: true });
    writeFileSync(join(workspaceRoot, "package.json"), JSON.stringify({ name: "rwgql" }), "utf8");
    writeFileSync(join(dbDir, "package.json"), JSON.stringify({ name: "db" }), "utf8");

    const config = defineDbDevConfig(pathToFileURL(configPath).href, {
      appEnvAdapter: noopAdapter,
      workspaceLevelsUp: 2,
      pgserveBinPath: "test-apps/db/node_modules/pgserve/bin/pgserve-wrapper.cjs",
    });

    expect(config.configModule).toBe("test-apps/db/pgserve.config.ts");
    expect(config.databaseName).toBe("redwoodgql");
    expect(config.defaultPort).toBe(8432);
    expect(config.dataDir).toBe("test-apps/db/.pgserve");
    expect(config.appEnvPath).toBe("test-apps/db/.env");
    expect(config.devPorts).toEqual([8910, 8911, 8912, 8913]);
    expect(config.appEnvAdapter).toBe(noopAdapter);
    expect(config.pgserveBinPath).toBe("test-apps/db/node_modules/pgserve/bin/pgserve-wrapper.cjs");
  });

  it("resolves pgserve from the db package devDependencies", () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
    const configPath = join(repoRoot, "test-apps/db/pgserve.config.ts");

    const config = defineDbDevConfig(pathToFileURL(configPath).href, {
      appEnvAdapter: noopAdapter,
    });

    expect(config.pgserveBinPath).toContain("pgserve/bin/pgserve-wrapper.cjs");
    // databaseName defaults to the sanitized checkout directory name, which
    // varies by environment (e.g. "redwoodgql" locally, "workspace" in CI),
    // so derive the expectation from the real repo root instead of hardcoding.
    const expectedDatabaseName = basename(repoRoot)
      .replace(/[^a-z0-9_]/gi, "")
      .toLowerCase();
    expect(config.databaseName).toBe(expectedDatabaseName);
  });
});
