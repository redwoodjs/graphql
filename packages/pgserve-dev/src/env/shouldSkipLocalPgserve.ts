/**
 * Local pgserve is a dev-only dependency. In production (e.g. Render), the
 * platform provides DATABASE_URL and starting pgserve / writing localhost
 * .env files would poison the runtime.
 */
export function shouldSkipLocalPgserve(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production";
}

/** True when the process already has a database URL from the environment. */
export function hasExternalDatabaseUrl(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL || env.PRISMA_DATABASE_URL);
}
