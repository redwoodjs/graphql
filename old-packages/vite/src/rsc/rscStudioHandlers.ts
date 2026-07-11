import http from 'node:http'
import type { ReadableStream } from 'node:stream/web'

import type { Request } from 'express'

import { getConfig, getRawConfig } from '@redwoodjs/project-config'

import { renderRscToStream } from './rscRenderer.js'
import type { RenderInput } from './rscRenderer.js'

const isTest = () => {
  return process.env.NODE_ENV === 'test'
}

const isDevelopment = () => {
  return process.env.NODE_ENV !== 'production' && !isTest()
}

const isStudioEnabled = () => {
  return getRawConfig()['studio'] !== undefined
}

const shouldSendToStudio = () => {
  // TODO (RSC): This should be just isDevelopment()
  // but since RSC apps currently run in production mode
  // we need to check for 'production' (aka not 'development')
  // for now when sending to Studio
  return isStudioEnabled() && !isDevelopment()
}

const getStudioPort = () => {
  return getConfig().studio.basePort
}

const processRenderRscStream = async (
  readable: ReadableStream,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []

    const writable = new WritableStream({
      write(chunk) {
        chunks.push(chunk)
      },
      close() {
        resolve(Buffer.concat(chunks).toString('utf8'))
      },
    })

    readable.pipeTo(writable).catch((error) => reject(error))
  })
}

const postFlightToStudio = (payload: string, metadata: Record<string, any>) => {
  if (!shouldSendToStudio()) {
    return
  }

  const base64Payload = Buffer.from(payload).toString('base64')
  const encodedMetadata = Buffer.from(JSON.stringify(metadata)).toString(
    'base64',
  )
  const jsonBody = JSON.stringify({
    flight: {
      encodedPayload: base64Payload,
      encoding: 'base64',
      encodedMetadata,
    },
  })

  // Options to configure the HTTP POST request
  // TODO (RSC): Get these from the toml and Studio config
  const options = {
    hostname: 'localhost',
    port: getStudioPort(),
    path: '/.redwood/functions/rsc-flight',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonBody),
    },
  }

  const req = http.request(options, (res) => {
    res.setEncoding('utf8')
  })

  req.on('error', (e: Error) => {
    console.error('An error occurred sending the Flight Payload to Studio')
    console.error(e)
  })

  req.write(jsonBody)
  req.end()
}

const createStudioFlightHandler = (
  readable: ReadableStream,
  metadata: Record<string, any>,
) => {
  processRenderRscStream(readable)
    .then((payload) => {
      console.debug('Sending RSC Rendered stream to Studio')
      postFlightToStudio(payload, metadata)
      console.debug('Sent RSC Rendered stream to Studio')
      console.debug('payload to Studio:', payload)
      console.debug('metadata to Studio:', metadata)
    })
    .catch((error) => {
      console.error('An error occurred getting RSC Rendered steam:', error)
    })
}

interface StudioRenderInput extends Omit<RenderInput, 'serverState'> {
  basePath: string
  req: Request
  handleError: (e: Error) => void
}

export const sendRscFlightToStudio = async (input: StudioRenderInput) => {
  if (!shouldSendToStudio()) {
    console.debug('Studio is not enabled')
    return
  }

  const { rscId, rsaId, args, basePath, req, handleError } = input

  try {
    // surround renderRsc with performance metrics
    const startedAt = Date.now()
    const start = performance.now()

    const readable = await renderRscToStream({ rscId, rsaId, args })
    const endedAt = Date.now()
    const end = performance.now()
    const duration = end - start

    // collect render request metadata
    const metadata = {
      rsc: {
        rscId,
        rsaId,
        args,
      },
      request: {
        basePath,
        originalUrl: req.originalUrl,
        url: req.url,
        headers: req.headers,
      },
      performance: {
        startedAt,
        endedAt,
        duration,
      },
    }

    // send rendered request to Studio
    createStudioFlightHandler(readable, metadata)
  } catch (e) {
    if (e instanceof Error) {
      console.error('An error occurred rendering RSC and sending to Studio:', e)
      handleError(e)
    }
  }
}
