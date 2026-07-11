import { defineConfig } from "nitro";

export default defineConfig({
  devServer: {
    port: 8911,
  },
  serverEntry: {
    format: "node",
    handler: "./server.node.ts",
  },
  // Bundle workspace packages into the server output so production does not rely on
  // packages/*/dist being present under node_modules at runtime (Render deploys).
  noExternals: [/^@rwgql\//, /^db$/],
});
