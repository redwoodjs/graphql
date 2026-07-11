import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import type { ReactElement } from "react";
import { renderToReadableStream as renderToRscStream } from "react-server-dom-webpack/server.edge";
import type { RenderToStreamOptions } from "rwsdk/worker";
import { constructWithDefaultRequestInfo, runWithRequestInfo } from "rwsdk/worker";

export type ApolloRwsdkRenderToRscStreamOptions = {
  readonly onError?: (error: unknown) => void;
  readonly requestInfo: NonNullable<RenderToStreamOptions["requestInfo"]>;
};

const createClientManifest = () =>
  new Proxy(
    {},
    {
      get(_target, key) {
        return { chunks: [], id: key, name: key };
      },
    },
  );

export const renderApolloRwsdkRscStream = async (
  element: ReactElement,
  { requestInfo, onError = () => {} }: ApolloRwsdkRenderToRscStreamOptions,
) => {
  const resolvedRequestInfo = constructWithDefaultRequestInfo(requestInfo);

  return runWithRequestInfo(resolvedRequestInfo, () =>
    renderToRscStream(
      {
        actionResult: undefined,
        node: jsxs(Fragment, {
          children: [element, jsx("div", { id: "rwsdk-app-end" })],
        }),
      },
      createClientManifest(),
      { onError },
    ),
  );
};
