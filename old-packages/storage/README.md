# `@redwoodjs/storage`

This package houses

- Prisma extension for handling uploads. Currently
  a) Query Extension: will save, delete, replace files on disk during CRUD
  b) Result Extension: gives you functions like `.withSignedUri` on configured prisma results - which will take the paths, and convert it to a signed url
- Storage adapters e.g. FS and Memory to use with the prisma extension
- Processors - i.e. utility functions which will take [`Files`](https://developer.mozilla.org/en-US/docs/Web/API/File) and save them to storage

## Usage

In `api/src/uploads.ts` - setup uploads - processors, storage and the prisma extension.

```ts
// api/src/lib/uploads.ts
nua
import { setupUploads, UploadsConfig } from '@redwoodjs/storage'
import { FileSystemStorage } from '@redwoodjs/storage/FileSystemStorage'
import { UrlSigner } from '@redwoodjs/storage/UrlSigner'

const uploadsConfig: UploadsConfig = {
  // 👇 prisma model
  profile: {
    // 👇 pass in fields that are going to be File uploads
    // these should be configured as string in the Prisma.schema
    fields: ['avatar', 'coverPhoto'],
  },
}

// 👇 exporting these allows you access elsewhere on the api side
export const fsStorage = new FileSystemStorage({
  baseDir: './uploads',
})

// Optional
export const urlSigner = new UrlSigner({
  secret: process.env.UPLOADS_SECRET,
  endpoint: '/signedUrl',
})

const { saveFiles, storagePrismaExtension } = setupStorage({
  uploadsConfig,
  storageAdapter: fsStorage,
  urlSigner,
})

export { saveFiles, storagePrismaExtension }
```

### Configuring db to use the prisma extension

```ts
// api/src/lib/db.ts

import { PrismaClient } from '@prisma/client'

import { emitLogLevels, handlePrismaLogging } from '@redwoodjs/api/logger'

import { logger } from './logger'
import { storagePrismaExtension } from './uploads'

// 👇 Notice here we create prisma client, and don't export it yet
export const prismaClient = new PrismaClient({
  log: emitLogLevels(['info', 'warn', 'error']),
})

handlePrismaLogging({
  db: prismaClient,
  logger,
  logLevels: ['info', 'warn', 'error'],
})

// 👇 Export db after adding uploads extension
export const db = prismaClient.$extends(storagePrismaExtension)
```

## Using Prisma extension

### A) CRUD operations

No need to do anything here, but you have to use processors to supply Prisma with data in the correct format.

### B) Result extensions

```ts
// api/src/services/profiles/profiles.ts

export const profile: QueryResolvers['profile'] = async ({ id }) => {
  // 👇 await the result from your prisma query
  const profile = await db.profile.findUnique({
    where: { id },
  })

  // Convert the avatar and coverPhoto fields to signed URLs
  // Note that you still need to add a api endpoint to handle these signed urls
  return profile?.withSignedUrl()
}
```

## Using `saveFiles`

In your services, you can use the preconfigured "processors" - exported as `saveFiles` to convert Files to paths on storage, for Prisma to save into the database. The processors, and storage adapters determine where the file is saved.

```ts
// api/src/services/profiles/profiles.ts

export const updateProfile: MutationResolvers['updateProfile'] = async ({
  id,
  input,
}) => {
  const processedInput = await saveFiles.forProfile(input)

  // This becomes a string 👇
  // The configuration on where it was saved is passed when we setup uploads in src/lib/uploads.ts
  // processedInput.avatar = '/mySavePath/profile/avatar/generatedId.jpg'

  return db.profile.update({
    data: processedInput,
    where: { id },
  })
}
```
