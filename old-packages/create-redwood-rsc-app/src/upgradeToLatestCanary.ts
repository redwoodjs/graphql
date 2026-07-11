import fs from 'node:fs'
import path from 'node:path'
import fetch from 'node-fetch'

import type { Config } from './config.js'

export async function upgradeToLatestCanary(config: Config) {
  const packageJsons = [
    path.join(config.installationDir, 'package.json'),
    path.join(config.installationDir, 'api', 'package.json'),
    path.join(config.installationDir, 'web', 'package.json'),
  ]
  const latestCanary = await getLatestCanary(config, '@redwoodjs/core')

  updatePackageJsons(config, packageJsons, latestCanary)
}

async function getLatestCanary(config: Config, packageName: string) {
  const url = 'https://registry.npmjs.org/' + packageName

  if (config.verbose) {
    console.log('Fetching', url)
  }

  const resp = await fetch(url)
  const packument = (await resp.json()) as {
    'dist-tags': Record<string, string>
  }

  if (config.verbose) {
    console.log(
      packageName,
      'packument[dist-tags]',
      JSON.stringify(packument['dist-tags'], null, 2),
    )
  }

  return packument['dist-tags'].canary
}

function updatePackageJsons(
  config: Config,
  packageJsons: string[],
  latestRwCanary: string,
) {
  // TODO: await Promise.all(packageJsons.map(async (path) => {
  for (const path of packageJsons) {
    if (config.verbose) {
      console.log('Updating', path, 'to use latest RW canary version')
    }

    const contents = fs.readFileSync(path, 'utf8')
    const packageJson = JSON.parse(contents)

    const dependencies = packageJson.dependencies
    const devDependencies = packageJson.devDependencies

    if (config.verbose) {
      console.log('dependencies', dependencies)
      console.log('devDependencies', devDependencies)
    }

    if (dependencies) {
      Object.keys(dependencies).forEach((name) => {
        if (name.startsWith('@redwoodjs/')) {
          dependencies[name] = latestRwCanary
        }
      })
    }

    if (devDependencies) {
      Object.keys(devDependencies).forEach((name) => {
        if (name.startsWith('@redwoodjs/')) {
          devDependencies[name] = latestRwCanary
        }
      })
    }

    if (config.verbose) {
      console.log('package.json', JSON.stringify(packageJson, null, 2))
    }

    fs.writeFileSync(path, JSON.stringify(packageJson, null, 2))
  }
}
