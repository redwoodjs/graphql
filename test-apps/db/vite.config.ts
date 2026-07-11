import { defineConfig } from "vite-plus";
import {
  createPgserveTasks,
  createDevPrepareTask,
  createDevStopTask,
} from "@rwgql/pgserve-dev/tasks";
import { createPrismaTasks } from "@rwgql/prisma-dev/tasks";

import { pgserveDevConfig } from "./pgserve.config.ts";

export default defineConfig({
  fmt: {
    ignorePatterns: [".pgserve/**"],
  },
  lint: {
    ignorePatterns: [".pgserve/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  run: {
    tasks: Object.assign(
      {},
      createPgserveTasks(pgserveDevConfig, undefined, { prepareDependsOn: ["generate"] }),
      createPrismaTasks({ dependsOnPrepare: "dev:prepare" }),
      createDevPrepareTask(pgserveDevConfig, undefined, { dependsOn: ["generate"] }),
      createDevStopTask(pgserveDevConfig),
    ),
  },
});
