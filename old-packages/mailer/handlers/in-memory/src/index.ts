import type {
  MailSendOptionsComplete,
  MailUtilities,
  MailRenderedContent,
  MailResult,
} from '@redwoodjs/mailer-core'
import { AbstractMailHandler } from '@redwoodjs/mailer-core'

export type InMemoryMail = {
  textContent: MailRenderedContent['text']
  htmlContent: MailRenderedContent['html']
  handler?: string | number | symbol
  handlerOptions?: unknown
  renderer?: string | number | symbol
  rendererOptions?: unknown
} & MailSendOptionsComplete

export class InMemoryMailHandler extends AbstractMailHandler {
  public inbox: InMemoryMail[]

  constructor() {
    super()
    this.inbox = []
  }

  send(
    content: MailRenderedContent,
    sendOptions: MailSendOptionsComplete,
    _handlerOptions?: never,
    utilities?: MailUtilities,
  ): MailResult | Promise<MailResult> {
    this.inbox.push({
      ...sendOptions,
      textContent: content.text,
      htmlContent: content.html,
      handler: utilities?.handler,
      handlerOptions: utilities?.handlerOptions,
      renderer: utilities?.renderer,
      rendererOptions: utilities?.rendererOptions,
    })

    return {
      messageID: `in-memory-${this.inbox.length}`,
    }
  }

  internal(): Record<string, unknown> {
    return {
      inbox: this.inbox,
    }
  }

  clearInbox() {
    this.inbox = []
  }
}
