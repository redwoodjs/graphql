import path from 'path'

import boxen from 'boxen'
import fs from 'fs-extra'
import { Listr } from 'listr2'
import * as toml from 'smol-toml'
import { env as envInterpolation } from 'string-env-interpolation'
import terminalLink from 'terminal-link'
import { titleCase } from 'title-case'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getPaths } from '../../lib'
import c from '../../lib/colors'

import { SshExecutor } from './baremetal/SshExecutor'

const CONFIG_FILENAME = 'deploy.toml'
const SYMLINK_FLAGS = '-nsf'
const CURRENT_RELEASE_SYMLINK_NAME = 'current'
const LIFECYCLE_HOOKS = ['before', 'after']
export const DEFAULT_SERVER_CONFIG = {
  port: 22,
  branch: 'main',
  packageManagerCommand: 'yarn',
  monitorCommand: 'pm2',
  sides: ['api', 'web'],
  keepReleases: 5,
  freeSpaceRequired: 2048,
}

export const command = 'baremetal [environment]'
export const description = 'Deploy to baremetal server(s)'

// force all paths to have forward slashes so that you can deploy to *nix
// systems from a Windows system
const pathJoin = path.posix.join

export const execaOptions = {
  cwd: pathJoin(getPaths().base),
  stdio: 'inherit',
  shell: true,
  cleanup: true,
}

export const builder = (yargs) => {
  yargs.positional('environment', {
    describe: 'The environment to deploy to',
    type: 'string',
  })

  yargs.option('first-run', {
    describe:
      'Set this flag the first time you deploy: starts server processes from scratch',
    default: false,
    type: 'boolean',
  })

  yargs.option('df', {
    describe: 'Check available disk space',
    default: true,
    type: 'boolean',
  })

  yargs.option('update', {
    describe: 'Update code to latest revision',
    default: true,
    type: 'boolean',
  })

  yargs.option('install', {
    describe: 'Run `yarn install`',
    default: true,
    type: 'boolean',
  })

  yargs.option('migrate', {
    describe: 'Run database migration tasks',
    default: true,
    type: 'boolean',
  })

  yargs.option('build', {
    describe: 'Run build process for the deployed `sides`',
    default: true,
    type: 'boolean',
  })

  yargs.option('restart', {
    describe: 'Restart server processes',
    default: true,
    type: 'boolean',
  })

  yargs.option('cleanup', {
    describe: 'Remove old deploy directories',
    default: true,
    type: 'boolean',
  })

  yargs.option('releaseDir', {
    describe:
      'Directory to create for the latest release, defaults to timestamp',
    default: new Date()
      .toISOString()
      .replace(/[:\-TZ]/g, '')
      .replace(/\.\d+$/, ''),
    type: 'string',
  })

  yargs.option('branch', {
    describe: 'The branch to deploy',
    type: 'string',
  })

  yargs.option('maintenance', {
    describe: 'Add/remove the maintenance page',
    choices: ['up', 'down'],
    help: 'Put up a maintenance page by replacing the content of web/dist/index.html with the content of web/src/maintenance.html',
  })

  yargs.option('rollback', {
    describe: 'Add/remove the maintenance page',
    help: 'Rollback [count] number of releases',
  })

  yargs.option('verbose', {
    describe: 'Verbose mode, for debugging purposes',
    default: false,
    type: 'boolean',
  })

  // TODO: Allow option to pass --sides and only deploy select sides instead of all, always

  yargs.epilogue(
    `Also see the ${terminalLink(
      'Redwood Baremetal Deploy Reference',
      'https://redwoodjs.com/docs/cli-commands#deploy',
    )}\n`,
  )
}

export const throwMissingConfig = (name) => {
  throw new Error(
    `"${name}" config option not set. See https://redwoodjs.com/docs/deployment/baremetal#deploytoml`,
  )
}

export const verifyConfig = (config, yargs) => {
  if (!yargs.environment) {
    throw new Error(
      'Must specify an environment to deploy to, ex: `yarn rw deploy baremetal production`',
    )
  }

  if (!config[yargs.environment]) {
    throw new Error(`No servers found for environment "${yargs.environment}"`)
  }

  return true
}

