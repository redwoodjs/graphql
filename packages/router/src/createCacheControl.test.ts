import { describe, expect, it } from "vite-plus/test";

import { createCacheControl } from "./createCacheControl.js";
import {
  DEFAULT_CACHE_CONTROL,
  resolveCacheControl,
  resolveRouteCacheControl,
} from "./cacheControl.js";

describe("resolveCacheControl", () => {
  it("returns the default policy for cache={true}", () => {
    expect(resolveCacheControl(true)).toBe(DEFAULT_CACHE_CONTROL);
  });

  it("passes through custom Cache-Control values", () => {
    expect(resolveCacheControl("public, max-age=300")).toBe("public, max-age=300");
  });
});

describe("resolveRouteCacheControl", () => {
  it("inherits Set-level cache unless a route opts out", () => {
    expect(resolveRouteCacheControl(undefined, DEFAULT_CACHE_CONTROL)).toBe(DEFAULT_CACHE_CONTROL);
    expect(resolveRouteCacheControl(false, DEFAULT_CACHE_CONTROL)).toBeUndefined();
  });
});

describe("createCacheControl", () => {
  it("sets Cache-Control on the response", () => {
    const middleware = createCacheControl("public, max-age=60");
    const response = { headers: new Headers() };

    void middleware({ response } as never);

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});
