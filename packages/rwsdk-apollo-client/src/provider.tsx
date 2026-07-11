"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { WrapApolloProvider } from "@apollo/client-react-streaming";
import { buildManualDataTransport } from "@apollo/client-react-streaming/manual-transport";

import type { ApolloClient } from "./client.shared.js";
import { getApolloRwsdkHtmlInsertion } from "./stream-context.shared.js";

const ApolloRwsdkTransportIdContext = createContext<string | null>(null);

const ApolloRwsdkTransport = buildManualDataTransport({
  useInsertHtml() {
    const transportId = useContext(ApolloRwsdkTransportIdContext);

    if (!transportId) {
      throw new ApolloRwsdkProviderError(
        "ApolloRwsdkProvider requires a transportId created by createApolloRwsdkTransportId().",
      );
    }

    const insertHtml = getApolloRwsdkHtmlInsertion(transportId);

    if (!insertHtml) {
      throw new ApolloRwsdkProviderError(
        "ApolloRwsdkProvider could not find its RWSDK HTML stream insertion callback.",
      );
    }

    return insertHtml;
  },
});

const WrappedApolloRwsdkProvider = WrapApolloProvider(ApolloRwsdkTransport);

class ApolloRwsdkProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApolloRwsdkProviderError";
  }
}

export type ApolloRwsdkProviderProps = {
  readonly children: ReactNode;
  readonly makeClient: () => ApolloClient;
  readonly nonce?: string;
  readonly transportId: string;
};

export const ApolloRwsdkProvider = ({
  children,
  makeClient,
  nonce,
  transportId,
}: ApolloRwsdkProviderProps) => (
  <ApolloRwsdkTransportIdContext.Provider value={transportId}>
    <WrappedApolloRwsdkProvider makeClient={makeClient} extraScriptProps={{ nonce }}>
      {children}
    </WrappedApolloRwsdkProvider>
  </ApolloRwsdkTransportIdContext.Provider>
);
