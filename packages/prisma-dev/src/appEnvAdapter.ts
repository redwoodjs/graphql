import { buildPostgresSocketUrl } from "@rwgql/pgserve-dev";
import type {
  AppEnvAdapter,
  PgserveConnectionEnv,
  ResolvedPgserveConfig,
} from "@rwgql/pgserve-dev";

export function createPrismaEnvAdapter(): AppEnvAdapter {
  return {
    fromConnection(config: ResolvedPgserveConfig, connection: PgserveConnectionEnv) {
      return {
        DATABASE_URL: connection.databaseUrl,
        PRISMA_DATABASE_URL: buildPostgresSocketUrl(connection.postgresPort, config.databaseName),
        PRISMA_HIDE_UPDATE_MESSAGE: "true",
      };
    },
    fallback(config: ResolvedPgserveConfig) {
      const databaseUrl = `postgresql://postgres@localhost:${config.defaultPort}/${config.databaseName}`;
      return {
        DATABASE_URL: databaseUrl,
        PRISMA_DATABASE_URL: buildPostgresSocketUrl(config.defaultPort, config.databaseName),
        PRISMA_HIDE_UPDATE_MESSAGE: "true",
      };
    },
  };
}
