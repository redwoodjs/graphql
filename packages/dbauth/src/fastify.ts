import type { FastifyInstance } from "fastify";

import { handleDbAuthRequest } from "./handler.js";
import type { DbAuthHandlerOptions } from "./types.js";

const toWebRequest = (request: {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  raw: { url?: string };
  url: string;
}) => {
  const url = request.raw.url ?? request.url;
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }

    headers.set(key, Array.isArray(value) ? value.join(",") : value);
  }

  const init: RequestInit = {
    headers,
    method: request.method,
  };

  if (request.method !== "GET" && request.method !== "HEAD" && request.body !== undefined) {
    init.body = JSON.stringify(request.body);
    headers.set("content-type", "application/json");
  }

  return new Request(`http://localhost${url}`, init);
};

const sendWebResponse = async (
  reply: {
    header(name: string, value: string): unknown;
    status(statusCode: number): { send(body: unknown): unknown };
  },
  response: Response,
) => {
  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });

  const body = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : await response.text();

  return reply.status(response.status).send(body);
};

export const registerDbAuthRoutes = (
  app: FastifyInstance,
  options: DbAuthHandlerOptions,
  route = "/auth",
) => {
  app.route({
    handler: async (request, reply) => {
      const response = await handleDbAuthRequest(toWebRequest(request), options);
      return sendWebResponse(reply, response);
    },
    method: ["GET", "POST", "OPTIONS"],
    url: route,
  });
};
