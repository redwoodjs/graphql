import { createRequire } from "node:module";

import type { CodegenConfig } from "@graphql-codegen/cli";

import { DEFAULT_RESOLVER_TYPES_OUTPUT, resolveContextType } from "./resolveContextType.ts";
import { clientScalars, resolverScalars } from "./scalars.ts";
import { writeSchemaGraphql, type TypeDefSource } from "./writeSchemaGraphql.ts";

const require = createRequire(import.meta.url);
const codegenPluginPath = require.resolve("@rwgql/graphql-typegen/codegen-plugin");

export type RedwoodResolverCodegenOptions = {
  /** Output path for generated resolver types. */
  output?: string;
  /**
   * Override the default context import (`../graphql.ts#YogaContext` relative to output).
   * Required when your Yoga context module is not at the default path.
   */
  contextType?: string;
  /** Scalar mappings for resolver typegen. Defaults to {@link resolverScalars}. */
  scalars?: Record<string, string | { input: string; output: string }>;
  /** Extra config merged into the typescript-resolvers plugin block. */
  config?: Record<string, unknown>;
};

export const createRedwoodResolverGenerateEntry = (
  options: RedwoodResolverCodegenOptions = {},
): CodegenConfig["generates"] => {
  const output = options.output ?? DEFAULT_RESOLVER_TYPES_OUTPUT;

  return {
    [output]: {
      plugins: [
        {
          [codegenPluginPath]: {},
        },
        "typescript-resolvers",
      ],
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        namingConvention: "keep",
        strictScalars: true,
        makeResolverTypeCallable: true,
        customResolverFn: "@rwgql/graphql-typegen#CustomResolverType",
        contextType: options.contextType ?? resolveContextType(output),
        scalars: options.scalars ?? resolverScalars,
        ...options.config,
      },
    },
  };
};

export {
  clientScalars,
  DEFAULT_RESOLVER_TYPES_OUTPUT,
  resolverScalars,
  resolveContextType,
  writeSchemaGraphql,
  type TypeDefSource,
};

export {
  discoverSchemaRegistryFiles,
  generateGetSchemaSource,
  generateSchemaRegistrySource,
  generateServicesRegistrySource,
  generateTypeDefsRegistrySource,
  SCHEMA_REGISTRY_FILES,
  writeSchemaRegistry,
  type DiscoveredSchemaRegistryFiles,
  type SchemaRegistryConfig,
} from "./generateSchemaRegistry.ts";
