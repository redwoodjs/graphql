import { Mailer } from '@redwoodjs/mailer-core'
import { NodemailerMailHandler } from '@redwoodjs/mailer-handler-nodemailer'
import { ReactEmailRenderer } from '@redwoodjs/mailer-renderer-react-email'

import { logger } from 'src/lib/logger'

export const mailer = new Mailer({
  handling: {
    handlers: {
      // TODO: Update this handler config or switch it out for a different handler completely
      nodemailer: new NodemailerMailHandler({
        transport: {
          host: 'localhost',
          port: 4319,
          secure: false,
        },
      }),
    },
    default: 'nodemailer',
  },

  rendering: {
    renderers: {
      reactEmail: new ReactEmailRenderer(),
    },
    default: 'reactEmail',
  },

  logger,
})
