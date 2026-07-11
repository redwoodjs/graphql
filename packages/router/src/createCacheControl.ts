import type { RequestInfo } from "rwsdk/worker";
import type { RouteMiddleware } from "rwsdk/router";

export const createCacheControl = <T extends RequestInfo = RequestInfo>(
  cacheControl: string,
): RouteMiddleware<T> => {
  return ({ response }) => {
    response.headers.set("Cache-Control", cacheControl);
  };
};
