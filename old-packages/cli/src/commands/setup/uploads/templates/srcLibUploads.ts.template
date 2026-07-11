import { createUploadsConfig, setupStorage } from '@redwoodjs/storage'
import { FileSystemStorage } from '@redwoodjs/storage/FileSystemStorage'
import { UrlSigner } from '@redwoodjs/storage/UrlSigner'

const uploadsConfig = createUploadsConfig({
  // Configure your fields here
  // e.g. modelName: { fields: ['fieldWithUpload']}
})

export const fsStorage = new FileSystemStorage({
  baseDir: './uploads',
})

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
