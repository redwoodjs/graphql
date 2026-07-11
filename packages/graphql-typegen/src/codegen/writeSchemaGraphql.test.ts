import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { writeSchemaGraphql } from "./writeSchemaGraphql.ts";

describe("writeSchemaGraphql", () => {
  it("writes merged SDL to the output path", () => {
    const dir = mkdtempSync(join(tmpdir(), "rwgql-schema-"));
    const outputPath = join(dir, "schema.graphql");

    writeSchemaGraphql(
      [
        `
          type Post {
            id: Int!
            title: String!
          }
        `,
      ],
      outputPath,
    );

    const written = readFileSync(outputPath, "utf8");
    expect(written).toContain("type Post");
    expect(written).toContain("id: Int!");
  });
});
