import type { APIGatewayProxyEvent } from 'aws-lambda'

import { isFetchApiRequest } from './transforms'

// Extracts the header from an event, handling lower and upper case header names.
export const getEventHeader = (
  event: APIGatewayProxyEvent | Request,
  headerName: string,
) => {
  if (isFetchApiRequest(event)) {
    return event.headers.get(headerName)
  }

  return event.headers[headerName] || event.headers[headerName.toLowerCase()]
}
