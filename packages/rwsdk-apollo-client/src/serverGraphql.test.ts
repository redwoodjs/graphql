import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { GraphqlQueryError, createServerGraphql } from "./serverGraphql.js";

vi.mock("rwsdk/worker", () => ({
  getRequestInfo: vi.fn(() => ({
    request: new Request("http://localhost/", {
      headers: { cookie: "session=test" },
    }),
  })),
}));

const QUERY = {
  kind: "Document",
  definitions: [],
} as unknown as TypedDocumentNode<{ posts: readonly { id: number }[] }>;

describe("createServerGraphql", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: { posts: [{ id: 1 }] } }),
      })),
    );
  });

  it("queries the configured endpoint with request cookies", async () => {
    const { queryGraphql } = createServerGraphql({
      resolveUrl: () => "http://example.com/graphql",
    });

    const data = await queryGraphql(QUERY);

    expect(data).toEqual({ posts: [{ id: 1 }] });
    expect(fetch).toHaveBeenCalledWith(
      "http://example.com/graphql",
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "session=test",
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("returns configured error UI from renderGraphqlPage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
      })),
    );

    const { renderGraphqlPage } = createServerGraphql({
      renderError: (message) => `failed:${message}`,
      resolveUrl: () => "http://example.com/graphql",
    });

    const result = await renderGraphqlPage(QUERY, undefined, () => "ok");

    expect(result).toBe("failed:GraphQL request failed (500)");
  });

  it("returns default empty UI when isEmpty matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: { posts: [] } }),
      })),
    );

    const { renderGraphqlPage } = createServerGraphql({
      resolveUrl: () => "http://example.com/graphql",
    });

    const result = await renderGraphqlPage(QUERY, undefined, () => "content", {
      isEmpty: ({ posts }) => posts.length === 0,
    });

    expect(renderToStaticMarkup(result as React.ReactElement)).toBe("<div>Empty</div>");
  });

  it("throws GraphqlQueryError for graphql errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ errors: [{ message: "nope" }] }),
      })),
    );

    const { queryGraphql } = createServerGraphql({
      resolveUrl: () => "http://example.com/graphql",
    });

    await expect(queryGraphql(QUERY)).rejects.toBeInstanceOf(GraphqlQueryError);
  });
});
