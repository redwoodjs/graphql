import path from 'path'

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import opentelemetry from '@opentelemetry/api'
import {
  NodeTracerProvider,
  SimpleSpanProcessor,
  SamplingDecision,
} from '@opentelemetry/sdk-trace-node'
import { hideBin } from 'yargs/helpers'

import { spawnBackgroundProcess } from '../lib/background'

import { CustomFileExporter } from './exporter'

/**
 * @type NodeTracerProvider
 */
let traceProvider

/**
 * @type SimpleSpanProcessor
 */
let traceProcessor

/**
 * @type CustomFileExporter
 */
let traceExporter

/**
 * @type boolean
 */
let isStarted = false

/**
 * @type boolean
 */
let isShutdown = false

export async function startTelemetry() {
  if (isStarted) {
    return
  }
  isStarted = true

  try {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

    // Tracing
    traceProvider = new NodeTracerProvider({
      sampler: {
        shouldSample: () => {
          return {
            decision: isShutdown
              ? SamplingDecision.NOT_RECORD
              : SamplingDecision.RECORD_AND_SAMPLED,
          }
        },
        toString: () => {
          return 'AlwaysSampleWhenNotShutdown'
        },
      },
    })
    traceExporter = new CustomFileExporter()
    traceProcessor = new SimpleSpanProcessor(traceExporter)
    traceProvider.addSpanProcessor(traceProcessor)
    traceProvider.register()

    // Without any listeners for these signals, nodejs will terminate the process and will not
    // trigger the exit event when doing so. This means our process.on('exit') handler will not run.
    // We add a listner which either calls process.exit or if some other handler has been added,
    // then we leave it to that handler to handle the signal.
    // See https://nodejs.org/dist/latest/docs/api/process.html#signal-events for more info on the
    // behaviour of nodejs for various signals.
    const cleanArgv = hideBin(process.argv)
    if (!cleanArgv.includes('sb') && !cleanArgv.includes('storybook')) {
      for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
        process.on(signal, () => {
          if (process.listenerCount(signal) === 1) {
            process.exit()
          }
        })
      }
    } else {
      process.on('shutdown-telemetry', () => {
        shutdownTelemetry()
      })
    }

    // Ensure to shutdown telemetry when the process exits so that we can be sure that all spans
    // are ended and all data is flushed to the exporter.
    process.on('exit', () => {
      shutdownTelemetry()
    })
  } catch (error) {
    console.error('Telemetry error')
    console.error(error)
  }
}

export function shutdownTelemetry() {
  if (isShutdown || !isStarted) {
    return
  }
  isShutdown = true

  try {
    // End the active spans
    while (opentelemetry.trace.getActiveSpan()?.isRecording()) {
      opentelemetry.trace.getActiveSpan()?.end()
    }

    // Shutdown exporter to ensure all data is flushed
    traceExporter?.shutdown()

    // Send the telemetry in a background process, so we don't block the CLI
    spawnBackgroundProcess('telemetry', 'yarn', [
      'node',
      path.join(__dirname, 'send.js'),
    ])
  } catch (error) {
    console.error('Telemetry error')
    console.error(error)
  }
}
