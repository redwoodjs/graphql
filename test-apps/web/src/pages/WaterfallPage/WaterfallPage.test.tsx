import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import WaterfallPage from "./WaterfallPage";

describe("WaterfallPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            waterfallBlogPost: {
              author: { email: "se7en@7.com", fullName: "Se7en Lastname" },
              body: "Mocked body",
              createdAt: "2022-01-17T13:57:51.607Z",
              id: 42,
              title: "Mocked title",
            },
          },
        }),
      })),
    );
  });

  it("renders a waterfall blog post from the server query", async () => {
    render(await WaterfallPage({ id: 42 }));
    expect(screen.getByText("Mocked title")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({
        body: expect.stringContaining('"id":42'),
        method: "POST",
      }),
    );
  });
});
