import { normalizeRedwoodPath } from "../normalizePath.js";

export type RouteNameEntry = {
  readonly name: string;
  readonly path: string;
};

const readAttribute = (attributes: string, attributeName: string): string | undefined => {
  const pattern = new RegExp(`\\b${attributeName}\\s*=\\s*(["'\`])([^"'\`]+)\\1`);
  const match = attributes.match(pattern);

  return match?.[2];
};

const hasAttribute = (attributes: string, attributeName: string): boolean =>
  new RegExp(`\\b${attributeName}\\b`).test(attributes);

const readRouteFromAttributes = (attributes: string): RouteNameEntry | undefined => {
  if (hasAttribute(attributes, "notfound")) {
    return {
      name: readAttribute(attributes, "name") ?? "notFound",
      path: "/*",
    };
  }

  const path = readAttribute(attributes, "path");
  const name = readAttribute(attributes, "name");

  if (!path || !name) {
    return undefined;
  }

  return {
    name,
    path: normalizeRedwoodPath(path),
  };
};

export const extractRouteNamesFromSource = (
  source: string,
  _fileName = "Routes.tsx",
): RouteNameEntry[] => {
  const routes: RouteNameEntry[] = [];
  const routePattern = /<Route\b([\s\S]*?)(?:\/>|>)/g;

  for (const match of source.matchAll(routePattern)) {
    const route = readRouteFromAttributes(match[1] ?? "");

    if (route) {
      routes.push(route);
    }
  }

  return routes;
};

export const routeNameEntriesFromTree = (
  entries: ReadonlyArray<{ readonly name: string; readonly path: string }>,
): RouteNameEntry[] => entries.map(({ name, path }) => ({ name, path }));
