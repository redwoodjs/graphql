import fs from "node:fs";
import path from "node:path";

export type AppEnvVariables = Record<string, string>;

export function formatAppEnvFile(variables: AppEnvVariables): string {
  return (
    Object.entries(variables)
      .map(([key, value]) => `${key}="${value}"`)
      .join("\n") + "\n"
  );
}

export function writeAppEnvFile(appEnvPath: string, variables: AppEnvVariables): void {
  fs.mkdirSync(path.dirname(appEnvPath), { recursive: true });
  fs.writeFileSync(appEnvPath, formatAppEnvFile(variables));
}

export function readAppEnvFile(appEnvPath: string): AppEnvVariables {
  if (!fs.existsSync(appEnvPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(appEnvPath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0 && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex);
        const rawValue = line.slice(separatorIndex + 1);
        const value =
          rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue.slice(1, -1) : rawValue;
        return [key, value] as const;
      }),
  ) as AppEnvVariables;
}
