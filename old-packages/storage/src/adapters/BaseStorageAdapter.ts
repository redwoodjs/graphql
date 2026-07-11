/**
 * The storage adapter will just save the file and return
 * {
 *  fileId: string,
 *  location: string, // depending on storage it could be a path
 * }
 */

import mime from 'mime-types'
import { ulid } from 'ulid'

export type AdapterResult = {
  location: string
}

export type SaveOptionsOverride = {
  fileName?: string
  path?: string
}

export type AdapterOptions = {
  baseDir: string
}

export abstract class BaseStorageAdapter {
  adapterOpts: AdapterOptions
  constructor(adapterOpts: AdapterOptions) {
    this.adapterOpts = adapterOpts
  }

  getAdapterOptions() {
    return this.adapterOpts
  }

  generateFileNameWithExtension(
    saveOpts: SaveOptionsOverride | undefined,
    file: File,
  ) {
    const fileName = saveOpts?.fileName || ulid()
    const extension = mime.extension(file.type)
      ? `.${mime.extension(file.type)}`
      : ''
    return `${fileName}${extension}`
  }

  abstract save(
    file: File,
    saveOpts?: SaveOptionsOverride,
  ): Promise<AdapterResult>
  abstract remove(fileLocation: AdapterResult['location']): Promise<void>
  abstract read(fileLocation: AdapterResult['location']): Promise<{
    contents: Buffer | string
    type: ReturnType<typeof mime.lookup>
  }>
}
