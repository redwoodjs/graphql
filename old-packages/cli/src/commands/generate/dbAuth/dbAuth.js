import path from 'path'

import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import { camelCase } from 'camel-case'
import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'
import { titleCase } from 'title-case'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import {
  addRoutesToRouterTask,
  addScaffoldImport,
  generateTemplate,
  getPaths,
  transformTSToJS,
  writeFilesTask,
} from '../../../lib'
import c from '../../../lib/colors'
import { prepareForRollback } from '../../../lib/rollback'
import { yargsDefaults } from '../helpers'
import { templateForComponentFile } from '../helpers'

const ROUTES = [
  `<Route path="/login" page={LoginPage} name="login" />`,
  `<Route path="/signup" page={SignupPage} name="signup" />`,
  `<Route path="/forgot-password" page={ForgotPasswordPage} name="forgotPassword" />`,
  `<Route path="/reset-password" page={ResetPasswordPage} name="resetPassword" />`,
]

function getPostInstallMessage(isDbAuthSetup) {
  return [
    `   ${c.warning("Pages created! But you're not done yet:")}\n`,
    "   You'll need to tell your pages where to redirect after a user has logged in,",
    '   signed up, or reset their password. Look in LoginPage, SignupPage,',
    '   ForgotPasswordPage and ResetPasswordPage for these lines: \n',
    '     if (isAuthenticated) {',
    '       navigate(routes.home())',
    '     }\n',
    '   and change the route to where you want them to go if the user is already',
    '   logged in. Also take a look in the onSubmit() functions in ForgotPasswordPage',
    '   and ResetPasswordPage to change where the user redirects to after submitting',
    '   those forms.\n',
    !isDbAuthSetup &&
      "   Oh, and if you haven't already, add the necessary dbAuth functions and\n" +
        '   app setup by running:\n\n' +
        '     yarn rw setup auth dbAuth\n',
    '   Happy authenticating!',
  ]
    .filter(Boolean)
    .join('\n')
}

function getPostInstallWebauthnMessage(isDbAuthSetup) {
  return [
    `   ${c.warning("Pages created! But you're not done yet:")}\n`,
    "   You'll need to tell your pages where to redirect after a user has logged in,",
    '   signed up, or reset their password. In LoginPage, look for the `REDIRECT`',
    "   constant and change the route if it's something other than home().",
    '   In SignupPage, ForgotPasswordPage and ResetPasswordPage look for these lines:\n',
    '     if (isAuthenticated) {',
    '       navigate(routes.home())',
    '     }\n',
    '   and change the route to where you want them to go if the user is already',
    '   logged in. Also take a look in the onSubmit() functions in ForgotPasswordPage',
    '   and ResetPasswordPage to change where the user redirects to after submitting',
    '   those forms.\n',
    !isDbAuthSetup &&
      "   Oh, and if you haven't already, add the necessary dbAuth functions and\n" +
        '   app setup by running:\n\n' +
        '     yarn rw setup auth dbAuth\n',
    '   Happy authenticating!',
  ]
    .filter(Boolean)
    .join('\n')
}

export const command = 'dbAuth'
export const description =
  'Generate Login, Signup and Forgot Password pages for dbAuth'
