import jsonParse from 'fast-json-parse'
import type { FastifyRequest, FastifyReply } from 'fastify'

import {
  NEWLINE,
  isObject,
  isPinoLog,
  noEmpty,
  formatDate,
  formatLevel,
  formatBundleSize,
  formatCustom,
  formatData,
  formatErrorProp,
  formatLoadTime,
  formatMessage,
  formatMethod,
  formatName,
  formatNs,
  formatOperationName,
  formatQuery,
  formatRequestId,
  formatResponseCache,
  formatStack,
  formatStatusCode,
  formatTracing,
  formatUserAgent,
  formatUrl,
} from './formatters'

export const LogFormatter = () => {
  const parse = (inputData: string | Record<string, unknown>) => {
    let logData
    if (typeof inputData === 'string') {
      const parsedData = jsonParse(inputData)
      if (!parsedData.value || parsedData.err || !isPinoLog(parsedData.value)) {
        return inputData + NEWLINE
      }
      logData = parsedData.value
    } else if (isObject(inputData) && isPinoLog(inputData)) {
      logData = inputData
    } else {
      return inputData + NEWLINE
    }

    if (!logData.level) {
      return inputData + NEWLINE
    }

    if (!logData.message) {
      logData.message = logData.msg
    }

    if (typeof logData.level === 'number') {
      convertLogNumber(logData)
    }

    return output(logData) + NEWLINE
  }

  const convertLogNumber = (logData: Record<string, unknown>) => {
    if (logData.level === 10) {
      logData.level = 'trace'
    }
    if (logData.level === 20) {
      logData.level = 'debug'
    }
    if (logData.level === 30) {
      logData.level = 'info'
    }
    if (logData.level === 40) {
      logData.level = 'warn'
    }
    if (logData.level === 50) {
      logData.level = 'error'
    }
    if (logData.level === 60) {
      logData.level = 'fatal'
    }
  }

  const output = (logData: Record<string, unknown>) => {
    const output = []

    output.push(formatDate((logData.time as Date) || Date.now()))
    output.push(formatLevel(logData.level))
    output.push(formatNs(logData.ns as string))
    output.push(formatName(logData.name as string))
    output.push(formatRequestId(logData.requestId as string))
    output.push(formatMessage(logData))

    const req = logData.req as FastifyRequest
    const res = logData.res as FastifyReply

    const { statusCode: responseStatusCode } = res || {}
    const { method: requestMethod, url: requestUrl } = req || {}

    const {
      level,
      message,
      name,
      ns,
      err: logDataErr,
      stack: logDataStack,
      statusCode: logDataStatusCode,
      elapsed,
      responseTime: logDataResponseTime,
      method: logDataMethod,
      custom,
      contentLength,
      operationName,
      query,
      data: graphQLData,
      responseCache,
      tracing,
      url: logDataUrl,
      userAgent,
      ...rest
    }: Record<string, unknown> = logData

    const statusCode = responseStatusCode || logDataStatusCode
    const responseTime = logDataResponseTime || elapsed
    const method = requestMethod || logDataMethod
    const url = requestUrl || logDataUrl

    const logDataErrStack = logDataErr && (logDataErr as Error).stack

    const stack =
      level === 'fatal' || level === 'error'
        ? logDataStack || (logDataErr && logDataErrStack)
        : null

    // Output err if it has more keys than 'stack'
    const err =
      (level === 'fatal' || level === 'error') &&
      logDataErr &&
      Object.keys(logDataErr).find((key) => key !== 'stack')
        ? logDataErr
        : null

    if (!message) {
      logData.message = ''
    }

    if (!level) {
      logData.level = 'customlevel'
    }

    if (!name) {
      logData.name = ''
    }

    if (!ns) {
      logData.ns = ''
    }

    if (method != null) {
      output.push(formatMethod(method as string))
      output.push(formatStatusCode(statusCode as string))
    }

    if (url != null) {
      output.push(formatUrl(url as string))
    }

    if (contentLength != null) {
      output.push(formatBundleSize(contentLength as string))
    }

    if (custom) {
      output.push(formatCustom(custom as Record<string, unknown>))
    }

    if (responseTime != null) {
      output.push(formatLoadTime(responseTime as string))
    }

    if (userAgent != null) {
      output.push(formatUserAgent(userAgent as string))
    }

    if (operationName != null) {
      output.push(formatOperationName(operationName as string))
    }

    if (query != null) {
      output.push(formatQuery(query as Record<string, unknown>))
    }

    if (graphQLData != null) {
      output.push(formatData(graphQLData as Record<string, unknown>))
    }

    if (responseCache != null) {
      output.push(formatResponseCache(responseCache as Record<string, unknown>))
    }

    if (tracing != null) {
      output.push(formatTracing(tracing as Record<string, unknown>))
    }

    if (err != null) {
      output.push(formatErrorProp(err as Record<string, unknown>))
    }

    if (stack != null) {
      output.push(formatStack(stack as Record<string, unknown>))
    }

    if (rest) {
      output.push(formatCustom(rest as Record<string, unknown>))
    }

    return output.filter(noEmpty).join(' ')
  }

  return parse
}
