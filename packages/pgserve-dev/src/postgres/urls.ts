// Must mirror pgserve's own socket-dir resolver (`resolveSocketDir` in
// pgserve/src/lib/socket-dir.js): `$XDG_RUNTIME_DIR/pgserve`, falling back to
// `/tmp/pgserve` when XDG_RUNTIME_DIR is unset or empty. If this diverges from
// where the pgserve postmaster actually binds its socket, the connection URLs
// we hand to Prisma/libpq point at the wrong path and every query fails. The
// empty-string check matters: CI runners and minimal containers often export
// XDG_RUNTIME_DIR as "".
export function getSocketDir(): string {
  const xdg = process.env.XDG_RUNTIME_DIR;
  const base = xdg && xdg.length > 0 ? xdg : "/tmp";
  return `${base}/pgserve`;
}

export function buildPostgresSocketUrl(postgresPort: number, databaseName: string): string {
  const socketDir = getSocketDir();
  return `postgresql://postgres@localhost:${postgresPort}/${databaseName}?host=${socketDir}&socket=${socketDir}`;
}
