import path from 'node:path'

import { fs as memfs, vol } from 'memfs'
import { vi, afterEach, beforeEach, describe, it, expect } from 'vitest'

import { runScriptFunction } from '../../lib/exec'
import '../../lib/mockTelemetry'
import { handler } from '../execHandler'

vi.mock('@redwoodjs/babel-config', () => ({
  getWebSideDefaultBabelConfig: () => ({
    presets: [],
    plugins: [],
  }),
  registerApiSideBabelHook: () => {},
}))

vi.mock('@redwoodjs/project-config', () => ({
  getPaths: () => ({
    api: { base: '', src: '' },
    web: { base: '', src: '' },
    scripts: path.join('redwood-app', 'scripts'),
  }),
  getConfig: () => ({}),
  resolveFile: (path: string) => path,
}))

vi.mock('@redwoodjs/internal/dist/files', () => ({
  findScripts: () => {
    const scriptsPath = path.join('redwood-app', 'scripts')

    return [
      path.join(scriptsPath, 'one', 'two', 'myNestedScript.ts'),
      path.join(scriptsPath, 'conflicting.js'),
      path.join(scriptsPath, 'conflicting.ts'),
      path.join(scriptsPath, 'normalScript.ts'),
      path.join(scriptsPath, 'secondNormalScript.ts'),
    ]
  },
}))

vi.mock('../../lib/exec', () => ({
  runScriptFunction: vi.fn(),
}))

vi.mock('fs', () => ({ ...memfs, default: { ...memfs } }))
vi.mock('node:fs', () => ({ ...memfs, default: { ...memfs } }))

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.mocked(console).log.mockRestore()
})

describe('yarn rw exec', () => {
  it('passes args on to the script', async () => {
    vol.fromJSON({
      'redwood.toml': '# redwood.toml',
      [path.join('redwood-app', 'scripts', 'normalScript.ts')]: '// script',
    })

    // Running:
    // `yarn rw exec normalScript positional1 --no-prisma positional2 --arg1=foo --arg2 bar`
    const args = {
      _: ['exec', 'positional1', 'positional2'],
      prisma: false,
      arg1: 'foo',
      arg2: 'bar',
      list: false,
      l: false,
      silent: false,
      s: false,
      $0: 'rw',
      name: 'normalScript',
    }
    await handler(args)
    expect(runScriptFunction).toHaveBeenCalledWith({
      args: {
        args: {
          _: ['positional1', 'positional2'],
          arg1: 'foo',
          arg2: 'bar',
        },
      },
      functionName: 'default',
      path: path.join('redwood-app', 'scripts', 'normalScript.ts'),
    })
  })
})

describe('yarn rw exec --list', () => {
  it('includes nested scripts', async () => {
    await handler({ list: true })
    const scriptPath = path
      .join('one', 'two', 'myNestedScript')
      // Handle Windows path separators
      .replaceAll('\\', '\\\\')
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp('\\b' + scriptPath + '\\b')),
    )
  })

  it("does not include the file extension if there's no ambiguity", async () => {
    await handler({ list: true })
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp('\\bnormalScript\\b')),
    )
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp('\\bsecondNormalScript\\b')),
    )
  })

  it('includes the file extension if there could be ambiguity', async () => {
    await handler({ list: true })
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp('\\bconflicting.js\\b')),
    )
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp('\\bconflicting.ts\\b')),
    )
  })
})
