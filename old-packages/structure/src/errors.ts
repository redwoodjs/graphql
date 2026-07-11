/**
 * Stable error codes
 * TODO: use numbers? they tend to be more resilient to changes.
 */
export enum RWError {
  SERVICE_NOT_IMPLEMENTED = 'SERVICE_NOT_IMPLEMENTED',
  NOTFOUND_PAGE_NOT_DEFINED = 'NOTFOUND_PAGE_NOT_DEFINED',
  // this error should be broken down into more specialized errors: syntax error, duplicate parameters
  INVALID_ROUTE_PATH_SYNTAX = 'INVALID_ROUTE_PATH_SYNTAX',
  SCHEMA_NOT_DEFINED = 'SCHEMA_NOT_DEFINED',
}
