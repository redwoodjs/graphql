import type { Logger } from '@redwoodjs/api/logger'

import type { AbstractMailHandler } from './handler'
import type {
  MailerConfig,
  MailSendWithoutRenderingOptions,
  MailHandlers,
  MailRenderers,
  MailSendOptions,
  MailerDefaults,
  MailerMode,
  MailResult,
} from './types'
import { constructCompleteSendOptions, extractDefaults } from './utils'

export class Mailer<
  THandlers extends MailHandlers,
  TDefaultHandler extends keyof THandlers,
  TRenderers extends MailRenderers,
  TDefaultRenderer extends keyof TRenderers,
  TTestHandler extends keyof THandlers,
  TDevelopmentHandler extends keyof THandlers,
> {
  protected logger: Logger | typeof console

  public mode: MailerMode = 'development'
  public defaults: MailerDefaults
  public handlers: THandlers
  public renderers: TRenderers

  // TODO: These would be better typed as the specific InMemoryMailHandler and StudioMailHandler classes
  //       However, that would require a circular dependency between this file and those files
  private fallbackTestHandler?: AbstractMailHandler
  private fallbackDevelopmentHandler?: AbstractMailHandler

  constructor(
    public config: MailerConfig<
      THandlers,
      TDefaultHandler,
      TRenderers,
      TDefaultRenderer,
      TTestHandler,
      TDevelopmentHandler
    >,
  ) {
    // Logger
    this.logger = this.config.logger
      ? this.config.logger.child({ module: 'mailer' })
      : console

    // Mode
    this.mode = this.isTest()
      ? 'test'
      : this.isDevelopment()
        ? 'development'
        : 'production'

    // Config
    this.handlers = this.config.handling.handlers
    this.renderers = this.config.rendering.renderers

    // Extract defaults from config
    this.defaults = extractDefaults(this.config.defaults ?? {})

    // Validate handlers for test and development modes
    const testHandlerKey = this.config.test?.handler
    if (testHandlerKey === undefined) {
      // Attempt to use a default in-memory handler if the required package is installed
      try {
        this.fallbackTestHandler =
          new (require('@redwoodjs/mailer-handler-in-memory').InMemoryMailHandler)()
        this.logger.warn(
          "Automatically loaded the '@redwoodjs/mailer-handler-in-memory' handler, this will be used to process mail in test mode",
        )
      } catch {
        this.logger.warn(
          "No test handler specified and could not load the '@redwoodjs/mailer-handler-in-memory' handler automatically, this will prevent mail from being processed in test mode",
        )
      }
    } else if (testHandlerKey === null) {
      this.logger.warn(
        'The test handler is null, this will prevent mail from being processed in test mode',
      )
    } else {
      if (this.handlers[testHandlerKey] === undefined) {
        throw new Error(
          `The specified test handler '${testHandlerKey.toString()}' is not defined`,
        )
      }
    }
    const developmentHandlerKey = this.config.development?.handler
    if (developmentHandlerKey === undefined) {
      // Attempt to use a default studio handler if the required package is installed
      try {
        this.fallbackDevelopmentHandler =
          new (require('@redwoodjs/mailer-handler-studio').StudioMailHandler)()
        this.logger.warn(
          "Automatically loaded the '@redwoodjs/mailer-handler-studio' handler, this will be used to process mail in development mode",
        )
      } catch {
        this.logger.warn(
          "No development handler specified and could not load the '@redwoodjs/mailer-handler-studio' handler automatically, this will prevent mail from being processed in development mode",
        )
      }
    } else if (developmentHandlerKey === null) {
      this.logger.warn(
        'The development handler is null, this will prevent mail from being processed in development mode',
      )
    } else {
      if (this.handlers[developmentHandlerKey] === undefined) {
        throw new Error(
          `The specified development handler '${developmentHandlerKey.toString()}' is not defined`,
        )
      }
    }

    // Validate default handler and renderer
    const defaultHandlerKey = this.config.handling.default
    if (defaultHandlerKey === undefined) {
      throw new Error('No default handler configured')
    } else if (this.handlers[defaultHandlerKey] === undefined) {
      throw new Error(
        `The specified default handler '${defaultHandlerKey.toString()}' is not defined`,
      )
    }
    const defaultRendererKey = this.config.rendering.default
    if (defaultRendererKey === undefined) {
      throw new Error('No default renderer configured')
    } else if (this.renderers[defaultRendererKey] === undefined) {
      throw new Error(
        `The specified default renderer '${defaultRendererKey.toString()}' is not defined`,
      )
    }

    // Initial logging
    let defaultsNotice = ''
    if (this.mode === 'production') {
      defaultsNotice = `, is using the '${defaultRendererKey.toString()}' renderer by default and the '${defaultHandlerKey.toString()}' handler by default`
    } else {
      const modeHandlerKey =
        this.mode === 'test' ? testHandlerKey : developmentHandlerKey
      const handlerNotice =
        modeHandlerKey != null
          ? `is using the '${modeHandlerKey.toString()}' handler for all mail`
          : 'is not sending mail to any handler'

      defaultsNotice = `, is using the '${defaultRendererKey.toString()}' renderer by default and ${handlerNotice}`
    }
    this.logger.debug(
      {},
      `Mailer initialized in ${this.mode} mode${defaultsNotice}`,
    )
  }

  async send<
    THandler extends keyof THandlers = TDefaultHandler,
    TRenderer extends keyof TRenderers = TDefaultRenderer,
  >(
    template: Parameters<TRenderers[TRenderer]['render']>[0],
    sendOptions: MailSendOptions<THandlers, THandler, TRenderers, TRenderer>,
    handlerOptions?: Parameters<THandlers[THandler]['send']>[2],
    rendererOptions?: Parameters<TRenderers[TRenderer]['render']>[1],
  ): Promise<MailResult> {
    const handlerKeyForProduction =
      sendOptions.handler ?? this.config.handling.default

    let handlerKey: keyof THandlers | null | undefined = null
    switch (this.mode) {
      case 'test':
        handlerKey = this.config.test?.handler
        break
      case 'development':
        handlerKey = this.config.development?.handler
        break
      case 'production':
        handlerKey = handlerKeyForProduction
        break
      default:
        throw new Error(`Invalid mode '${this.mode}'`)
    }

    if (handlerKey === null) {
      // Handler is null, which indicates a no-op
      return {}
    }

    const completedSendOptions = constructCompleteSendOptions(
      sendOptions,
      this.defaults,
    )

    const rendererKey = sendOptions.renderer ?? this.getDefaultRendererKey()
    if (rendererKey === undefined) {
      throw new Error(
        'No renderer specified and no default renderer configured',
      )
    }
    const renderer = this.renderers[rendererKey]
    if (renderer === undefined) {
      throw new Error(`No renderer found to match '${rendererKey.toString()}'`)
    }

    const defaultedRendererOptions = {
      ...this.config.rendering.options?.[rendererKey],
      ...rendererOptions,
    }
    const renderedContent = renderer.render(
      template,
      defaultedRendererOptions,
      {
        logger: this.logger,
        mode: this.mode,
        renderer: rendererKey,
        rendererOptions: defaultedRendererOptions,
      },
    )

    const defaultedHandlerOptions =
      handlerKey === undefined
        ? handlerOptions
        : {
            ...this.config.handling.options?.[handlerKey],
            ...handlerOptions,
          }

    const handler =
      handlerKey === undefined
        ? this.getDefaultHandler()
        : this.handlers[handlerKey]
    if (handler === null || handler === undefined) {
      // Handler is null or missing, which indicates a no-op
      return {}
    }

    const result = await handler.send(
      renderedContent,
      completedSendOptions,
      defaultedHandlerOptions,
      {
        logger: this.logger,
        mode: this.mode,
        handler: handlerKeyForProduction,
        handlerOptions: defaultedHandlerOptions,
        renderer: rendererKey,
        rendererOptions: defaultedRendererOptions,
      },
    )

    return result
  }

  async sendWithoutRendering<
    THandler extends keyof THandlers = TDefaultHandler,
  >(
    content: Parameters<THandlers[THandler]['send']>[0],
    sendOptions: MailSendWithoutRenderingOptions<THandlers, THandler>,
    handlerOptions?: Parameters<THandlers[THandler]['send']>[2],
  ): Promise<MailResult> {
    const handlerKeyForProduction =
      sendOptions.handler ?? this.config.handling.default

    let handlerKey: keyof THandlers | null | undefined = null
    switch (this.mode) {
      case 'test':
        handlerKey = this.config.test?.handler
        break
      case 'development':
        handlerKey = this.config.development?.handler
        break
      case 'production':
        handlerKey = handlerKeyForProduction
        break
      default:
        throw new Error(`Invalid mode '${this.mode}'`)
    }

    if (handlerKey === null) {
      // Handler is null, which indicates a no-op
      return {}
    }

    const completedSendOptions = constructCompleteSendOptions(
      sendOptions,
      this.defaults,
    )

    const defaultedHandlerOptions =
      handlerKey === undefined
        ? handlerOptions
        : {
            ...this.config.handling.options?.[handlerKey],
            ...handlerOptions,
          }

    const handler =
      handlerKey === undefined
        ? this.getDefaultHandler()
        : this.handlers[handlerKey]
    if (handler === null || handler === undefined) {
      // Handler is null or missing, which indicates a no-op
      return {}
    }

    const result = await handler.send(
      content,
      completedSendOptions,
      defaultedHandlerOptions,
      {
        logger: this.logger,
        mode: this.mode,
        handler: handlerKeyForProduction,
        handlerOptions: defaultedHandlerOptions,
      },
    )

    return result
  }

  protected isDevelopment() {
    if (this.config.development?.when === undefined) {
      // TODO: Ensure this is a sensible default
      return process.env.NODE_ENV !== 'production'
    }
    if (typeof this.config.development?.when === 'boolean') {
      return this.config.development?.when
    }
    if (typeof this.config.development?.when === 'function') {
      return this.config.development?.when()
    }
    throw new Error("Invalid 'when' configuration for development mode")
  }

  protected isTest() {
    if (this.config.test?.when === undefined) {
      // TODO: Ensure this is a sensible default
      return process.env.NODE_ENV === 'test'
    }
    if (typeof this.config.test?.when === 'boolean') {
      return this.config.test?.when
    }
    if (typeof this.config.test?.when === 'function') {
      return this.config.test?.when()
    }
    throw new Error("Invalid 'when' configuration for test mode")
  }

  getTestHandler() {
    const handlerKey = this.config.test?.handler
    if (handlerKey === null) {
      return handlerKey
    }
    if (handlerKey === undefined) {
      return this.fallbackTestHandler
    }
    return this.handlers[handlerKey]
  }

  getDevelopmentHandler() {
    const handlerKey = this.config.development?.handler
    if (handlerKey === null) {
      return handlerKey
    }
    if (handlerKey === undefined) {
      return this.fallbackDevelopmentHandler
    }
    return this.handlers[handlerKey]
  }

  getDefaultProductionHandler() {
    return this.handlers[this.config.handling.default]
  }

  getDefaultHandler(mode: MailerMode = this.mode) {
    if (mode === 'test') {
      return this.getTestHandler()
    }
    if (mode === 'development') {
      return this.getDevelopmentHandler()
    }
    if (mode === 'production') {
      return this.getDefaultProductionHandler()
    }
    throw new Error(`Invalid mode '${mode}'`)
  }

  getDefaultRenderer() {
    return this.renderers[this.config.rendering.default]
  }

  protected getDefaultRendererKey() {
    return this.config.rendering.default
  }
}
