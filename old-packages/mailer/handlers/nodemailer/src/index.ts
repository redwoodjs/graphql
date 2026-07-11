import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

import { AbstractMailHandler } from '@redwoodjs/mailer-core'
import type {
  MailRenderedContent,
  MailResult,
  MailSendOptionsComplete,
} from '@redwoodjs/mailer-core'

export type HandlerConfig = {
  transport: SMTPTransport | SMTPTransport.Options | string
  defaults?: SMTPTransport.Options
}

export type HandlerOptions = nodemailer.SendMailOptions

export class NodemailerMailHandler extends AbstractMailHandler {
  protected transporter: nodemailer.Transporter

  constructor(protected config: HandlerConfig) {
    super()

    this.transporter = nodemailer.createTransport(
      config.transport,
      config.defaults,
    )
  }

  // TODO: This would mean handlerOptions take precedence over sendOptions
  async send(
    renderedContent: MailRenderedContent,
    sendOptions: MailSendOptionsComplete,
    handlerOptions?: HandlerOptions,
  ): Promise<MailResult> {
    const result = await this.transporter.sendMail({
      to: sendOptions.to,
      cc: sendOptions.cc,
      bcc: sendOptions.bcc,
      from: sendOptions.from,
      replyTo: sendOptions.replyTo,
      subject: sendOptions.subject,
      headers: sendOptions.headers,
      text: renderedContent.text,
      html: renderedContent.html,
      attachments: sendOptions.attachments,
      ...handlerOptions,
    })

    return {
      messageID: result.messageId,
      handlerInformation: result,
    }
  }

  internal() {
    return {
      config: this.config,
      transporter: this.transporter,
    }
  }
}
