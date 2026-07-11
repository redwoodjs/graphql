import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { ensurePrismaDatabaseUrl } from "./env.ts";

const originalUrl = process.env.PRISMA_DATABASE_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.PRISMA_DATABASE_URL;
  } else {
    process.env.PRISMA_DATABASE_URL = originalUrl;
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("ensurePrismaDatabaseUrl", () => {
  it("does nothing when PRISMA_DATABASE_URL is already set", () => {
    process.env.PRISMA_DATABASE_URL = "postgresql://existing";

    const dir = mkdtempSync(join(tmpdir(), "prisma-dev-"));
    const moduleUrl = pathToFileURL(join(dir, "src", "client.ts")).href;

    ensurePrismaDatabaseUrl(moduleUrl);

    expect(process.env.PRISMA_DATABASE_URL).toBe("postgresql://existing");
  });

  it("falls back to DATABASE_URL when PRISMA_DATABASE_URL is unset", () => {
    delete process.env.PRISMA_DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://render-internal";

    const dir = mkdtempSync(join(tmpdir(), "prisma-dev-"));
    const moduleUrl = pathToFileURL(join(dir, "src", "client.ts")).href;

    ensurePrismaDatabaseUrl(moduleUrl);

    expect(process.env.PRISMA_DATABASE_URL).toBe("postgresql://render-internal");
    delete process.env.DATABASE_URL;
  });

  it("loads PRISMA_DATABASE_URL from .env.defaults", () => {
    delete process.env.PRISMA_DATABASE_URL;

    const dir = mkdtempSync(join(tmpdir(), "prisma-dev-"));
    writeFileSync(
      join(dir, ".env.defaults"),
      'PRISMA_DATABASE_URL="postgresql://postgres@localhost:8432/test"\n',
    );

    const moduleUrl = pathToFileURL(join(dir, "src", "client.ts")).href;

    ensurePrismaDatabaseUrl(moduleUrl);

    expect(process.env.PRISMA_DATABASE_URL).toBe("postgresql://postgres@localhost:8432/test");
  });
});
