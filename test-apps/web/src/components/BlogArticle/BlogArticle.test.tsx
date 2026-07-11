import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import BlogArticle from "./BlogArticle";

describe("BlogArticle", () => {
  it("renders post content", () => {
    render(
      <BlogArticle
        post={{
          author: { email: "ada@example.com", fullName: "Ada Lovelace" },
          body: "Hello world",
          createdAt: "2022-01-17T13:57:51.607Z",
          id: 1,
          title: "First post",
        }}
        titleHref="/blog-post/1"
      />,
    );

    expect(screen.getByText("First post")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