export const verifyServerConfig = (config) => {
  if (!config.host) {
    throwMissingConfig('host')
  }

  if (!config.path) {
    throwMissingConfig('path')
  }

  if (!config.repo) {
    throwMissingConfig('repo')
  }

  if (!/^\d+$/.test(config.freeSpaceRequired)) {
    throw new Error('"freeSpaceRequired" must be an integer >= 0')
  }

  return true
}

const symlinkCurrentCommand = async (dir, ssh, path) => {
  return await ssh.exec(path, 'ln', [
    SYMLINK_FLAGS,
    dir,
    CURRENT_RELEASE_SYMLINK_NAME,
  ])
}

const restartProcessCommand = async (processName, ssh, serverConfig, path) => {
  return await ssh.exec(path, serverConfig.monitorCommand, [
    'restart',
    processName,
  ])
}

export const serverConfigWithDefaults = (serverConfig, yargs) => {
  return {
    ...DEFAULT_SERVER_CONFIG,
    ...serverConfig,
    branch: yargs.branch || serverConfig.branch || DEFAULT_SERVER_CONFIG.branch,
  }
}

export const maintenanceTasks = (status, ssh, serverConfig) => {
  const deployPath = pathJoin(serverConfig.path, CURRENT_RELEASE_SYMLINK_NAME)
  const tasks = []

  if (status === 'up') {
    tasks.push({
      title: `Enabling maintenance page...`,
      task: async () => {
        await ssh.exec(deployPath, 'cp', [
          pathJoin('web', 'dist', '200.html'),
          pathJoin('web', 'dist', '200.html.orig'),
        ])
        await ssh.exec(deployPath, 'ln', [
          SYMLINK_FLAGS,
          pathJoin('..', 'src', 'maintenance.html'),
          pathJoin('web', 'dist', '200.html'),
        ])
      },
    })

    if (serverConfig.processNames) {
      tasks.push({
        title: `Stopping ${serverConfig.processNames.join(', ')} processes...`,
        task: async () => {
          await ssh.exec(serverConfig.path, serverConfig.monitorCommand, [
            'stop',
            serverConfig.processNames.join(' '),
          ])
        },
      })
    }
  } else if (status === 'down') {
    tasks.push({
      title: `Starting ${serverConfig.processNames.join(', ')} processes...`,
      task: async () => {
        await ssh.exec(serverConfig.path, serverConfig.monitorCommand, [
          'start',
          serverConfig.processNames.join(' '),
        ])
      },
    })

    if (serverConfig.processNames) {
      tasks.push({
        title: `Disabling maintenance page...`,
        task: async () => {
          await ssh.exec(deployPath, 'rm', [
            pathJoin('web', 'dist', '200.html'),
          ])
          await ssh.exec(deployPath, 'cp', [
            pathJoin('web', 'dist', '200.html.orig'),
            pathJoin('web', 'dist', '200.html'),
          ])
        },
      })
    }
  }

  return tasks
}

export const rollbackTasks = (count, ssh, serverConfig) => {
  let rollbackCount = 1

  if (parseInt(count) === count) {
    rollbackCount = count
  }

  const tasks = [
    {
      title: `Rolling back ${rollbackCount} release(s)...`,
      task: async () => {
        const currentLink = (
          await ssh.exec(serverConfig.path, 'readlink', ['-f', 'current'])
        ).stdout
          .split('/')
          .pop()
        const dirs = (await ssh.exec(serverConfig.path, 'ls', ['-t'])).stdout
          .split('\n')
          .filter((dirs) => !dirs.match(/current/))

        const deployedIndex = dirs.indexOf(currentLink)
        const rollbackIndex = deployedIndex + rollbackCount

        if (dirs[rollbackIndex]) {
          console.info('Setting symlink')
          await symlinkCurrentCommand(
            dirs[rollbackIndex],
            ssh,
            serverConfig.path,
          )
        } else {
          throw new Error(
            `Cannot rollback ${rollbackCount} release(s): ${
              dirs.length - dirs.indexOf(currentLink) - 1
            } previous release(s) available`,
          )
        }
      },
    },
  ]

  if (serverConfig.processNames) {
    for (const processName of serverConfig.processNames) {
      tasks.push({
        title: `Restarting ${processName} process...`,
        task: async () => {
          await restartProcessCommand(
            processName,
            ssh,
            serverConfig,
            serverConfig.path,
          )
        },
      })
    }
  }

  return tasks
}

