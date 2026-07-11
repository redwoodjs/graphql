import {
  getNamedType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  type GraphQLSchema,
} from "graphql";

export const RELATION_OPTIONAL = `type RelationOptional<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] }`;

const ROOT_OPERATION_TYPES = new Set(["Query", "Mutation", "Subscription"]);

export const getRelationFields = (schema: GraphQLSchema, typeName: string): string[] => {
  const type = schema.getType(typeName);
  if (!type || !isObjectType(type)) {
    return [];
  }

  return Object.values(type.getFields())
    .filter((field) => {
      const namedType = getNamedType(field.type);
      return isObjectType(namedType) || isInterfaceType(namedType) || isUnionType(namedType);
    })
    .map((field) => field.name);
};

export const shouldWrapRelationOptional = (schema: GraphQLSchema, typeName: string): boolean => {
  if (ROOT_OPERATION_TYPES.has(typeName)) {
    return false;
  }

  return getRelationFields(schema, typeName).length > 0;
};

export const wrapObjectType = (declaration: string, relationFields: string[]): string => {
  const match = declaration.match(/^export type (\S+) = ([\s\S]+)$/);
  if (!match) {
    return declaration;
  }

  const [, typeName, body] = match;
  return `export type ${typeName} = RelationOptional<\n${body}, '${relationFields.join("' | '")}'>\n`;
};

export const wrapRelationOptionalTypes = (schema: GraphQLSchema, content: string): string =>
  content
    .split(/(?=^export type )/m)
    .map((declaration) => {
      const nameMatch = declaration.match(/^export type (\w+) =/);
      if (!nameMatch || !shouldWrapRelationOptional(schema, nameMatch[1])) {
        return declaration;
      }

      const relationFields = getRelationFields(schema, nameMatch[1]);
      if (relationFields.length === 0) {
        return declaration;
      }

      const trimmed = declaration.trimEnd();
      const wrapped = wrapObjectType(trimmed, relationFields);
      return declaration.endsWith("\n") ? `${wrapped}\n` : wrapped;
    })
    .join("");

/** Append dedicated relation-resolver types for grouped service exports. */
export const appendRelationResolverTypes = (schema: GraphQLSchema, content: string): string => {
  const lines: string[] = [];

  for (const typeName of Object.keys(schema.getTypeMap()).sort()) {
    if (typeName.startsWith("__") || ROOT_OPERATION_TYPES.has(typeName)) {
      continue;
    }

    const relationFields = getRelationFields(schema, typeName);
    if (relationFields.length === 0) {
      continue;
    }

    const keys = relationFields.map((field) => `'${field}'`).join(" | ");
    lines.push(
      `export type ${typeName}RelationResolvers<ContextType = YogaContext, ParentType extends ResolversParentTypes['${typeName}'] = ResolversParentTypes['${typeName}']> = Pick<${typeName}Resolvers<ContextType, ParentType>, ${keys}>;`,
    );
  }

  if (lines.length === 0) {
    return content;
  }

  return `${content.trimEnd()}\n\n${lines.join("\n")}\n`;
};
