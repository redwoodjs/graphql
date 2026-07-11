declare module '@whatwg-node/server' {
  export interface ServerAdapterPlugin<
    TServerContext = Record<string, unknown>,
  > {
    onRequest?: OnRequestHook<TServerContext>
    onResponse?: OnResponseHook<TServerContext>
  }
  export const Response: typeof globalThis.Response & {
    json(data: any, init?: ResponseInit): globalThis.Response
  }
}
