import { render } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import AboutPage from "./AboutPage";

describe("AboutPage", () => {
  it("renders successfully", () => {
    expect(() => {
      render(<AboutPage />);
    }).not.toThrow();
  });
});
