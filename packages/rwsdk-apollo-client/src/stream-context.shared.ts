import type { ReactNode } from "react";

export type ApolloRwsdkHtmlInsertion = () => ReactNode;

export type ApolloRwsdkInsertHtml = (render: ApolloRwsdkHtmlInsertion) => void;

const apolloRwsdkInsertionRegistryKey = Symbol.for("rwsdk.apollo.htmlInsertionRegistry");

type ApolloRwsdkGlobal = typeof globalThis & {
  [apolloRwsdkInsertionRegistryKey]?: Map<string, ApolloRwsdkInsertHtml>;
};

const getInsertionRegistry = () => {
  const global = globalThis as ApolloRwsdkGlobal;
  global[apolloRwsdkInsertionRegistryKey] ??= new Map();
  return global[apolloRwsdkInsertionRegistryKey];
};

export const createApolloRwsdkTransportId = () => crypto.randomUUID();

export const registerApolloRwsdkHtmlInsertion = ({
  transportId,
  insertHtml,
}: {
  readonly transportId: string;
  readonly insertHtml: ApolloRwsdkInsertHtml;
}) => {
  const registry = getInsertionRegistry();
  registry.set(transportId, insertHtml);

  return () => {
    registry.delete(transportId);
  };
};

export const getApolloRwsdkHtmlInsertion = (transportId: string) =>
  getInsertionRegistry().get(transportId);
