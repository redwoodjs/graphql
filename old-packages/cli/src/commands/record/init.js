import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { parseDatamodel } from '@redwoodjs/record'

export const handler = async () => {
  recordTelemetryAttributes({
    command: 'record',
  })
  await parseDatamodel()
}
