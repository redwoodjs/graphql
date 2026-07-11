import {
  vi,
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest'

import { AbstractMailHandler } from '../handler'
import { Mailer } from '../mailer'
import { AbstractMailRenderer } from '../renderer'
import type {
  MailRenderedContent,
  MailSendOptionsComplete,
  MailUtilities,
  MailResult,
  MailRendererOptions,
} from '../types'

class MockMailHandler extends AbstractMailHandler {
  send(
    _renderedContent: MailRenderedContent,
    _sendOptions: MailSendOptionsComplete,
    _handlerOptions?: Record<string | number | symbol, unknown>,
    _utilities?: MailUtilities,
  ): MailResult | Promise<MailResult> {
    // do nothing
    return {}
  }
  internal(): Record<string, unknown> {
    return {}
  }
}

class MockMailRenderer extends AbstractMailRenderer {
  render(
    _template: unknown,
    _options: MailRendererOptions<unknown>,
    _utilities?: MailUtilities,
  ): MailRenderedContent {
    // do nothing
    return {
      html: '',
      text: '',
    }
  }
  internal(): Record<string, unknown> {
    return {}
  }
}

describe('Uses the correct modes', () => {
  const baseConfig = {
    handling: {
      handlers: {
        handlerA: new MockMailHandler(),
        handlerB: new MockMailHandler(),
      },
      default: 'handlerA',
    },
    rendering: {
      renderers: {
        rendererA: new MockMailRenderer(),
        rendererB: new MockMailRenderer(),
      },
      default: 'rendererA',
    },
  } as const

  beforeAll(() => {
    // prevent console output
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('starts in test mode', () => {
    test('default', () => {
      const existingValue = process.env.NODE_ENV

      process.env.NODE_ENV = 'test'
      expect(new Mailer(baseConfig).mode).toBe('test')

      process.env.NODE_ENV = 'test-override'
      expect(new Mailer(baseConfig).mode).not.toBe('test')

      process.env.NODE_ENV = existingValue
    })

    test('explicit boolean', () => {
      expect(
        new Mailer({
          ...baseConfig,
          test: {
            when: true,
          },
        }).mode,
      ).toBe('test')
      expect(
        new Mailer({
          ...baseConfig,
          test: {
            when: false,
          },
        }).mode,
      ).not.toBe('test')
    })

    test('explicit function', () => {
      expect(
        new Mailer({
          ...baseConfig,
          test: {
            when: () => true,
          },
        }).mode,
      ).toBe('test')
      expect(
        new Mailer({
          ...baseConfig,
          test: {
            when: () => false,
          },
        }).mode,
      ).not.toBe('test')
    })

    test('fails for other condition types', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          test: {
            // @ts-expect-error - test invalid type
            when: 123,
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Invalid 'when' configuration for test mode]`,
      )

      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          test: {
            // @ts-expect-error - test invalid type
            when: 'invalid',
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Invalid 'when' configuration for test mode]`,
      )
    })
  })

  describe('starts in development mode', () => {
    test('default', () => {
      const existingValue = process.env.NODE_ENV

      process.env.NODE_ENV = 'anything-but-production'
      expect(new Mailer(baseConfig).mode).toBe('development')

      process.env.NODE_ENV = 'production'
      expect(new Mailer(baseConfig).mode).not.toBe('development')

      process.env.NODE_ENV = existingValue
    })

    test('explicit boolean', () => {
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: true,
          },
          test: {
            when: false,
          },
        }).mode,
      ).toBe('development')
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: false,
          },
          test: {
            when: false,
          },
        }).mode,
      ).not.toBe('development')
    })

    test('explicit function', () => {
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: () => true,
          },
          test: {
            when: false,
          },
        }).mode,
      ).toBe('development')
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: () => false,
          },
          test: {
            when: false,
          },
        }).mode,
      ).not.toBe('development')
    })

    test('fails for other condition types', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          development: {
            // @ts-expect-error - test invalid type
            when: 123,
          },
          test: {
            when: false,
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Invalid 'when' configuration for development mode]`,
      )

      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          development: {
            // @ts-expect-error - test invalid type
            when: 'invalid',
          },
          test: {
            when: false,
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Invalid 'when' configuration for development mode]`,
      )
    })
  })

  describe('starts in production mode', () => {
    test('default', () => {
      const existingValue = process.env.NODE_ENV

      process.env.NODE_ENV = 'production'
      expect(new Mailer(baseConfig).mode).toBe('production')

      process.env.NODE_ENV = 'anything-but-production'
      expect(new Mailer(baseConfig).mode).not.toBe('production')

      process.env.NODE_ENV = existingValue
    })

    test('explicit boolean', () => {
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: false,
          },
          test: {
            when: false,
          },
        }).mode,
      ).toBe('production')
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: true,
          },
          test: {
            when: false,
          },
        }).mode,
      ).not.toBe('production')
    })

    test('explicit function', () => {
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: () => false,
          },
          test: {
            when: false,
          },
        }).mode,
      ).toBe('production')
      expect(
        new Mailer({
          ...baseConfig,
          development: {
            when: () => true,
          },
          test: {
            when: false,
          },
        }).mode,
      ).not.toBe('production')
    })
  })

  describe('warns about null handlers', () => {
    beforeAll(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    test('test', () => {
      console.warn.mockClear()
      const _mailer1 = new Mailer({
        ...baseConfig,
        test: {
          when: true,
          handler: null,
        },
      })
      expect(console.warn).toBeCalledWith(
        'The test handler is null, this will prevent mail from being processed in test mode',
      )
    })

    test('development', () => {
      console.warn.mockClear()
      const _mailer1 = new Mailer({
        ...baseConfig,
        development: {
          when: true,
          handler: null,
        },
      })
      expect(console.warn).toBeCalledWith(
        'The development handler is null, this will prevent mail from being processed in development mode',
      )
    })
  })

  describe('attempts to use fallback handlers', () => {
    beforeAll(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    test('test', () => {
      console.warn.mockClear()
      const _mailer = new Mailer({
        ...baseConfig,
        test: {
          when: true,
          handler: undefined,
        },
      })
      expect(console.warn).toBeCalledWith(
        "Automatically loaded the '@redwoodjs/mailer-handler-in-memory' handler, this will be used to process mail in test mode",
      )
    })

    test('development', () => {
      console.warn.mockClear()
      const _mailer = new Mailer({
        ...baseConfig,
        development: {
          when: true,
          handler: undefined,
        },
      })
      expect(console.warn).toBeCalledWith(
        "Automatically loaded the '@redwoodjs/mailer-handler-studio' handler, this will be used to process mail in development mode",
      )
    })
  })

  describe('detects missing default handler', () => {
    test('test', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          test: {
            when: true,
            // @ts-expect-error - test invalid type
            handler: 'handlerC',
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: The specified test handler 'handlerC' is not defined]`,
      )
    })
    test('development', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          development: {
            when: true,
            // @ts-expect-error - test invalid type
            handler: 'handlerC',
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: The specified development handler 'handlerC' is not defined]`,
      )
    })
    test('production', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          test: {
            when: false,
          },
          development: {
            when: false,
          },
          handling: {
            ...baseConfig.handling,
            // @ts-expect-error - test invalid type
            default: 'handlerC',
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: The specified default handler 'handlerC' is not defined]`,
      )
    })
  })

  describe('detects missing default renderer', () => {
    test('test', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          test: {
            when: true,
          },
          rendering: {
            ...baseConfig.rendering,
            // @ts-expect-error - test invalid type
            default: 'rendererC',
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: The specified default renderer 'rendererC' is not defined]`,
      )
    })
    test('development', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          development: {
            when: true,
          },
          rendering: {
            ...baseConfig.rendering,
            // @ts-expect-error - test invalid type
            default: 'rendererC',
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: The specified default renderer 'rendererC' is not defined]`,
      )
    })
    test('production', () => {
      expect(() => {
        const _mailer = new Mailer({
          ...baseConfig,
          test: {
            when: false,
          },
          development: {
            when: false,
          },
          rendering: {
            ...baseConfig.rendering,
            // @ts-expect-error - test invalid type
            default: 'rendererC',
          },
        })
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: The specified default renderer 'rendererC' is not defined]`,
      )
    })
  })

  describe('calls the correct handler and renderer function', () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})

    describe('test', () => {
      const testHandler = new MockMailHandler()
      const testRenderer = new MockMailRenderer()
      const mailerConfig = {
        ...baseConfig,
        handling: {
          ...baseConfig.handling,
          handlers: {
            ...baseConfig.handling.handlers,
            testHandler,
          },
        },
        rendering: {
          ...baseConfig.rendering,
          renderers: {
            ...baseConfig.rendering.renderers,
            testRenderer,
          },
          default: 'testRenderer',
        },
        test: {
          when: true,
          handler: 'testHandler',
        },
        development: {
          when: false,
          handler: 'handlerA',
        },
      } as const
      const mailer = new Mailer(mailerConfig)

      beforeEach(() => {
        const handlerKeys = Object.keys(mailer.handlers)
        for (const handlerKey of handlerKeys) {
          vi.spyOn(mailer.handlers[handlerKey], 'send')
        }
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          vi.spyOn(mailer.renderers[rendererKey], 'render')
        }
      })

      afterEach(() => {
        const handlerKeys = Object.keys(mailer.handlers)
        for (const handlerKey of handlerKeys) {
          if (mailer.handlers[handlerKey] === testHandler) {
            expect(mailer.handlers[handlerKey].send).toBeCalledTimes(1)
          } else {
            expect(mailer.handlers[handlerKey].send).toBeCalledTimes(0)
          }

          mailer.handlers[handlerKey].send.mockClear()
        }

        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          mailer.renderers[rendererKey].render.mockClear()
        }
      })

      test('send', async () => {
        await mailer.send(undefined, {
          to: 'to@example.com',
          subject: 'Test',
          from: 'from@example.com',
        })
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          if (mailer.renderers[rendererKey] === testRenderer) {
            expect(mailer.renderers[rendererKey].render).toBeCalledTimes(1)
          } else {
            expect(mailer.renderers[rendererKey].render).toBeCalledTimes(0)
          }
        }
      })

      test('sendWithoutRendering', async () => {
        await mailer.sendWithoutRendering(
          {
            text: 'text',
            html: '<html></html>',
          },
          {
            to: 'to@example.com',
            subject: 'Test',
            from: 'from@example.com',
          },
        )
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          expect(mailer.renderers[rendererKey].render).toBeCalledTimes(0)
        }
      })
    })
    describe('development', () => {
      const developmentHandler = new MockMailHandler()
      const developmentRenderer = new MockMailRenderer()
      const mailerConfig = {
        ...baseConfig,
        handling: {
          ...baseConfig.handling,
          handlers: {
            ...baseConfig.handling.handlers,
            developmentHandler,
          },
        },
        rendering: {
          ...baseConfig.rendering,
          renderers: {
            ...baseConfig.rendering.renderers,
            developmentRenderer,
          },
          default: 'developmentRenderer',
        },
        test: {
          when: false,
          handler: 'handlerA',
        },
        development: {
          when: true,
          handler: 'developmentHandler',
        },
      } as const
      const mailer = new Mailer(mailerConfig)

      beforeEach(() => {
        const handlerKeys = Object.keys(mailer.handlers)
        for (const handlerKey of handlerKeys) {
          vi.spyOn(mailer.handlers[handlerKey], 'send')
        }
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          vi.spyOn(mailer.renderers[rendererKey], 'render')
        }
      })

      afterEach(() => {
        const handlerKeys = Object.keys(mailer.handlers)
        for (const handlerKey of handlerKeys) {
          if (mailer.handlers[handlerKey] === developmentHandler) {
            expect(mailer.handlers[handlerKey].send).toBeCalledTimes(1)
          } else {
            expect(mailer.handlers[handlerKey].send).toBeCalledTimes(0)
          }

          mailer.handlers[handlerKey].send.mockClear()
        }

        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          mailer.renderers[rendererKey].render.mockClear()
        }
      })

      test('send', async () => {
        await mailer.send(undefined, {
          to: 'to@example.com',
          subject: 'Test',
          from: 'from@example.com',
        })
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          if (mailer.renderers[rendererKey] === developmentRenderer) {
            expect(mailer.renderers[rendererKey].render).toBeCalledTimes(1)
          } else {
            expect(mailer.renderers[rendererKey].render).toBeCalledTimes(0)
          }
        }
      })

      test('sendWithoutRendering', async () => {
        await mailer.sendWithoutRendering(
          {
            text: 'text',
            html: '<html></html>',
          },
          {
            to: 'to@example.com',
            subject: 'Test',
            from: 'from@example.com',
          },
        )
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          expect(mailer.renderers[rendererKey].render).toBeCalledTimes(0)
        }
      })
    })
    describe('production', () => {
      const productionHandler = new MockMailHandler()
      const productionRenderer = new MockMailRenderer()
      const mailerConfig = {
        ...baseConfig,
        handling: {
          ...baseConfig.handling,
          handlers: {
            ...baseConfig.handling.handlers,
            productionHandler,
          },
          default: 'productionHandler',
        },
        rendering: {
          ...baseConfig.rendering,
          renderers: {
            ...baseConfig.rendering.renderers,
            productionRenderer,
          },
          default: 'productionRenderer',
        },
        test: {
          when: false,
          handler: 'handlerA',
        },
        development: {
          when: false,
          handler: 'handlerA',
        },
      } as const
      const mailer = new Mailer(mailerConfig)

      beforeEach(() => {
        const handlerKeys = Object.keys(mailer.handlers)
        for (const handlerKey of handlerKeys) {
          vi.spyOn(mailer.handlers[handlerKey], 'send')
        }
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          vi.spyOn(mailer.renderers[rendererKey], 'render')
        }
      })

      afterEach(() => {
        const handlerKeys = Object.keys(mailer.handlers)
        for (const handlerKey of handlerKeys) {
          if (mailer.handlers[handlerKey] === productionHandler) {
            expect(mailer.handlers[handlerKey].send).toBeCalledTimes(1)
          } else {
            expect(mailer.handlers[handlerKey].send).toBeCalledTimes(0)
          }

          mailer.handlers[handlerKey].send.mockClear()
        }

        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          mailer.renderers[rendererKey].render.mockClear()
        }
      })

      test('send', async () => {
        await mailer.send(undefined, {
          to: 'to@example.com',
          subject: 'Test',
          from: 'from@example.com',
        })
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          if (mailer.renderers[rendererKey] === productionRenderer) {
            expect(mailer.renderers[rendererKey].render).toBeCalledTimes(1)
          } else {
            expect(mailer.renderers[rendererKey].render).toBeCalledTimes(0)
          }
        }
      })

      test('sendWithoutRendering', async () => {
        await mailer.sendWithoutRendering(
          {
            text: 'text',
            html: '<html></html>',
          },
          {
            to: 'to@example.com',
            subject: 'Test',
            from: 'from@example.com',
          },
        )
        const rendererKeys = Object.keys(mailer.renderers)
        for (const rendererKey of rendererKeys) {
          expect(mailer.renderers[rendererKey].render).toBeCalledTimes(0)
        }
      })
    })
  })

  test('getTestHandler', () => {
    const handlerC = new MockMailHandler()
    const mailer = new Mailer({
      ...baseConfig,
      handling: {
        ...baseConfig.handling,
        handlers: {
          ...baseConfig.handling.handlers,
          handlerC,
        },
      },
      test: {
        handler: 'handlerC',
      },
    })
    expect(mailer.getTestHandler()).toBe(handlerC)

    const mailerExplicitlyNullTestHandler = new Mailer({
      ...baseConfig,
      test: {
        handler: null,
      },
    })
    expect(mailerExplicitlyNullTestHandler.getTestHandler()).toBeNull()

    const mailerNoTestHandlerDefined = new Mailer(baseConfig)
    expect(mailerNoTestHandlerDefined.getTestHandler()).not.toBeNull()
  })

  test('getDevelopmentHandler', () => {
    const handlerC = new MockMailHandler()
    const mailer = new Mailer({
      ...baseConfig,
      handling: {
        ...baseConfig.handling,
        handlers: {
          ...baseConfig.handling.handlers,
          handlerC,
        },
      },
      development: {
        handler: 'handlerC',
      },
    })
    expect(mailer.getDevelopmentHandler()).toBe(handlerC)

    const mailerExplicitlyNullDevelopmentHandler = new Mailer({
      ...baseConfig,
      development: {
        handler: null,
      },
    })
    expect(
      mailerExplicitlyNullDevelopmentHandler.getDevelopmentHandler(),
    ).toBeNull()

    const mailerNoDevelopmentHandlerDefined = new Mailer(baseConfig)
    expect(
      mailerNoDevelopmentHandlerDefined.getDevelopmentHandler(),
    ).not.toBeNull()
  })

  test('getDefaultProductionHandler', () => {
    const handlerC = new MockMailHandler()
    const mailer = new Mailer({
      ...baseConfig,
      handling: {
        ...baseConfig.handling,
        handlers: {
          ...baseConfig.handling.handlers,
          handlerC,
        },
        default: 'handlerC',
      },
    })
    expect(mailer.getDefaultProductionHandler()).toBe(handlerC)
  })

  test('getDefaultHandler', () => {
    const handlerTest = new MockMailHandler()
    const handlerDev = new MockMailHandler()
    const handlerProd = new MockMailHandler()
    const mailerConfig = {
      ...baseConfig,
      handling: {
        ...baseConfig.handling,
        handlers: {
          ...baseConfig.handling.handlers,
          handlerTest,
          handlerDev,
          handlerProd,
        },
        default: 'handlerProd',
      },
      test: {
        handler: 'handlerTest',
      },
      development: {
        handler: 'handlerDev',
      },
    } as const

    const mailerTest = new Mailer({
      ...mailerConfig,
      test: { ...mailerConfig.test, when: true },
      development: { ...mailerConfig.development, when: false },
    })
    expect(mailerTest.getDefaultHandler()).toBe(handlerTest)

    const mailerDev = new Mailer({
      ...mailerConfig,
      test: { ...mailerConfig.test, when: false },
      development: { ...mailerConfig.development, when: true },
    })
    expect(mailerDev.getDefaultHandler()).toBe(handlerDev)

    const mailerProd = new Mailer({
      ...mailerConfig,
      test: { ...mailerConfig.test, when: false },
      development: { ...mailerConfig.development, when: false },
    })
    expect(mailerProd.getDefaultHandler()).toBe(handlerProd)
  })

  test('getDefaultRenderer', () => {
    const rendererC = new MockMailRenderer()
    const mailer = new Mailer({
      ...baseConfig,
      rendering: {
        ...baseConfig.rendering,
        renderers: {
          ...baseConfig.rendering.renderers,
          rendererC,
        },
        default: 'rendererC',
      },
    })
    expect(mailer.getDefaultRenderer()).toBe(rendererC)
  })
})
