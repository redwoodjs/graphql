import { describe, expect, it } from "vite-plus/test";

import { routeNamesFromTree, Private, Route, Router, Set } from "./routeTree.js";

describe("routeNamesFromTree", () => {
  it("extracts route metadata without page components", () => {
    const names = routeNamesFromTree(
      <Router>
        <Route path="/login" name="login" />
        <Set wrap={() => null} title="Contacts">
          <Private unauthenticated="login">
            <Route path="/contacts/{id:Int}" name="contact" private />
          </Private>
        </Set>
        <Route notfound name="notFound" />
      </Router>,
    );

    expect(names).toEqual([
      { name: "login", path: "/login" },
      { name: "contact", path: "/contacts/:id", private: true, unauthenticated: "login" },
      { name: "notFound", path: "/*" },
    ]);
  });
});
