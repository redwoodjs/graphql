export type CacheOption = boolean | string;

export const DEFAULT_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

export const resolveCacheControl = (cache: CacheOption | undefined): string | undefined => {
  if (cache === undefined || cache === false) {
    return undefined;
  }

  if (typeof cache === "string") {
    return cache;
  }

  return DEFAULT_CACHE_CONTROL;
};

export const resolveRouteCacheControl = (
  cache: CacheOption | undefined,
  inherited?: string,
): string | undefined => {
  if (cache === false) {
    return undefined;
  }

  if (cache === undefined) {
    return inherited;
  }

  return resolveCacheControl(cache);
};