export const builder = (yargs) => {
  yargs
    .option('skip-forgot', {
      description: 'Skip generating the Forgot Password page',
      type: 'boolean',
      default: false,
    })
    .option('skip-login', {
      description: 'Skip generating the login page',
      type: 'boolean',
      default: false,
    })
    .option('skip-reset', {
      description: 'Skip generating the Reset Password page',
      type: 'boolean',
      default: false,
    })
    .option('skip-signup', {
      description: 'Skip generating the signup page',
      type: 'boolean',
      default: false,
    })
    .option('webauthn', {
      alias: 'w',
      default: null,
      description: 'Include WebAuthn support (TouchID/FaceID)',
      type: 'boolean',
    })
    .option('username-label', {
      default: null,
      description: 'Override default form label for username field',
      type: 'string',
    })
    .option('password-label', {
      default: null,
      description: 'Override default form label for password field',
      type: 'string',
    })
    .option('rollback', {
      description: 'Revert all generator actions if an error occurs',
      type: 'boolean',
      default: true,
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/authentication#self-hosted-auth-installation-and-setup',
      )}`,
    )

  // Merge generator defaults in
  Object.entries(yargsDefaults).forEach(([option, config]) => {
    yargs.option(option, config)
  })
}

export const files = async ({
  _tests,
  typescript,
  skipForgot,
  skipLogin,
  skipReset,
  skipSignup,
  webauthn,
  usernameLabel,
  passwordLabel,
}) => {
  const files = []

  usernameLabel = usernameLabel || 'username'
  passwordLabel = passwordLabel || 'password'

  const templateVars = {
    usernameLowerCase: usernameLabel.toLowerCase(),
    usernameCamelCase: camelCase(usernameLabel),
    usernameTitleCase: titleCase(usernameLabel),
    passwordLowerCase: passwordLabel.toLowerCase(),
    passwordCamelCase: camelCase(passwordLabel),
    passwordTitleCase: titleCase(passwordLabel),
  }

  if (!skipForgot) {
    files.push(
      await templateForComponentFile({
        name: 'ForgotPassword',
        suffix: 'Page',
        extension: typescript ? '.tsx' : '.jsx',
        webPathSection: 'pages',
        generator: 'dbAuth',
        templatePath: 'forgotPassword.tsx.template',
        templateVars,
      }),
    )
  }

  if (!skipLogin) {
    files.push(
      await templateForComponentFile({
        name: 'Login',
        suffix: 'Page',
        extension: typescript ? '.tsx' : '.jsx',
        webPathSection: 'pages',
        generator: 'dbAuth',
        templatePath: webauthn
          ? 'login.webAuthn.tsx.template'
          : 'login.tsx.template',
        templateVars,
      }),
    )
  }

  if (!skipReset) {
    files.push(
      await templateForComponentFile({
        name: 'ResetPassword',
        suffix: 'Page',
        extension: typescript ? '.tsx' : '.jsx',
        webPathSection: 'pages',
        generator: 'dbAuth',
        templatePath: 'resetPassword.tsx.template',
        templateVars,
      }),
    )
  }

  if (!skipSignup) {
    files.push(
      await templateForComponentFile({
        name: 'Signup',
        suffix: 'Page',
        extension: typescript ? '.tsx' : '.jsx',
        webPathSection: 'pages',
        generator: 'dbAuth',
        templatePath: 'signup.tsx.template',
        templateVars,
      }),
    )
  }

  if (files.length === 0) {
    console.info(c.error('\nNo files to generate.\n'))
    process.exit(0)
  }

  // add scaffold CSS file if it doesn't exist already
  const scaffoldOutputPath = path.join(getPaths().web.src, 'scaffold.css')
  if (!fs.existsSync(scaffoldOutputPath)) {
    const scaffoldTemplate = await generateTemplate(
      path.join(
        __dirname,
        '../scaffold/templates/assets/scaffold.css.template',
      ),
      { name: 'scaffold' },
    )

    files.push([scaffoldOutputPath, scaffoldTemplate])
  }

  return files.reduce(async (accP, [outputPath, content]) => {
    const acc = await accP

    let template = content

    if (outputPath.match(/\.[jt]sx?/) && !typescript) {
      template = await transformTSToJS(outputPath, content)
    }

    return {
      [outputPath]: template,
      ...acc,
    }
  }, Promise.resolve({}))
}

const tasks = ({
  enquirer,
  listr2,
  force,
  tests,
  typescript,
  skipForgot,
  skipLogin,
  skipReset,
  skipSignup,
  webauthn,
  usernameLabel,
  passwordLabel,
}) => {
  return new Listr(
    [
      {
        title: 'Determining UI labels...',
        skip: () => {
          return !!(usernameLabel && passwordLabel)
        },
        task: async (ctx, task) => {
          return task.newListr(
            [
              {
                title: 'Username label',
                task: async (subCtx, subtask) => {
                  if (usernameLabel) {
                    subtask.skip(
                      `Argument username-label is set, using: "${usernameLabel}"`,
                    )
                    return
                  }

                  const prompt = subtask.prompt(ListrEnquirerPromptAdapter)
                  usernameLabel = await prompt.run(
                    {
                      type: 'input',
                      name: 'username',
                      message: 'What would you like the username label to be:',
                      default: 'Username',
                    },
                    { enquirer: subCtx.enquirer || ctx.enquirer },
                  )
                  subtask.title = `Username label: "${usernameLabel}"`
                },
              },
              {
                title: 'Password label',
                task: async (subCtx, subtask) => {
                  if (passwordLabel) {
                    subtask.skip(
                      `Argument password-label passed, using: "${passwordLabel}"`,
                    )
                    return
                  }

                  const prompt = subtask.prompt(ListrEnquirerPromptAdapter)
                  passwordLabel = await prompt.run(
                    {
                      type: 'input',
                      name: 'password',
                      message: 'What would you like the password label to be:',
                      default: 'Password',
                    },
                    { enquirer: subCtx.enquirer || ctx.enquirer },
                  )
                  subtask.title = `Password label: "${passwordLabel}"`
                },
              },
            ],
            { ctx: { enquirer } },
          )
        },
      },
      {
        title: 'Querying WebAuthn addition...',
        task: async (ctx, task) => {
          if (webauthn != null) {
            // We enter here if the user passed the `--webauthn` flag. The flag
            // always takes precedence.

            ctx.webauthn = webauthn

            task.skip(
              `Querying WebAuthn addition: argument webauthn passed, WebAuthn${
                webauthn ? '' : ' not'
              } included`,
            )
            return
          }

          if (isDbAuthSetup()) {
            if (isWebAuthnEnabled()) {
              ctx.webauthn = webauthn = true

              task.skip(
                'Querying WebAuthn addition: WebAuthn setup detected - ' +
                  'support will be included in pages',
              )
            } else {
              ctx.webauthn = webauthn = false

              task.skip(
                'Querying WebAuthn addition: No WebAuthn setup detected - ' +
                  'support will not be included in pages',
              )
            }

            return
          }

          const prompt = task.prompt(ListrEnquirerPromptAdapter)
          const response = await prompt.run(
            {
              type: 'confirm',
              name: 'answer',
              message:
                'Enable WebAuthn support (TouchID/FaceID) on LoginPage? See ' +
                'https://redwoodjs.com/docs/auth/dbAuth#webAuthn',
              default: false,
            },
            { enquirer: ctx.enquirer },
          )

          ctx.webauthn = webauthn = response

          task.title = `Querying WebAuthn addition: WebAuthn addition${
            webauthn ? '' : ' not'
          } included`
        },
      },
      {
        title: 'Creating pages...',
        task: async () => {
          const filesObj = await files({
            tests,
            typescript,
            skipForgot,
            skipLogin,
            skipReset,
            skipSignup,
            webauthn,
            usernameLabel,
            passwordLabel,
          })

          return writeFilesTask(filesObj, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'Adding routes...',
        task: async () => {
          addRoutesToRouterTask(ROUTES)
        },
      },
      {
        title: 'Adding scaffold import...',
        task: () => addScaffoldImport(),
      },
      {
        title: 'Generate types...',
        task: () => {
          execa.commandSync('yarn rw g types')
        },
      },
      {
        title: 'One more thing...',
        task: () => {
          // This doesn't preserve formatting, so it's been moved to regular
          // console.log()s after the tasks have all finished running
          // task.title = webauthn ? WEBAUTHN_POST_INSTALL : POST_INSTALL
        },
      },
    ],
    {
      silentRendererCondition: () => listr2?.silentRendererCondition,
      rendererOptions: { collapseSubtasks: false },
      ctx: { enquirer },
      exitOnError: true,
    },
  )
}

export const handler = async (yargs) => {
  recordTelemetryAttributes({
    command: 'generate dbAuth',
    skipForgot: yargs.skipForgot,
    skipLogin: yargs.skipLogin,
    skipReset: yargs.skipReset,
    skipSignup: yargs.skipSignup,
    webauthn: yargs.webauthn,
    force: yargs.force,
    rollback: yargs.rollback,
  })
  const t = tasks({ ...yargs })

  try {
    if (yargs.rollback && !yargs.force) {
      prepareForRollback(t)
    }
    await t.run()

    console.log('')
    console.log(
      yargs.webauthn || t.ctx.webauthn
        ? getPostInstallWebauthnMessage(isDbAuthSetup())
        : getPostInstallMessage(isDbAuthSetup()),
    )
  } catch (e) {
    console.log(c.error(e.message))
  }
}

function isDbAuthSetup() {
  const extensions = ['ts', 'js', 'tsx', 'jsx']
  const webAuthExtension = extensions.find((ext) =>
    fs.existsSync(path.join(getPaths().web.src, 'auth.' + ext)),
  )

  // If no `auth.ext` file was found auth is not set up
  if (webAuthExtension) {
    const webAuthPath = path.join(
      getPaths().web.src,
      'auth.' + webAuthExtension,
    )

    return /^import (.*) from ['"]@redwoodjs\/auth-dbauth-web['"]/m.test(
      fs.readFileSync(webAuthPath),
    )
  }

  return false
}

function isWebAuthnEnabled() {
  const webPackageJson = fs.readFileSync(
    path.join(getPaths().web.base, 'package.json'),
    'utf-8',
  )

  return webPackageJson.includes('"@simplewebauthn/browser": ')
}
