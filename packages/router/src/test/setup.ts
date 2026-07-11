import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";

vi.mock("rwsdk/client", () => ({
  navigate: vi.fn(),
}));

vi.mock("rwsdk/router", () => ({
  route: (path: string, handler: unknown) => ({ path, handler }),
}));

afterEach(() => {
  cleanup();
});
