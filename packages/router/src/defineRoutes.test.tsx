import { describe, expect, it } from "vite-plus/test";

import { defineRoutes } from "./defineRoutes.js";
import { Route, Router } from "./routeTree.js";

const HomePage = () => null;

describe("defineRoutes", () => {
  it("returns the route tree for worker compilation", () => {
    const routeTree = (
      <Router>
        <Route path="/login" page={HomePage} name="login" />
        <Route path="/" page={HomePage} name="home" />
      </Router>
    );

    expect(defineRoutes(routeTree)).toEqual({ routeTree });
  });
});
