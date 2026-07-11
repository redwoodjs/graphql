import type { Logger } from '@redwoodjs/api/logger'

import type { AbstractMailHandler } from './handler'
import type { AbstractMailRenderer } from './renderer'

// TODO: Some properties we have marked as unknown or similar are actually expected to be spreadable
//       so we should probably attempt narrow the type to ensure that remains possible

export type MailRenderedContent = {
  html: string
  text: string
}

export type MailHandlers = Record<string, AbstractMailHandler>
export type MailRenderers = Record<string, AbstractMailRenderer>

export type MailRendererOptions<TRenderOutputFormats> = {
  outputFormat?: TRenderOutputFormats
  [key: string]: unknown
}

export type DefaultHandlerOptions<THandlers extends MailHandlers> = {
  [K in keyof THandlers]?: Parameters<THandlers[K]['send']>[2]
}

export type DefaultRendererOptions<TRenderers extends MailRenderers> = {
  [K in keyof TRenderers]?: Parameters<TRenderers[K]['render']>[1]
}

export type DefaultSendOptions = {
  attachments: MailAttachment[]
  bcc: string[]
  cc: string[]
  from: string
  headers: Record<string, string>
  replyTo: string
}

export type MailHandlersOptions<
  THandlers extends MailHandlers,
  TDefaultHandler,
> = {
  handlers: THandlers
  default: TDefaultHandler | keyof THandlers
  options?: DefaultHandlerOptions<THandlers>
}

export type MailRenderersOptions<
  TRenderers extends MailRenderers,
  TDefaultRenderer,
> = {
  renderers: TRenderers
  default: TDefaultRenderer | keyof TRenderers
  options?: DefaultRendererOptions<TRenderers>
}

export interface ModeHandlerOptions<
  THandlers extends MailHandlers,
  TModeHandler extends keyof THandlers,
> {
  handler?: TModeHandler | null
  when?: boolean | ((...args: any[]) => boolean)
}

export interface MailerConfig<
  THandlers extends MailHandlers,
  TDefaultHandler extends keyof THandlers,
  TRenderers extends MailRenderers,
  TDefaultRenderer extends keyof TRenderers,
  TTestHandler extends keyof THandlers,
  TDevelopmentHandler extends keyof THandlers,
> {
  handling: MailHandlersOptions<THandlers, TDefaultHandler>

  // TODO: Allow rendering to be completely optional?
  rendering: MailRenderersOptions<TRenderers, TDefaultRenderer>

  defaults?: Partial<Omit<MailBasicSendOptions, 'to' | 'subject'>>

  development?: ModeHandlerOptions<THandlers, TDevelopmentHandler>

  test?: ModeHandlerOptions<THandlers, TTestHandler>

  logger?: Logger
}

export type MailAddress = string | { name?: string; address: string }

export interface MailBasicSendOptions {
  to: MailAddress | MailAddress[]
  cc?: MailAddress | MailAddress[]
  bcc?: MailAddress | MailAddress[]

  from?: MailAddress
  replyTo?: MailAddress

  subject: string

  headers?: Record<string, string>

  attachments?: MailAttachment[]
}

export interface MailSendWithoutRenderingOptions<
  THandlers,
  THandler extends keyof THandlers,
> extends MailBasicSendOptions {
  handler?: THandler | keyof THandlers
}

export interface MailSendOptions<
  THandlers,
  THandler extends keyof THandlers,
  TRenderers,
  TRenderer extends keyof TRenderers,
> extends MailSendWithoutRenderingOptions<THandlers, THandler> {
  renderer?: TRenderer | keyof TRenderers
}

export type MailAttachment = {
  filename?: string
  path?: string
  content?: string | Buffer
}

export type MailSendOptionsComplete = {
  to: string[]
  cc: string[]
  bcc: string[]

  from: string
  replyTo?: string

  subject: string

  headers: Record<string, string>

  attachments: MailAttachment[]
}

export type MailResult = {
  messageID?: string
  handlerInformation?: unknown
}

export type MailUtilities = {
  logger?: Logger | Console
  mode?: MailerMode
  handler?: string | number | symbol
  handlerOptions?: unknown
  renderer?: string | number | symbol
  rendererOptions?: unknown
}

export type MailerDefaults = Omit<DefaultSendOptions, 'from' | 'replyTo'> & {
  from?: string
  replyTo?: string
}

export type MailerMode = 'test' | 'development' | 'production'
