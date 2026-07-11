import type { RequestInfo } from "rwsdk/worker";
import type { RouteMiddleware } from "rwsdk/router";

export type RequireAuthOptions<T extends RequestInfo = RequestInfo> = {
  readonly loginPath?: string;
  readonly isAuthenticated: (requestInfo: T) => boolean;
};

export const createRequireAuth = <T extends RequestInfo = RequestInfo>({
  loginPath = "/login",
  isAuthenticated,
}: RequireAuthOptions<T>): RouteMiddleware<T> => {
  return (requestInfo) => {
    if (isAuthenticated(requestInfo)) {
      return;
    }

    const requestUrl = new URL(requestInfo.request.url);
    const loginUrl = new URL(loginPath, requestUrl);
    loginUrl.searchParams.set("redirectTo", `${requestUrl.pathname}${requestUrl.search}`);

    return new Response(null, {
      headers: { Location: `${loginUrl.pathname}${loginUrl.search}` },
      status: 302,
    });
  };
};
