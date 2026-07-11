import path from "node:path";
import { pathToFileURL } from "node:url";

import { getStringArg, parseCliArgs, type CliArgs } from "../cli/parseArgs.ts";

import { resolvePgserveConfig } from "./resolveConfig.ts";
import type { PgserveDevConfig, ResolvedPgserveConfig } from "../types.ts";
import { PgserveCliArgKey as CliKeys } from "../types.ts";

function assertPgserveDevConfig(value: unknown, configModule: string): PgserveDevConfig {
  if (!value || typeof value !== "object") {
    throw new Error(`Config module ${configModule} must export pgserveDevConfig`);
  }

  const config = value as PgserveDevConfig;
  if (!config.workspaceRoot || !config.databaseName || !config.defaultPort) {
    throw new Error(`Config module ${configModule} is missing required pgserve fields`);
  }

  return config;
}

export async function loadPgserveConfigFromModule(configModule: string): Promise<PgserveDevConfig> {
  const absolutePath = path.resolve(configModule);
  const imported = await import(pathToFileURL(absolutePath).href);
  const config = imported.pgserveDevConfig ?? imported.default;

  return assertPgserveDevConfig(config, configModule);
}

function applyConfigOverrides(config: PgserveDevConfig, args: CliArgs): PgserveDevConfig {
  const portArg = getStringArg(args, CliKeys.Port);
  const dataDirArg = getStringArg(args, CliKeys.DataDir);
  const databaseArg = getStringArg(args, CliKeys.Database);

  let next = config;

  if (portArg !== undefined) {
    const port = Number.parseInt(portArg, 10);
    if (!Number.isInteger(port)) {
      throw new Error(`Invalid --port value: ${portArg}`);
    }
    next = { ...next, defaultPort: port };
  }

  if (dataDirArg !== undefined) {
    const dataDir = path.isAbsolute(dataDirArg)
      ? path.relative(next.workspaceRoot, dataDirArg) || "."
      : dataDirArg;
    next = { ...next, dataDir };
  }

  if (databaseArg !== undefined) {
    next = { ...next, databaseName: databaseArg };
  }

  return next;
}

export async function loadResolvedConfigFromArgv(argv = process.argv.slice(2)): Promise<{
  config: ResolvedPgserveConfig;
  args: CliArgs;
}> {
  const args = parseCliArgs(argv);
  const configModule = getStringArg(args, CliKeys.Config);

  if (!configModule) {
    throw new Error(
      "Missing required --config argument (e.g. --config=/abs/path/to/test-apps/db/pgserve.config.ts)",
    );
  }

  const config = applyConfigOverrides(await loadPgserveConfigFromModule(configModule), args);
  return { config: resolvePgserveConfig(config), args };
}
