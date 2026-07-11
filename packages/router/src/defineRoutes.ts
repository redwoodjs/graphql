import type { ReactNode } from "react";

import type { NamedRoutes } from "./buildPath.js";

export type DefinedRoutes = {
  readonly routeTree: ReactNode;
  readonly routes: NamedRoutes;
};

export const defineRoutes = (routeTree: ReactNode): Pick<DefinedRoutes, "routeTree"> => ({
  routeTree,
});
