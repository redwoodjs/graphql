import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";
import type { DocumentNode } from "graphql";
import { createYoga, type Plugin } from "graphql-yoga";
import { createAuthDecoder } from "@rwgql/dbauth/server";
import { createAuthYogaPlugin } from "@rwgql/auth/graphql";

import { dbAuthOptions } from "./auth/dbAuthConfig.ts";
import { cookieName, getCurrentUser } from "./auth/auth.ts";
import { getSchema } from "./getSchema.gen.ts";

export type YogaContext = {
  readonly currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
  readonly reply: FastifyReply;
  readonly request: FastifyRequest;
};

const authDecoder = createAuthDecoder({ cookieName, secret: dbAuthOptions.secret });

const getOperationName = (
  document: DocumentNode | undefined,
  fallback: string | null | undefined,
): string | undefined => {
  if (fallback) {
    return fallback;
  }

  const operation = document?.definitions.find((def) => def.kind === "OperationDefinition");
  return operation && "name" in operation ? operation.name?.value : undefined;
};

// Emits one lean log per GraphQL operation: the operation/resolver name plus
// its execution time, e.g. `ListPosts 12.4ms`.
const createOperationLoggerPlugin = (logger: FastifyBaseLogger): Plugin<YogaContext> => ({
  onExecute({ args }) {
    const start = performance.now();

    return {
      onExecuteDone() {
        const responseTime = performance.now() - start;
        const operationName = getOperationName(args.document, args.operationName);
        logger.info({ operationName, responseTime }, operationName ?? "anonymous operation");
      },
    };
  },
});

const toWebRequest = (request: FastifyRequest) =>
  new Request(`http://localhost${request.url}`, {
    headers: request.headers as HeadersInit,
    method: request.method,
  });

export const createGraphqlYoga = (logger: FastifyBaseLogger) =>
  createYoga<YogaContext>({
    context: ({ reply, request }) => ({
      currentUser: null,
      reply,
      request,
    }),
    graphqlEndpoint: "/graphql",
    landingPage: true,
    logging: {
      debug: (...args) => args.forEach((arg) => logger.debug(arg)),
      error: (...args) => args.forEach((arg) => logger.error(arg)),
      info: (...args) => args.forEach((arg) => logger.info(arg)),
      warn: (...args) => args.forEach((arg) => logger.warn(arg)),
    },
    plugins: [
      createOperationLoggerPlugin(logger),
      createAuthYogaPlugin({
        decodeSession: (request) => {
          const webRequest =
            request instanceof Request ? request : toWebRequest(request as FastifyRequest);

          return authDecoder(webRequest);
        },
        getCurrentUser: (session) => getCurrentUser(session as { id: number }),
      }),
    ],
    schema: getSchema(),
  });
