global.__dirname = __dirname

vi.mock('fs-extra')

import path from 'path'

// Load mocks
import '../../../../lib/test'

const actualFs = await vi.importActual('fs-extra')
import Enquirer from 'enquirer'
import { vol } from 'memfs'
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest'

import { Listr2Mock } from '../../../../__tests__/Listr2Mock'
import { getPaths } from '../../../../lib'
import * as dbAuth from '../dbAuth'

vi.mock('listr2', () => ({
  Listr: Listr2Mock,
}))

// Mock files needed for each test
const mockFiles = {}

const dbAuthTemplateFiles = [
  'forgotPassword.tsx.template',
  'login.tsx.template',
  'login.webAuthn.tsx.template',
  'resetPassword.tsx.template',
  'signup.tsx.template',
]
dbAuthTemplateFiles.forEach((templateFilename) => {
  mockFiles[path.join(__dirname, `../templates/${templateFilename}`)] = actualFs
    .readFileSync(path.join(__dirname, `../templates/${templateFilename}`))
    .toString()
})

mockFiles[
  path.join(__dirname, `../../scaffold/templates/assets/scaffold.css.template`)
] = actualFs
  .readFileSync(
    path.join(
      __dirname,
      `../../scaffold/templates/assets/scaffold.css.template`,
    ),
  )
  .toString()

mockFiles[getPaths().web.routes] = actualFs
  .readFileSync(
    path.join(
      __dirname,
      `../../../../../../../__fixtures__/example-todo-main/web/src/Routes.js`,
    ),
  )
  .toString()

mockFiles[getPaths().web.app] = actualFs
  .readFileSync(
    path.join(
      __dirname,
      `../../../../../../../__fixtures__/example-todo-main/web/src/App.js`,
    ),
  )
  .toString()

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterAll(() => {
  vi.mocked(console).log.mockRestore?.()
})

beforeEach(() => {
  vol.reset()
  vol.fromJSON(mockFiles)
})

describe('dbAuth handler WebAuthn task title', () => {
  it('is correct after prompt answer "Yes"', async () => {
    const customEnquirer = new Enquirer({ show: false })
    customEnquirer.on('prompt', (prompt) => {
      if (prompt.state.message.includes('Enable WebAuthn')) {
        prompt.on('run', () => {
          return prompt.keypress('y')
        })
      } else {
        prompt.submit()
      }
    })

    await dbAuth.handler({
      usernameLabel: 'email',
      passwordLabel: 'password',
      enquirer: customEnquirer,
      listr2: { silentRendererCondition: true },
    })

    const taskTitles = Listr2Mock.executedTaskTitles
    console.log('taskTitles', taskTitles)

    expect(Listr2Mock.executedTaskTitles[0]).toEqual(
      'Querying WebAuthn addition: WebAuthn addition included',
    )
  })

  it("does not prompt for WebAuthn if it's already set up", async () => {
    const localMockFiles = { ...mockFiles }
    localMockFiles[path.join(getPaths().web.src, 'auth.ts')] = `
import { createDbAuthClient, createAuth } from '@redwoodjs/auth-dbauth-web'

const dbAuthClient = createDbAuthClient()

export const { AuthProvider, useAuth } = createAuth(dbAuthClient)
`
    localMockFiles[path.join(getPaths().web.base, 'package.json')] = `{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "@redwoodjs/auth-dbauth-web": "7.0.0",
    "@simplewebauthn/browser": "7.4.0"
  }
}
`

    vol.reset()
    vol.fromJSON(localMockFiles)

    await dbAuth.handler({
      listr2: { silentRendererCondition: true },
      usernameLabel: 'email',
      passwordLabel: 'password',
    })

    expect(Listr2Mock.skippedTaskTitles[1]).toEqual(
      'Querying WebAuthn addition: WebAuthn setup detected - ' +
        'support will be included in pages',
    )
  })

  it('does not prompt for WebAuthn if dbAuth is set up', async () => {
    const localMockFiles = { ...mockFiles }
    localMockFiles[path.join(getPaths().web.src, 'auth.ts')] = `
import { createDbAuthClient, createAuth } from '@redwoodjs/auth-dbauth-web'

const dbAuthClient = createDbAuthClient()

export const { AuthProvider, useAuth } = createAuth(dbAuthClient)
`
    localMockFiles[path.join(getPaths().web.base, 'package.json')] = `{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "@redwoodjs/auth-dbauth-web": "7.0.0",
  }
}
`

    vol.reset()
    vol.fromJSON(localMockFiles)

    await dbAuth.handler({
      listr2: { silentRendererCondition: true },
      usernameLabel: 'email',
      passwordLabel: 'password',
    })

    expect(Listr2Mock.skippedTaskTitles[1]).toEqual(
      'Querying WebAuthn addition: No WebAuthn setup detected - ' +
        'support will not be included in pages',
    )
  })

  it('is correct after prompt answer "No"', async () => {
    const customEnquirer = new Enquirer({ show: false })
    customEnquirer.on('prompt', (prompt) => {
      if (prompt.state.message.includes('Enable WebAuthn')) {
        prompt.on('run', () => {
          return prompt.keypress('N')
        })
      } else {
        prompt.submit()
      }
    })

    await dbAuth.handler({
      enquirer: customEnquirer,
      listr2: { silentRendererCondition: true },
      usernameLabel: 'email',
      passwordLabel: 'password',
    })

    expect(Listr2Mock.executedTaskTitles[0]).toEqual(
      'Querying WebAuthn addition: WebAuthn addition not included',
    )
  })

  it('is correct after providing cli flag value `true`', async () => {
    const customEnquirer = new Enquirer({ show: false })
    customEnquirer.on('prompt', (prompt) => {
      prompt.submit()
    })

    await dbAuth.handler({
      enquirer: customEnquirer,
      listr2: { silentRendererCondition: true },
      webauthn: true,
      usernameLabel: 'email',
      passwordLabel: 'password',
    })

    expect(Listr2Mock.skippedTaskTitles[1]).toEqual(
      'Querying WebAuthn addition: argument webauthn passed, WebAuthn included',
    )
  })

  it('is correct after providing cli flag value `false`', async () => {
    const customEnquirer = new Enquirer({ show: false })
    customEnquirer.on('prompt', (prompt) => {
      prompt.submit()
    })

    await dbAuth.handler({
      enquirer: customEnquirer,
      listr2: { silentRendererCondition: true },
      webauthn: false,
      usernameLabel: 'email',
      passwordLabel: 'password',
    })

    expect(Listr2Mock.skippedTaskTitles[1]).toEqual(
      'Querying WebAuthn addition: argument webauthn passed, WebAuthn not included',
    )
  })
})
