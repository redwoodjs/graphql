import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    entry: [
      "src/index.ts",
      "src/yoga.ts",
      "src/codegen/index.ts",
      "src/omit-relation-resolvers-plugin.ts",
    ],
  },
  test: {
    environment: "node",
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
