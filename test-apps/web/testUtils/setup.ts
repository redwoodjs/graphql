import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";

import { createMockAuthState, mockUseAuth } from "./mockAuth";

vi.mock("rwsdk/client", () => ({
  navigate: vi.fn(),
}));

vi.mock("rwsdk/worker", () => ({
  getRequestInfo: vi.fn(() => ({
    request: new Request("http://localhost/"),
  })),
}));

vi.mock("@apollo/client/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@apollo/client/react")>();

  return {
    ...actual,
    useMutation: vi.fn(() => [vi.fn(), { called: false, error: undefined, loading: false }]),
    useQuery: vi.fn(() => ({ data: undefined, error: undefined, loading: true })),
  };
});

afterEach(() => {
  cleanup();
  mockUseAuth.mockReset();
  mockUseAuth.mockImplementation(createMockAuthState);
});
