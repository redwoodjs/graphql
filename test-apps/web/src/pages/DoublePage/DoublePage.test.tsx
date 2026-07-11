import { render } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import DoublePage from "./DoublePage";

describe("DoublePage", () => {
  it("renders successfully", () => {
    expect(() => {
      render(<DoublePage />);
    }).not.toThrow();
  });
});
