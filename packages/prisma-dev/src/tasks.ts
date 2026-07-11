import type { TaskDefinition } from "@rwgql/pgserve-dev/tasks";

export interface CreatePrismaTasksOptions {
  schemaPath?: string;
  dependsOnSetupEnv?: string;
  dependsOnPrepare?: string;
}

/** Prefer existing PRISMA_DATABASE_URL; otherwise use DATABASE_URL (e.g. Render). */
const withPrismaDatabaseUrl = (command: string) =>
  `PRISMA_DATABASE_URL="\${PRISMA_DATABASE_URL:-$DATABASE_URL}" ${command}`;

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
