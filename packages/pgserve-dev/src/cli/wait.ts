import { loadResolvedConfigFromArgv } from "../config/loadConfig.ts";
import { waitForPostgresFromDatabaseUrl } from "../wait/waitForPostgres.ts";

async function main() {
  const { config } = await loadResolvedConfigFromArgv();
  const databaseUrl =
    process.env.DATABASE_URL ??
    `postgresql://localhost:${config.defaultPort}/${config.databaseName}`;

  await waitForPostgresFromDatabaseUrl(databaseUrl);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
