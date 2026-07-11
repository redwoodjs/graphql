import { trace as RW_OTEL_WRAPPER_TRACE } from '@opentelemetry/api'
import opentelemetry from '@opentelemetry/api'
import { db } from 'src/lib/db'
export const updateContact = (
  { id, input } = {
    id: 1,
    input: {
      name: 'R. Edwoods',
    },
  }
) => {
  const __updateContact = (
    { id, input } = {
      id: 1,
      input: {
        name: 'R. Edwoods',
      },
    }
  ) => {
    return opentelemetry.trace
      .getTracer('service')
      .startActiveSpan('updateContact', async (span) => {
        const data = await db.contact.update({
          data: input,
          where: {
            id,
          },
        })
        span.end()
        return data
      })
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:updateContact',
    (span) => {
      span.setAttribute('code.function', 'updateContact')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __updateContact({
          id,
          input,
        })
        span.end()
        return RW_OTEL_WRAPPER_INNER_RESULT
      } catch (error) {
        span.recordException(error)
        span.setStatus({
          code: 2,
          message:
            error?.message?.split('\n')[0] ?? error?.toString()?.split('\n')[0],
        })
        span.end()
        throw error
      }
    }
  )
  return RW_OTEL_WRAPPER_RESULT
}