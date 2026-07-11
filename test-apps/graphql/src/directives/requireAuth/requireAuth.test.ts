import { describe, expect, it } from "vite-plus/test";

import { mockValidatorDirective } from "../../../testUtils/directives.ts";
import requireAuth from "./requireAuth.ts";

describe("requireAuth directive", () => {
  it("declares the directive sdl as schema, with the correct name", () => {
    expect(requireAuth.schema).toBeTruthy();
    expect(requireAuth.name).toBe("requireAuth");
  });

  it("requireAuth has stub implementation. Should not throw when current user", () => {
    const mockExecution = mockValidatorDirective(requireAuth, {
      context: { currentUser: { email: "b@zinga.com", id: 1, roles: "ADMIN" } },
    });

    expect(mockExecution).not.toThrow();
  });
});
