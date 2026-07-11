import path from "node:path";

/** Default output path for generated server resolver types. */
export const DEFAULT_RESOLVER_TYPES_OUTPUT = "./types/graphql.d.ts";

/** Default GraphQL context export name for Redwood-style Yoga apps. */
export const DEFAULT_CONTEXT_EXPORT = "YogaContext";

/**
 * Resolve the graphql-codegen `contextType` import for a generated `graphql.ts` file.
 * Convention: Yoga context lives at `src/graphql.ts`, one level up from app-root `types/`.
 */
export const resolveContextType = (
  outputPath: string,
  contextExport: string = DEFAULT_CONTEXT_EXPORT,
): string => {
  const outputDir = path.dirname(outputPath);
  const contextModule = path.normalize(path.join(outputDir, "../src/graphql.ts"));
  const relativeModule = path.relative(outputDir, contextModule).replace(/\\/g, "/");
  const importPath = relativeModule.startsWith(".") ? relativeModule : `./${relativeModule}`;

  return `${importPath}#${contextExport}`;
};
