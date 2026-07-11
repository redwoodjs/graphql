import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { extractRouteNamesFromSource, type RouteNameEntry } from "./extractRouteNamesFromSource.js";

export const DEFAULT_ROUTES_FILE = "src/Routes.tsx";
export const DEFAULT_ROUTE_DEFINITIONS_OUTPUT = "src/routeDefinitions.gen.ts";

export type GenerateRoutesOptions = {
  readonly root: string;
  readonly routesFile?: string;
  readonly outputFile?: string;
};

export const generateRouteDefinitionsFileContent = (routes: RouteNameEntry[]): string => {
  const definitions = routes
    .map(
      (route) => `  { name: ${JSON.stringify(route.name)}, path: ${JSON.stringify(route.path)} },`,
    )
    .join("\n");

  return `// Generated from src/Routes.tsx by @rwgql/router. Do not edit.

export const routeDefinitions = [
${definitions}
] as const;
`;
};

export const generateRoutes = ({
  root,
  routesFile = DEFAULT_ROUTES_FILE,
  outputFile = DEFAULT_ROUTE_DEFINITIONS_OUTPUT,
}: GenerateRoutesOptions) => {
  const routesFilePath = path.resolve(root, routesFile);
  const outputPath = path.resolve(root, outputFile);
  const source = readFileSync(routesFilePath, "utf8");
  const routes = extractRouteNamesFromSource(source, routesFilePath);

  if (routes.length === 0) {
    throw new Error(`No <Route> entries found in ${routesFilePath}`);
  }

  writeFileSync(outputPath, generateRouteDefinitionsFileContent(routes));

  return outputPath;
};
