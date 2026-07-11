import path from 'path'

import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import ci from 'ci-info'
import envinfo from 'envinfo'
import fs from 'fs-extra'
import system from 'systeminformation'
import { v4 as uuidv4, validate as validateUUID } from 'uuid'

import { getPaths, getRawConfig } from '@redwoodjs/project-config'
import { DefaultHost } from '@redwoodjs/structure/dist/hosts'
import { RWProject } from '@redwoodjs/structure/dist/model/RWProject'

import { name as packageName, version as packageVersion } from '../../package'

export async function getResources() {
  // Read the UUID from the file within .redwood or generate a new one if it doesn't exist
  // or if it is too old
  let UID = uuidv4()
  try {
    const telemetryFile = path.join(getPaths().generated.base, 'telemetry.txt')
    if (!fs.existsSync(telemetryFile)) {
      fs.ensureFileSync(telemetryFile)
    }
    if (fs.statSync(telemetryFile).mtimeMs < Date.now() - 86400000) {
      // 86400000 is 24 hours in milliseconds, we rotate the UID every 24 hours
      fs.writeFileSync(telemetryFile, UID)
    } else {
      const storedUID = fs.readFileSync(telemetryFile, { encoding: 'utf8' })
      if (storedUID && validateUUID(storedUID)) {
        UID = storedUID
      } else {
        fs.writeFileSync(telemetryFile, UID)
      }
    }
  } catch (_error) {
    // We can ignore any errors here, we'll just use the generated UID in this case
  }

  const info = JSON.parse(
    await envinfo.run(
      {
        System: ['OS', 'Shell'],
        Binaries: ['Node', 'Yarn', 'npm'],
        npmPackages: '@redwoodjs/*',
        IDEs: ['VSCode'],
      },
      { json: true },
    ),
  )

  // get shell name instead of path
  const shell = info.System?.Shell // Windows doesn't always provide shell info, I guess
  if (shell?.path?.match('/')) {
    info.System.Shell.name = info.System.Shell.path.split('/').pop()
  } else if (shell?.path.match('\\')) {
    info.System.Shell.name = info.System.Shell.path.split('\\').pop()
  }
  const cpu = await system.cpu()
  const mem = await system.mem()

  // Record any specific development environment
  let developmentEnvironment = undefined
  // Gitpod
  if (Object.keys(process.env).some((key) => key.startsWith('GITPOD_'))) {
    developmentEnvironment = 'gitpod'
  }

  // Returns a list of all enabled experiments
  // This detects all top level [experimental.X] and returns all X's, ignoring all Y's for any [experimental.X.Y]
  const experiments = Object.keys(getRawConfig()['experimental'] || {})

  // Project complexity metric
  const project = new RWProject({
    host: new DefaultHost(),
    projectRoot: getPaths().base,
  })

  const routes = project.getRouter().routes
  const prerenderedRoutes = routes.filter((route) => route.hasPrerender)
  const complexity = [
    routes.length,
    prerenderedRoutes.length,
    project.services.length,
    project.cells.length,
    project.pages.length,
  ].join('.')
  const sides = project.sides.join(',')

  return {
    [SemanticResourceAttributes.SERVICE_NAME]: packageName,
    [SemanticResourceAttributes.SERVICE_VERSION]: packageVersion,
    [SemanticResourceAttributes.OS_TYPE]: info.System?.OS?.split(' ')[0],
    [SemanticResourceAttributes.OS_VERSION]: info.System?.OS?.split(' ')[1],
    'shell.name': info.System?.Shell?.name,
    'node.version': info.Binaries?.Node?.version,
    'yarn.version': info.Binaries?.Yarn?.version,
    'npm.version': info.Binaries?.npm?.version,
    'vscode.version': info.IDEs?.VSCode?.version,
    'cpu.count': cpu.physicalCores,
    'memory.gb': Math.round(mem.total / 1073741824),
    'env.node_env': process.env.NODE_ENV || null,
    'ci.redwood': !!process.env.REDWOOD_CI,
    'ci.isci': ci.isCI,
    'dev.environment': developmentEnvironment,
    complexity,
    sides,
    experiments: JSON.stringify(experiments),
    webBundler: 'vite', // Hardcoded because this is now the only supported bundler
    uid: UID,
  }
}
