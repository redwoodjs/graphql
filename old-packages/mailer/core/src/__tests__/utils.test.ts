import { describe, test, expect } from 'vitest'

import type { MailerDefaults } from '../types'
import {
  constructCompleteSendOptions,
  convertAddresses,
  extractDefaults,
} from '../utils'

describe('convertAddresses', () => {
  test('string passthrough', () => {
    const addresses = ['alice@example.com', 'bob@example.com']
    expect(convertAddresses(addresses)).toStrictEqual(addresses)
  })
  test('object without name', () => {
    const addresses = [
      { address: 'alice@example.com' },
      { address: 'bob@example.com' },
    ]
    expect(convertAddresses(addresses)).toStrictEqual([
      'alice@example.com',
      'bob@example.com',
    ])
  })
  test('object with name', () => {
    const addresses = [
      { address: 'alice@example.com', name: 'Alice McExampleton' },
      { address: 'bob@example.com', name: 'Bob Testinger' },
    ]
    expect(convertAddresses(addresses)).toStrictEqual([
      'Alice McExampleton <alice@example.com>',
      'Bob Testinger <bob@example.com>',
    ])
  })
})

describe('extractDefaults', () => {
  test('blank', () => {
    expect(extractDefaults({})).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: undefined,
      headers: {},
      replyTo: undefined,
    })
  })

  test('example', () => {
    expect(
      extractDefaults({
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        cc: ['ccOne@example.com', 'ccTwo@example.com'],
        bcc: {
          name: 'BCC Recipient',
          address: 'bcc@example.com',
        },
        headers: {
          'X-Test-Header': 'test',
        },
        attachments: [
          {
            filename: 'test.txt',
            content: 'test',
          },
        ],
      }),
    ).toStrictEqual({
      attachments: [
        {
          filename: 'test.txt',
          content: 'test',
        },
      ],
      bcc: ['BCC Recipient <bcc@example.com>'],
      cc: ['ccOne@example.com', 'ccTwo@example.com'],
      from: 'from@example.com',
      headers: {
        'X-Test-Header': 'test',
      },
      replyTo: 'replyTo@example.com',
    })
  })
})

