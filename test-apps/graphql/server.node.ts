import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { registerDbAuthRoutes } from "@rwgql/dbauth/server";

import { dbAuthOptions } from "./src/auth/dbAuthConfig.ts";
import { createGraphqlYoga } from "./src/graphql.ts";
import { db } from "db";

const isDev = process.env.NODE_ENV !== "production";

// Fastify's per-request `→`/`←` logs are noisy; opt in with GRAPHQL_REQUEST_LOGGING=true.
const enableRequestLogging = process.env.GRAPHQL_REQUEST_LOGGING === "true";

const app = Fastify({
  disableRequestLogging: !enableRequestLogging,
  logger: isDev
    ? { transport: { target: "@rwgql/log-formatter", options: { name: "graphql" } } }
    : true,
});

await app.register(cors, {
  credentials: true,
  origin: process.env.WEB_ORIGIN ?? "http://localhost:8910",
});

registerDbAuthRoutes(app, dbAuthOptions);

const yoga = createGraphqlYoga(app.log);

const yogaMethods = ["GET", "HEAD", "POST", "OPTIONS"] as const;

const handleYoga = (request: FastifyRequest, reply: FastifyReply) =>
  yoga.handleNodeRequestAndResponse(request, reply, {
    reply,
    request,
  });

// Yoga owns /graphql and built-in subpaths like /graphql/health (readiness).
for (const url of [yoga.graphqlEndpoint, `${yoga.graphqlEndpoint}/health`]) {
  app.route({
    handler: handleYoga,
    method: [...yogaMethods],
    url,
  });
}

const disconnect = async () => {
  await db.$disconnect();
};

const handleShutdownSignal = () => {
  void disconnect();
};

process.on("SIGINT", handleShutdownSignal);
process.on("SIGTERM", handleShutdownSignal);

await app.ready();

const routing = app.routing.bind(app);

export default routing;
