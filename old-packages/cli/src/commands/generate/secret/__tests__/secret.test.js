import { describe, it, expect } from 'vitest'
import yargs from 'yargs/yargs'

import {
  DEFAULT_LENGTH,
  generateSecret,
  handler,
  builder,
} from './../secret.js'

describe('generateSecret', () => {
  it('contains base64-encoded string', () => {
    const secret = generateSecret()
    const buffer = Buffer.alloc(DEFAULT_LENGTH)
    const stringLength = buffer.toString('base64').length

    expect(secret).toMatch(new RegExp(`^[A-Za-z0-9+/=]{${stringLength}}$`))
  })

  it('can optionally accept a length', () => {
    const secret = generateSecret(16)
    const buffer = Buffer.alloc(16)

    // however long a 16-byte buffer is when base64-encoded (24 characters)
    expect(secret.length).toEqual(buffer.toString('base64').length)
  })

  it('prints nothing but the secret when setting the --raw flag', () => {
    const realLog = console.log
    const realInfo = console.info
    const realWrite = process.stdout.write

    let output = ''

    console.log = (...args) => (output += args.join(' ') + '\n')
    console.info = (...args) => (output += args.join(' ') + '\n')
    process.stdout.write = (str) => (output += str)

    const { raw } = yargs()
      .command('secret', false, builder, handler)
      .parse('secret --raw')

    console.log = realLog
    console.info = realInfo
    process.stdout.write = realWrite

    expect(raw).toBeTruthy()
    expect(output).toMatch(new RegExp(`^[A-Za-z0-9+/=]+\n$`))
  })
})
