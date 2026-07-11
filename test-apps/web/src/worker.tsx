import type { ReactNode } from "react";
import { defineApp, type RequestInfo } from "rwsdk/worker";
import { createAuthDecoder } from "@rwgql/dbauth/decoder";
import {
  createApolloRwsdkTransportId,
  renderApolloRwsdkRscStream,
  renderApolloRwsdkStream,
} from "@rwgql/rwsdk-apollo-client/worker";
import { withWorkerCompile } from "@rwgql/router/worker";
import type { NamedRoutes } from "@rwgql/router/routes";
import appRoutes, { routes } from "@/Routes";
import { GraphQLProvider } from "@/GraphQLProvider";
import { Document } from "@/document";
import { setCommonHeaders } from "@/headers";
import { resolveGraphqlUrl } from "@/graphql.server";

export type Session = {
  readonly id: number;
};

export type AppContext = {
  session: Session | null;
};

type IdParams = {
  readonly id: string;
};

type AppRequestInfo = RequestInfo<IdParams, AppContext>;

// Must match the dbAuth cookie name configured in test-apps/graphql (src/auth/auth.ts).
const cookieName = "session_8911";

const authDecoder = createAuthDecoder({
  cookieName,
  secret: import.meta.env.DB_AUTH_SECRET,
});

const sessionMiddleware = ({ ctx, request }: RequestInfo<IdParams, AppContext>) => {
  ctx.session = authDecoder(request);
};

const isRscNavigationRequest = (request: Request) => {
  const url = new URL(request.url);
  return url.searchParams.has("__rsc");
};

const renderPage = async (requestInfo: AppRequestInfo, children: ReactNode) => {
  const apolloTransportId = createApolloRwsdkTransportId();
  const graphqlUrl = resolveGraphqlUrl();
  const page = (
    <GraphQLProvider
      graphQLUrl={graphqlUrl}
      nonce={requestInfo.rw.nonce}
      transportId={apolloTransportId}
    >
      {children}
    </GraphQLProvider>
  );

  if (isRscNavigationRequest(requestInfo.request)) {
    const stream = await renderApolloRwsdkRscStream(page, { requestInfo });

    return new Response(stream, {
      headers: {
        "content-type": "text/x-component; charset=utf-8",
      },
    });
  }

  const stream = await renderApolloRwsdkStream(page, {
    Document,
    requestInfo,
    transportId: apolloTransportId,
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
};

const routeId = (requestInfo: AppRequestInfo) => Number.parseInt(requestInfo.params.id, 10);

const { workerRoutes } = withWorkerCompile({
  ...appRoutes,
  routes: routes as NamedRoutes,
}).compile({
  isAuthenticated: ({ ctx }) => Boolean(ctx.session),
  parseRouteId: routeId,
  renderPage,
});

export default defineApp([setCommonHeaders(), sessionMiddleware, ...workerRoutes]);
