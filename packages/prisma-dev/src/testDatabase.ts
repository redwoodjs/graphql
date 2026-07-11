import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPostgresSocketUrl, PgserveTestProvider } from "@rwgql/pgserve-dev";

const DEFAULT_TEST_DATABASE_NAME = "template_test";

export interface EphemeralTestDatabaseOptions {
  /** Module URL of the db workspace package (for example test-apps/db/index.ts). */
  dbModuleUrl: string;
  databaseName?: string;
}

let provider: PgserveTestProvider | null = null;

function resolveDbPackageRoot(dbModuleUrl: string): string {
  return resolve(dirname(fileURLToPath(dbModuleUrl)));
}

function resolvePgserveBinPath(dbPackageRoot: string): string {
  const requireFromDb = createRequire(resolve(dbPackageRoot, "package.json"));

  try {
    return requireFromDb.resolve("pgserve/bin/pgserve-wrapper.cjs");
  } catch {
    throw new Error(
      "Could not resolve pgserve. Add pgserve as a devDependency of the db workspace package.",
    );
  }
}

function resolvePrismaCli(dbPackageRoot: string): string {
  const requireFromDb = createRequire(resolve(dbPackageRoot, "package.json"));

  try {
    return requireFromDb.resolve("prisma/build/index.js");
  } catch {
    throw new Error(
      "Could not resolve prisma. Add prisma as a devDependency of the db workspace package.",
    );
  }
}

function applyDatabaseEnv(databaseUrl: string, prismaDatabaseUrl: string): void {
  process.env.DATABASE_URL = databaseUrl;
  process.env.PRISMA_DATABASE_URL = prismaDatabaseUrl;
  process.env.PRISMA_HIDE_UPDATE_MESSAGE = "true";
}

function runMigrations(dbPackageRoot: string): void {
  const prismaCli = resolvePrismaCli(dbPackageRoot);

  execSync(`node "${prismaCli}" migrate deploy`, {
    cwd: dbPackageRoot,
    env: process.env,
    stdio: "pipe",
  });
}

export async function startEphemeralTestDatabase(
  options: EphemeralTestDatabaseOptions,
): Promise<void> {
  if (provider) {
    return;
  }

  const dbPackageRoot = resolveDbPackageRoot(options.dbModuleUrl);
  const pgserveBinPath = resolvePgserveBinPath(dbPackageRoot);

  provider = new PgserveTestProvider(pgserveBinPath, {
    databaseName: options.databaseName ?? DEFAULT_TEST_DATABASE_NAME,
  });

  await provider.start();

  const databaseName = options.databaseName ?? DEFAULT_TEST_DATABASE_NAME;
  await provider.ensureDatabaseExists(databaseName);

  const databaseUrl = provider.getDatabaseUrl(databaseName);
  const prismaDatabaseUrl = buildPostgresSocketUrl(provider.getPostgresPort(), databaseName);

  applyDatabaseEnv(databaseUrl, prismaDatabaseUrl);
  runMigrations(dbPackageRoot);
}

export async function stopEphemeralTestDatabase(): Promise<void> {
  if (!provider) {
    return;
  }

  await provider.stop();
  provider = null;
}
