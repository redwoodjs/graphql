import type { TaskDefinition, TaskPluginContext } from "./vite-task-types.ts";

export type { TaskDefinition, TaskPluginContext } from "./vite-task-types.ts";

import { buildPgserveConfigArg } from "./config/resolveConfig.ts";
import type { PgserveDevConfig } from "./types.ts";

const PGSERVE_BUILD_TASK = "@rwgql/pgserve-dev#build";
const defaultBin = (name: string) => `vp exec ${name}`;

function resolveCtx(ctx?: TaskPluginContext): TaskPluginContext {
  return ctx ?? { bin: defaultBin };
}

function withPgserveBuildDep(dependsOn: string[] = []): string[] {
  return dependsOn.includes(PGSERVE_BUILD_TASK) ? dependsOn : [PGSERVE_BUILD_TASK, ...dependsOn];
}

function pgserveTaskCommand(
  ctx: TaskPluginContext | undefined,
  cliName: string,
  config: PgserveDevConfig,
): string {
  return `${resolveCtx(ctx).bin(cliName)} ${buildPgserveConfigArg(config)}`;
}

export interface CreatePgserveTasksOptions {
  prepareDependsOn?: string[];
}

export function createPgserveTasks(
  config: PgserveDevConfig,
  ctx?: TaskPluginContext,
  options: CreatePgserveTasksOptions = {},
): Record<string, TaskDefinition> {
  const prepareDependsOn = options.prepareDependsOn ?? [];

  const tasks: Record<string, TaskDefinition> = {
    pgserve: {
      command: pgserveTaskCommand(ctx, "rwgql-pgserve-start", config),
      dependsOn: withPgserveBuildDep(),
      cache: false,
    },
    prepare: {
      command: pgserveTaskCommand(ctx, "rwgql-pgserve-ensure", config),
      dependsOn: withPgserveBuildDep(prepareDependsOn),
      cache: false,
    },
    dev: {
      command: pgserveTaskCommand(ctx, "rwgql-pgserve-dev-hold", config),
      dependsOn: withPgserveBuildDep(),
      cache: false,
    },
  };

  if (config.appEnvPath && config.appEnvAdapter) {
    tasks["setup-env"] = {
      command: pgserveTaskCommand(ctx, "rwgql-pgserve-setup-env", config),
      dependsOn: withPgserveBuildDep(),
      input: [config.configModule],
    };
  }

  return tasks;
}

export function createDevPrepareTask(
  config: PgserveDevConfig,
  ctx?: TaskPluginContext,
  options: { dependsOn?: string[] } = {},
): Record<string, TaskDefinition> {
  return {
    "dev:prepare": {
      command: pgserveTaskCommand(ctx, "rwgql-pgserve-dev-prepare", config),
      dependsOn: withPgserveBuildDep(options.dependsOn ?? []),
      cache: false,
    },
  };
}

export function createDevStopTask(
  config: PgserveDevConfig,
  ctx?: TaskPluginContext,
): Record<string, TaskDefinition> {
  return {
    "dev:stop": {
      command: pgserveTaskCommand(ctx, "rwgql-pgserve-stop", config),
      dependsOn: withPgserveBuildDep(),
      cache: false,
    },
  };
}
