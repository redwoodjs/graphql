import fs from 'node:fs/promises'

import type { MockedFunction } from 'vitest'
import { describe, it, vi, expect, beforeEach, beforeAll } from 'vitest'

import { ensurePosixPath } from '@redwoodjs/project-config'

import { FileSystemStorage } from '../adapters/FileSystemStorage/FileSystemStorage.js'
import { createUploadsConfig, setupStorage } from '../index.js'

// @MARK: use the local prisma client in the test
import type { Dumbo, Dummy } from './prisma-client/index.js'
import { PrismaClient } from './prisma-client/index.js'

vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn(),
    unlink: vi.fn(),
    readFile: vi.fn(() => {
      return 'MOCKED_FILE_CONTENT'
    }),
    copyFile: vi.fn(),
  },
}))

// For creation of FS adapter
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}))

describe('Query extensions', () => {
  const uploadsConfig = createUploadsConfig({
    dummy: {
      fields: 'uploadField',
    },
    dumbo: {
      fields: ['firstUpload', 'secondUpload'],
    },
  })

  const { storagePrismaExtension, saveFiles } = setupStorage({
    uploadsConfig: uploadsConfig,
    storageAdapter: new FileSystemStorage({
      baseDir: '/tmp',
    }),
  })

  const prismaClient = new PrismaClient().$extends(storagePrismaExtension)

  beforeEach(() => {
    vi.resetAllMocks()
  })

  const sampleFile = new File(['heres-some-content'], 'dummy.txt', {
    type: 'text/plain',
  })

  describe('create', () => {
    it('create will save files', async () => {
      const processedData = await saveFiles.forDummy({
        uploadField: sampleFile,
      })

      expect(fs.writeFile).toHaveBeenCalled()
      const dummy = await prismaClient.dummy.create({
        data: processedData,
      })

      // On windows the slahes are different
      const uploadFieldPath = ensurePosixPath(dummy.uploadField)

      expect(uploadFieldPath).toMatch(/\/tmp\/.*\.txt$/)
    })

    it('will remove the file if the create fails', async () => {
      try {
        await prismaClient.dumbo.create({
          data: {
            firstUpload: '/tmp/first.txt',
            secondUpload: '/bazinga/second.txt',
            // @ts-expect-error Checking the error here
            id: 'this-is-the-incorrect-type',
          },
        })
      } catch {
        expect(fs.unlink).toHaveBeenNthCalledWith(1, '/tmp/first.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(2, '/bazinga/second.txt')
      }

      expect.assertions(2)
    })
  })

  describe('update', () => {
    let ogDummy: Dummy
    let ogDumbo: Dumbo
    beforeAll(async () => {
      ogDummy = await prismaClient.dummy.create({
        data: {
          uploadField: '/tmp/old.txt',
        },
      })

      ogDumbo = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/tmp/oldFirst.txt',
          secondUpload: '/tmp/oldSecond.txt',
        },
      })
    })

    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('update will remove the old file, save new one', async () => {
      const updatedDummy = await prismaClient.dummy.update({
        data: {
          uploadField: '/tmp/new.txt',
        },
        where: {
          id: ogDummy.id,
        },
      })

      expect(fs.unlink).toHaveBeenCalledWith('/tmp/old.txt')
      expect(updatedDummy.uploadField).toBe('/tmp/new.txt')
    })

    it('should not delete the file if the update fails', async () => {
      const failedUpdatePromise = prismaClient.dummy.update({
        data: {
          // @ts-expect-error Intentional
          id: 'this-is-the-incorrect-type',
        },
        where: {
          id: ogDummy.id,
        },
      })

      // Id is invalid, so the update should fail
      await expect(failedUpdatePromise).rejects.toThrowError()

      // The old one should NOT be deleted
      expect(fs.unlink).not.toHaveBeenCalled()
    })

    it('should only delete old files from the fields that are being updated', async () => {
      const updatedDumbo = await prismaClient.dumbo.update({
        data: {
          firstUpload: '/tmp/newFirst.txt',
        },
        where: {
          id: ogDumbo.id,
        },
      })

      expect(updatedDumbo.firstUpload).toBe('/tmp/newFirst.txt')
      expect(updatedDumbo.secondUpload).toBe('/tmp/oldSecond.txt')
      expect(fs.unlink).toHaveBeenCalledOnce()
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/oldFirst.txt')
    })

    it('should not delete files on update of non-upload fields', async () => {
      // In this case, we're only updating the message field
      await prismaClient.dumbo.update({
        data: {
          message: 'Hello world',
        },
        where: {
          id: ogDumbo.id,
        },
      })

      expect(fs.unlink).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('delete will remove all uploads', async () => {
      const dumbo = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/tmp/first.txt',
          secondUpload: '/tmp/second.txt',
        },
      })

      await prismaClient.dumbo.delete({
        where: {
          id: dumbo.id,
        },
      })

      expect(fs.unlink).toHaveBeenCalledTimes(2)
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/first.txt')
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/second.txt')
    })

    it('delete will not remove any uploads if the delete fails', async () => {
      const bookWithCover = await prismaClient.book.create({
        data: {
          name: 'Prisma extensions for dummies',
          cover: {
            create: {
              photo: '/tmp/book-covers/prisma-for-dummies.jpg',
            },
          },
        },
      })

      // This delete will fail because the book is associated with a cover BUTTTT
      // test serves more as documentation (and to prevent regression if Prisma changes behavior)
      // Because Prisma will throw the validation __before__ the delete in the extension is called

      try {
        await prismaClient.bookCover.delete({
          where: {
            id: bookWithCover.coverId,
          },
        })
        // eslint-disable-next-line no-empty
      } catch {}

      expect(fs.unlink).not.toHaveBeenCalled()
    })

    it('Should handle if a bad path is provided', async () => {
      ;(fs.unlink as MockedFunction<typeof fs.unlink>).mockRejectedValueOnce(
        new Error('unlink error'),
      )

      const invalidPathDumbo = await prismaClient.dumbo.create({
        data: {
          firstUpload: '',
          secondUpload: 'im-a-invalid-path',
        },
      })

      const deletePromise = prismaClient.dumbo.delete({
        where: {
          id: invalidPathDumbo.id,
        },
      })

      await expect(deletePromise).resolves.not.toThrow()

      expect(fs.unlink).toHaveBeenCalledOnce()
      expect(fs.unlink).toHaveBeenCalledWith('im-a-invalid-path')
    })
  })

  describe('upsert', () => {
    it('will remove old files and save new ones on upsert, if it exists [UPDATE]', async () => {
      const ogDumbo = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/tmp/oldFirst.txt',
          secondUpload: '/tmp/oldSecond.txt',
        },
      })

      const updatedDumbo = await prismaClient.dumbo.upsert({
        update: {
          firstUpload: '/tmp/newFirst.txt',
        },
        create: {
          // won't be used
          firstUpload: 'x',
          secondUpload: 'x',
        },
        where: {
          id: ogDumbo.id,
        },
      })

      expect(updatedDumbo.firstUpload).toBe('/tmp/newFirst.txt')
      expect(updatedDumbo.secondUpload).toBe('/tmp/oldSecond.txt')
      expect(fs.unlink).toHaveBeenCalledOnce()
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/oldFirst.txt')
    })

    it('will create a new record (findOrCreate)', async () => {
      const newDumbo = await prismaClient.dumbo.upsert({
        create: {
          firstUpload: '/tmp/first.txt',
          secondUpload: '/bazinga/second.txt',
        },
        update: {},
        where: {
          id: 444444444,
        },
      })

      expect(newDumbo.firstUpload).toBe('/tmp/first.txt')
      expect(newDumbo.secondUpload).toBe('/bazinga/second.txt')
    })

    it('will remove processed files if upsert CREATION fails (findOrCreate)', async () => {
      // This is essentially findOrCreate, because update is empty
      try {
        await prismaClient.dumbo.upsert({
          create: {
            firstUpload: '/tmp/first.txt',
            secondUpload: '/bazinga/second.txt',
            // @ts-expect-error Checking the error here
            id: 'this-is-the-incorrect-type',
          },
        })
      } catch {
        expect(fs.unlink).toHaveBeenNthCalledWith(1, '/tmp/first.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(2, '/bazinga/second.txt')
      }

      expect.assertions(2)
    })

    it('will remove processed files if upsert UPDATE fails', async () => {
      // Bit of a contrived case... why would you ever have different values for update and create...

      const ogDumbo = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/tmp/oldFirst.txt',
          secondUpload: '/tmp/oldSecond.txt',
        },
      })

      try {
        await prismaClient.dumbo.upsert({
          where: {
            id: ogDumbo.id,
          },
          update: {
            firstUpload: '/tmp/newFirst.txt',
            secondUpload: '/tmp/newSecond.txt',
            // @ts-expect-error Intentionally causing an error
            id: 'this-should-cause-an-error',
          },
          create: {
            firstUpload: '/tmp/createFirst.txt',
            secondUpload: '/tmp/createSecond.txt',
          },
        })
      } catch (error) {
        expect(fs.unlink).toHaveBeenCalledTimes(2)
        expect(fs.unlink).not.toHaveBeenCalledWith('/tmp/createFirst.txt')
        expect(fs.unlink).not.toHaveBeenCalledWith('/tmp/createSecond.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(1, '/tmp/newFirst.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(2, '/tmp/newSecond.txt')
        expect(error).toBeDefined()
      }

      // Verify the original files weren't deleted
      const unchangedDumbo = await prismaClient.dumbo.findUnique({
        where: { id: ogDumbo.id },
      })
      expect(unchangedDumbo?.firstUpload).toBe('/tmp/oldFirst.txt')
      expect(unchangedDumbo?.secondUpload).toBe('/tmp/oldSecond.txt')

      expect.assertions(8)
    })
  })

  describe('createMany', () => {
    it('createMany will remove files if all the create fails', async () => {
      try {
        await prismaClient.dumbo.createMany({
          data: [
            {
              firstUpload: '/one/first.txt',
              secondUpload: '/one/second.txt',
              // @ts-expect-error Intentional
              id: 'break',
            },
            {
              firstUpload: '/two/first.txt',
              secondUpload: '/two/second.txt',
              // @ts-expect-error Intentional
              id: 'break2',
            },
          ],
        })
      } catch {
        expect(fs.unlink).toHaveBeenCalledTimes(4)
        expect(fs.unlink).toHaveBeenNthCalledWith(1, '/one/first.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(2, '/one/second.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(3, '/two/first.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(4, '/two/second.txt')
      }

      expect.assertions(5)
    })

    it('createMany will remove all files, even if one of them errors', async () => {
      try {
        await prismaClient.dumbo.createMany({
          data: [
            // This one is correct, but createMany fails together
            // so all the files should be removed!
            {
              firstUpload: '/one/first.txt',
              secondUpload: '/one/second.txt',
              id: 9158125,
            },
            {
              firstUpload: '/two/first.txt',
              secondUpload: '/two/second.txt',
              // @ts-expect-error Intentional
              id: 'break2',
            },
          ],
        })
      } catch {
        // This one doesn't actually get created!
        expect(
          prismaClient.dumbo.findUnique({ where: { id: 9158125 } }),
        ).resolves.toBeNull()

        expect(fs.unlink).toHaveBeenCalledTimes(4)
        expect(fs.unlink).toHaveBeenNthCalledWith(1, '/one/first.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(2, '/one/second.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(3, '/two/first.txt')
        expect(fs.unlink).toHaveBeenNthCalledWith(4, '/two/second.txt')
      }

      expect.assertions(6)
    })
  })

  describe('updateMany', () => {
    it('will remove old files and save new ones on update, if they exist', async () => {
      const ogDumbo1 = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/FINDME/oldFirst1.txt',
          secondUpload: '/FINDME/oldSecond1.txt',
        },
      })

      const ogDumbo2 = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/FINDME/oldFirst2.txt',
          secondUpload: '/FINDME/oldSecond2.txt',
        },
      })

      const updatedDumbos = await prismaClient.dumbo.updateMany({
        data: {
          firstUpload: '/REPLACED/newFirst.txt',
          secondUpload: '/REPLACED/newSecond.txt',
        },
        where: {
          firstUpload: {
            contains: 'FINDME',
          },
        },
      })

      expect(updatedDumbos.count).toBe(2)

      const updatedDumbo1 = await prismaClient.dumbo.findFirstOrThrow({
        where: {
          id: ogDumbo1.id,
        },
      })

      const updatedDumbo2 = await prismaClient.dumbo.findFirstOrThrow({
        where: {
          id: ogDumbo2.id,
        },
      })

      // Still performs the update
      expect(updatedDumbo1.firstUpload).toBe('/REPLACED/newFirst.txt')
      expect(updatedDumbo1.secondUpload).toBe('/REPLACED/newSecond.txt')
      expect(updatedDumbo2.firstUpload).toBe('/REPLACED/newFirst.txt')
      expect(updatedDumbo2.secondUpload).toBe('/REPLACED/newSecond.txt')

      // Then deletes the old files
      expect(fs.unlink).toHaveBeenCalledTimes(4)
      expect(fs.unlink).toHaveBeenNthCalledWith(1, '/FINDME/oldFirst1.txt')
      expect(fs.unlink).toHaveBeenNthCalledWith(2, '/FINDME/oldSecond1.txt')
      expect(fs.unlink).toHaveBeenNthCalledWith(3, '/FINDME/oldFirst2.txt')
      expect(fs.unlink).toHaveBeenNthCalledWith(4, '/FINDME/oldSecond2.txt')
    })

    it('will __not__ remove files if the update fails', async () => {
      const ogDumbo1 = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/tmp/oldFirst1.txt',
          secondUpload: '/tmp/oldSecond1.txt',
        },
      })

      const ogDumbo2 = await prismaClient.dumbo.create({
        data: {
          firstUpload: '/tmp/oldFirst2.txt',
          secondUpload: '/tmp/oldSecond2.txt',
        },
      })

      const failedUpdatePromise = prismaClient.dumbo.updateMany({
        data: {
          // @ts-expect-error Intentional
          id: 'this-is-the-incorrect-type',
        },
        where: {
          OR: [{ id: ogDumbo1.id }, { id: ogDumbo2.id }],
        },
      })

      // Id is invalid, so the update should fail
      await expect(failedUpdatePromise).rejects.toThrowError()

      // The old files should NOT be deleted
      expect(fs.unlink).not.toHaveBeenCalled()
    })
  })
})
