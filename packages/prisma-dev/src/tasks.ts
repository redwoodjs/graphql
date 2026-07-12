import type { TaskDefinition } from "@rwgql/pgserve-dev/tasks";

export interface CreatePrismaTasksOptions {
  schemaPath?: string;
  dependsOnSetupEnv?: string;
  dependsOnPrepare?: string;
}

/**
 * Prefer existing PRISMA_DATABASE_URL, else DATABASE_URL (e.g. Render).
 * If both are unset/empty, leave the var unset so Prisma can load `.env`
 * written by setup-env / dev:prepare (a forced empty override would shadow it).
 */
const withPrismaDatabaseUrl = (command: string) =>
  `sh -c 'u="\${PRISMA_DATABASE_URL:-$DATABASE_URL}"; if [ -n "$u" ]; then export PRISMA_DATABASE_URL="$u"; else unset PRISMA_DATABASE_URL; fi; exec "$@"' sh ${command}`;

export function createPrismaTasks(
  options: CreatePrismaTasksOptions = {},
): Record<string, TaskDefinition> {
  const schemaPath = options.schemaPath ?? "prisma/schema.prisma";
  const dependsOnSetupEnv = options.dependsOnSetupEnv ?? "setup-env";
  const dependsOnPrepare = options.dependsOnPrepare ?? "prepare";

  return {
    generate: {
      command: withPrismaDatabaseUrl("prisma generate"),
      dependsOn: [dependsOnSetupEnv],
      input: [schemaPath],
    },
    "migrate-deploy": {
      command: withPrismaDatabaseUrl("prisma migrate deploy"),
      dependsOn: [dependsOnPrepare],
      cache: false,
    },
  };
}
