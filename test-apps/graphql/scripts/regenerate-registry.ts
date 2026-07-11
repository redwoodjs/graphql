import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { writeSchemaRegistry } from "@rwgql/graphql-typegen/codegen";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(projectRoot, "src");

await writeSchemaRegistry({
  outputDir,
  patterns: {
    directives: "src/directives/**/*.ts",
    sdl: "src/graphql/**/*.sdl.ts",
    services: "src/services/**/*.ts",
  },
  projectRoot,
});
