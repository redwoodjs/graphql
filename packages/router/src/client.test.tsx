import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { NavLink } from "./client.js";
import { PathnameProvider } from "./PathnameProvider.js";

describe("NavLink", () => {
  const originalPathname = window.location.pathname;

  afterEach(() => {
    window.history.pushState({}, "", originalPathname);
  });

  it("applies activeClassName when the current pathname matches", () => {
    window.history.pushState({}, "", "/about");

    render(
      <NavLink activeClassName="is-active" className="link" to="/about">
        About
      </NavLink>,
    );

    expect(screen.getByRole("link", { name: "About" })).toHaveClass("is-active");
  });

  it("uses className when pathname does not match", () => {
    window.history.pushState({}, "", "/contact");

    render(
      <NavLink activeClassName="is-active" className="link" to="/about">
        About
      </NavLink>,
    );

    expect(screen.getByRole("link", { name: "About" })).toHaveClass("link");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveClass("is-active");
  });

  it("matches active routes when provider pathname has a trailing slash", () => {
    render(
      <PathnameProvider pathname="/contact/">
        <NavLink activeClassName="is-active" className="link" to="/contact">
          Contact Us
        </NavLink>
      </PathnameProvider>,
    );

    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveClass("is-active");
  });
});
