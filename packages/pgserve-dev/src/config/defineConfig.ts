import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PgserveDevConfig } from "../types.ts";

export interface ConfigLocation {
  configFilePath: string;
  configDir: string;
  workspaceRoot: string;
}

export function resolveConfigLocation(moduleUrl: string, levelsUp = 2): ConfigLocation {
  const configFilePath = fileURLToPath(moduleUrl);
  const configDir = path.dirname(configFilePath);
  const workspaceRoot = path.resolve(configDir, ...Array.from({ length: levelsUp }, () => ".."));

  return { configFilePath, configDir, workspaceRoot };
}

export interface DefinePgserveConfigOptions extends Omit<
  PgserveDevConfig,
  "workspaceRoot" | "configModule"
> {
  workspaceRoot?: string;
  /** Levels up from the config file directory to the workspace root. Defaults to 2 (test-apps/db). */
  workspaceLevelsUp?: number;
}

export function definePgserveConfig(
  moduleUrl: string,
  config: DefinePgserveConfigOptions,
): PgserveDevConfig {
  const levelsUp = config.workspaceLevelsUp ?? 2;
  const {
    configFilePath,
    configDir,
    workspaceRoot: resolvedWorkspaceRoot,
  } = resolveConfigLocation(moduleUrl, levelsUp);
  const workspaceRoot = config.workspaceRoot ?? resolvedWorkspaceRoot;

  const { workspaceLevelsUp: _workspaceLevelsUp, ...rest } = config;

  const appEnvPath = rest.appEnvPath ?? path.relative(workspaceRoot, path.join(configDir, ".env"));
  const configModule = path.relative(workspaceRoot, configFilePath);

  return {
    ...rest,
    workspaceRoot,
    configModule,
    appEnvPath,
  };
}
