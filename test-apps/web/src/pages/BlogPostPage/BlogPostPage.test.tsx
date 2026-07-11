import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import BlogPostPage from "./BlogPostPage";

describe("BlogPostPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            blogPost: {
              author: { email: "ada@example.com", fullName: "Ada Lovelace" },
              body: "Hello",
              createdAt: "2022-01-17T13:57:51.607Z",
              id: 42,
              title: "A post",
            },
          },
        }),
      })),
    );
  });

  it("renders a blog post from the server query", async () => {
    render(await BlogPostPage({ id: 42 }));
    expect(screen.getByText("A post")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({
        body: expect.stringContaining('"id":42'),
        method: "POST",
      }),
    );
  });
});
