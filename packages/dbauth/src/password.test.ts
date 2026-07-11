import { describe, expect, it } from "vite-plus/test";

import {
  DEFAULT_DB_AUTH_SECRET,
  createSessionPayload,
  decryptSession,
  encryptSession,
  resolveDbAuthSecret,
} from "./cookie.js";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes and verifies passwords", () => {
    const { hashedPassword, salt } = hashPassword("password");

    expect(verifyPassword("password", salt, hashedPassword)).toBe(true);
    expect(verifyPassword("wrong", salt, hashedPassword)).toBe(false);
  });
});

describe("cookie", () => {
  it("round-trips session payloads", () => {
    const secret = "test-secret";
    const now = Date.UTC(2026, 0, 1);
    const payload = createSessionPayload(42, 60, now);
    const encrypted = encryptSession(payload, secret);
    const session = decryptSession(encrypted, secret, now);

    expect(session).toEqual(payload);
  });

  it("rejects expired sessions", () => {
    const secret = "test-secret";
    const now = Date.UTC(2026, 0, 1);
    const encrypted = encryptSession(createSessionPayload(42, 60, now), secret);

    expect(decryptSession(encrypted, secret, now + 61_000)).toBeNull();
  });

  it("rejects the default secret in production", () => {
    expect(() =>
      resolveDbAuthSecret({
        env: { NODE_ENV: "production" },
      }),
    ).toThrow("DB_AUTH_SECRET must be set");

    expect(
      resolveDbAuthSecret({
        env: { DB_AUTH_SECRET: "prod-secret", NODE_ENV: "production" },
      }),
    ).toBe("prod-secret");
    expect(
      resolveDbAuthSecret({
        env: { NODE_ENV: "development" },
      }),
    ).toBe(DEFAULT_DB_AUTH_SECRET);
  });
});
