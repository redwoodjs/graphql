export type RouteParams = {
  readonly id: number | string;
};

export const buildPath = (path: string, params?: RouteParams): string => {
  if (!path.includes(":id")) {
    return path;
  }

  if (!params) {
    throw new Error(`@rwgql/router: route "${path}" requires params.id`);
  }

  return path.replace(":id", String(params.id));
};

type PathHasId<P extends string> = P extends `${string}:id${string}` ? true : false;

export type NamedRouteFnForPath<P extends string> = string extends P
  ? (params?: RouteParams) => string
  : PathHasId<P> extends true
    ? (params: RouteParams) => string
    : () => string;

export type NamedRoutesFrom<T extends readonly { readonly name: string; readonly path: string }[]> =
  {
    [K in T[number] as K["name"]]: NamedRouteFnForPath<K["path"]>;
  };

export type NamedRouteFn = NamedRouteFnForPath<string>;

export type NamedRoutes = Readonly<Record<string, NamedRouteFn>>;

export const pathHasRouteId = (path: string): boolean => path.includes(":id");
