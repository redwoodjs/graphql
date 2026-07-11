import { trace as RW_OTEL_WRAPPER_TRACE } from '@opentelemetry/api'
import { AuthenticationError, ForbiddenError } from '@redwoodjs/graphql-server'
import { db } from './db'
export const getCurrentUser = async (session) => {
  const __getCurrentUser = async (session) => {
    if (!session || typeof session.id !== 'number') {
      throw new Error('Invalid session')
    }
    return await db.user.findUnique({
      where: {
        id: session.id,
      },
      select: {
        id: true,
        roles: true,
        email: true,
      },
    })
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = await RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:getCurrentUser',
    async (span) => {
      span.setAttribute('code.function', 'getCurrentUser')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = await __getCurrentUser(session)
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
export const isAuthenticated = () => {
  const __isAuthenticated = () => {
    return !!context.currentUser
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:isAuthenticated',
    (span) => {
      span.setAttribute('code.function', 'isAuthenticated')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __isAuthenticated()
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
export const hasRole = (roles) => {
  const __hasRole = (roles) => {
    if (!isAuthenticated()) {
      return false
    }
    const currentUserRoles = context.currentUser?.roles
    if (typeof roles === 'string') {
      if (typeof currentUserRoles === 'string') {
        // roles to check is a string, currentUser.roles is a string
        return currentUserRoles === roles
      } else if (Array.isArray(currentUserRoles)) {
        // roles to check is a string, currentUser.roles is an array
        return currentUserRoles?.some((allowedRole) => roles === allowedRole)
      }
    }
    if (Array.isArray(roles)) {
      if (Array.isArray(currentUserRoles)) {
        // roles to check is an array, currentUser.roles is an array
        return currentUserRoles?.some((allowedRole) =>
          roles.includes(allowedRole)
        )
      } else if (typeof currentUserRoles === 'string') {
        // roles to check is an array, currentUser.roles is a string
        return roles.some((allowedRole) => currentUserRoles === allowedRole)
      }
    }

    // roles not found
    return false
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:hasRole',
    (span) => {
      span.setAttribute('code.function', 'hasRole')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __hasRole(roles)
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
export const requireAuth = ({ roles } = {}) => {
  const __requireAuth = ({ roles } = {}) => {
    if (!isAuthenticated()) {
      throw new AuthenticationError("You don't have permission to do that.")
    }
    if (roles && !hasRole(roles)) {
      throw new ForbiddenError("You don't have access to do that.")
    }
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:requireAuth',
    (span) => {
      span.setAttribute('code.function', 'requireAuth')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = __requireAuth({
          roles,
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