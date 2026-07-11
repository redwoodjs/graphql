import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_CACHE_CONTROL } from "./cacheControl.js";
import { buildRouteDefinitions } from "./buildRouteDefinitions.js";
import { Private, Route, Router, Set } from "./routeTree.js";

const HomePage = () => null;
const ProfilePage = () => null;

describe("buildRouteDefinitions", () => {
  it("inherits cache from Set and skips private routes", () => {
    const definitions = buildRouteDefinitions(
      <Router>
        <Set wrap={() => null} cache>
          <Route path="/" page={HomePage} name="home" />
          <Private unauthenticated="login">
            <Route path="/profile" page={ProfilePage} name="profile" />
          </Private>
        </Set>
      </Router>,
    );

    expect(definitions.find((entry) => entry.name === "home")?.cacheControl).toBe(
      DEFAULT_CACHE_CONTROL,
    );
    expect(definitions.find((entry) => entry.name === "profile")?.cacheControl).toBeUndefined();
  });
});
