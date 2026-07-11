import { Resend } from 'resend'

import type {
  MailSendOptionsComplete,
  MailRenderedContent,
  MailResult,
} from '@redwoodjs/mailer-core'
import { AbstractMailHandler } from '@redwoodjs/mailer-core'

export type ResendMailHandlerOptions = {
  // Note: Resend SDK no longer exports the type Tag but it's simple enough to copy
  // out here. It just makes us a little more susceptible to getting out of sync if
  // the Resend SDK changes.
  tags?: {
    name: string
    value: string
  }[]
}

export class ResendMailHandler extends AbstractMailHandler {
  private client: Resend

  constructor({ apiToken }: { apiToken: string }) {
    super()
    this.client = new Resend(apiToken)
  }

  async send(
    content: MailRenderedContent,
    sendOptions: MailSendOptionsComplete,
    handlerOptions?: ResendMailHandlerOptions,
  ): Promise<MailResult> {
    // I was not having success at passing attachment contents as strings directly
    // to the Resend client, so I'm going to transform them to Buffers if they are
    // strings.
    const transformedAttachments = []
    const attachments = sendOptions.attachments
    if (attachments) {
      for (const attachment of attachments) {
        if (typeof attachment.content === 'string') {
          transformedAttachments.push({
            ...attachment,
            // We assume utf8 encoding here. We should document this and if users
            // wish to use a different encoding, we can recomment they pass an already
            // encoded Buffer instead of a string which will be encoded here.
            content: Buffer.from(attachment.content, 'utf8'),
          })
        } else {
          transformedAttachments.push(attachment)
        }
      }
    }

    const result = await this.client.emails.send({
      // Standard options
      attachments: transformedAttachments,
      bcc: sendOptions.bcc,
      cc: sendOptions.cc,
      from: sendOptions.from,
      headers: sendOptions.headers,
      reply_to: sendOptions.replyTo,
      subject: sendOptions.subject,
      to: sendOptions.to,

      // Content
      html: content.html,
      text: content.text,

      // Resend specific options
      tags: handlerOptions?.tags ?? [],
    })

    return {
      messageID: result.data?.id,
      handlerInformation: result,
    }
  }

  internal() {
    return {
      client: this.client,
    }
  }
}