describe('constructCompleteSendOptions', () => {
  const blankDefaults: MailerDefaults = {
    attachments: [],
    bcc: [],
    cc: [],
    headers: {},
  }
  test('minimal', () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })

  test('throws when no from address is provided', () => {
    expect(() => {
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
        },
        blankDefaults,
      )
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Missing from address]`)

    expect(() => {
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        blankDefaults,
      )
    }).not.toThrow()

    expect(() => {
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
        },
        { ...blankDefaults, from: 'from@example.com' },
      )
    }).not.toThrow()
  })
  test('throws when no to address is provided', () => {
    expect(() => {
      constructCompleteSendOptions(
        // @ts-expect-error - intentionally missing 'to'
        {
          subject: 'Test Subject',
          from: 'from@example.com',
        },
        blankDefaults,
      )
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Missing to address]`)

    expect(() => {
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        blankDefaults,
      )
    }).not.toThrow()
  })
  test('throws when no subject is provided', () => {
    expect(() => {
      constructCompleteSendOptions(
        // @ts-expect-error - intentionally missing 'subject'
        {
          to: 'to@example.com',
          from: 'from@example.com',
        },
        blankDefaults,
      )
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Missing subject]`)

    expect(() => {
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        blankDefaults,
      )
    }).not.toThrow()
  })

  test('converts addresses as appropriate', () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: [
            { name: 'name1', address: 'address1@example.com' },
            { name: 'name2', address: 'address2@example.com' },
          ],
          from: { name: 'fromName', address: 'fromAddress@example.com' },
          replyTo: {
            name: 'replyToName',
            address: 'replyToAddress@example.com',
          },
          cc: [
            { name: 'ccName1', address: 'ccAddress1@example.com' },
            { name: 'ccName2', address: 'ccAddress2@example.com' },
          ],
          bcc: [
            { name: 'bccName1', address: 'bccAddress1@example.com' },
            { name: 'bccName2', address: 'bccAddress2@example.com' },
          ],
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [
        'bccName1 <bccAddress1@example.com>',
        'bccName2 <bccAddress2@example.com>',
      ],
      cc: [
        'ccName1 <ccAddress1@example.com>',
        'ccName2 <ccAddress2@example.com>',
      ],
      from: 'fromName <fromAddress@example.com>',
      headers: {},
      replyTo: 'replyToName <replyToAddress@example.com>',
      subject: 'Test Subject',
      to: ['name1 <address1@example.com>', 'name2 <address2@example.com>'],
    })
  })

  test("handles 'from'", () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
        },
        {
          ...blankDefaults,
          from: 'from@example.com',
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'fromOverride@example.com',
        },
        {
          ...blankDefaults,
          from: 'from@example.com',
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'fromOverride@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })

  test("handles 'subject'", () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })

  test("handles 'cc'", () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          cc: 'cc@example.com',
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: ['cc@example.com'],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        {
          ...blankDefaults,
          cc: ['cc@example.com'],
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: ['cc@example.com'],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          cc: ['ccOverride@example.com'],
        },
        {
          ...blankDefaults,
          cc: ['cc@example.com'],
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: ['ccOverride@example.com'],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })

  test("handles 'bcc'", () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          bcc: 'bcc@example.com',
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: ['bcc@example.com'],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        {
          ...blankDefaults,
          bcc: ['bcc@example.com'],
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: ['bcc@example.com'],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          bcc: ['bccOverride@example.com'],
        },
        {
          ...blankDefaults,
          bcc: ['bcc@example.com'],
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: ['bccOverride@example.com'],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })

  test("handles 'replyTo'", () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          replyTo: 'replyTo@example.com',
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: 'replyTo@example.com',
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        {
          ...blankDefaults,
          replyTo: 'replyTo@example.com',
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: 'replyTo@example.com',
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          replyTo: 'replyToOverride@example.com',
        },
        {
          ...blankDefaults,
          replyTo: 'replyTo@example.com',
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: 'replyToOverride@example.com',
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })

  test("handles 'headers'", () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          headers: {
            'X-Test-Header': 'test',
          },
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {
        'X-Test-Header': 'test',
      },
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        {
          ...blankDefaults,
          headers: {
            'X-Test-Header': 'test',
          },
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {
        'X-Test-Header': 'test',
      },
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          headers: {
            'X-Test-Header-Override': 'test',
          },
        },
        {
          ...blankDefaults,
          headers: {
            'X-Test-Header': 'test',
          },
        },
      ),
    ).toStrictEqual({
      attachments: [],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {
        'X-Test-Header-Override': 'test',
      },
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })

  test("handles 'attachments'", () => {
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          attachments: [
            {
              filename: 'test.txt',
              content: 'test',
            },
          ],
        },
        blankDefaults,
      ),
    ).toStrictEqual({
      attachments: [
        {
          filename: 'test.txt',
          content: 'test',
        },
      ],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
        },
        {
          ...blankDefaults,
          attachments: [
            {
              filename: 'test.txt',
              content: 'test',
            },
          ],
        },
      ),
    ).toStrictEqual({
      attachments: [
        {
          filename: 'test.txt',
          content: 'test',
        },
      ],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
    expect(
      constructCompleteSendOptions(
        {
          subject: 'Test Subject',
          to: 'to@example.com',
          from: 'from@example.com',
          attachments: [
            {
              filename: 'testOverride.txt',
              content: 'testOverride',
            },
          ],
        },
        {
          ...blankDefaults,
          attachments: [
            {
              filename: 'test.txt',
              content: 'test',
            },
          ],
        },
      ),
    ).toStrictEqual({
      attachments: [
        {
          filename: 'testOverride.txt',
          content: 'testOverride',
        },
      ],
      bcc: [],
      cc: [],
      from: 'from@example.com',
      headers: {},
      replyTo: undefined,
      subject: 'Test Subject',
      to: ['to@example.com'],
    })
  })
})
