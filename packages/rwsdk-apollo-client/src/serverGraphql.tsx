import type { ReactNode } from "react";

import type { OperationVariables } from "@apollo/client";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";
import { getRequestInfo } from "rwsdk/worker";

import { DefaultGraphqlEmpty, DefaultQueryError } from "./queryError.js";

export class GraphqlQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphqlQueryError";
  }
}

type GraphqlResponse<TData> = {
  readonly data?: TData;
  readonly errors?: ReadonlyArray<{ readonly message?: string }>;
};

export type ServerGraphqlConfig = {
  readonly renderError?: (message: string) => ReactNode;
  readonly resolveHeaders?: (request: Request) => HeadersInit | undefined;
  readonly resolveUrl: () => string;
};

export type ServerGraphqlClient = {
  readonly GraphqlQueryError: typeof GraphqlQueryError;
  readonly queryGraphql: <TData, TVariables extends OperationVariables = OperationVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
  ) => Promise<TData>;
  readonly renderGraphqlPage: <TData, TVariables extends OperationVariables = OperationVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables | undefined,
    render: (data: TData) => ReactNode,
    options?: RenderGraphqlPageOptions<TData>,
  ) => Promise<ReactNode>;
};

export type RenderGraphqlPageOptions<TData> = {
  readonly empty?: ReactNode;
  readonly isEmpty?: (data: TData) => boolean;
};

export const createServerGraphql = (config: ServerGraphqlConfig): ServerGraphqlClient => {
  const renderError = config.renderError ?? ((message) => <DefaultQueryError message={message} />);

  const queryGraphql = async <TData, TVariables extends OperationVariables = OperationVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
  ): Promise<TData> => {
    const { request } = getRequestInfo();
    const cookie = request.headers.get("Cookie");
    const extraHeaders = config.resolveHeaders?.(request);
    const headers = new Headers({ "content-type": "application/json" });

    if (cookie) {
      headers.set("cookie", cookie);
    }

    if (extraHeaders) {
      new Headers(extraHeaders).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const response = await fetch(config.resolveUrl(), {
      body: JSON.stringify({
        query: print(document),
        variables: variables ?? {},
      }),
      headers,
      method: "POST",
    });

    if (!response.ok) {
      throw new GraphqlQueryError(`GraphQL request failed (${response.status})`);
    }

    const json = (await response.json()) as GraphqlResponse<TData>;
    const [firstError] = json.errors ?? [];

    if (firstError?.message) {
      throw new GraphqlQueryError(firstError.message);
    }

    if (!json.data) {
      throw new GraphqlQueryError("GraphQL response did not include data");
    }

    return json.data;
  };

  const renderGraphqlPage = async <
    TData,
    TVariables extends OperationVariables = OperationVariables,
  >(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables | undefined,
    render: (data: TData) => ReactNode,
    options?: RenderGraphqlPageOptions<TData>,
  ): Promise<ReactNode> => {
    try {
      const data = await queryGraphql(document, variables);

      if (options?.isEmpty?.(data)) {
        return options.empty ?? <DefaultGraphqlEmpty />;
      }

      return render(data);
    } catch (error) {
      const message = error instanceof GraphqlQueryError ? error.message : "Unknown error";
      return renderError(message);
    }
  };

  return {
    GraphqlQueryError,
    queryGraphql,
    renderGraphqlPage,
  };
};
