import type { PluginFunction } from "@graphql-codegen/plugin-helpers";

import {
  RELATION_OPTIONAL,
  appendRelationResolverTypes,
  wrapRelationOptionalTypes,
} from "./schema-relations.ts";

const plugin: PluginFunction = async (schema, documents, config) => {
  const { plugin: typescriptPlugin } = await import("@graphql-codegen/typescript");
  const result = await typescriptPlugin(schema, documents, config);

  const content = appendRelationResolverTypes(
    schema,
    wrapRelationOptionalTypes(schema, result.content),
  );

  return {
    prepend: [RELATION_OPTIONAL, ...(result.prepend ?? [])],
    content,
  };
};

export default plugin;
export { plugin };
