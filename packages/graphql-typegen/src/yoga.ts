import { mergeTypeDefs } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";
import type { DocumentNode } from "graphql";
import type { GraphQLResolveInfo, GraphQLSchema } from "graphql";

import type { CustomResolverType } from "./index.ts";

export const bindResolver =
  <TResult, TParent, TContext, TArgs>(
    resolver: CustomResolverType<TResult, TParent, TContext, TArgs>,
  ) =>
  (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) =>
    resolver(args, { root: parent, context, info });

export const callService = <TResult, TParent, TContext, TArgs>(
  resolver: CustomResolverType<TResult, TParent, TContext, TArgs>,
  args: TArgs,
  root: TParent = {} as TParent,
  context?: TContext,
) => resolver(args, { root, context });

const isObjectType = (
  type: unknown,
): type is { getFields: () => Record<string, { name: string }> } =>
  typeof type === "object" &&
  type !== null &&
  "getFields" in type &&
  typeof type.getFields === "function";

const defaultDateTimeScalar = {
  DateTime: {
    parseValue: (value: unknown) => new Date(value as string),
    serialize: (value: unknown) => (value instanceof Date ? value.toISOString() : value),
  },
} as const;

const isCamelCaseExport = (name: string): boolean => /^[a-z]/.test(name);

const isPascalCaseExport = (name: string): boolean => /^[A-Z]/.test(name);

type ServiceNamespace = Record<string, unknown>;

type ServiceResolvers = Record<string, ServiceNamespace>;

type ScalarResolvers = Record<
  string,
  {
    parseValue?: (value: unknown) => unknown;
    serialize?: (value: unknown) => unknown;
  }
>;

type ResolverMap = Record<string, Record<string, unknown>>;

export type CreateServiceSchemaOptions = {
  typeDefs: readonly (string | DocumentNode)[];
  services: ServiceResolvers;
  scalars?: ScalarResolvers;
  applyDirectives?: (schema: GraphQLSchema) => GraphQLSchema;
};

const collectServiceExports = (services: ServiceResolvers) => {
  const operationResolvers = new Map<string, { namespace: string; resolver: unknown }>();
  const typeResolvers = new Map<string, Record<string, unknown>>();

  for (const [namespace, module] of Object.entries(services)) {
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (typeof exportValue === "function" && isCamelCaseExport(exportName)) {
        const existing = operationResolvers.get(exportName);
        if (existing) {
          throw new Error(
            `Ambiguous service export "${exportName}" in ${existing.namespace} and ${namespace}`,
          );
        }

        operationResolvers.set(exportName, { namespace, resolver: exportValue });
        continue;
      }

      if (
        typeof exportValue === "object" &&
        exportValue !== null &&
        isPascalCaseExport(exportName)
      ) {
        const existing = typeResolvers.get(exportName);
        if (existing) {
          throw new Error(
            `Ambiguous type resolver export "${exportName}" in ${namespace} and an earlier namespace`,
          );
        }

        typeResolvers.set(exportName, exportValue as Record<string, unknown>);
      }
    }
  }

  return { operationResolvers, typeResolvers };
};

const buildResolverMap = (schema: GraphQLSchema, services: ServiceResolvers): ResolverMap => {
  const { operationResolvers, typeResolvers } = collectServiceExports(services);
  const resolvers: ResolverMap = {};

  for (const typeName of ["Query", "Mutation"] as const) {
    const type = schema.getType(typeName);
    if (!type || !isObjectType(type)) {
      continue;
    }

    for (const field of Object.values(type.getFields())) {
      const match = operationResolvers.get(field.name);
      if (!match) {
        throw new Error(`Missing service resolver for ${typeName}.${field.name}`);
      }

      resolvers[typeName] ??= {};
      resolvers[typeName][field.name] = bindResolver(
        match.resolver as CustomResolverType<unknown, unknown, unknown, unknown>,
      );
      operationResolvers.delete(field.name);
    }
  }

  for (const [typeName, fieldResolvers] of typeResolvers) {
    const type = schema.getType(typeName);
    if (!type || !isObjectType(type)) {
      throw new Error(`Service exports type resolver "${typeName}" but it is not in the schema`);
    }

    resolvers[typeName] ??= {};

    for (const [fieldName, resolver] of Object.entries(fieldResolvers)) {
      if (typeof resolver !== "function") {
        continue;
      }

      const field = type.getFields()[fieldName];
      if (!field) {
        throw new Error(`Service exports ${typeName}.${fieldName} but it is not in the schema`);
      }

      resolvers[typeName][fieldName] = bindResolver(
        resolver as CustomResolverType<unknown, unknown, unknown, unknown>,
      );
    }
  }

  if (operationResolvers.size > 0) {
    const unused = [...operationResolvers.keys()].join(", ");
    throw new Error(`Service exports are not mapped to Query or Mutation fields: ${unused}`);
  }

  return resolvers;
};

export const createServiceSchema = ({
  applyDirectives,
  scalars = defaultDateTimeScalar,
  services,
  typeDefs,
}: CreateServiceSchemaOptions): GraphQLSchema => {
  const mergedTypeDefs = mergeTypeDefs([...typeDefs], { throwOnConflict: true });
  const typeDefsOnlySchema = makeExecutableSchema({ typeDefs: mergedTypeDefs });
  const resolverMap = buildResolverMap(typeDefsOnlySchema, services);

  let schema = makeExecutableSchema({
    resolvers: {
      ...scalars,
      ...resolverMap,
    },
    typeDefs: mergedTypeDefs,
  });

  if (applyDirectives) {
    schema = applyDirectives(schema);
  }

  return schema;
};
