import { startEphemeralTestDatabase, stopEphemeralTestDatabase } from "@rwgql/prisma-dev/test";

export default async function globalSetup() {
  const dbModuleUrl = new URL("../../db/index.ts", import.meta.url).href;
  await startEphemeralTestDatabase({ dbModuleUrl });

  return async () => {
    try {
      const { db } = await import("db");
      await db.$disconnect();
    } finally {
      await stopEphemeralTestDatabase();
    }
  };
}
