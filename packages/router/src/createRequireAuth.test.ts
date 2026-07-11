import { describe, expect, it } from "vite-plus/test";
import type { RequestInfo } from "rwsdk/worker";

import { createRequireAuth } from "./createRequireAuth.js";

type TestContext = {
  session: { id: number } | null;
};

const createRequestInfo = (url: string, session: { id: number } | null = null) =>
  ({
    ctx: { session },
    request: new Request(url),
  }) as unknown as RequestInfo<Record<string, string>, TestContext>;

describe("createRequireAuth", () => {
  it("redirects unauthenticated requests to login with redirectTo", async () => {
    const requireAuth = createRequireAuth<RequestInfo<Record<string, string>, TestContext>>({
      isAuthenticated: ({ ctx }) => Boolean(ctx.session),
    });

    const result = await requireAuth(createRequestInfo("https://example.com/posts?page=2"));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe(
      "/login?redirectTo=%2Fposts%3Fpage%3D2",
    );
  });

  it("passes through authenticated requests", async () => {
    const requireAuth = createRequireAuth<RequestInfo<Record<string, string>, TestContext>>({
      isAuthenticated: ({ ctx }) => Boolean(ctx.session),
    });

    const result = await requireAuth(createRequestInfo("https://example.com/posts", { id: 1 }));

    expect(result).toBeUndefined();
  });
});
