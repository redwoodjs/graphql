export interface RedwoodFastifyWebOptions {
  redwood?: {
    /**
     * Specify the URL to your API server.
     * This can be a relative URL on the current domain (`/.redwood/functions`),
     * in which case the `apiProxyTarget` option must be set,
     * or a fully-qualified URL (`https://api.redwood.horse`).
     *
     * Note: This should not include the path to the GraphQL Server.
     **/
    apiUrl?: string
    /**
     * The fully-qualified URL to proxy requests to from `apiUrl`.
     * Only valid when `apiUrl` is a relative URL.
     */
    apiProxyTarget?: string

    /**
     * @deprecated Use `apiProxyTarget` instead.
     */
    apiHost?: string
  }
}
