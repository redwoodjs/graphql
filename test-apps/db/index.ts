import { PrismaClient } from "@prisma/client";
import { ensurePrismaDatabaseUrl } from "@rwgql/prisma-dev";

function resolveDatabaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
    const url = process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is required in production");
    }
    return url;
  }

  ensurePrismaDatabaseUrl(import.meta.url, { levelsUp: 0 });
  const url = process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("PRISMA_DATABASE_URL or DATABASE_URL is required");
  }
  return url;
}

const databaseUrl = resolveDatabaseUrl();
process.env.PRISMA_DATABASE_URL = databaseUrl;

// Pin the datasource URL so Prisma does not override it from test-apps/db/.env written during build.
export const db = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
});

export type * from "@prisma/client";
