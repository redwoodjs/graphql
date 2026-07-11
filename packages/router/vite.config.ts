import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: [
      "src/index.ts",
      "src/routes.ts",
      "src/worker.ts",
      "src/codegen/index.ts",
      "src/tasks.ts",
      "src/cli/generate-routes.ts",
    ],
    dts: {
      tsgo: true,
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
