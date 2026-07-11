import { defineConfig } from "vite-plus";
import { configDefaults } from "vite-plus/test/config";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["test-apps/scripts/**"],
        env: { node: true },
      },
    ],
  },
  test: {
    exclude: [...configDefaults.exclude],
    projects: ["packages/*", "test-apps/graphql", "test-apps/web"],
  },
  run: {
    cache: true,
    tasks: {
      bootstrap: {
        // Build workspace packages via Vite+ task runner. Limit concurrency to avoid
        // parallel tsgo spawns racing on the native binary (spawn EBUSY on first clone).
        command: 'vp run --filter "./packages/*" --concurrency-limit 2 build',
      },
      dev: {
        command: "vp run --parallel --filter rwsdk --filter graphql --filter db dev",
        dependsOn: ["bootstrap", "db#generate", "db#dev:prepare", "seed", "graphql#codegen"],
        cache: false,
      },
      seed: {
        command: "tsx test-apps/scripts/seed.ts",
        dependsOn: ["db#migrate-deploy"],
        cache: false,
      },
      ready: {
        dependsOn: ["bootstrap", "graphql#codegen"],
        command: "vp check && vp run -r test && vp run -r build",
      },
    },
  },
});
