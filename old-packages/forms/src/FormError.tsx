import React from 'react'

import type { GraphQLFormattedError } from 'graphql'

export interface ServerParseError extends Error {
  response: Response
  statusCode: number
  bodyText: string
}

export interface ServerError extends Error {
  response: Response
  statusCode: number
  result: Record<string, any>
}

export interface RWGqlError {
  message: string
  graphQLErrors: readonly GraphQLFormattedError[]
  networkError: Error | ServerParseError | ServerError | null
}

export type RwGqlErrorProperties = Record<string, Record<string, string[]>>

interface FormErrorProps {
  error?: RWGqlError
  wrapperClassName?: string
  wrapperStyle?: React.CSSProperties
  titleClassName?: string
  titleStyle?: React.CSSProperties
  listClassName?: string
  listStyle?: React.CSSProperties
  listItemClassName?: string
  listItemStyle?: React.CSSProperties
}

/**
 * Big error message at the top of the page explaining everything that's wrong
 * with the form fields in this form
 */
const FormError = ({
  error,
  wrapperClassName,
  wrapperStyle,
  titleClassName,
  titleStyle,
  listClassName,
  listStyle,
  listItemClassName,
  listItemStyle,
}: FormErrorProps) => {
  if (!error) {
    return null
  }

  let rootMessage = error.message
  const messages: string[] = []
  const hasGraphQLError = !!error.graphQLErrors?.[0]
  const hasNetworkError =
    !!error.networkError && Object.keys(error.networkError).length > 0

  if (hasGraphQLError) {
    rootMessage = error.graphQLErrors[0].message ?? 'Something went wrong'

    // override top-level message for ServiceValidation errorrs
    if (error.graphQLErrors[0]?.extensions?.code === 'BAD_USER_INPUT') {
      rootMessage = 'Errors prevented this form from being saved'
    }

    const properties = error.graphQLErrors[0].extensions?.[
      'properties'
    ] as RwGqlErrorProperties

    const propertyMessages = properties?.['messages']

    if (propertyMessages) {
      for (const e in propertyMessages) {
        propertyMessages[e].forEach((fieldError: any) => {
          messages.push(fieldError)
        })
      }
    }
  } else if (hasNetworkError) {
    rootMessage = rootMessage ?? 'An error has occurred'
    if (Object.prototype.hasOwnProperty.call(error.networkError, 'bodyText')) {
      const netErr = error.networkError as ServerParseError
      messages.push(`${netErr.name}: ${netErr.bodyText}`)
    } else if (
      Object.prototype.hasOwnProperty.call(error.networkError, 'result')
    ) {
      const netErr = error.networkError as ServerError
      netErr.result.errors?.forEach((error: any) => {
        if (typeof error.message === 'string') {
          if (error.message.indexOf(';') >= 0) {
            messages.push(error.message?.split(';')[1])
          } else {
            messages.push(error.message)
          }
        }
      })
    }
  }

  if (!rootMessage) {
    return null
  }

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      <p className={titleClassName} style={titleStyle}>
        {rootMessage}
      </p>
      {messages.length > 0 && (
        <ul className={listClassName} style={listStyle}>
          {messages.map((message: string, index: number) => (
            <li key={index} className={listItemClassName} style={listItemStyle}>
              {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FormError
