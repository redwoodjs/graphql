import { createNamedRoutes } from "@rwgql/router/routes";

import { routeDefinitions } from "@/routeDefinitions.gen";

export { routeDefinitions };
export const routes = createNamedRoutes(routeDefinitions);
export type WebRouteName = keyof typeof routes;
