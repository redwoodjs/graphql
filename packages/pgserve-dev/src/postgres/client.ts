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

const isTransientStartupError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return (
    code === "57P03" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    message.includes("the database system is starting up")
  );
};

export async function ensureDatabaseExists(
  adminDatabaseUrl: string,
  databaseName: string,
): Promise<void> {
  const maxAttempts = 50;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const client = new pg.Client({ connectionString: adminDatabaseUrl });

    try {
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

      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);

      if (!isTransientStartupError(error) || attempt === maxAttempts - 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to ensure database exists: ${String(lastError)}`);
}
