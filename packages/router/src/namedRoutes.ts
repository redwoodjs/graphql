import { buildPath, type NamedRoutesFrom, type RouteParams } from "./buildPath.js";

const createNamedRoute = <P extends string>(path: P) => {
  if (path.includes(":id")) {
    return (params: RouteParams) => buildPath(path, params);
  }

  return () => buildPath(path);
};

export const createNamedRoutes = <
  const T extends readonly { readonly name: string; readonly path: string }[],
>(
  definitions: T,
): NamedRoutesFrom<T> => {
  return Object.fromEntries(
    definitions.map((entry) => [entry.name, createNamedRoute(entry.path)]),
  ) as NamedRoutesFrom<T>;
};
