import { render } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import ContactUsPage from "./ContactUsPage";

describe("ContactUsPage", () => {
  it("renders successfully", () => {
    expect(() => {
      render(<ContactUsPage />);
    }).not.toThrow();
  });
});
