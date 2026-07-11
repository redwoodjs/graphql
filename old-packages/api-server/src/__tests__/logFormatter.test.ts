import { describe, it, expect } from 'vitest'

import { LogFormatter } from '../logFormatter/index'

const logFormatter = LogFormatter()

describe('LogFormatter', () => {
  describe('Formats log levels as emoji', () => {
    it('Formats Trace level', () => {
      expect(logFormatter({ level: 10 })).toMatch('🧵')
    })

    it('Formats Debug level', () => {
      expect(logFormatter({ level: 20 })).toMatch('🐛')
    })

    it('Formats Info level', () => {
      expect(logFormatter({ level: 30 })).toMatch('🌲')
    })

    it('Formats Warn level', () => {
      expect(logFormatter({ level: 40 })).toMatch('🚦')
    })

    it('Formats Error level', () => {
      expect(logFormatter({ level: 50 })).toMatch('🚨')
    })
  })

  describe('Formats log messages', () => {
    it('Formats newline-delimited json data with a message', () => {
      expect(
        logFormatter({ level: 10, message: 'Message in a bottle' }),
      ).toMatch('Message in a bottle')
    })

    it('Formats newline-delimited json data with a msg', () => {
      expect(logFormatter({ level: 10, msg: 'Message in a bottle' })).toMatch(
        'Message in a bottle',
      )
    })

    it('Formats a text message', () => {
      expect(logFormatter('Handles text data')).toMatch('Handles text data')
    })

    it('Formats Get Method and Status Code', () => {
      const logData = { level: 10, method: 'GET', statusCode: 200 }
      expect(logFormatter(logData)).toMatch('GET')
      expect(logFormatter(logData)).toMatch('200')
    })

    it('Formats Post Method and Status Code', () => {
      const logData = { level: 10, method: 'POST', statusCode: 200 }
      expect(logFormatter(logData)).toMatch('POST')
      expect(logFormatter(logData)).toMatch('200')
    })

    it('Should not format Status Code without a Method', () => {
      expect(logFormatter({ level: 10, statusCode: 200 })).not.toMatch('200')
    })
  })

  describe('Formats GraphQL injected log data from useRedwoodLogger plugin', () => {
    it('Handles query', () => {
      expect(
        logFormatter({
          level: 10,
          query: {
            id: 1,
          },
        }),
      ).toMatch('"id": 1')
    })

    it('Handles operation name', () => {
      expect(
        logFormatter({ level: 10, operationName: 'GET_BLOG_POST_BY_ID' }),
      ).toMatch('GET_BLOG_POST_BY_ID')
    })

    it('Handles GraphQL data', () => {
      expect(
        logFormatter({
          level: 10,
          data: { post: { id: 1, title: 'My Blog Post' } },
        }),
      ).toMatch('My Blog Post')
    })

    it('Handles browser user agent', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15'
      expect(
        logFormatter({
          level: 10,
          userAgent,
        }),
      ).toMatch(/Mozilla.*AppleWebKit.*Safari/)
    })
  })

  describe('Custom log data', () => {
    it('Should include the custom log attribute text', () => {
      expect(
        logFormatter({
          level: 10,
          custom: 'I should see this custom message text',
        }),
      ).toMatch('I should see this')
    })

    it('Should include the custom log attribute info a custom emoji and label', () => {
      expect(
        logFormatter({
          level: 10,
          custom: 'I should see this custom emoji and label',
        }),
      ).toMatch('🗒 Custom')
    })

    it('Should include the custom log attribute info with nested text message', () => {
      expect(
        logFormatter({
          level: 10,
          custom: {
            string: 'I should see this custom message in the log',
          },
        }),
      ).toMatch('I should see this custom message in the log')
    })

    it('Should include the custom log attribute info with a number attribute', () => {
      expect(
        logFormatter({
          level: 10,
          custom: {
            string: 'I should see this custom message and number in the log',
            number: 100,
          },
        }),
      ).toMatch('100')
    })

    it('Should include the custom log attribute info with a nested object attribute', () => {
      expect(
        logFormatter({
          level: 10,
          custom: {
            string: 'I should see this custom object in the log',
            obj: { foo: 'bar' },
          },
        }),
      ).toMatch('"foo": "bar"')
    })

    it('Should include the custom log attribute info with a nested object attribute', () => {
      expect(
        logFormatter({
          level: 10,
          custom: {
            string: 'I should see this custom object in the log',
            obj: { foo: 'bar' },
          },
        }),
      ).toMatch('"foo": "bar"')
    })

    it('Should filter out overly verbose custom log attributes', () => {
      expect(
        logFormatter({
          level: 10,
          custom: {
            time: 1,
            pid: 1,
            hostname: 'should not appear',
            reqId: 'should not appear',
            req: {
              method: 'should not appear',
              url: 'should not appear',
              hostname: 'should not appear',
              remoteAddress: 'should not appear',
              remotePort: 1,
            },
          },
        }),
      ).not.toMatch('should not appear')
    })
  })

  it('Should format error stack traces', () => {
    expect(
      logFormatter({
        level: 50,
        err: {
          message: 'This error has a stack traces',
          stack:
            'A stack trace \n will have \n several lines \n at some line number \n at some code',
        },
      }),
    ).toMatch(/at some line number/)
  })

  it('Should format error and include the error type', () => {
    expect(
      logFormatter({
        level: 50,
        err: {
          type: 'GraphQL Error',
          message: 'This error has a stack traces',
          stack:
            'A stack trace \n will have \n several lines \n at some line number \n at some code',
        },
      }),
    ).toMatch(/GraphQL Error Info/)
  })

  describe('When there are additional options', () => {
    it('Should format and include additional options without custom tag', () => {
      expect(
        logFormatter({
          level: 10,
          apiVersion: '4.2.1',
          environment: 'staging',
        }),
      ).toMatch('"apiVersion": "4.2.1"')

      expect(
        logFormatter({
          level: 10,
          apiVersion: '4.2.1',
          environment: 'staging',
        }),
      ).toMatch('"environment": "staging"')
    })

    it('Should format and include additional nested options without custom tag', () => {
      expect(
        logFormatter({
          level: 10,
          deploy: {
            environment: 'staging',
            version: '4.2.1',
          },
        }),
      ).toMatch('"deploy"')

      expect(
        logFormatter({
          level: 10,
          deploy: {
            environment: 'staging',
            version: '4.2.1',
          },
        }),
      ).toMatch('"environment": "staging"')

      logFormatter({
        level: 10,
        deploy: {
          environment: 'staging',
          version: '4.2.1',
        },
      }) // ?

      expect(
        logFormatter({
          level: 10,
          deploy: {
            environment: 'staging',
            version: '4.2.1',
          },
        }),
      ).toMatch('"version": "4.2.1"')
    })
  })

  it('Should not have any undefined ns, name, or message', () => {
    expect(
      logFormatter({
        level: 10,
      }),
    ).not.toContain('undefined')
  })
})
