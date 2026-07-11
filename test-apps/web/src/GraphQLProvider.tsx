"use client";

import { ApolloRwsdkProvider, createRwsdkApolloMakeClient } from "@rwgql/rwsdk-apollo-client";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { AuthProvider } from "@/auth";

export const GraphQLProvider = ({
  children,
  graphQLUrl,
  nonce,
  transportId,
}: {
  readonly children: ReactNode;
  readonly graphQLUrl: string;
  readonly nonce: string;
  readonly transportId: string;
}) => {
  const makeClient = useMemo(() => createRwsdkApolloMakeClient({ uri: graphQLUrl }), [graphQLUrl]);

  return (
    <AuthProvider>
      <ApolloRwsdkProvider makeClient={makeClient} nonce={nonce} transportId={transportId}>
        {children}
      </ApolloRwsdkProvider>
    </AuthProvider>
  );
};
