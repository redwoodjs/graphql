global.__dirname = __dirname

vi.mock('fs-extra')
vi.mock('execa')

import path from 'path'

// Load mocks
import '../../../../lib/test'

const actualFs = await vi.importActual('fs-extra')
import Enquirer from 'enquirer'
import fs from 'fs-extra'
import { vol } from 'memfs'
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
} from 'vitest'

import { getPaths } from '../../../../lib'
import * as dbAuth from '../dbAuth'

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

describe('dbAuth', () => {
  beforeEach(() => {
    vol.reset()
    vol.fromJSON(mockFiles)
  })

  it('creates a login page', async () => {
    expect(await dbAuth.files(true, false)).toHaveProperty([
      path.normalize('/path/to/project/web/src/pages/LoginPage/LoginPage.jsx'),
    ])
  })

  it('creates a signup page', async () => {
    expect(await dbAuth.files(true, false)).toHaveProperty([
      path.normalize(
        '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
      ),
    ])
  })

  it('creates a scaffold CSS file', async () => {
    expect(await dbAuth.files(true, false)).toHaveProperty([
      path.normalize('/path/to/project/web/src/scaffold.css'),
    ])
  })

  describe('handler', () => {
    it('exits when all files are skipped', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {})
      const mockConsoleInfo = vi
        .spyOn(console, 'info')
        .mockImplementation(() => {})

      await dbAuth.handler({
        listr2: { silentRendererCondition: true },
        usernameLabel: 'email',
        passwordLabel: 'password',
        webauthn: false,
        skipForgot: true,
        skipLogin: true,
        skipReset: true,
        skipSignup: true,
      })

      expect(mockConsoleInfo.mock.calls[0]).toMatchSnapshot()
      expect(mockExit).toHaveBeenCalledWith(0)

      mockExit.mockRestore()
      mockConsoleInfo.mockRestore()
    })

    it('prompts for username label', async () => {
      let correctPrompt = false

      const customEnquirer = new Enquirer({ show: false })
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('username label')) {
          correctPrompt = true
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })
      expect(correctPrompt).toBe(true)
    })

    it('does not prompt for username label when flag is given', async () => {
      let correctPrompt = false

      const customEnquirer = new Enquirer({ show: false })
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('username label')) {
          correctPrompt = true
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
        usernameLabel: 'email',
      })
      expect(correctPrompt).toBe(false)
    })

    it('prompts for password label', async () => {
      let correctPrompt = false

      const customEnquirer = new Enquirer({ show: false })
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('password label')) {
          correctPrompt = true
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })
      expect(correctPrompt).toBe(true)
    })

    it('does not prompt for password label when flag is given', async () => {
      let correctPrompt = false

      const customEnquirer = new Enquirer({ show: false })
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('password label')) {
          correctPrompt = true
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
        passwordLabel: 'secret',
      })
      expect(correctPrompt).toBe(false)
    })

    it('prompt for webauthn', async () => {
      let correctPrompt = false
      const mockConsoleLog = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      const customEnquirer = new Enquirer({ show: false })
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('Enable WebAuthn')) {
          correctPrompt = true
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })
      expect(correctPrompt).toBe(true)

      // Verify that the final log message is not the webauthn one
      expect(mockConsoleLog.mock.calls.at(-1)[0]).toMatch(
        /Look in LoginPage, Sign/,
      )
      mockConsoleLog.mockRestore()
    })

    it('prints webauthn message when answering Yes', async () => {
      const mockConsoleLog = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      const customEnquirer = new Enquirer()
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
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })

      // Verify that the final log message is the webauthn one
      expect(mockConsoleLog.mock.calls.at(-1)[0]).toMatch(
        /In LoginPage, look for the `REDIRECT`/,
      )
      mockConsoleLog.mockRestore()
    })

    it('does not prompt for webauthn when flag is given', async () => {
      let correctPrompt = false

      const customEnquirer = new Enquirer({ show: false })
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('Enable WebAuthn')) {
          correctPrompt = true
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
        webauthn: false,
      })
      expect(correctPrompt).toBe(false)
    })

    it('produces the correct files with default labels', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom username set via flag', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
        usernameLabel: 'Email',
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom username set via prompt', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('username label')) {
          prompt.value = 'Email'
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom password set via flag', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
        passwordLabel: 'Secret',
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom password set via prompt', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('password label')) {
          prompt.value = 'Secret'
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom username and password set via flag', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
        usernameLabel: 'Email',
        passwordLabel: 'Secret',
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom username and password set via prompt', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('username label')) {
          prompt.value = 'Email'
        }
        if (prompt.state.message.includes('password label')) {
          prompt.value = 'Secret'
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom username and password set via prompt and with webauthn enabled via flag', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('username label')) {
          prompt.value = 'Email'
        }
        if (prompt.state.message.includes('password label')) {
          prompt.value = 'Secret'
        }
        prompt.submit()
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
        webauthn: true,
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })

    it('produces the correct files with custom username and password set via prompt and with webauthn enabled via prompt', async () => {
      const customEnquirer = new Enquirer()
      customEnquirer.on('prompt', (prompt) => {
        if (prompt.state.message.includes('Enable WebAuthn')) {
          prompt.on('run', () => {
            return prompt.keypress('y')
          })
        } else {
          if (prompt.state.message.includes('username label')) {
            prompt.value = 'Email'
          } else if (prompt.state.message.includes('password label')) {
            prompt.value = 'Secret'
          }

          prompt.submit()
        }
      })

      await dbAuth.handler({
        enquirer: customEnquirer,
        listr2: { silentRendererCondition: true },
      })

      const forgotPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx',
          ),
        )
        .toString()
      expect(forgotPasswordPage).toMatchSnapshot()

      const loginPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/LoginPage/LoginPage.jsx',
          ),
        )
        .toString()
      expect(loginPage).toMatchSnapshot()

      const resetPasswordPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/ResetPasswordPage/ResetPasswordPage.jsx',
          ),
        )
        .toString()
      expect(resetPasswordPage).toMatchSnapshot()

      const signupPage = fs
        .readFileSync(
          path.normalize(
            '/path/to/project/web/src/pages/SignupPage/SignupPage.jsx',
          ),
        )
        .toString()
      expect(signupPage).toMatchSnapshot()
    })
  })
})
