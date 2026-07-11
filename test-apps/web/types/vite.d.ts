declare module "*?url" {
  const result: string;
  export default result;
}

interface ImportMetaEnv {
  readonly DB_AUTH_SECRET?: string;
  readonly VITE_AUTH_URL?: string;
  readonly VITE_GRAPHQL_URL?: string;
}
