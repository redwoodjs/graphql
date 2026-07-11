import type { CORSOptions } from 'graphql-yoga'

import type { CorsConfig } from '@redwoodjs/api'

export const mapRwCorsOptionsToYoga = (
  rwCorsConfig?: CorsConfig,
  requestOrigin?: string | null,
) => {
  const yogaCORSOptions: CORSOptions = {}

  if (!rwCorsConfig) {
    // Disable all CORS headers on Yoga
    return false
  }

  if (rwCorsConfig?.methods) {
    if (typeof rwCorsConfig.methods === 'string') {
      yogaCORSOptions.methods = [rwCorsConfig.methods]
    } else if (Array.isArray(rwCorsConfig.methods)) {
      yogaCORSOptions.methods = rwCorsConfig.methods
    }
  }
  if (rwCorsConfig?.allowedHeaders) {
    if (typeof rwCorsConfig.allowedHeaders === 'string') {
      yogaCORSOptions.allowedHeaders = [rwCorsConfig.allowedHeaders]
    } else if (Array.isArray(rwCorsConfig.allowedHeaders)) {
      yogaCORSOptions.allowedHeaders = rwCorsConfig.allowedHeaders
    }
  }

  if (rwCorsConfig?.exposedHeaders) {
    if (typeof rwCorsConfig.exposedHeaders === 'string') {
      yogaCORSOptions.exposedHeaders = [rwCorsConfig.exposedHeaders]
    } else if (Array.isArray(rwCorsConfig.exposedHeaders)) {
      yogaCORSOptions.exposedHeaders = rwCorsConfig.exposedHeaders
    }
  }

  if (rwCorsConfig?.credentials) {
    yogaCORSOptions.credentials = rwCorsConfig.credentials
  }

  if (rwCorsConfig?.maxAge) {
    yogaCORSOptions.maxAge = rwCorsConfig.maxAge
  }

  if (rwCorsConfig?.origin) {
    if (typeof rwCorsConfig.origin === 'string') {
      yogaCORSOptions.origin = [rwCorsConfig.origin]
    } else if (rwCorsConfig.origin === true) {
      yogaCORSOptions.origin = [requestOrigin || '*']
    } else {
      // Array of origins
      yogaCORSOptions.origin = rwCorsConfig.origin
    }
  }

  return yogaCORSOptions
}
