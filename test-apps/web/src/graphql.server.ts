import { createServerGraphql } from "@rwgql/rwsdk-apollo-client/server";

const defaultDevGraphqlUrl = "http://localhost:8911/graphql";

export const resolveGraphqlUrl = () => {
  if (import.meta.env.VITE_GRAPHQL_URL) {
    return import.meta.env.VITE_GRAPHQL_URL;
  }

  if (import.meta.env.DEV) {
    return defaultDevGraphqlUrl;
  }

  throw new Error(
    "VITE_GRAPHQL_URL must point at the test-apps/graphql endpoint (for example https://api.example.com/graphql).",
  );
};

export const { renderGraphqlPage } = createServerGraphql({
  resolveUrl: resolveGraphqlUrl,
});
