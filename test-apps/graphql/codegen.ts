import type { CodegenConfig } from "@graphql-codegen/cli";
import { clientScalars, createRedwoodResolverGenerateEntry } from "@rwgql/graphql-typegen/codegen";

const schemaPath = "./schema.graphql";

const config: CodegenConfig = {
  schema: schemaPath,
  documents: ["../web/src/components/**/*.{ts,tsx}", "../web/src/pages/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    "../web/src/gql/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: { unmaskFunctionName: "getFragmentData" },
      },
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: clientScalars,
      },
    },
    ...createRedwoodResolverGenerateEntry(),
  },
};

export default config;
