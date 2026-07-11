import { ApolloLink, HttpLink } from "@apollo/client";

import { ApolloClient, InMemoryCache, SSRMultipartLink } from "./client.shared.js";

export type CreateRwsdkApolloClientOptions = {
  readonly credentials?: RequestCredentials;
  readonly uri: string;
};

export const createRwsdkApolloClient = ({
  credentials = "include",
  uri,
}: CreateRwsdkApolloClientOptions) => {
  const httpLink = new HttpLink({
    credentials,
    uri,
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link:
      typeof window === "undefined"
        ? ApolloLink.from([
            new SSRMultipartLink({
              stripDefer: true,
            }),
            httpLink,
          ])
        : httpLink,
  });
};

export const createRwsdkApolloMakeClient = (options: CreateRwsdkApolloClientOptions) => {
  return () => createRwsdkApolloClient(options);
};
