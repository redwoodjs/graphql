import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    entry: [
      "src/index.ts",
      "src/config/defineDbDevConfig.ts",
      "src/tasks.ts",
      "src/env/index.ts",
      "src/cli/ensure.ts",
      "src/cli/start.ts",
      "src/cli/wait.ts",
      "src/cli/dev-prepare.ts",
      "src/cli/setup-env.ts",
      "src/cli/stop.ts",
      "src/cli/dev-hold.ts",
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
