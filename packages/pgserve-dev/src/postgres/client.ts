import pg from "pg";

export async function canQueryDatabase(databaseUrl: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function ensureDatabaseExists(
  adminDatabaseUrl: string,
  databaseName: string,
): Promise<void> {
  const client = new pg.Client({ connectionString: adminDatabaseUrl });

  await client.connect();
  try {
    const result = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [databaseName],
    );

    if (!result.rows[0]?.exists) {
      const quotedName = `"${databaseName.replaceAll('"', '""')}"`;
      await client.query(`CREATE DATABASE ${quotedName}`);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}
