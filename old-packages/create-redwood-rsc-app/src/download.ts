import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import fetch from 'node-fetch'

import type { Config } from './config.js'

export async function downloadTemplate(config: Config) {
  console.log('📥 Downloading RedwoodJS RSC template')

  const url = 'https://github.com/redwoodjs/redwood/archive/refs/heads/main.zip'

  const tmpDir = path.join(
    os.tmpdir(),
    'rw-rsc-app',
    // ":" is problematic with paths
    new Date().toISOString().split(':').join('-'),
  )

  await fs.promises.mkdir(tmpDir, { recursive: true })

  if (config.verbose) {
    console.log('Downloading into', tmpDir)
  }

  const filePath = await download(url, tmpDir)

  if (config.verbose) {
    console.log('Downloaded file to', filePath)
  }

  return filePath
}

async function download(url: string, targetDir: string) {
  const filePath = path.join(targetDir, 'template.zip')
  const res = await fetch(url)

  // Is this safe to do?
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  if (!res.ok) {
    throw new Error(`Failed to download: ${res.statusText}`)
  }

  const fileStream = fs.createWriteStream(filePath)

  await new Promise<void>((resolve, reject) => {
    if (!res.body) {
      fileStream.close()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      throw new Error('Response body is missing')
    }

    res.body.pipe(fileStream)
    res.body.on('error', (err) => {
      fileStream.close()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      reject(new Error(err))
    })

    fileStream.on('finish', function () {
      fileStream.close()
      resolve()
    })
  })

  return filePath
}
