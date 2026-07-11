export interface ParsePortOptions {
  min?: number;
  max?: number;
}

export function parsePort(
  value: string | number | undefined,
  { min = 1, max = 65535 }: ParsePortOptions = {},
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  if (typeof value === "string" && !/^\d+$/.test(value.trim())) {
    return undefined;
  }

  const port = typeof value === "number" ? value : Number(value.trim());

  return Number.isInteger(port) && port >= min && port <= max ? port : undefined;
}

export function parseStrictPort(
  value: string | undefined,
  errorMessage: string,
  options?: ParsePortOptions,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const port = parsePort(value, options);

  if (port === undefined) {
    throw new Error(errorMessage);
  }

  return port;
}