export const lifecycleTask = (
  lifecycle,
  task,
  skip,
  { serverLifecycle, ssh, cmdPath },
) => {
  if (serverLifecycle[lifecycle]?.[task]) {
    const tasks = []

    for (const command of serverLifecycle[lifecycle][task]) {
      tasks.push({
        title: `${titleCase(lifecycle)} ${task}: \`${command}\``,
        task: async () => {
          await ssh.exec(cmdPath, command)
        },
        skip: () => skip,
      })
    }

    return tasks
  }
}

// wraps a given command with any defined before/after lifecycle commands
export const commandWithLifecycleEvents = ({ name, config, skip, command }) => {
  const tasks = []

  tasks.push(lifecycleTask('before', name, skip, config))
  tasks.push({ ...command, skip: () => skip })
  tasks.push(lifecycleTask('after', name, skip, config))

  return tasks.flat().filter((t) => t)
}

/**
 * @param {Yargs} yargs
 * @param {SshExecutor} ssh
 * @param {*} serverConfig
 * @param {*} serverLifecycle
 * @returns Yargs tasks
 */
export const deployTasks = (yargs, ssh, serverConfig, serverLifecycle) => {
  const cmdPath = pathJoin(serverConfig.path, yargs.releaseDir)
  const config = { yargs, ssh, serverConfig, serverLifecycle, cmdPath }
  const tasks = []

  tasks.push(
    commandWithLifecycleEvents({
      name: 'df',
      config: { ...config, cmdPath: serverConfig.path },
      skip:
        !yargs.df ||
        serverConfig.freeSpaceRequired === 0 ||
        serverConfig.freeSpaceRequired === '0',
      command: {
        title: `Checking available disk space...`,
        task: async (_ctx, task) => {
          const { stdout } = await ssh.exec(serverConfig.path, 'df', [
            serverConfig.path,
            '|',
            'awk',
            '\'NR == 2 {print "df:"$4}\'',
          ])

          // I'm doing this because on my machine "stdout" was:
          // 'Non-interactive shell detected\n4102880'
          // Other machines might have different output
          const df = stdout.split('\n').find((line) => line.startsWith('df:'))

          if (!df || !df.startsWith('df:') || df === 'df:') {
            return task.skip(
              c.warning('Warning: Could not get disk space information'),
            )
          }

          const dfMb = parseInt(df.replace('df:', ''), 10) / 1024

          if (isNaN(dfMb)) {
            return task.skip(
              c.warning('Warning: Could not parse disk space information'),
            )
          }

          // This will only show if --verbose is passed
          task.output = `Available disk space: ${dfMb}MB`

          const freeSpaceRequired = parseInt(
            serverConfig.freeSpaceRequired ?? 2048,
            10,
          )

          if (dfMb < freeSpaceRequired) {
            throw new Error(
              `Not enough disk space. You need at least ${freeSpaceRequired}` +
                `MB free space to continue. (Currently ${Math.round(dfMb)}MB ` +
                'available)',
            )
          }
        },
      },
    }),
  )

  tasks.push(
    commandWithLifecycleEvents({
      name: 'update',
      config: { ...config, cmdPath: serverConfig.path },
      skip: !yargs.update,
      command: {
        title: `Cloning \`${serverConfig.branch}\` branch...`,
        task: async () => {
          await ssh.exec(serverConfig.path, 'git', [
            'clone',
            `--branch=${serverConfig.branch}`,
            `--depth=1`,
            serverConfig.repo,
            yargs.releaseDir,
          ])
        },
      },
    }),
  )

  tasks.push(
    commandWithLifecycleEvents({
      name: 'symlinkEnv',
      config,
      skip: !yargs.update,
      command: {
        title: `Symlink .env...`,
        task: async () => {
          await ssh.exec(cmdPath, 'ln', [SYMLINK_FLAGS, '../.env', '.env'])
        },
      },
    }),
  )

  tasks.push(
    commandWithLifecycleEvents({
      name: 'install',
      config,
      skip: !yargs.install,
      command: {
        title: `Installing dependencies...`,
        task: async () => {
          await ssh.exec(cmdPath, serverConfig.packageManagerCommand, [
            'install',
          ])
        },
      },
    }),
  )

  tasks.push(
    commandWithLifecycleEvents({
      name: 'migrate',
      config,
      skip: !yargs.migrate || serverConfig?.migrate === false,
      command: {
        title: `DB Migrations...`,
        task: async () => {
          await ssh.exec(cmdPath, serverConfig.packageManagerCommand, [
            'rw',
            'prisma',
            'migrate',
            'deploy',
          ])
          await ssh.exec(cmdPath, serverConfig.packageManagerCommand, [
            'rw',
            'prisma',
            'generate',
          ])
          await ssh.exec(cmdPath, serverConfig.packageManagerCommand, [
            'rw',
            'dataMigrate',
            'up',
          ])
        },
      },
    }),
  )

  for (const side of serverConfig.sides) {
    tasks.push(
      commandWithLifecycleEvents({
        name: 'build',
        config,
        skip: !yargs.build,
        command: {
          title: `Building ${side}...`,
          task: async () => {
            await ssh.exec(cmdPath, serverConfig.packageManagerCommand, [
              'rw',
              'build',
              side,
            ])
          },
        },
      }),
    )
  }

  tasks.push(
    commandWithLifecycleEvents({
      name: 'symlinkCurrent',
      config,
      skip: !yargs.update,
      command: {
        title: `Symlinking current release...`,
        task: async () => {
          await symlinkCurrentCommand(yargs.releaseDir, ssh, serverConfig.path)
        },
        skip: () => !yargs.update,
      },
    }),
  )

  if (serverConfig.processNames) {
    for (const processName of serverConfig.processNames) {
      if (yargs.firstRun) {
        tasks.push(
          commandWithLifecycleEvents({
            name: 'restart',
            config,
            skip: !yargs.restart,
            command: {
              title: `Starting ${processName} process for the first time...`,
              task: async () => {
                await ssh.exec(serverConfig.path, serverConfig.monitorCommand, [
                  'start',
                  pathJoin(CURRENT_RELEASE_SYMLINK_NAME, 'ecosystem.config.js'),
                  '--only',
                  processName,
                ])
              },
            },
          }),
        )
        tasks.push({
          title: `Saving ${processName} state for future startup...`,
          task: async () => {
            await ssh.exec(serverConfig.path, serverConfig.monitorCommand, [
              'save',
            ])
          },
          skip: () => !yargs.restart,
        })
      } else {
        tasks.push(
          commandWithLifecycleEvents({
            name: 'restart',
            config,
            skip: !yargs.restart,
            command: {
              title: `Restarting ${processName} process...`,
              task: async () => {
                await restartProcessCommand(
                  processName,
                  ssh,
                  serverConfig,
                  serverConfig.path,
                )
              },
            },
          }),
        )
      }
    }
  }

  tasks.push(
    commandWithLifecycleEvents({
      name: 'cleanup',
      config: { ...config, cmdPath: serverConfig.path },
      skip: !yargs.cleanup,
      command: {
        title: `Cleaning up old deploys...`,
        task: async () => {
          // add 2 to skip `current` and start on the keepReleases + 1th release
          const fileStartIndex = serverConfig.keepReleases + 2

          await ssh.exec(
            serverConfig.path,
            `ls -t | tail -n +${fileStartIndex} | xargs rm -rf`,
          )
        },
      },
    }),
  )

  return tasks.flat().filter((e) => e)
}

