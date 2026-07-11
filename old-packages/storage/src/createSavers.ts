import { ulid } from 'ulid'

import type {
  SaveOptionsOverride,
  BaseStorageAdapter,
} from './adapters/BaseStorageAdapter.js'
import type { ModelNames, UploadsConfig } from './prismaExtension.js'

// Assumes you pass in the graphql type
type MakeFilesString<T> = {
  [K in keyof T]: T[K] extends File ? string : T[K]
}

export const createFileListSaver = (storage: BaseStorageAdapter) => {
  return async (files: File[] = [], pathOverrideOnly?: { path?: string }) => {
    const locations = await Promise.all(
      files.map(async (file) => {
        const { location } = await storage.save(file, pathOverrideOnly)
        return location
      }),
    )

    return locations
  }
}

/*
This creates a "saver" for each model in the uploads config (i.e. tied to a model in the prisma schema)
The saver will only handle single file uploads, not file lists.
*/
export const createUploadSavers = <MNames extends ModelNames = ModelNames>(
  uploadConfig: UploadsConfig<MNames>,
  storage: BaseStorageAdapter,
) => {
  type uploadSaverNames = `for${Capitalize<string & MNames>}`

  // @TODO(TS): Is there a way to make the type of data more specific?
  type Savers = {
    [K in uploadSaverNames]: <T extends Record<string, any>>(
      data: T,
      overrideSaveOptions?: SaveOptionsOverride,
    ) => Promise<MakeFilesString<T>>
  }

  const savers = {} as Savers

  Object.keys(uploadConfig).forEach((model) => {
    const modelKey = model as keyof typeof uploadConfig

    const currentModelConfig = uploadConfig[modelKey]

    if (!currentModelConfig) {
      return
    }

    const currentModelUploadFields = (
      Array.isArray(currentModelConfig.fields)
        ? currentModelConfig.fields
        : [currentModelConfig.fields]
    ) as string[]

    const capitalCaseModel = `${model.charAt(0).toUpperCase() + model.slice(1)}`
    const saverKey = `for${capitalCaseModel}` as keyof Savers

    savers[saverKey] = async (data, overrideSaveOptions) => {
      const updatedFields = {} as Record<string, string>
      for (const field of currentModelUploadFields) {
        if (data[field]) {
          const file = data[field]

          const saveOptions = overrideSaveOptions || {
            fileName: `${model}-${field}-${ulid()}`,
          }
          const { location } = await storage.save(file, saveOptions)

          updatedFields[field] = location
        }
      }
      return {
        ...data,
        ...updatedFields,
      }
    }
  })

  return {
    ...savers,
    inList: createFileListSaver(storage),
  }
}
