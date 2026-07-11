import type { ReactNode } from "react";
import type { RouteMiddleware } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";

import { compileRoutes, type RouteDefinition } from "./compileRoutes.js";
import type { NamedRoutes } from "./buildPath.js";
import { createRequireAuth } from "./createRequireAuth.js";

export type CompileRoutesOptions<T extends RequestInfo = RequestInfo> = {
  readonly isAuthenticated: (requestInfo: T) => boolean;
  readonly loginPath?: string;
  readonly parseRouteId?: (requestInfo: T) => number;
  readonly renderPage: (requestInfo: T, children: ReactNode) => Response | Promise<Response>;
};

const resolveLoginPath = (routes: NamedRoutes, routeName: string) => {
  const routeFn = routes[routeName as keyof typeof routes];
  if (!routeFn) {
    throw new Error(
      `@rwgql/router: <Private unauthenticated="${routeName}"> references unknown route name`,
    );
  }

  return (routeFn as () => string)();
};

const attachAuthMiddleware = <T extends RequestInfo>(
  definitions: RouteDefinition<T>[],
  routes: NamedRoutes,
  options: CompileRoutesOptions<T>,
) => {
  const loginPathByName = new Map<string, string>();

  for (const entry of definitions) {
    if (!entry.unauthenticated || loginPathByName.has(entry.unauthenticated)) {
      continue;
    }

    loginPathByName.set(entry.unauthenticated, resolveLoginPath(routes, entry.unauthenticated));
  }

  const defaultLoginPath = options.loginPath ?? loginPathByName.get("login") ?? "/login";
  const requireAuthByLoginPath = new Map<string, RouteMiddleware<T>>();

  const requireAuthFor = (entry: RouteDefinition<T>): RouteMiddleware<T> => {
    const loginPath = entry.unauthenticated
      ? (loginPathByName.get(entry.unauthenticated) ?? defaultLoginPath)
      : defaultLoginPath;

    let middleware = requireAuthByLoginPath.get(loginPath);
    if (!middleware) {
      middleware = createRequireAuth<T>({
        isAuthenticated: options.isAuthenticated,
        loginPath,
      });
      requireAuthByLoginPath.set(loginPath, middleware);
    }

    return middleware;
  };

  return definitions.map((entry) =>
    entry.private ? { ...entry, requireAuth: requireAuthFor(entry) } : entry,
  );
};

export const compileFromDefinitions = <T extends RequestInfo = RequestInfo>(
  definitions: RouteDefinition<T>[],
  routes: NamedRoutes,
  options: CompileRoutesOptions<T>,
) => {
  const definitionsWithAuth = attachAuthMiddleware(definitions, routes, options);

  return compileRoutes(definitionsWithAuth, {
    parseRouteId: options.parseRouteId,
    renderPage: options.renderPage,
    routes,
  });
};
