import fs from "node:fs";
import path from "node:path";

import { getStringArg } from "../cli/parseArgs.ts";

import { getSocketDir } from "../postgres/urls.ts";
import type { PgserveCliArgs, PgserveConnectionEnv, ResolvedPgserveConfig } from "../types.ts";
import { PgserveCliArgKey as CliKeys } from "../types.ts";

function getDatabaseHost(databaseUrl: string): string {
  return new URL(databaseUrl).hostname;
}

function resolveDataDir(config: ResolvedPgserveConfig, args: PgserveCliArgs = {}): string {
  const override = getStringArg(args, CliKeys.DataDir);
  return path.resolve(override ?? config.dataDir);
}

export function getConnectionEnvPath(
  config: ResolvedPgserveConfig,
  args: PgserveCliArgs = {},
): string {
  return path.join(resolveDataDir(config, args), "connection.env");
}

export function removeConnectionEnvFiles(
  config: ResolvedPgserveConfig,
  args: PgserveCliArgs = {},
): void {
  fs.rmSync(getConnectionEnvPath(config, args), { force: true });
}

export function buildConnectionEnv({
  connectionEnvPath,
  databaseUrl,
  dataDir,
  routerPort,
  postgresPort,
  socketDir,
  wrapperPid,
}: {
  connectionEnvPath: string;
  databaseUrl: string;
  dataDir: string;
  routerPort: number;
  postgresPort: number;
  socketDir: string;
  wrapperPid?: number;
}): PgserveConnectionEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PGSERVE_DATABASE_URL: databaseUrl,
    PGSERVE_HOST: getDatabaseHost(databaseUrl),
    PGSERVE_PORT: String(routerPort),
    PGSERVE_POSTGRES_PORT: String(postgresPort),
    PGSERVE_DATA_DIR: dataDir,
    PGSERVE_SOCKET_DIR: socketDir,
    PGSERVE_CONNECTION_ENV: connectionEnvPath,
  };

  if (wrapperPid !== undefined) {
    env.PGSERVE_WRAPPER_PID = String(wrapperPid);
  }

  return {
    connectionEnvPath,
    databaseUrl,
    dataDir,
    env,
    postgresPort,
    routerPort,
    socketDir,
    wrapperPid,
  };
}

function writeConnectionEnvFile(connection: PgserveConnectionEnv): void {
  fs.mkdirSync(connection.dataDir, { recursive: true });
  const content = [
    `DATABASE_URL=${connection.databaseUrl}`,
    `PGSERVE_PORT=${connection.routerPort}`,
    `PGSERVE_POSTGRES_PORT=${connection.postgresPort}`,
    `PGSERVE_DATA_DIR=${connection.dataDir}`,
    `PGSERVE_SOCKET_DIR=${connection.socketDir}`,
    ...(connection.wrapperPid !== undefined
      ? [`PGSERVE_WRAPPER_PID=${connection.wrapperPid}`]
      : []),
    "",
  ].join("\n");

  fs.writeFileSync(connection.connectionEnvPath, content);
}

export function persistConnectionEnv(connection: PgserveConnectionEnv): PgserveConnectionEnv {
  writeConnectionEnvFile(connection);
  return connection;
}

function parseConnectionEnvFile(connectionEnvPath: string): PgserveConnectionEnv {
  if (!fs.existsSync(connectionEnvPath)) {
    throw new Error(
      `Missing pgserve connection env at ${connectionEnvPath}. Run vp run db#pgserve first.`,
    );
  }

  const values = Object.fromEntries(
    fs
      .readFileSync(connectionEnvPath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0 && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );

  const databaseUrl = values.DATABASE_URL;
  const dataDir = values.PGSERVE_DATA_DIR;
  const socketDir = values.PGSERVE_SOCKET_DIR ?? getSocketDir();
  const routerPort = Number.parseInt(values.PGSERVE_PORT ?? "", 10);
  const postgresPort = Number.parseInt(values.PGSERVE_POSTGRES_PORT ?? "", 10);
  const wrapperPidValue = values.PGSERVE_WRAPPER_PID;
  const wrapperPid =
    wrapperPidValue !== undefined ? Number.parseInt(wrapperPidValue, 10) : undefined;

  if (!databaseUrl || !dataDir || !routerPort || !postgresPort) {
    throw new Error(`Invalid pgserve connection env at ${connectionEnvPath}`);
  }

  return buildConnectionEnv({
    connectionEnvPath,
    databaseUrl,
    dataDir,
    routerPort,
    postgresPort,
    socketDir,
    wrapperPid: Number.isInteger(wrapperPid) && wrapperPid! > 0 ? wrapperPid : undefined,
  });
}

export function readConnectionEnv(
  config: ResolvedPgserveConfig,
  args: PgserveCliArgs = {},
): PgserveConnectionEnv {
  return parseConnectionEnvFile(getConnectionEnvPath(config, args));
}

export async function waitForConnectionEnv(
  config: ResolvedPgserveConfig,
  args: PgserveCliArgs = {},
): Promise<void> {
  const connectionEnvPath = getConnectionEnvPath(config, args);
  const maxAttempts = 300;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (fs.existsSync(connectionEnvPath)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for pgserve connection env at ${connectionEnvPath}`);
}
