import { trace as RW_OTEL_WRAPPER_TRACE } from '@opentelemetry/api'
// This example function has default values in the function signature
export const withDefaultValues = async ({
  id,
  process = true,
  output = [],
  backup = () => 'backup',
}) => {
  const __withDefaultValues = async ({
    id,
    process = true,
    output = [],
    backup = () => 'backup',
  }) => {
    if (process) {
      output.push(backup())
    }
    return `${id}: ${output.join('\t')}`
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = await RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:withDefaultValues',
    async (span) => {
      span.setAttribute('code.function', 'withDefaultValues')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = await __withDefaultValues({
          id,
          process: process,
          output: output,
          backup: backup,
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

// This example function has a different default value definition in the function signature
export const withDefaultValuesTwo = async (
  args = {
    id,
    process: true,
    output: [],
    backup: () => 'backup',
  }
) => {
  const __withDefaultValuesTwo = async (
    args = {
      id,
      process: true,
      output: [],
      backup: () => 'backup',
    }
  ) => {
    if (args.process) {
      args.output.push(args.backup())
    }
    return `${args.id}: ${args.output.join('\t')}`
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = await RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:withDefaultValuesTwo',
    async (span) => {
      span.setAttribute('code.function', 'withDefaultValuesTwo')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = await __withDefaultValuesTwo(args)
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