import { describe, it, expect } from 'vitest'

import { sanitizeArgv } from '../sendTelemetry'

describe('sanitizeArgv', () => {
  it('ignores commands with no replacements', () => {
    const output = sanitizeArgv(['yarn', 'rw', 'foo', 'arg'])

    expect(output).toEqual('foo arg')
  })

  it('replaces sensitive args in first position', () => {
    const output = sanitizeArgv(['yarn', 'rw', 'g', 'page', 'Foo'])

    expect(output).toEqual('g page [name]')
  })

  it('replaces sensitive args in multiple positions', () => {
    const output = sanitizeArgv(['yarn', 'rw', 'g', 'page', 'Foo', '/foo'])

    expect(output).toEqual('g page [name] [path]')
  })

  it('does not replace --flag args in numbered position', () => {
    const output = sanitizeArgv(['yarn', 'rw', 'g', 'page', 'Foo', '--force'])

    expect(output).toEqual('g page [name] --force')
  })

  it('replaces named --flag args', () => {
    const output = sanitizeArgv([
      'yarn',
      'rw',
      'prisma',
      'migrate',
      'dev',
      '--name',
      'create-user',
    ])

    expect(output).toEqual('prisma migrate dev --name [name]')
  })
})
