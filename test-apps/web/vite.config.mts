import { fileURLToPath } from "node:url";

import { defineConfig, lazyPlugins } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import { createGenerateRoutesTasks } from "@rwgql/router/tasks";
import { redwood } from "rwsdk/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const isTest = Boolean(process.env.VITEST);

const webPackageBuilds = [
  "@rwgql/auth#build",
  "@rwgql/dbauth#build",
  "@rwgql/rwsdk-apollo-client#build",
  "@rwgql/cell#build",
  "@rwgql/router#build",
] as const;

export default defineConfig({
  resolve: {
    alias: isTest
      ? {
          "@/auth": fileURLToPath(new URL("./testUtils/mockAuth.ts", import.meta.url)),
        }
      : undefined,
    tsconfigPaths: isTest,
  },
  fmt: {
    ignorePatterns: ["src/**/*.gen.ts"],
  },
  lint: {
    ignorePatterns: ["src/**/*.gen.ts"],
  },
  plugins: lazyPlugins(() =>
    isTest
      ? []
      : [
          cloudflare({
            viteEnvironment: { name: "worker" },
          }),
          redwood(),
        ],
  ),
  test: {
    browser: {
      enabled: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["testUtils/setup.ts"],
  },
  run: {
    tasks: {
      ...createGenerateRoutesTasks(),
      dev: {
        command: "vp dev --port 8910",
        dependsOn: [...webPackageBuilds, "generate-routes"],
        cache: false,
      },
      build: {
        command: "vp build",
        dependsOn: [...webPackageBuilds, "generate-routes"],
      },
      check: {
        command: [
          "vp run graphql#codegen",
          "vp run generate",
          "vp run generate-routes",
          "vp run types",
        ],
        dependsOn: [...webPackageBuilds],
      },
      generate: {
        command: "rw-scripts ensure-env && wrangler types --include-runtime false",
      },
      types: {
        command: "tsc",
      },
    },
  },
});
