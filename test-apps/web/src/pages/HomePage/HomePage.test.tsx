import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import HomePage from "./HomePage";

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            blogPosts: [
              {
                author: { email: "ada@example.com", fullName: "Ada Lovelace" },
                body: "Hello",
                createdAt: "2022-01-17T13:57:51.607Z",
                id: 1,
                title: "First post",
              },
            ],
          },
        }),
      })),
    );
  });

  it("renders blog posts from the server query", async () => {
    render(await HomePage());
    expect(screen.getByText("First post")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("renders empty when the query returns no posts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: { blogPosts: [] } }),
      })),
    );

    render(await HomePage());
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
