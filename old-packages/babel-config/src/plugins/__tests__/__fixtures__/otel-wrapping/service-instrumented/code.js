import opentelemetry from '@opentelemetry/api'

import { db } from 'src/lib/db'

export const updateContact = ({
  id,
  input,
} = {
    id: 1,
    input: {
      name: 'R. Edwoods',
    },
  }) => {
  return opentelemetry.trace.getTracer('service').startActiveSpan('updateContact', async (span) => {
    const data = await db.contact.update({
      data: input,
      where: { id },
    })
    span.end()
    return data
  })
}
