import { AbstractMailHandler } from '@redwoodjs/mailer-core'
import type {
  MailRenderedContent,
  MailResult,
  MailSendOptionsComplete,
} from '@redwoodjs/mailer-core'
import { NodemailerMailHandler } from '@redwoodjs/mailer-handler-nodemailer'
import type { HandlerOptions } from '@redwoodjs/mailer-handler-nodemailer'

export class StudioMailHandler extends AbstractMailHandler {
  private nodemailerHandler: NodemailerMailHandler

  constructor() {
    super()

    this.nodemailerHandler = new NodemailerMailHandler({
      transport: {
        host: 'localhost',
        port: 4319,
        secure: false,
      },
    })
  }

  async send(
    renderedContent: MailRenderedContent,
    sendOptions: MailSendOptionsComplete,
    handlerOptions?: HandlerOptions,
  ): Promise<MailResult> {
    try {
      return await this.nodemailerHandler.send(
        renderedContent,
        sendOptions,
        handlerOptions,
      )
    } catch (e) {
      console.error(
        '\nSent an email to the void! You can view this email during development with Redwood Studio: `yarn rw studio`',
      )
      console.error('  ' + (e as Error).message + '\n')
    }

    return {}
  }

  internal() {
    return {
      nodemailerHandler: this.nodemailerHandler,
    }
  }
}
