import { canConnectTcp } from "../postgres/tcp.ts";

const DEFAULT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 250;

const parseDatabaseUrl = (databaseUrl: string) => {
  const url = new URL(databaseUrl);
  const port = url.port ? Number(url.port) : 5432;

  if (!Number.isFinite(port)) {
    throw new Error(`Invalid DATABASE_URL port: ${url.port}`);
  }

  return {
    host: url.hostname,
    port,
  };
};

export async function waitForPostgres(
  host: string,
  port: number,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await canConnectTcp(host, port, POLL_INTERVAL_MS)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for PostgreSQL at ${host}:${port}`);
}

export async function waitForPostgresFromDatabaseUrl(
  databaseUrl: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> {
  const { host, port } = parseDatabaseUrl(databaseUrl);
  await waitForPostgres(host, port, timeoutMs);
  console.info(`PostgreSQL is ready at ${host}:${port}`);
}
