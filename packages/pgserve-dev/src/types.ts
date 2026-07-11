export type AppEnvVariables = Record<string, string>;

export interface AppEnvAdapter {
  fromConnection(config: ResolvedPgserveConfig, connection: PgserveConnectionEnv): AppEnvVariables;
  fallback(config: ResolvedPgserveConfig): AppEnvVariables;
}

export interface PgserveConnectionEnv {
  connectionEnvPath: string;
  databaseUrl: string;
  dataDir: string;
  env: NodeJS.ProcessEnv;
  postgresPort: number;
  routerPort: number;
  socketDir: string;
  wrapperPid?: number;
}

export interface PgserveDevConfig {
  /** Workspace-relative path to this config module (e.g. test-apps/db/pgserve.config.ts). */
  configModule: string;
  workspaceRoot: string;
  databaseName: string;
  defaultPort: number;
  dataDir: string;
  pgserveBinPath: string;
  /** Relative to workspaceRoot. Defaults to `.env` beside the config file when using definePgserveConfig(). */
  appEnvPath?: string;
  appEnvAdapter?: AppEnvAdapter;
  devPorts?: readonly number[];
}

/** Fully resolved paths and values used at runtime. */
export interface ResolvedPgserveConfig {
  configModule: string;
  workspaceRoot: string;
  databaseName: string;
  defaultPort: number;
  dataDir: string;
  pgserveBinPath: string;
  appEnvPath?: string;
  appEnvAdapter?: AppEnvAdapter;
  devPorts?: readonly number[];
}

export const PGSERVE_READY_MARKER = "PGSERVE_CONNECTION_READY";

export const PgserveCliArgKey = {
  Config: "config",
  DataDir: "data-dir",
  Database: "database",
  Port: "port",
} as const;

export type PgserveCliArgKey = (typeof PgserveCliArgKey)[keyof typeof PgserveCliArgKey];

import type { CliArgs } from "./cli/parseArgs.ts";

export type PgserveCliArgs = CliArgs;

export interface StartLocalDevPgserveOptions {
  detach?: boolean;
  emitReadyMarker?: boolean;
}

export interface StopLocalDevPgserveOptions {
  quiet?: boolean;
}

export interface StartedLocalDevPgserve {
  connectionEnvPath: string;
  databaseUrl: string;
  dataDir: string;
  env: NodeJS.ProcessEnv;
  postgresPort: number;
  provider: import("./provider/pgserveProvider.ts").PgserveProvider | null;
  routerPort: number;
}
