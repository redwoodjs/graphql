import { describe, expect, it } from "vite-plus/test";

import { hasExternalDatabaseUrl, shouldSkipLocalPgserve } from "./shouldSkipLocalPgserve.ts";

describe("shouldSkipLocalPgserve", () => {
  it("is true when NODE_ENV is production", () => {
    expect(shouldSkipLocalPgserve({ NODE_ENV: "production" })).toBe(true);
  });

  it("is false for non-production environments", () => {
    expect(shouldSkipLocalPgserve({ NODE_ENV: "development" })).toBe(false);
    expect(shouldSkipLocalPgserve({})).toBe(false);
  });
});

describe("hasExternalDatabaseUrl", () => {
  it("detects DATABASE_URL", () => {
    expect(hasExternalDatabaseUrl({ DATABASE_URL: "postgresql://db" })).toBe(true);
  });

  it("detects PRISMA_DATABASE_URL", () => {
    expect(hasExternalDatabaseUrl({ PRISMA_DATABASE_URL: "postgresql://db" })).toBe(true);
  });

  it("is false when neither URL is set", () => {
    expect(hasExternalDatabaseUrl({})).toBe(false);
  });
});
