import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { Resource } from '@opentelemetry/resources'
import {
  NodeTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { PrismaInstrumentation } from '@prisma/instrumentation'

import { getConfig } from '@redwoodjs/project-config'

// You may wish to set this to DiagLogLevel.DEBUG when you need to debug opentelemetry itself
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'redwood-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.0',
  })
)

const studioPort = getConfig().studio.basePort
const exporter = new OTLPTraceExporter({
  // Update this URL to point to where your OTLP compatible collector is listening
  // The redwood development studio (`yarn rw exp studio`) can collect your
  // telemetry at `http://127.0.0.1:<PORT>/v1/traces` (default PORT is 4318)
  url: `http://127.0.0.1:${studioPort}/.redwood/functions/otel-trace`,
  concurrencyLimit: 64,
})

// You may wish to switch to BatchSpanProcessor in production as it is the recommended choice for performance reasons
const processor = new SimpleSpanProcessor(exporter)

const provider = new NodeTracerProvider({
  resource: resource,
})
provider.addSpanProcessor(processor)

// Optionally register instrumentation libraries here
registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new HttpInstrumentation(),
    new FastifyInstrumentation(),
    new PrismaInstrumentation({
      middleware: true,
    }),
  ],
})

provider.register()
