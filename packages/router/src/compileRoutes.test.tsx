import { describe, expect, it, vi } from "vite-plus/test";

import { compileRoutes } from "./compileRoutes.js";
import type { NamedRoutes } from "./buildPath.js";
import { createNamedRoutes } from "./namedRoutes.js";
import { createRequireAuth } from "./createRequireAuth.js";

const HomePage = () => null;
const PostPage = () => null;

import type { LayoutWrapper } from "./withLayout.js";

const blogLayout: LayoutWrapper = (children) => children;

describe("compileRoutes", () => {
  it("generates worker route handlers from route definitions", () => {
    const renderPage = vi.fn((_requestInfo, children) => new Response(String(children)));
    const definitions = [
      { name: "home", path: "/", page: HomePage, layoutWrapper: blogLayout },
      {
        name: "post",
        path: "/posts/:id",
        page: PostPage,
        layoutWrapper: blogLayout,
        private: true,
        requireAuth: createRequireAuth({ isAuthenticated: () => true }),
      },
    ] as const;
    const routes = createNamedRoutes(definitions) as NamedRoutes;

    const { workerRoutes } = compileRoutes(definitions, {
      parseRouteId: () => 7,
      renderPage,
      routes,
    });

    expect(routes.home()).toBe("/");
    expect(routes.post({ id: 7 })).toBe("/posts/7");
    expect(workerRoutes).toHaveLength(2);
  });

  it("throws when :id routes omit parseRouteId", () => {
    const definitions = [
      { name: "post", path: "/posts/:id", page: PostPage, layoutWrapper: blogLayout },
    ] as const;
    const routes = createNamedRoutes(definitions) as NamedRoutes;

    expect(() =>
      compileRoutes(definitions, {
        renderPage: vi.fn(),
        routes,
      }),
    ).toThrow('@rwgql/router: route "post" (/posts/:id) requires parseRouteId');
  });

  it("throws when private routes omit requireAuth", () => {
    const definitions = [{ name: "home", path: "/", page: HomePage, private: true }] as const;
    const routes = createNamedRoutes(definitions) as NamedRoutes;

    expect(() =>
      compileRoutes(definitions, {
        renderPage: vi.fn(),
        routes,
      }),
    ).toThrow('@rwgql/router: private route "home" requires requireAuth');
  });
});
