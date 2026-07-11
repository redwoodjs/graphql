import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'stream/promises'
import yauzl from 'yauzl-promise'

import type { Config } from './config.js'

export async function unzip(config: Config, zipFilePath: string) {
  console.log('📦 Unpacking template')

  if (config.verbose) {
    console.log('zip file path:', zipFilePath)
  }

  const zip = await yauzl.open(zipFilePath)

  if (config.verbose) {
    console.log('zip file path:', zipFilePath)
    console.log(zip.entryCount, 'entries in zip file')
  }

  const baseDir = `redwood-main/__fixtures__/${config.template}/`

  if (config.verbose) {
    console.log('baseDir:', baseDir)
  }

  try {
    for await (const entry of zip) {
      const isDir = entry.filename.endsWith('/')

      if (isDir || !entry.filename.includes(baseDir)) {
        continue
      }

      const filePath = path.join(
        config.installationDir,
        entry.filename.replace(baseDir, ''),
      )
      const fileDir = path.dirname(filePath)

      if (config.verbose) {
        console.log('Extracting file:', filePath)
      }

      fs.mkdirSync(fileDir, { recursive: true })

      const readStream = await entry.openReadStream()
      const writeStream = fs.createWriteStream(filePath)
      await pipeline(readStream, writeStream)
    }
  } finally {
    await zip.close()
  }

  fs.rmSync(path.dirname(zipFilePath), { recursive: true, force: true })
}
