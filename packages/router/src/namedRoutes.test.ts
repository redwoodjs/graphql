import { describe, expect, it } from "vite-plus/test";

import { createNamedRoutes } from "./namedRoutes.js";

describe("createNamedRoutes", () => {
  it("types static routes as zero-arg functions", () => {
    const routes = createNamedRoutes([
      { name: "home", path: "/" },
      { name: "about", path: "/about" },
    ] as const);

    expect(routes.home()).toBe("/");
    expect(routes.about()).toBe("/about");
  });

  it("types param routes as functions requiring params", () => {
    const routes = createNamedRoutes([
      { name: "post", path: "/posts/:id" },
      { name: "editPost", path: "/posts/:id/edit" },
    ] as const);

    expect(routes.post({ id: 3 })).toBe("/posts/3");
    expect(routes.editPost({ id: "abc" })).toBe("/posts/abc/edit");
  });
});
