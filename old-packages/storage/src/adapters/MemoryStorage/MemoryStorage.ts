import path from 'node:path'

import mime from 'mime-types'

import { BaseStorageAdapter } from '../BaseStorageAdapter.js'
import type { SaveOptionsOverride } from '../BaseStorageAdapter.js'

export class MemoryStorage
  extends BaseStorageAdapter
  implements BaseStorageAdapter
{
  store: Record<string, any> = {}

  async save(file: File, saveOpts?: SaveOptionsOverride) {
    const fileName = this.generateFileNameWithExtension(saveOpts, file)

    const location = path.join(
      saveOpts?.path || this.adapterOpts.baseDir,
      fileName,
    )
    const nodeBuffer = await file.arrayBuffer()

    this.store[location] = Buffer.from(nodeBuffer)

    return {
      location,
    }
  }

  async remove(filePath: string) {
    delete this.store[filePath]
  }

  async read(filePath: string) {
    return {
      contents: this.store[filePath],
      type: mime.lookup(filePath),
    }
  }

  async clear() {
    this.store = {}
  }
}
