import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { writeSchemaGraphql } from "@rwgql/graphql-typegen/codegen";

import { typeDefs } from "../src/typeDefs.gen.ts";

const outputPath = join(dirname(fileURLToPath(import.meta.url)), "..", "schema.graphql");

writeSchemaGraphql(typeDefs, outputPath);
