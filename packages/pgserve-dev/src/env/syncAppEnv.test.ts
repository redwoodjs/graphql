import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import type { AppEnvAdapter, ResolvedPgserveConfig } from "../types.ts";
import { setupAppEnvFallback } from "./syncAppEnv.ts";
import { formatAppEnvFile, readAppEnvFile } from "./writeAppEnv.ts";

const testConfig = (appEnvPath: string, adapter: AppEnvAdapter): ResolvedPgserveConfig => ({
  configModule: "apps/db/pgserve.config.ts",
  workspaceRoot: "/tmp",
  databaseName: "redwoodgql",
  defaultPort: 8432,
  dataDir: "/tmp/apps/db/.pgserve",
  pgserveBinPath: "/tmp/apps/db/node_modules/pgserve/bin/pgserve-wrapper.cjs",
  appEnvPath,
  appEnvAdapter: adapter,
});

const originalNodeEnv = process.env.NODE_ENV;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalPrismaUrl = process.env.PRISMA_DATABASE_URL;

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  if (originalPrismaUrl === undefined) {
    delete process.env.PRISMA_DATABASE_URL;
  } else {
    process.env.PRISMA_DATABASE_URL = originalPrismaUrl;
  }
});

describe("syncAppEnv", () => {
  it("writes fallback env via adapter when connection env is missing", () => {
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
    delete process.env.PRISMA_DATABASE_URL;

    const dir = mkdtempSync(join(tmpdir(), "pgserve-dev-"));
    const appEnvPath = join(dir, ".env");
    const adapter: AppEnvAdapter = {
      fromConnection: () => ({ FROM_CONNECTION: "yes" }),
      fallback: () => ({ FALLBACK: "yes" }),
    };

    setupAppEnvFallback(testConfig(appEnvPath, adapter));

    expect(readAppEnvFile(appEnvPath)).toEqual({ FALLBACK: "yes" });
  });

  it("skips writing fallback env in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;
    delete process.env.PRISMA_DATABASE_URL;

    const dir = mkdtempSync(join(tmpdir(), "pgserve-dev-"));
    const appEnvPath = join(dir, ".env");
    const adapter: AppEnvAdapter = {
      fromConnection: () => ({ FROM_CONNECTION: "yes" }),
      fallback: () => ({ FALLBACK: "yes" }),
    };

    setupAppEnvFallback(testConfig(appEnvPath, adapter));

    expect(existsSync(appEnvPath)).toBe(false);
  });

  it("skips writing fallback env when DATABASE_URL is already set", () => {
    delete process.env.NODE_ENV;
    process.env.DATABASE_URL = "postgresql://external/db";
    delete process.env.PRISMA_DATABASE_URL;

    const dir = mkdtempSync(join(tmpdir(), "pgserve-dev-"));
    const appEnvPath = join(dir, ".env");
    const adapter: AppEnvAdapter = {
      fromConnection: () => ({ FROM_CONNECTION: "yes" }),
      fallback: () => ({ FALLBACK: "yes" }),
    };

    setupAppEnvFallback(testConfig(appEnvPath, adapter));

    expect(existsSync(appEnvPath)).toBe(false);
  });

  it("formats quoted env files", () => {
    expect(formatAppEnvFile({ FOO: "bar" })).toBe('FOO="bar"\n');
  });
});
