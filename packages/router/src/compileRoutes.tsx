import type { ComponentType, ReactNode } from "react";
import { route, type Route, type RouteMiddleware } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";

import { pathHasRouteId } from "./buildPath.js";
import type { NamedRoutes } from "./buildPath.js";
import { createCacheControl } from "./createCacheControl.js";
import type { LayoutWrapper } from "./withLayout.js";

export type RouteDefinition<T extends RequestInfo = RequestInfo> = {
  readonly cacheControl?: string;
  readonly name: string;
  readonly path: string;
  readonly layoutWrapper?: LayoutWrapper;
  readonly private?: boolean;
  readonly unauthenticated?: string;
  readonly requireAuth?: RouteMiddleware<T>;
  readonly page?: ComponentType<any>;
  readonly pageProps?: (requestInfo: T) => Record<string, unknown>;
  readonly render?: (requestInfo: T) => ReactNode;
};

export type CompileRoutesOptions<T extends RequestInfo = RequestInfo> = {
  readonly parseRouteId?: (requestInfo: T) => number;
  readonly renderPage: (requestInfo: T, children: ReactNode) => Response | Promise<Response>;
  readonly routes: NamedRoutes;
};

export type CompiledRoutes<T extends RequestInfo = RequestInfo> = {
  readonly routes: NamedRoutes;
  readonly workerRoutes: Route<T>[];
};

const identityLayout: LayoutWrapper = (children) => children;

const resolvePageProps = <T extends RequestInfo>(
  entry: RouteDefinition<T>,
  parseRouteId?: (requestInfo: T) => number,
): ((requestInfo: T) => Record<string, unknown>) | undefined => {
  if (entry.pageProps) {
    return entry.pageProps;
  }

  if (!entry.page || !pathHasRouteId(entry.path)) {
    return undefined;
  }

  if (!parseRouteId) {
    throw new Error(
      `@rwgql/router: route "${entry.name}" (${entry.path}) requires parseRouteId in compile options`,
    );
  }

  return (requestInfo) => ({ id: parseRouteId(requestInfo) });
};

const renderRoutePage = <T extends RequestInfo>(
  entry: RouteDefinition<T>,
  requestInfo: T,
  parseRouteId?: (requestInfo: T) => number,
): ReactNode => {
  if (entry.render) {
    return entry.render(requestInfo);
  }

  if (!entry.page) {
    throw new Error(`@rwgql/router: route "${entry.name}" is missing page or render`);
  }

  const Page = entry.page;
  const pageProps = resolvePageProps(entry, parseRouteId)?.(requestInfo) ?? {};

  return <Page {...pageProps} />;
};

export const compileRoutes = <
  const D extends readonly RouteDefinition<T>[],
  T extends RequestInfo = RequestInfo,
>(
  definitions: D,
  options: CompileRoutesOptions<T>,
): CompiledRoutes<T> => {
  for (const entry of definitions) {
    if (entry.page && pathHasRouteId(entry.path) && !entry.pageProps && !options.parseRouteId) {
      throw new Error(
        `@rwgql/router: route "${entry.name}" (${entry.path}) requires parseRouteId in compile options`,
      );
    }

    if (entry.private && !entry.requireAuth) {
      throw new Error(`@rwgql/router: private route "${entry.name}" requires requireAuth`);
    }
  }

  const workerRoutes = definitions.map((entry) => {
    const layout = entry.layoutWrapper ?? identityLayout;

    const handler = (requestInfo: T) => {
      const page = renderRoutePage(entry, requestInfo, options.parseRouteId);
      const wrapped = layout(page, requestInfo);
      return options.renderPage(requestInfo, wrapped);
    };

    const routeMiddleware: RouteMiddleware<T>[] = [
      ...(entry.cacheControl ? [createCacheControl<T>(entry.cacheControl)] : []),
      ...(entry.private ? [entry.requireAuth!] : []),
    ];

    if (routeMiddleware.length === 0) {
      return route(entry.path, handler);
    }

    return route(entry.path, [...routeMiddleware, handler]);
  });

  return { routes: options.routes, workerRoutes };
};
