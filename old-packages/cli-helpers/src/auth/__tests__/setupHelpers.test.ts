globalThis.__dirname = __dirname

// mock Telemetry for CLI commands so they don't try to spawn a process
vi.mock('@redwoodjs/telemetry', () => {
  return {
    errorTelemetry: () => vi.fn(),
    timedTelemetry: () => vi.fn(),
  }
})

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal<typeof ProjectConfig>()
  return {
    ...originalProjectConfig,
    getConfig: () => ({}),
  }
})

vi.mock('../../lib/paths', () => {
  const path = require('path')
  const __dirname = path.resolve()

  return {
    getPaths: () => ({
      api: {
        src: path.join(__dirname, '../create-redwood-app/template/api/src'),
        functions: path.join(
          __dirname,
          '../create-redwood-app/template/api/src/functions',
        ),
        lib: path.join(__dirname, '../create-redwood-app/template/api/src/lib'),
      },
      web: { src: '' },
      base: path.join(__dirname, '../create-redwood-app/template'),
    }),
  }
})

vi.mock('../../lib/project', () => ({
  isTypeScriptProject: () => true,
}))

vi.mock('execa')
vi.mock('listr2')
vi.mock('prompts', () => ({
  default: vi.fn(() => ({ answer: true })),
}))

import fs from 'fs'
import path from 'path'

import { Listr } from 'listr2'
import prompts from 'prompts'
import { vi, describe, afterEach, it, expect } from 'vitest'
import type { Mock, MockedFunction } from 'vitest'

import type * as ProjectConfig from '@redwoodjs/project-config'

import { standardAuthHandler } from '../setupHelpers.js'

describe('Auth generator tests', () => {
  const processExitSpy = vi
    .spyOn<NodeJS.Process, any>(process, 'exit')
    .mockImplementation((_code: any) => {})

  const mockListrRun = vi.fn()

  ;(Listr as MockedFunction<Mock>).mockImplementation(() => {
    return {
      run: mockListrRun,
    }
  })

  const fsSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})

  afterEach(() => {
    processExitSpy.mockReset()
    fsSpy.mockReset()
    ;(prompts as unknown as Mock).mockClear()
    mockListrRun.mockClear()
  })

  it('Successfully executes the handler for Supertokens', async () => {
    await standardAuthHandler({
      basedir: path.join(__dirname, 'fixtures/supertokensSetup'),
      provider: 'supertokens',
      webAuthn: false,
      forceArg: false,
    })

    expect(mockListrRun).toHaveBeenCalledTimes(1)
    expect(processExitSpy).not.toHaveBeenCalledWith(1)
    // TODO: Add something like this back in when we've added support for
    // prompting the user
    // expect(prompts).toHaveBeenCalledTimes(1)
    // expect(prompts).toHaveBeenCalledWith(
    //   expect.objectContaining({
    //     message: expect.stringMatching(
    //       /Overwrite existing [/\\]api[/\\]src[/\\]lib[/\\]auth.ts\?/
    //     ),
    //   })
    // )
  })

  it('Successfully executes the handler for Netlify without prompting the user when --force is true', async () => {
    await standardAuthHandler({
      basedir: path.join(__dirname, 'fixtures/supertokensSetup'),
      provider: 'supertokens',
      webAuthn: false,
      forceArg: true,
    })

    expect(mockListrRun).toHaveBeenCalledTimes(1)
    expect(processExitSpy).not.toHaveBeenCalledWith(1)
    expect(prompts).toHaveBeenCalledTimes(0)
  })

  it('Successfully executes the handler for dbAuth', async () => {
    await standardAuthHandler({
      basedir: path.join(__dirname, 'fixtures/dbAuthSetup'),
      provider: 'dbAuth',
      webAuthn: false,
      forceArg: false,
    })

    expect(mockListrRun).toHaveBeenCalledTimes(1)
    expect(processExitSpy).not.toHaveBeenCalledWith(1)
    // TODO: Add this back in later
    // expect(prompts).toHaveBeenCalledTimes(1)
    // expect(prompts).toHaveBeenCalledWith(
    //   expect.objectContaining({
    //     message: expect.stringMatching(
    //       /Overwrite existing [/\\]api[/\\]src[/\\]lib[/\\]auth.ts\?/
    //     ),
    //   })
    // )
  })
})
