import path from "node:path";

import type { PgserveDevConfig, ResolvedPgserveConfig } from "../types.ts";

export function resolvePgserveConfig(config: PgserveDevConfig): ResolvedPgserveConfig {
  const workspaceRoot = path.resolve(config.workspaceRoot);

  return {
    configModule: config.configModule,
    workspaceRoot,
    databaseName: config.databaseName,
    defaultPort: config.defaultPort,
    dataDir: path.join(workspaceRoot, config.dataDir),
    pgserveBinPath: path.join(workspaceRoot, config.pgserveBinPath),
    appEnvPath: config.appEnvPath ? path.join(workspaceRoot, config.appEnvPath) : undefined,
    appEnvAdapter: config.appEnvAdapter,
    devPorts: config.devPorts,
  };
}

export function buildPgserveConfigArg(config: PgserveDevConfig): string {
  const configPath = path.join(path.resolve(config.workspaceRoot), config.configModule);
  return `--config=${configPath}`;
}
