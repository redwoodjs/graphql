import type { RequestInfo } from "rwsdk/worker";

import { buildRouteDefinitions } from "./buildRouteDefinitions.js";
import { compileFromDefinitions, type CompileRoutesOptions } from "./compileFromDefinitions.js";
import type { DefinedRoutes } from "./defineRoutes.js";

export const compileAppRoutes = <T extends RequestInfo = RequestInfo>(
  defined: DefinedRoutes,
  options: CompileRoutesOptions<T>,
) => {
  const definitions = buildRouteDefinitions(defined.routeTree);

  return compileFromDefinitions(definitions, defined.routes, options);
};
