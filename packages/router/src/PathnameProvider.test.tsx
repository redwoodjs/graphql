import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { PathnameProvider, usePathname } from "./PathnameProvider.js";

const PathnameProbe = () => <span data-testid="pathname">{usePathname()}</span>;

describe("usePathname", () => {
  const originalPathname = window.location.pathname;

  afterEach(() => {
    window.history.pushState({}, "", originalPathname);
  });

  it("prefers provider pathname when set", () => {
    window.history.pushState({}, "", "/contact");

    render(
      <PathnameProvider pathname="/about">
        <PathnameProbe />
      </PathnameProvider>,
    );

    expect(screen.getByTestId("pathname")).toHaveTextContent("/about");
  });

  it("falls back to window.location when provider is undefined", () => {
    window.history.pushState({}, "", "/contact");

    render(<PathnameProbe />);

    expect(screen.getByTestId("pathname")).toHaveTextContent("/contact");
  });

  it("strips trailing slashes from pathnames", () => {
    render(
      <PathnameProvider pathname="/contact/">
        <PathnameProbe />
      </PathnameProvider>,
    );

    expect(screen.getByTestId("pathname")).toHaveTextContent("/contact");
  });
});
