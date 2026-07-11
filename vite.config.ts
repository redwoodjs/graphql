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
      "deploy:build": {
        // Fresh clones need real dist artifacts; callers should use --no-cache.
        dependsOn: ["bootstrap", "graphql#build"],
        command:
          "test -f packages/auth/dist/graphql.mjs && test -f packages/dbauth/dist/server.mjs && test -f packages/graphql-typegen/dist/index.mjs && test -f packages/log-formatter/dist/index.mjs && test -f test-apps/graphql/.output/server/index.mjs",
        cache: false,
      },
      "deploy:start": {
        // migrate + seed run via seed → db#migrate-deploy → db#dev:prepare (pgserve no-ops in production).
        dependsOn: ["seed"],
        command:
          'PRISMA_DATABASE_URL="${PRISMA_DATABASE_URL:-$DATABASE_URL}" node test-apps/graphql/.output/server/index.mjs',
        cache: false,
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