// merges additional lifecycle events into an existing object
const mergeLifecycleEvents = (lifecycle, other) => {
  let lifecycleCopy = JSON.parse(JSON.stringify(lifecycle))

  for (const hook of LIFECYCLE_HOOKS) {
    for (const key in other[hook]) {
      lifecycleCopy[hook][key] = (lifecycleCopy[hook][key] || []).concat(
        other[hook][key],
      )
    }
  }

  return lifecycleCopy
}

export const parseConfig = (yargs, rawConfigToml) => {
  const configToml = envInterpolation(rawConfigToml)
  const config = toml.parse(configToml)
  let envConfig
  const emptyLifecycle = {}

  verifyConfig(config, yargs)

  // start with an empty set of hooks, { before: {}, after: {} }
  for (const hook of LIFECYCLE_HOOKS) {
    emptyLifecycle[hook] = {}
  }

  // global lifecycle config
  let envLifecycle = mergeLifecycleEvents(emptyLifecycle, config)

  // get config for given environment
  envConfig = config[yargs.environment]
  envLifecycle = mergeLifecycleEvents(envLifecycle, envConfig)

  return { envConfig, envLifecycle }
}

/**
 * @param {Yargs} yargs
 * @param {SshExecutor} ssh
 * @returns Yargs tasks
 */
