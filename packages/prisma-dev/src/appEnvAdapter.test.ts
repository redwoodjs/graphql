import { describe, expect, it } from "vite-plus/test";

import { createPrismaEnvAdapter } from "./appEnvAdapter.ts";

describe("createPrismaEnvAdapter", () => {
  const config = {
    configModule: "apps/db/pgserve.config.ts",
    workspaceRoot: "/tmp",
    databaseName: "redwoodgql",
    defaultPort: 8432,
    dataDir: "/tmp/apps/db/.pgserve",
    pgserveBinPath: "/tmp/apps/db/node_modules/pgserve/bin/pgserve-wrapper.cjs",
    appEnvPath: "/tmp/apps/db/.env",
  };

  it("builds fallback env from config defaults", () => {
    const variables = createPrismaEnvAdapter().fallback(config);

    expect(variables.DATABASE_URL).toContain("8432/redwoodgql");
    expect(variables.PRISMA_DATABASE_URL).toContain("host=");
    expect(variables.PRISMA_HIDE_UPDATE_MESSAGE).toBe("true");
  });

  it("builds env from pgserve connection", () => {
    const variables = createPrismaEnvAdapter().fromConnection(config, {
      connectionEnvPath: "/tmp/connection.env",
      databaseUrl: "postgresql://postgres@localhost:8432/redwoodgql",
      dataDir: config.dataDir,
      env: {},
      postgresPort: 8432,
      routerPort: 8432,
      socketDir: "/run/user/1000/pgserve",
    });

    expect(variables.DATABASE_URL).toBe("postgresql://postgres@localhost:8432/redwoodgql");
    expect(variables.PRISMA_DATABASE_URL).toContain("host=");
    expect(variables.PRISMA_HIDE_UPDATE_MESSAGE).toBe("true");
  });
});
