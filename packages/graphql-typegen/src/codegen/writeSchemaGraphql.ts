import { writeFileSync } from "node:fs";

import { mergeTypeDefs } from "@graphql-tools/merge";
import { print, type DocumentNode } from "graphql";

export type TypeDefSource = string | DocumentNode;

/** Write merged SDL type definitions to a schema.graphql file for codegen and tooling. */
export const writeSchemaGraphql = (
  typeDefs: readonly TypeDefSource[],
  outputPath: string,
): void => {
  writeFileSync(outputPath, `${print(mergeTypeDefs([...typeDefs]))}\n`);
};
