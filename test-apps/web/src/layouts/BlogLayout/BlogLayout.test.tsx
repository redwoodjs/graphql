import { render } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import BlogLayout from "./BlogLayout";

describe("BlogLayout", () => {
  it("renders successfully", () => {
    expect(() => {
      render(<BlogLayout />);
    }).not.toThrow();
  });
});
