import { describe, it, expect, vi } from 'vitest'

import { MemoryStorage } from '../adapters/MemoryStorage/MemoryStorage.js'
import { createUploadsConfig, setupStorage } from '../index.js'
import { UrlSigner } from '../UrlSigner.js'

// @MARK: use the local prisma client in the test
import { PrismaClient } from './prisma-client/index.js'

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = (await importOriginal()) as any
  return {
    ...originalProjectConfig,
    getConfig: () => {
      return {
        web: {
          apiUrl: '/.redwood/functions',
        },
      }
    },
  }
})

describe('Result extensions', () => {
  const uploadsConfig = createUploadsConfig({
    dummy: {
      fields: 'uploadField',
    },
    dumbo: {
      fields: ['firstUpload', 'secondUpload'],
    },
  })

  const memStorage = new MemoryStorage({
    baseDir: '/tmp',
  })

  const { storagePrismaExtension } = setupStorage({
    uploadsConfig,
    storageAdapter: memStorage,
    urlSigner: new UrlSigner({
      endpoint: '/signed-url',
      secret: 'my-sekret',
    }),
  })

  const prismaClient = new PrismaClient().$extends(storagePrismaExtension)

  it('Adds signedURL and dataURI extensions', async () => {
    const dummy = await prismaClient.dummy.create({
      data: {
        uploadField: '/dummy/upload.txt',
      },
    })

    expect(dummy).toHaveProperty('withSignedUrl')
    expect(dummy).toHaveProperty('withDataUri')
  })

  it('Does not add it to models without upload fields', async () => {
    const noUpload = await prismaClient.noUploadFields.create({
      data: {
        name: 'no-upload',
      },
    })

    expect(noUpload).not.toHaveProperty('withSignedUrl')
    expect(noUpload).not.toHaveProperty('withDataUri')
  })

  it('Generates signed urls for each upload field', async () => {
    const dumbo = await prismaClient.dumbo.create({
      data: {
        firstUpload: '/dumbo/first.txt',
        secondUpload: '/dumbo/second.txt',
      },
    })

    const signedUrlDumbo = dumbo.withSignedUrl({
      expiresIn: 254,
    })

    expect(signedUrlDumbo.firstUpload).toContain(
      '/.redwood/functions/signed-url',
    )
    expect(signedUrlDumbo.firstUpload).toContain('path=%2Fdumbo%2Ffirst.txt')
    expect(signedUrlDumbo.secondUpload).toContain('path=%2Fdumbo%2Fsecond.txt')
  })

  it('Generates data uris for each upload field', async () => {
    // Save these files to disk
    const { location: firstUploadLocation } = await memStorage.save(
      new File(['SOFT_KITTENS'], 'first.txt'),
      {
        fileName: 'first.txt',
        path: '/dumbo',
      },
    )
    const { location: secondUploadLocation } = await memStorage.save(
      new File(['PURR_PURR'], 'second.txt'),
      {
        fileName: 'second.txt',
        path: '/dumbo',
      },
    )

    const dumbo = await prismaClient.dumbo.create({
      data: {
        firstUpload: firstUploadLocation,
        secondUpload: secondUploadLocation,
      },
    })

    // Note that this is async!
    const signedUrlDumbo = await dumbo.withDataUri()

    expect(signedUrlDumbo.firstUpload).toMatch(
      `data:text/plain;base64,${Buffer.from('SOFT_KITTENS').toString('base64')}`,
    )

    expect(signedUrlDumbo.secondUpload).toMatch(
      `data:text/plain;base64,${Buffer.from('PURR_PURR').toString('base64')}`,
    )
  })
})
