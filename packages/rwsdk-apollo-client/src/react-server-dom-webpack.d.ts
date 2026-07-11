declare module "react-server-dom-webpack/server.edge" {
  import type { ReactNode } from "react";

  export function renderToReadableStream(
    input: {
      readonly actionResult: unknown;
      readonly node: ReactNode;
    },
    clientManifest: unknown,
    options?: {
      readonly onError?: (error: unknown) => void;
    },
  ): ReadableStream;
}
