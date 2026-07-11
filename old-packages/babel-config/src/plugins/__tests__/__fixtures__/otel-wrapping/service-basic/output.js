import { trace as RW_OTEL_WRAPPER_TRACE } from '@opentelemetry/api'
import { db } from 'src/lib/db'
export const contacts = () => {
  const __contacts = () => {
    return db.contact.findMany()
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:contacts',
    (span) => {
      span.setAttribute('code.function', 'contacts')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __contacts()
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
export const contact = ({ id }) => {
  const __contact = ({ id }) => {
    return db.contact.findUnique({
      where: {
        id,
      },
    })
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:contact',
    (span) => {
      span.setAttribute('code.function', 'contact')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __contact({
          id,
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
export const createContact = ({ input }) => {
  const __createContact = ({ input }) => {
    return db.contact.create({
      data: input,
    })
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:createContact',
    (span) => {
      span.setAttribute('code.function', 'createContact')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __createContact({
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
export const updateContact = ({ id, input }) => {
  const __updateContact = ({ id, input }) => {
    return db.contact.update({
      data: input,
      where: {
        id,
      },
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
export const deleteContact = ({ id }) => {
  const __deleteContact = ({ id }) => {
    return db.contact.delete({
      where: {
        id,
      },
    })
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:deleteContact',
    (span) => {
      span.setAttribute('code.function', 'deleteContact')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __deleteContact({
          id,
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