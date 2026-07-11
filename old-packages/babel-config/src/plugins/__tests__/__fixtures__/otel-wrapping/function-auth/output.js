import { trace as RW_OTEL_WRAPPER_TRACE } from '@opentelemetry/api'
import { DbAuthHandler, DbAuthHandlerOptions } from '@redwoodjs/auth-dbauth-api'
import { db } from 'src/lib/db'
export const handler = async (event, context) => {
  const __handler = async (event, context) => {
    const forgotPasswordOptions = {
      handler: (user) => {
        return user
      },
      expires: 60 * 60 * 24,
      errors: {
        usernameNotFound: 'Username not found',
        usernameRequired: 'Username is required',
      },
    }
    const loginOptions = {
      handler: (user) => {
        return user
      },
      errors: {
        usernameOrPasswordMissing: 'Both username and password are required',
        usernameNotFound: 'Username ${username} not found',
        incorrectPassword: 'Incorrect password for ${username}',
      },
      expires: 60 * 60 * 24 * 365 * 10,
    }
    const resetPasswordOptions = {
      handler: (_user) => {
        return true
      },
      allowReusedPassword: true,
      errors: {
        resetTokenExpired: 'resetToken is expired',
        resetTokenInvalid: 'resetToken is invalid',
        resetTokenRequired: 'resetToken is required',
        reusedPassword: 'Must choose a new password',
      },
    }
    const signupOptions = {
      handler: ({ username, hashedPassword, salt, userAttributes }) => {
        return db.user.create({
          data: {
            email: username,
            hashedPassword: hashedPassword,
            salt: salt,
            fullName: userAttributes['full-name'],
          },
        })
      },
      passwordValidation: (_password) => {
        return true
      },
      errors: {
        fieldMissing: '${field} is required',
        usernameTaken: 'Username `${username}` already in use',
      },
    }
    const authHandler = new DbAuthHandler(event, context, {
      db: db,
      authModelAccessor: 'user',
      authFields: {
        id: 'id',
        username: 'email',
        hashedPassword: 'hashedPassword',
        salt: 'salt',
        resetToken: 'resetToken',
        resetTokenExpiresAt: 'resetTokenExpiresAt',
      },
      cookie: {
        HttpOnly: true,
        Path: '/',
        SameSite: 'Strict',
        Secure: process.env.NODE_ENV !== 'development',
      },
      forgotPassword: forgotPasswordOptions,
      login: loginOptions,
      resetPassword: resetPasswordOptions,
      signup: signupOptions,
    })
    return await authHandler.invoke()
  }
  const RW_OTEL_WRAPPER_TRACER = RW_OTEL_WRAPPER_TRACE.getTracer('redwoodjs')
  const RW_OTEL_WRAPPER_RESULT = await RW_OTEL_WRAPPER_TRACER.startActiveSpan(
    'redwoodjs:api:__MOCKED_API_FOLDER__:handler',
    async (span) => {
      span.setAttribute('code.function', 'handler')
      span.setAttribute('code.filepath', '__MOCKED_FILENAME__')
      try {
        const RW_OTEL_WRAPPER_INNER_RESULT = await __handler(event, context)
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