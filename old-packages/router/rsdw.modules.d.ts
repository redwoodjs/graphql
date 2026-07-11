declare module 'react-server-dom-webpack/node-loader'
declare module 'react-server-dom-webpack/client.edge'

// https://github.com/facebook/react/blob/b09e102ff1e2aaaf5eb6585b04609ac7ff54a5c8/packages/react-server-dom-webpack/src/shared/ReactFlightImportMetadata.js#L10
type ImportManifestEntry = {
  id: string
  // chunks is a double indexed array of chunkId / chunkFilename pairs
  chunks: string[]
  name: string
}

type ClientReferenceManifestEntry = ImportManifestEntry

type ClientManifest = {
  [id: string]: ClientReferenceManifestEntry
}

declare module 'react-server-dom-webpack/server.edge' {
  type Options = {
    environmentName?: string
    identifierPrefix?: string
    signal?: AbortSignal
    onError?: (error: mixed) => void
    onPostpone?: (reason: string) => void
  }

  // https://github.com/facebook/react/blob/0711ff17638ed41f9cdea712a19b92f01aeda38f/packages/react-server-dom-webpack/src/ReactFlightDOMServerEdge.js#L48
  export function renderToReadableStream(
    model: ReactClientValue,
    webpackMap: ClientManifest,
    options?: Options,
  ): ReadableStream
}

// Should be able to use just react-dom/server, but right now we can't
// See https://github.com/facebook/react/issues/26906
declare module 'react-dom/server.edge' {
  export * from 'react-dom/server'
}

declare module 'react-server-dom-webpack/client' {
  // https://github.com/facebook/react/blob/dfaed5582550f11b27aae967a8e7084202dd2d90/packages/react-server-dom-webpack/src/ReactFlightDOMClientBrowser.js#L31
  export type Options<A, T> = {
    callServer?: (id: string, args: A) => Promise<T>
  }

  export function createFromFetch<A, T>(
    // `Response` is a Web Response:
    // https://developer.mozilla.org/en-US/docs/Web/API/Response
    promiseForResponse: Promise<Response>,
    options?: Options<A, T>,
  ): Thenable<T>

  export function encodeReply(
    // https://github.com/facebook/react/blob/dfaed5582550f11b27aae967a8e7084202dd2d90/packages/react-client/src/ReactFlightReplyClient.js#L65
    value: ReactServerValue,
  ): Promise<string | URLSearchParams | FormData>
}

declare module 'react-server-dom-webpack/server' {
  import type { Writable } from 'stream'

  import type { Busboy } from 'busboy'

  // It's difficult to know the true type of `ServerManifest`.
  // A lot of react's source files are stubs that are replaced at build time.
  // Going off this reference for now: https://github.com/facebook/react/blob/b09e102ff1e2aaaf5eb6585b04609ac7ff54a5c8/packages/react-server-dom-webpack/src/ReactFlightClientConfigBundlerWebpack.js#L40
  type ServerManifest = {
    [id: string]: ImportManifestEntry
  }

  // The types for `decodeReply` and `decodeReplyFromBusboy` were taken from
  // https://github.com/facebook/react/blob/b09e102ff1e2aaaf5eb6585b04609ac7ff54a5c8/packages/react-server-dom-webpack/src/ReactFlightDOMServerNode.js
  // which is what 'react-server-dom-webpack/server' resolves to with the 'react-server' condition.

  /**
   * WARNING: The types for this were handwritten by looking at React's source and could be wrong.
   */
  export function decodeReply<T>(
    body: string | FormData,
    webpackMap?: ServerManifest,
  ): Promise<T>

  /**
   * WARNING: The types for this were handwritten by looking at React's source and could be wrong.
   */
  export function decodeReplyFromBusboy<T>(
    busboyStream: Busboy,
    webpackMap?: ServerManifest,
  ): Promise<T>

  type PipeableStream = {
    abort(reason: any): void
    pipe<T extends Writable>(destination: T): T
  }

  // The types for `renderToPipeableStream` are incomplete and were taken from
  // https://github.com/facebook/react/blob/b09e102ff1e2aaaf5eb6585b04609ac7ff54a5c8/packages/react-server-dom-webpack/src/ReactFlightDOMServerNode.js#L75.

  /**
   * WARNING: The types for this were handwritten by looking at React's source and could be wrong.
   */
  export function renderToPipeableStream(
    model: ReactClientValue,
    webpackMap: ClientManifest,
  ): PipeableStream
}
