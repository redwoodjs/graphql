const REDWOOD_PARAM = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?::[^}]+)?\}/g;

export const normalizeRedwoodPath = (path: string): string =>
  path.replace(REDWOOD_PARAM, (_match, paramName: string) => `:${paramName}`);

/** Normalize URL pathnames for stable comparisons (e.g. NavLink active state). */
export const normalizePathname = (pathname: string): string => {
  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
};
