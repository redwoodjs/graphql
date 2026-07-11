import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface EnsurePrismaDatabaseUrlOptions {
  levelsUp?: number;
  envFiles?: string[];
}

export function ensurePrismaDatabaseUrl(
  moduleUrl: string,
  options: EnsurePrismaDatabaseUrlOptions = {},
): void {
  if (process.env.PRISMA_DATABASE_URL) {
    return;
  }

  if (process.env.DATABASE_URL) {
    process.env.PRISMA_DATABASE_URL = process.env.DATABASE_URL;
    return;
  }

  const levelsUp = options.levelsUp ?? 1;
  const packageRoot = resolve(
    dirname(fileURLToPath(moduleUrl)),
    ...Array.from({ length: levelsUp }, () => ".."),
  );

  for (const fileName of options.envFiles ?? [".env", ".env.defaults"]) {
    const envPath = resolve(packageRoot, fileName);
    if (!existsSync(envPath)) {
      continue;
    }

    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^PRISMA_DATABASE_URL=(.*)$/);
      if (!match) {
        continue;
      }

      process.env.PRISMA_DATABASE_URL = match[1]!.replace(/^["']|["']$/g, "");
      return;
    }
  }
}
