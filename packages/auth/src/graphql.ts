import { getDirective, MapperKind, mapSchema } from "@graphql-tools/utils";
import {
  type DocumentNode,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  defaultFieldResolver,
  Kind,
  parse,
} from "graphql";
import type { Plugin } from "graphql-yoga";

export { AuthenticationError, ForbiddenError } from "./errors.js";
export { hasRoleForUser } from "./hasRole.js";

type AuthContext = {
  readonly currentUser?: Record<string, unknown> | null;
};

const extendAuthContext = (
  extendContext: (contextExtension: Partial<Record<string, unknown>>) => void,
  currentUser: Record<string, unknown> | null,
) => {
  extendContext({ currentUser });
};

type DecodeSession = (
  request: Request,
) => Promise<null | Record<string, unknown>> | null | Record<string, unknown>;

type GetCurrentUser = (
  session: Record<string, unknown>,
) => Promise<Record<string, unknown> | null> | null | Record<string, unknown>;

export const createAuthYogaPlugin = ({
  decodeSession,
  getCurrentUser,
}: {
  decodeSession: DecodeSession;
  getCurrentUser: GetCurrentUser;
}): Plugin => ({
  onContextBuilding: async ({ context, extendContext }) => {
    const request = (context as { request?: Request }).request;
    const setCurrentUser = extendContext as (
      contextExtension: Partial<Record<string, unknown>>,
    ) => void;

    if (!request) {
      extendAuthContext(setCurrentUser, null);
      return;
    }

    const session = await decodeSession(request);

    if (!session) {
      extendAuthContext(setCurrentUser, null);
      return;
    }

    const currentUser = await getCurrentUser(session);
    extendAuthContext(setCurrentUser, currentUser ?? null);
  },
});

export type ValidatorDirectiveFunc<TDirectiveArgs = Record<string, unknown>> = (args: {
  root: unknown;
  args: Record<string, unknown>;
  context: AuthContext;
  info: GraphQLResolveInfo;
  directiveArgs: TDirectiveArgs;
}) => void | Promise<void>;

export type ValidatorDirective = {
  readonly name: string;
  readonly schema: DocumentNode | string;
  readonly type: "validator";
  readonly onResolverCalled: ValidatorDirectiveFunc;
};

const getDirectiveName = (schema: DocumentNode | string): string => {
  const document = typeof schema === "string" ? parse(schema) : schema;

  for (const definition of document.definitions) {
    if (definition.kind === Kind.DIRECTIVE_DEFINITION) {
      return definition.name.value;
    }
  }

  throw new Error("createValidatorDirective: no directive definition found in schema");
};

export const createValidatorDirective = <TDirectiveArgs = Record<string, unknown>>(
  schema: DocumentNode | string,
  validate: ValidatorDirectiveFunc<TDirectiveArgs>,
): ValidatorDirective => ({
  name: getDirectiveName(schema),
  onResolverCalled: (params) =>
    validate({ ...params, directiveArgs: params.directiveArgs as TDirectiveArgs }),
  schema,
  type: "validator",
});

export const applyValidatorDirectives = (
  directives: readonly ValidatorDirective[],
  { enforceOn = ["Query", "Mutation"] }: { enforceOn?: readonly string[] } = {},
) => {
  const directiveNames = directives.map((directive) => directive.name);

  return (schema: GraphQLSchema): GraphQLSchema =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const matched = directives.flatMap((directive) => {
          const directiveArgs = getDirective(schema, fieldConfig, directive.name)?.[0];

          return directiveArgs ? [{ directive, directiveArgs }] : [];
        });

        if (matched.length === 0) {
          if (enforceOn.includes(typeName)) {
            throw new Error(
              `Field "${typeName}.${fieldName}" is missing an auth directive. ` +
                `Add one of: ${directiveNames.map((name) => `@${name}`).join(", ")}.`,
            );
          }

          return fieldConfig;
        }

        const { resolve = defaultFieldResolver } = fieldConfig;

        fieldConfig.resolve = async (root, args, context, info) => {
          const authContext = context as AuthContext;

          for (const { directive, directiveArgs } of matched) {
            await directive.onResolverCalled({
              args: args as Record<string, unknown>,
              context: authContext,
              directiveArgs,
              info,
              root,
            });
          }

          return resolve(root, args, context, info);
        };

        return fieldConfig;
      },
    });
};
