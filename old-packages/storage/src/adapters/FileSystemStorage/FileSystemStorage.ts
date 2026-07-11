import { existsSync, mkdirSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import mime from 'mime-types'

import { ensurePosixPath } from '@redwoodjs/project-config'

import type { SaveOptionsOverride } from '../BaseStorageAdapter.js'
import { BaseStorageAdapter } from '../BaseStorageAdapter.js'

export class FileSystemStorage
  extends BaseStorageAdapter
  implements BaseStorageAdapter
{
  constructor(opts: { baseDir: string }) {
    super(opts)
    if (!existsSync(opts.baseDir)) {
      const posixBaseDir = ensurePosixPath(opts.baseDir)
      console.log('Creating baseDir >', posixBaseDir)
      mkdirSync(posixBaseDir, { recursive: true })
    }
  }
  async save(file: File, saveOverride?: SaveOptionsOverride) {
    const fileName = this.generateFileNameWithExtension(saveOverride, file)

    const location = path.join(
      ensurePosixPath(saveOverride?.path || this.adapterOpts.baseDir),
      fileName,
    )
    const nodeBuffer = await file.arrayBuffer()

    await fs.writeFile(location, Buffer.from(nodeBuffer))
    return { location }
  }

  async read(filePath: string) {
    return {
      contents: await fs.readFile(filePath),
      type: mime.lookup(filePath),
    }
  }

  async remove(filePath: string) {
    await fs.unlink(filePath)
  }
}
