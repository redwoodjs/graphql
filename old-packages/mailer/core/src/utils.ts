import type { Mailer } from './mailer'
import type {
  MailAddress,
  MailSendOptions,
  MailSendWithoutRenderingOptions,
  MailSendOptionsComplete,
  MailerDefaults,
} from './types'

export function convertAddress(address: MailAddress): string {
  if (typeof address === 'string') {
    return address
  }
  if (address.name === undefined) {
    return address.address
  }
  return `${address.name} <${address.address}>`
}

export function convertAddresses(addresses: MailAddress[]): string[] {
  const result: string[] = []
  for (const address of addresses) {
    result.push(convertAddress(address))
  }
  return result
}

export function extractDefaults(
  defaults: NonNullable<ConstructorParameters<typeof Mailer>[0]['defaults']>,
): MailerDefaults {
  const extractedDefaults: MailerDefaults = {
    attachments: defaults.attachments ?? [],
    bcc: [],
    cc: [],
    from: undefined,
    headers: defaults.headers ?? {},
    replyTo: undefined,
  }

  // Convert addresses now to avoid doing it repeatedly later
  if (defaults.bcc !== undefined) {
    extractedDefaults.bcc = convertAddresses(
      Array.isArray(defaults.bcc) ? defaults.bcc : [defaults.bcc],
    )
  }
  if (defaults.cc !== undefined) {
    extractedDefaults.cc = convertAddresses(
      Array.isArray(defaults.cc) ? defaults.cc : [defaults.cc],
    )
  }
  if (defaults.replyTo !== undefined) {
    extractedDefaults.replyTo = convertAddress(defaults.replyTo)
  }
  if (defaults.from !== undefined) {
    extractedDefaults.from = convertAddress(defaults.from)
  }

  return extractedDefaults
}

export function constructCompleteSendOptions(
  sendOptions:
    | MailSendWithoutRenderingOptions<any, any>
    | MailSendOptions<any, any, any, any>,
  defaults: MailerDefaults,
): MailSendOptionsComplete {
  const sendOptionsComplete: Omit<MailSendOptionsComplete, 'from' | 'subject'> =
    {
      attachments: [],
      bcc: [],
      cc: [],
      headers: {},
      replyTo: undefined,
      to: [],
    }

  const from = sendOptions.from ?? defaults.from
  if (from === undefined) {
    throw new Error('Missing from address')
  }

  const subject = sendOptions.subject
  if (subject === undefined) {
    throw new Error('Missing subject')
  }

  if (sendOptions.to !== undefined) {
    sendOptionsComplete.to = convertAddresses(
      Array.isArray(sendOptions.to) ? sendOptions.to : [sendOptions.to],
    )
  }
  if (sendOptionsComplete.to.length === 0) {
    throw new Error('Missing to address')
  }

  if (sendOptions.cc !== undefined) {
    sendOptionsComplete.cc = convertAddresses(
      Array.isArray(sendOptions.cc) ? sendOptions.cc : [sendOptions.cc],
    )
  } else {
    sendOptionsComplete.cc = defaults.cc
  }

  if (sendOptions.bcc !== undefined) {
    sendOptionsComplete.bcc = convertAddresses(
      Array.isArray(sendOptions.bcc) ? sendOptions.bcc : [sendOptions.bcc],
    )
  } else {
    sendOptionsComplete.bcc = defaults.bcc
  }

  if (sendOptions.replyTo !== undefined) {
    sendOptionsComplete.replyTo = convertAddress(sendOptions.replyTo)
  } else {
    sendOptionsComplete.replyTo = defaults.replyTo
  }

  if (sendOptions.headers !== undefined) {
    sendOptionsComplete.headers = sendOptions.headers
  } else {
    sendOptionsComplete.headers = defaults.headers
  }

  if (sendOptions.attachments !== undefined) {
    sendOptionsComplete.attachments = sendOptions.attachments
  } else {
    sendOptionsComplete.attachments = defaults.attachments
  }

  return { ...sendOptionsComplete, from: convertAddress(from), subject }
}
