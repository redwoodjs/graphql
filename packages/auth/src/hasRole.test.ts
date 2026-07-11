import { describe, expect, it } from "vite-plus/test";

import { hasRoleForUser } from "./hasRole.js";

describe("hasRoleForUser", () => {
  it("returns false when user is missing", () => {
    expect(hasRoleForUser(null, "ADMIN")).toBe(false);
  });

  it("matches comma-separated roles", () => {
    expect(hasRoleForUser({ roles: "ADMIN,EDITOR" }, "ADMIN")).toBe(true);
    expect(hasRoleForUser({ roles: "ADMIN,EDITOR" }, "USER")).toBe(false);
  });

  it("matches role arrays", () => {
    expect(hasRoleForUser({ roles: ["ADMIN", "EDITOR"] }, ["USER", "ADMIN"])).toBe(true);
  });
});
