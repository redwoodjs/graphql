import { mkdirSync, writeFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

export type SchemaRegistryConfig = {
  /** Absolute path to the GraphQL app root (e.g. test-apps/graphql). */
  projectRoot: string;
  /** Absolute path for generated registry modules (a directory). */
  outputDir: string;
  patterns: {
    sdl: string;
    directives: string;
    services: string;
  };
  /** Import path for applyValidatorDirectives in generated getSchema.ts. */
  authDirectivesImport?: string;
  /** GraphQL types to enforce auth directives on. Defaults to Query and Mutation. */
  authEnforceOn?: string[];
};

export type DiscoveredSchemaRegistryFiles = {
  directives: string[];
  sdl: string[];
  services: string[];
};

export const SCHEMA_REGISTRY_FILES = {
  getSchema: "getSchema.gen.ts",
  services: "services.gen.ts",
  typeDefs: "typeDefs.gen.ts",
} as const;

const GENERATED_HEADER =
  "// AUTO-GENERATED — do not edit. Run `vp run regenerate-registry` to update.\n";

const isTestFile = (filePath: string): boolean => filePath.includes(".test.");

const isServiceModule = (filePath: string): boolean => {
  const serviceName = basename(dirname(filePath));
  const moduleName = basename(filePath, ".ts");

  return serviceName === moduleName;
};

const collectGlob = async (pattern: string, cwd: string): Promise<string[]> => {
  const matches: string[] = [];

  for await (const file of glob(pattern, { cwd })) {
    matches.push(file);
  }

  return matches;
};

/** Discover SDL, directive, and service modules using configured glob patterns. */
export const discoverSchemaRegistryFiles = async (
  config: SchemaRegistryConfig,
): Promise<DiscoveredSchemaRegistryFiles> => {
  const { patterns, projectRoot } = config;

  const [sdl, directives, services] = await Promise.all([
    collectGlob(patterns.sdl, projectRoot),
    collectGlob(patterns.directives, projectRoot),
    collectGlob(patterns.services, projectRoot),
  ]);

  return {
    directives: directives.filter((file) => !isTestFile(file)).sort(),
    sdl: sdl.sort(),
    services: services.filter((file) => !isTestFile(file) && isServiceModule(file)).sort(),
  };
};

const toImportPath = (outputDir: string, projectRoot: string, filePath: string): string => {
  const absolutePath = join(projectRoot, filePath);
  const importPath = relative(outputDir, absolutePath).replaceAll("\\", "/");

  if (importPath.startsWith(".")) {
    return importPath;
  }

  return `./${importPath}`;
};

const directiveBinding = (filePath: string): string => `${basename(dirname(filePath))}Directive`;

const sdlBinding = (filePath: string): string => `${basename(filePath, ".sdl.ts")}Schema`;

const serviceBinding = (filePath: string): string => `${basename(dirname(filePath))}Service`;

const serviceKey = (filePath: string): string => basename(dirname(filePath));

/** Generate SDL and directive registry source without service imports. */
export const generateTypeDefsRegistrySource = (
  config: SchemaRegistryConfig,
  files: DiscoveredSchemaRegistryFiles,
): string => {
  const rel = (filePath: string) => toImportPath(config.outputDir, config.projectRoot, filePath);

  const imports = [
    ...files.directives.map((file) => `import ${directiveBinding(file)} from "${rel(file)}";`),
    ...files.sdl.map((file) => `import { schema as ${sdlBinding(file)} } from "${rel(file)}";`),
  ];

  const directiveBindings = files.directives.map(directiveBinding).join(", ");
  const sdlBindings = files.sdl.map(sdlBinding).join(",\n  ");

  return `${GENERATED_HEADER}
${imports.join("\n")}

export const directives = [${directiveBindings}] as const;

export const typeDefs = [
  ...directives.map((directive) => directive.schema),
  ${sdlBindings},
] as const;
`;
};

/** Generate the service namespace registry source. */
export const generateServicesRegistrySource = (
  config: SchemaRegistryConfig,
  files: DiscoveredSchemaRegistryFiles,
): string => {
  const rel = (filePath: string) => toImportPath(config.outputDir, config.projectRoot, filePath);

  const imports = files.services.map(
    (file) => `import * as ${serviceBinding(file)} from "${rel(file)}";`,
  );

  const serviceEntries = files.services
    .map((file) => `  ${serviceKey(file)}: ${serviceBinding(file)},`)
    .join("\n");

  return `${GENERATED_HEADER}
${imports.join("\n")}

export const services = {
${serviceEntries}
} as const;
`;
};

/** Generate combined registry source for callers that want a single module. */
export const generateSchemaRegistrySource = (
  config: SchemaRegistryConfig,
  files: DiscoveredSchemaRegistryFiles,
): string => {
  const typeDefsSource = generateTypeDefsRegistrySource(config, files).replace(
    GENERATED_HEADER,
    "",
  );
  const servicesSource = generateServicesRegistrySource(config, files).replace(
    GENERATED_HEADER,
    "",
  );

  return `${GENERATED_HEADER}${typeDefsSource.trim()}\n\n${servicesSource.trim()}\n`;
};

/** Generate executable schema factory source. */
export const generateGetSchemaSource = (config: SchemaRegistryConfig): string => {
  const authImport = config.authDirectivesImport ?? "@rwgql/auth/graphql";
  const enforceOn = config.authEnforceOn ?? ["Query", "Mutation"];
  const enforceOnLiteral = enforceOn.map((type) => `"${type}"`).join(", ");

  return `${GENERATED_HEADER}
import type { GraphQLSchema } from "graphql";

import { applyValidatorDirectives } from "${authImport}";
import { createServiceSchema } from "@rwgql/graphql-typegen/yoga";

import { directives, typeDefs } from "./typeDefs.gen.ts";
import { services } from "./services.gen.ts";

let schema: GraphQLSchema | undefined;

export const getSchema = (): GraphQLSchema => {
  schema ??= createServiceSchema({
    applyDirectives: (executable) =>
      applyValidatorDirectives(directives, { enforceOn: [${enforceOnLiteral}] })(executable),
    services,
    typeDefs,
  });

  return schema;
};
`;
};

/** Discover schema modules and write generated registry files. */
export const writeSchemaRegistry = async (config: SchemaRegistryConfig): Promise<void> => {
  const files = await discoverSchemaRegistryFiles(config);

  mkdirSync(config.outputDir, { recursive: true });
  writeFileSync(
    join(config.outputDir, SCHEMA_REGISTRY_FILES.typeDefs),
    generateTypeDefsRegistrySource(config, files),
  );
  writeFileSync(
    join(config.outputDir, SCHEMA_REGISTRY_FILES.services),
    generateServicesRegistrySource(config, files),
  );
  writeFileSync(
    join(config.outputDir, SCHEMA_REGISTRY_FILES.getSchema),
    generateGetSchemaSource(config),
  );
};
