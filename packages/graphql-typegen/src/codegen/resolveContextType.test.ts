import { describe, expect, it } from "vite-plus/test";

import { createRedwoodResolverGenerateEntry } from "./index.ts";
import { DEFAULT_RESOLVER_TYPES_OUTPUT, resolveContextType } from "./resolveContextType.ts";

describe("resolveContextType", () => {
  it("resolves the Yoga context import relative to the generated resolver types path", () => {
    expect(resolveContextType("./types/graphql.d.ts")).toBe("../src/graphql.ts#YogaContext");
  });

  it("supports a custom context export name", () => {
    expect(resolveContextType("./types/graphql.d.ts", "GraphQLContext")).toBe(
      "../src/graphql.ts#GraphQLContext",
    );
  });
});

describe("createRedwoodResolverGenerateEntry", () => {
  it("uses the default resolver types output path", () => {
    const entry = createRedwoodResolverGenerateEntry({});
    const generated = entry[DEFAULT_RESOLVER_TYPES_OUTPUT];

    expect(Object.keys(entry)).toEqual([DEFAULT_RESOLVER_TYPES_OUTPUT]);
    expect(generated).toMatchObject({
      config: {
        contextType: "../src/graphql.ts#YogaContext",
      },
    });
  });

  it("allows overriding the output path", () => {
    const entry = createRedwoodResolverGenerateEntry({
      output: "./generated/api/graphql.ts",
    });

    expect(Object.keys(entry)).toEqual(["./generated/api/graphql.ts"]);
  });
});
