import type { AttributeValue, Span } from '@opentelemetry/api'
import opentelemetry, { SpanStatusCode } from '@opentelemetry/api'

type TelemetryAttributes = {
  [key: string]: AttributeValue
}

/**
 * Safely records attributes to the opentelemetry span
 *
 * @param attributes An object of key-value pairs to be individually recorded as attributes
 * @param span An optional span to record the attributes to. If not provided, the current active span will be used
 */
export function recordTelemetryAttributes(
  attributes: TelemetryAttributes,
  span?: Span,
) {
  const spanToRecord = span ?? opentelemetry.trace.getActiveSpan()
  if (spanToRecord === undefined) {
    return
  }
  for (const [key, value] of Object.entries(attributes)) {
    spanToRecord.setAttribute(key, value)
  }
}

/**
 * Safely records an error to the opentelemetry span
 *
 * @param error An error to record to the span
 * @param span An optional span to record the error to. If not provided, the current active span will be used
 */
export function recordTelemetryError(error: any, span?: Span) {
  const spanToRecord = span ?? opentelemetry.trace.getActiveSpan()
  if (spanToRecord === undefined) {
    return
  }
  const message = error?.message ?? error?.toString() ?? 'Unknown error'

  // Some errors had the full stack trace in the message, so we only want the first line
  const firstLineOfError = message.split('\n')[0]

  spanToRecord.setStatus({
    code: SpanStatusCode.ERROR,
    message: firstLineOfError,
  })
  spanToRecord.recordException(error ?? new Error(firstLineOfError))
}