export const commands = (yargs, ssh) => {
  const deployConfig = fs
    .readFileSync(pathJoin(getPaths().base, CONFIG_FILENAME))
    .toString()

  let { envConfig, envLifecycle } = parseConfig(yargs, deployConfig)
  let servers = []
  let tasks = []

  // loop through each server in deploy.toml
  for (const config of envConfig.servers) {
    // merge in defaults
    const serverConfig = serverConfigWithDefaults(config, yargs)

    verifyServerConfig(serverConfig)

    // server-specific lifecycle
    const serverLifecycle = mergeLifecycleEvents(envLifecycle, serverConfig)

    tasks.push({
      title: 'Connecting...',
      task: () =>
        ssh.connect({
          host: serverConfig.host,
          port: serverConfig.port,
          username: serverConfig.username,
          password: serverConfig.password,
          privateKey: serverConfig.privateKey,
          privateKeyPath: serverConfig.privateKeyPath,
          passphrase: serverConfig.passphrase,
          agent: serverConfig.agentForward && process.env.SSH_AUTH_SOCK,
          agentForward: serverConfig.agentForward,
        }),
    })

    if (yargs.maintenance) {
      tasks = tasks.concat(
        maintenanceTasks(yargs.maintenance, ssh, serverConfig),
      )
    } else if (yargs.rollback) {
      tasks = tasks.concat(rollbackTasks(yargs.rollback, ssh, serverConfig))
    } else {
      tasks = tasks.concat(
        deployTasks(yargs, ssh, serverConfig, serverLifecycle),
      )
    }

    tasks.push({
      title: 'Disconnecting...',
      task: () => ssh.dispose(),
    })

    // Sets each server as a "parent" task so that the actual deploy tasks
    // run as children. Each server deploy can run concurrently
    servers.push({
      title: serverConfig.host,
      task: () => {
        return new Listr(tasks)
      },
    })
  }

  return servers
}

export const handler = async (yargs) => {
  recordTelemetryAttributes({
    command: 'deploy baremetal',
    firstRun: yargs.firstRun,
    df: yargs.df,
    update: yargs.update,
    install: yargs.install,
    migrate: yargs.migrate,
    build: yargs.build,
    restart: yargs.restart,
    cleanup: yargs.cleanup,
    maintenance: yargs.maintenance,
    rollback: yargs.rollback,
    verbose: yargs.verbose,
  })

  // Check if baremetal has been setup
  const tomlPath = path.join(getPaths().base, 'deploy.toml')
  const ecosystemPath = path.join(getPaths().base, 'ecosystem.config.js')

  if (!fs.existsSync(tomlPath) || !fs.existsSync(ecosystemPath)) {
    console.error(
      c.error('\nError: Baremetal deploy has not been properly setup.\n') +
        'Please run `yarn rw setup deploy baremetal` before deploying',
    )
    process.exit(1)
  }

  const ssh = new SshExecutor(yargs.verbose)

  try {
    const tasks = new Listr(commands(yargs, ssh), {
      concurrent: true,
      exitOnError: true,
      renderer: yargs.verbose && 'verbose',
    })
    await tasks.run()
  } catch (e) {
    console.error(c.error('\nDeploy failed:'))
    console.error(
      boxen(e.stderr || e.message, {
        padding: { top: 0, bottom: 0, right: 1, left: 1 },
        margin: 0,
        borderColor: 'red',
      }),
    )

    process.exit(e?.exitCode || 1)
  }
}
