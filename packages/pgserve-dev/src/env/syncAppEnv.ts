import fs from "node:fs";
import path from "node:path";

import type { PgserveConnectionEnv, ResolvedPgserveConfig } from "../types.ts";
import { hasExternalDatabaseUrl, shouldSkipLocalPgserve } from "./shouldSkipLocalPgserve.ts";
import { writeAppEnvFile } from "./writeAppEnv.ts";

export async function syncAppEnvFromConnection(
  config: ResolvedPgserveConfig,
  connection: PgserveConnectionEnv,
): Promise<void> {
  if (!config.appEnvAdapter || !config.appEnvPath) {
    return;
  }

  writeAppEnvFile(config.appEnvPath, config.appEnvAdapter.fromConnection(config, connection));
}

export function setupAppEnvFallback(config: ResolvedPgserveConfig): void {
  if (!config.appEnvAdapter || !config.appEnvPath) {
    return;
  }

  // Production / external DATABASE_URL: never write localhost fallback .env.
  if (shouldSkipLocalPgserve() || hasExternalDatabaseUrl()) {
    return;
  }

  const connectionEnvPath = path.join(config.dataDir, "connection.env");
  if (fs.existsSync(connectionEnvPath)) {
    return;
  }

  writeAppEnvFile(config.appEnvPath, config.appEnvAdapter.fallback(config));
}
