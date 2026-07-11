import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import type { AppEnvAdapter, PgserveDevConfig } from "../types.ts";
import { definePgserveConfig, resolveConfigLocation } from "./defineConfig.ts";

export const DEFAULT_DB_DEV_PORT = 8432;

export const DEFAULT_DEV_PORTS = [8910, 8911, 8912, 8913] as const;

export interface DefineDbDevConfigOptions {
  appEnvAdapter: AppEnvAdapter;
  databaseName?: string;
  defaultPort?: number;
  devPorts?: readonly number[];
  pgserveBinPath?: string;
  workspaceLevelsUp?: number;
}

function defaultDatabaseName(workspaceRoot: string): string {
  return (
    path
      .basename(workspaceRoot)
      .replace(/[^a-z0-9_]/gi, "")
      .toLowerCase() || "app"
  );
}

function resolvePgserveBinPath(configDir: string, workspaceRoot: string): string {
  const requireFromConfig = createRequire(path.join(configDir, "package.json"));
  const pgservePackageJson = requireFromConfig.resolve("pgserve/package.json");
  const pgserveBin = path.join(path.dirname(pgservePackageJson), "bin/pgserve-wrapper.cjs");

  if (!fs.existsSync(pgserveBin)) {
    throw new Error(`Missing pgserve binary at ${pgserveBin}. Add pgserve as a devDependency.`);
  }

  return path.relative(workspaceRoot, pgserveBin);
}

export function defineDbDevConfig(
  moduleUrl: string,
  options: DefineDbDevConfigOptions,
): PgserveDevConfig {
  const levelsUp = options.workspaceLevelsUp ?? 2;
  const { configDir, workspaceRoot } = resolveConfigLocation(moduleUrl, levelsUp);
  const packageDir = path.relative(workspaceRoot, configDir) || ".";

  return definePgserveConfig(moduleUrl, {
    workspaceRoot,
    databaseName: options.databaseName ?? defaultDatabaseName(workspaceRoot),
    defaultPort: options.defaultPort ?? DEFAULT_DB_DEV_PORT,
    dataDir: path.join(packageDir, ".pgserve"),
    pgserveBinPath: options.pgserveBinPath ?? resolvePgserveBinPath(configDir, workspaceRoot),
    appEnvAdapter: options.appEnvAdapter,
    devPorts: options.devPorts ?? DEFAULT_DEV_PORTS,
    workspaceLevelsUp: levelsUp,
  });
}
