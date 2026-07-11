import { defineConfig } from "vite-plus";

const graphqlPackageBuilds = [
  "@rwgql/auth#build",
  "@rwgql/dbauth#build",
  "@rwgql/graphql-typegen#build",
  "@rwgql/log-formatter#build",
] as const;

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["testUtils/globalSetup.ts"],
    include: ["src/**/*.test.ts"],
    setupFiles: ["testUtils/setup.ts"],
  },
  fmt: {
    ignorePatterns: [
      ".nitro/**",
      ".output/**",
      "schema.graphql",
      "src/**/*.gen.ts",
      "types/graphql.d.ts",
    ],
  },
  lint: {
    ignorePatterns: [
      ".nitro/**",
      ".output/**",
      "schema.graphql",
      "src/**/*.gen.ts",
      "types/graphql.d.ts",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  run: {
    tasks: {
      build: {
        command: "nitro build",
        dependsOn: [...graphqlPackageBuilds, "codegen", "db#generate"],
      },
      check: {
        command: "vp check",
        dependsOn: [...graphqlPackageBuilds, "codegen"],
      },
      dev: {
        command: "tsx scripts/dev.ts",
        dependsOn: [...graphqlPackageBuilds, "regenerate-registry"],
        cache: false,
      },
      codegen: {
        command: "graphql-codegen --config codegen.ts",
        dependsOn: ["export-schema", ...graphqlPackageBuilds],
        input: [
          "codegen.ts",
          "schema.graphql",
          { pattern: "test-apps/web/src/components/**/*.{ts,tsx}", base: "workspace" },
          { pattern: "test-apps/web/src/pages/**/*.{ts,tsx}", base: "workspace" },
        ],
        output: [{ pattern: "test-apps/web/src/gql/**", base: "workspace" }, "types/graphql.d.ts"],
      },
      "export-schema": {
        command: "tsx scripts/export-schema.ts",
        dependsOn: ["regenerate-registry", ...graphqlPackageBuilds],
        input: [
          "scripts/export-schema.ts",
          "src/graphql/**/*.ts",
          "src/directives/**/*.ts",
          "src/**/*.gen.ts",
        ],
        output: ["schema.graphql"],
      },
      "regenerate-registry": {
        command:
          "tsx scripts/regenerate-registry.ts && vp fmt src/typeDefs.gen.ts src/services.gen.ts src/getSchema.gen.ts",
        dependsOn: [...graphqlPackageBuilds],
        input: [
          "scripts/regenerate-registry.ts",
          "src/graphql/**/*.ts",
          "src/directives/**/*.ts",
          "src/services/**/*.ts",
        ],
        output: ["src/typeDefs.gen.ts", "src/services.gen.ts", "src/getSchema.gen.ts"],
      },
    },
  },
});
