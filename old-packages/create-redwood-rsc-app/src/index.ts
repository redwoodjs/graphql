#!/usr/bin/env node

import type { TelemetryInfo } from './telemetry.js'

import { initConfig } from './config.js'
import { downloadTemplate } from './download.js'
import { handleError } from './error.js'
import { initialCommit } from './git.js'
import { install } from './install.js'
import { setInstallationDir } from './installationDir.js'
import { relaunchOnLatest, shouldRelaunch } from './latest.js'
import { printDone, printWelcome } from './messages.js'
import { checkNodeVersion, checkYarnInstallation } from './prerequisites.js'
import { sendTelemetry } from './telemetry.js'
import { upgradeToLatestCanary } from './upgradeToLatestCanary.js'
import { printVersion } from './version.js'
import { unzip } from './zip.js'

const startTime = Date.now()
const telemetryInfo: TelemetryInfo = {}

try {
  const config = initConfig()
  telemetryInfo.template = config.template

  if (config.printVersion) {
    printVersion()
  } else if (shouldRelaunch(config)) {
    relaunchOnLatest(config)
  } else {
    printWelcome()

    checkNodeVersion(config)
    checkYarnInstallation(config)
    await setInstallationDir(config)
    const templateZipPath = await downloadTemplate(config)
    await unzip(config, templateZipPath)
    await upgradeToLatestCanary(config)
    install(config)
    initialCommit(config)

    printDone(config)
  }
} catch (e) {
  handleError(e)
}

await sendTelemetry(telemetryInfo, Date.now() - startTime)
