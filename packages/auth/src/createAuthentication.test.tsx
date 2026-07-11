import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { createAuthentication } from "./createAuthentication.js";
import type { AuthClient } from "./types.js";

const createMockClient = (): AuthClient => ({
  forgotPassword: vi.fn(async () => ({})),
  getToken: vi.fn(async () => null),
  getUserMetadata: vi.fn(async () => ({ email: "ada@example.com", id: 1, roles: "ADMIN" })),
  login: vi.fn(async () => ({})),
  logout: vi.fn(async () => undefined),
  resetPassword: vi.fn(async () => ({})),
  signup: vi.fn(async () => ({})),
  validateResetToken: vi.fn(async () => ({})),
});

describe("createAuthentication", () => {
  it("loads the current user on mount", async () => {
    const client = createMockClient();
    const { AuthProvider, useAuth } = createAuthentication(client);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser?.email).toBe("ada@example.com");
    expect(result.current.hasRole("ADMIN")).toBe(true);
  });
});
