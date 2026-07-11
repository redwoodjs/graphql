import type {
  MailSendOptionsComplete,
  MailResult,
  MailUtilities,
  MailRenderedContent,
} from './types'

export abstract class AbstractMailHandler {
  // Send a mail
  abstract send(
    renderedContent: MailRenderedContent,
    sendOptions: MailSendOptionsComplete,
    handlerOptions?: Record<string | number | symbol, unknown>,
    utilities?: MailUtilities,
  ): Promise<MailResult> | MailResult

  // Provide access to handler specific properties
  abstract internal(): Record<string, unknown>
}
