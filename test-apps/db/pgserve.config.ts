import { defineDbDevConfig } from "@rwgql/pgserve-dev";
import { createPrismaEnvAdapter } from "@rwgql/prisma-dev";

export const pgserveDevConfig = defineDbDevConfig(import.meta.url, {
  appEnvAdapter: createPrismaEnvAdapter(),
});
